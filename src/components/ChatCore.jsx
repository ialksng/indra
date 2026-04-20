import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ImagePlus, X, Camera, Database, HardDrive, ChevronDown, MonitorUp, Zap, MousePointerClick, ShieldAlert, Mic, Volume2, VolumeX, Download, Cloud, Search } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function ChatCore({ projectId = 'default', isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // UI states for the "Thunderbolt Action Hub"
  const [selectedModel, setSelectedModel] = useState('flash');
  const [automationEnabled, setAutomationEnabled] = useState(false); 
  const [voiceEnabled, setVoiceEnabled] = useState(false); 
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const [activeVideoSource, setActiveVideoSource] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [isRecording, setIsRecording] = useState(false);

  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultData, setVaultData] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(null); 
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- 🎙️ VOICE ENGINE ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsRecording(false);
        setShowTextInput(true); 
      };
      
      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return alert("Speech recognition not supported in this browser.");
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    // Remove markdown image URLs and formatting for speech
    const cleanText = text.replace(/!\[.*?\]\((.*?)\)/g, 'Here is the image you requested.')
                          .replace(/[#*_~`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Female'));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // --- 🤖 WEB AGENT / AUTOMATION HANDLERS ---
  const approveAction = (actionDetails, messageIndex) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          chrome.tabs.sendMessage(activeTab.id, { type: 'EXECUTE_ACTION', payload: actionDetails });
        }
      });
    } else {
      const targetOrigin = document.referrer ? new URL(document.referrer).origin : '*';
      window.parent.postMessage({ type: 'INDRA_ACTION', payload: actionDetails }, targetOrigin);
    }

    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[messageIndex].pendingAction.status = 'approved';
      return newMessages;
    });
  };

  const denyAction = (messageIndex) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[messageIndex].pendingAction.status = 'denied';
      return newMessages;
    });
  };

  const fetchDomMap = () => {
    return new Promise((resolve) => {
      if (!automationEnabled) return resolve([]);
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0];
          if (!activeTab?.id) return resolve([]);
          chrome.tabs.sendMessage(activeTab.id, { type: 'GET_LIVE_CONTEXT' }, (response) => {
            if (chrome.runtime.lastError || !response) return resolve([]);
            resolve(response.map);
          });
        });
      } else {
        const elements = document.querySelectorAll('a, button, input, select, textarea');
        const map = Array.from(elements).map((el, i) => {
          const indraId = `indra-element-${i}`;
          el.setAttribute('data-indra-id', indraId);
          return { type: el.tagName.toLowerCase(), text: (el.innerText || el.placeholder || "").substring(0, 50), selector: `[data-indra-id="${indraId}"]` };
        });
        resolve(map);
      }
    });
  };

  // --- 🛰️ STREAMING SEND LOGIC ---
  const handleSend = async (e) => {
    e?.preventDefault();
    if (isLoading || (!input.trim() && !selectedImage && !activeVideoSource)) return;

    if (voiceEnabled) window.speechSynthesis.speak(new SpeechSynthesisUtterance("")); // Unlock Audio

    let imageToSend = selectedImage;
    if (activeVideoSource) imageToSend = captureVideoFrame();

    const userMsg = { role: 'user', text: input, image: imageToSend };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    const messagePayload = input;
    setInput('');
    setSelectedImage(null);
    setShowTextInput(false);
    if (activeVideoSource) stopVideo();

    try {
      const currentDomMap = await fetchDomMap();
      setMessages(prev => [...prev, { role: 'ai', text: '', isStreaming: true }]);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/indra/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messagePayload,
          image: imageToSend,
          modelType: selectedModel,
          allowAutomation: automationEnabled,
          domMap: currentDomMap,
          vaultData: selectedModel === 'smartsphere-rag' ? vaultData : null,
          history: messages,
          projectId
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                streamedText += data.text;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.role === 'ai') {
                    lastMsg.text = streamedText;
                  }
                  return updated;
                });
              }
            } catch (e) {}
          }
        }
      }
      speakText(streamedText);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: 'Connection failed.' }]);
    } finally {
      setIsLoading(false);
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1]) updated[updated.length - 1].isStreaming = false;
        return updated;
      });
    }
  };

  // --- 🎨 IMAGE HANDLERS ---
  const downloadToDevice = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `indra_gen_${Date.now()}.jpg`;
      a.click();
      setShowSaveDialog(null);
    } catch (e) { window.open(url, '_blank'); }
  };

  const saveToSmartSphere = (url) => {
    setVaultData(prev => prev + (prev ? '\n\n' : '') + `[Reference Image]: ${url}`);
    setIsVaultOpen(true);
    setShowSaveDialog(null);
  };

  const renderMessageText = (text) => {
    const imgRegex = /!\[.*?\]\((.*?)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = imgRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
      }
      const imgUrl = match[1];
      parts.push(
        <div key={`img-${match.index}`} className="relative group my-4">
          <img src={imgUrl} alt="AI Gen" className="rounded-xl border border-white/10 shadow-2xl max-h-72 object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-xl backdrop-blur-sm">
             <button onClick={() => setShowSaveDialog(imgUrl)} className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold hover:scale-105 transition-all">
               <Download size={16} className="inline mr-2" /> Save Options
             </button>
          </div>
        </div>
      );
      lastIndex = imgRegex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    return parts.length > 0 ? parts : text;
  };

  // --- 🎥 CAMERA UTILS ---
  const stopVideo = () => { 
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setActiveVideoSource(null);
  };

  const toggleCamera = async () => { 
    if (activeVideoSource === 'camera') stopVideo();
    else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        setActiveVideoSource('camera');
      } catch (err) { alert("Camera denied."); }
    }
  };

  const toggleScreenShare = async () => { 
    if (activeVideoSource === 'screen') stopVideo();
    else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        setActiveVideoSource('screen');
      } catch (err) { console.warn(err); }
    }
  };

  const captureVideoFrame = () => { 
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleDeviceUpload = (e) => { 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setSelectedImage(reader.result); setShowActionMenu(false); setShowTextInput(true); };
    reader.readAsDataURL(file);
  };

  const models = [
    { id: 'flash', name: '⚡ Gemini 2.0 Flash' },
    { id: 'pro', name: '🧠 Gemini 1.5 Pro' },
    { id: 'gemini-search', name: '🌐 Web Search' },
    { id: 'deepseek', name: '🤔 DeepSeek R1' },
    { id: 'groq-llama-3', name: '🦙 Llama 3.3 70B' },
    { id: 'groq-vision', name: '👁️ Llama Vision' },
    { id: 'or-mistral', name: '🌪️ Mistral 7B' },
    { id: 'or-gemma', name: '💎 Gemma 9B' },
    { id: 'image-generator', name: '🎨 Image Gen' },
    { id: 'smartsphere-rag', name: '📚 SmartSphere' }
  ];

  const isInputModeActive = showTextInput || isRecording || activeVideoSource || selectedImage;

  return (
    <div id="indra-chat-core-container" className="flex flex-col h-full w-full relative z-10 bg-[#0b0f1a] text-slate-200 font-sans">
      
      {/* MODAL: IMAGE SAVE */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-3xl w-full max-w-sm p-6 flex flex-col gap-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold uppercase text-xs tracking-widest">Save Options</h3>
              <button onClick={() => setShowSaveDialog(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <img src={showSaveDialog} className="rounded-xl max-h-48 object-contain bg-black/50" alt="Preview" />
            <div className="flex flex-col gap-2">
              <button onClick={() => downloadToDevice(showSaveDialog)} className="bg-amber-500 text-black py-3 rounded-2xl font-bold hover:bg-amber-400 transition-all shadow-lg flex items-center justify-center gap-2">
                <Download size={18} /> Download
              </button>
              <button onClick={() => saveToSmartSphere(showSaveDialog)} className="bg-white/5 text-white py-3 rounded-2xl font-bold hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2">
                <Cloud size={18} /> Send to Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SMARTSPHERE VAULT */}
      {isVaultOpen && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-3xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold flex items-center gap-2 text-xs tracking-widest uppercase"><Database size={14}/> SmartSphere Vault</h3>
              <button onClick={() => setIsVaultOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <textarea value={vaultData} onChange={(e) => setVaultData(e.target.value)} className="w-full h-56 bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-amber-500 focus:outline-none resize-none" placeholder="Paste knowledge here..." />
            <button onClick={() => setIsVaultOpen(false)} className="bg-amber-500 text-black py-3 rounded-2xl font-bold shadow-lg">SAVE TO VAULT</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center z-20 backdrop-blur-md">
        <div className="relative">
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="appearance-none bg-white/5 text-white px-4 py-2 pr-10 rounded-xl border border-white/10 focus:outline-none text-xs font-bold uppercase tracking-widest">
            {models.map(m => <option className="bg-slate-900" key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-2.5 pointer-events-none text-gray-500" />
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) window.speechSynthesis?.cancel(); }} className={`p-2.5 rounded-xl border transition-all ${voiceEnabled ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button onClick={() => setAutomationEnabled(!automationEnabled)} className={`p-2.5 rounded-xl border transition-all ${automationEnabled ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>
            <MousePointerClick size={18} />
          </button>
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 scale-110">
            <Zap className="text-amber-500 mb-6 animate-pulse" size={64} fill="currentColor" />
            <h3 className="text-white font-black text-2xl tracking-tighter uppercase">Indra Core</h3>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in`}>
            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
              <div className={`p-5 rounded-3xl shadow-2xl ${msg.role === 'user' ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-black font-bold' : 'bg-white/5 border border-white/5 text-slate-200'}`}>
                {msg.image && <img src={msg.image} className="rounded-2xl mb-4 max-h-56 object-cover" alt="media"/>}
                <div className="text-sm sm:text-base leading-relaxed">{renderMessageText(msg.text)}</div>
              </div>
            </div>

            {/* AUTOMATION ACTION UI */}
            {msg.pendingAction && (
              <div className="ml-2 p-4 bg-black/40 border border-amber-500/30 rounded-2xl max-w-[85%] flex flex-col gap-3 backdrop-blur-md">
                <div className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                  <Zap size={12} fill="currentColor" /> Action Requested
                </div>
                <div className="bg-black/60 p-2 rounded text-[10px] font-mono text-gray-300 border border-white/5">
                  {msg.pendingAction.action.toUpperCase()} <span className="text-orange-400">{msg.pendingAction.selector}</span>
                </div>
                {msg.pendingAction.status === 'waiting' && (
                  <div className="flex gap-2">
                    <button onClick={() => approveAction(msg.pendingAction, i)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black py-2 rounded-lg transition-all">APPROVE</button>
                    <button onClick={() => denyAction(i)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black py-2 rounded-lg transition-all">DENY</button>
                  </div>
                )}
                {msg.pendingAction.status === 'approved' && <span className="text-[10px] text-emerald-500 font-black tracking-widest">✓ EXECUTED</span>}
                {msg.pendingAction.status === 'denied' && <span className="text-[10px] text-red-500 font-black tracking-widest">✗ DENIED</span>}
              </div>
            )}
          </div>
        ))}
        {isLoading && !messages[messages.length-1]?.isStreaming && <Loader2 className="animate-spin text-amber-500 mx-auto" size={24} />}
        <div ref={messagesEndRef} />
      </div>

      {/* CAMERA / SCREEN PREVIEW */}
      <div className={`p-4 justify-center ${activeVideoSource ? 'flex' : 'hidden'}`}>
        <div className="relative rounded-[30px] overflow-hidden border-2 border-amber-500/40 shadow-2xl">
          <video ref={videoRef} className={`h-40 bg-black object-contain ${activeVideoSource === 'camera' ? 'scale-x-[-1]' : ''}`} muted playsInline />
          <button onClick={stopVideo} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white"><X size={16} /></button>
        </div>
      </div>

      {/* --- ACTION HUB AREA --- */}
      <div className="p-8 flex flex-col items-center justify-center relative min-h-[120px]">
        {selectedImage && <div className="absolute -top-16 left-10 bg-[#0f172a] p-1.5 rounded-2xl border border-white/10 shadow-2xl"><img src={selectedImage} className="h-14 w-14 object-cover rounded-xl" /></div>}
        <input type="file" ref={fileInputRef} onChange={handleDeviceUpload} className="hidden" accept="image/*" />
        
        {isInputModeActive ? (
          <div className="flex items-center gap-3 w-full max-w-4xl animate-in slide-in-from-bottom-5">
            <button onClick={() => {setShowTextInput(false); stopVideo(); setIsRecording(false); setSelectedImage(null);}} className="p-4 bg-white/5 rounded-full text-gray-500"><X size={24}/></button>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder={isRecording ? "Listening..." : "Command Indra..."} className="flex-1 bg-white/5 border border-white/10 rounded-[30px] px-8 py-5 focus:border-amber-500 outline-none text-white shadow-2xl placeholder:text-gray-700" autoFocus />
            <button onClick={handleSend} disabled={isLoading} className="p-5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-[25px] text-black shadow-lg hover:scale-105 transition-all"><Send size={24}/></button>
          </div>
        ) : (
          <div className="relative">
            {showActionMenu && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-3 bg-[#0f172a]/95 backdrop-blur-3xl p-6 rounded-[50px] border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)] w-[360px] animate-in zoom-in-90 duration-300">
                <button onClick={() => {setShowTextInput(true); setShowActionMenu(false);}} className="flex flex-col items-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[35px] transition-all group">
                  <Search size={26} className="group-hover:text-amber-400" /><span className="text-[10px] font-black text-gray-500 uppercase">Search</span>
                </button>
                <button onClick={() => {toggleRecording(); setShowActionMenu(false);}} className="flex flex-col items-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[35px] transition-all group">
                  <Mic size={26} className="group-hover:text-amber-400" /><span className="text-[10px] font-black text-gray-500 uppercase">Voice</span>
                </button>
                <button onClick={() => {toggleCamera(); setShowTextInput(true); setShowActionMenu(false);}} className="flex flex-col items-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[35px] transition-all group">
                  <Camera size={26} className="group-hover:text-amber-400" /><span className="text-[10px] font-black text-gray-500 uppercase">Camera</span>
                </button>
                <button onClick={() => {toggleScreenShare(); setShowTextInput(true); setShowActionMenu(false);}} className="flex flex-col items-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[35px] transition-all group">
                  <MonitorUp size={26} className="group-hover:text-amber-400" /><span className="text-[10px] font-black text-gray-500 uppercase">Present</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[35px] transition-all group">
                  <HardDrive size={26} className="group-hover:text-amber-400" /><span className="text-[10px] font-black text-gray-500 uppercase">Device</span>
                </button>
                <button onClick={() => {setIsVaultOpen(true); setShowActionMenu(false);}} className="flex flex-col items-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[35px] transition-all group">
                  <Database size={26} className="group-hover:text-amber-400" /><span className="text-[10px] font-black text-gray-500 uppercase">Vault</span>
                </button>
              </div>
            )}
            <button onClick={() => setShowActionMenu(!showActionMenu)} className={`w-24 h-24 rounded-full flex items-center justify-center text-black shadow-2xl transition-all duration-500 ${showActionMenu ? 'bg-white/10 rotate-45 text-white scale-90 shadow-none' : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-110 shadow-amber-500/50'}`}>
              {showActionMenu ? <X size={40}/> : <Zap size={40} fill="currentColor" />}
            </button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}