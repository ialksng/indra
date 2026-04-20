import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ImagePlus, X, Camera, Database, HardDrive, ChevronDown, MonitorUp, Zap, MousePointerClick, ShieldAlert, Mic, Volume2, VolumeX, Download, Cloud, Search } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function ChatCore({ projectId = 'default', isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState('flash');
  const [automationEnabled, setAutomationEnabled] = useState(false); 
  const [voiceEnabled, setVoiceEnabled] = useState(false); 
  
  // --- NEW UI STATES ---
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const [activeVideoSource, setActiveVideoSource] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); 

  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultData, setVaultData] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(null); 
  
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      };
      
      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  const models = [
    { id: 'flash', name: '⚡ Gemini 2.5 Flash' },
    { id: 'flash-lite', name: '🍃 Gemini 2.5 Flash Lite' },
    { id: 'pro', name: '🧠 Gemini 2.5 Pro (Complex)' },
    { id: 'gemini-search', name: '🌐 Web Search (Live Data)' },
    { id: 'deepseek', name: '🤔 DeepSeek R1 (Math/Logic)' },
    { id: 'groq-llama-3', name: '🦙 Llama 3.3 70B' },
    { id: 'groq-vision', name: '👁️ Llama Vision (Image Reader)' },
    { id: 'or-mistral', name: '🌪️ Mistral 7B' },
    { id: 'or-gemma', name: '💎 Google Gemma 9B' },
    { id: 'or-phi', name: '🔬 Microsoft Phi-3' },
    { id: 'or-qwen', name: '🐉 Alibaba Qwen 7B' },
    { id: 'image-generator', name: '🎨 Image Generator' },
    { id: 'smartsphere-rag', name: '📚 SmartSphere (My Data)' }
  ];

  const toggleRecording = () => {
    if (!recognitionRef.current) return alert("Your browser doesn't support speech recognition.");
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
    const cleanText = text.replace(/!\[.*?\]\((.*?)\)/g, 'Here is the image you requested.');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const downloadToDevice = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `indra_generated_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      setShowSaveDialog(null);
    } catch (e) {
      window.open(url, '_blank'); 
      setShowSaveDialog(null);
    }
  };

  const saveToSmartSphere = (url) => {
    setVaultData(prev => prev + (prev ? '\n\n' : '') + `[Saved Reference Image]: ${url}`);
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
        <div key={`img-${match.index}`} className="relative group mt-3 mb-3 block">
          <img src={imgUrl} alt="AI Generated" className="rounded-lg max-h-64 object-cover border border-white/10 shadow-lg" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-sm">
             <button 
                onClick={() => setShowSaveDialog(imgUrl)} 
                className="bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-400 flex items-center gap-2 transform hover:scale-105 transition-all"
              >
               <Download size={16} /> Save Options
             </button>
          </div>
        </div>
      );
      lastIndex = imgRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }
    return parts.length > 0 ? parts : text;
  };

  const stopVideo = () => { 
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setActiveVideoSource(null);
  };

  const toggleCamera = async () => { 
    if (activeVideoSource === 'camera') stopVideo();
    else {
      try {
        stopVideo();
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setActiveVideoSource('camera');
      } catch (err) { console.warn("Camera denied", err); }
    }
  };

  const toggleScreenShare = async () => { 
    if (activeVideoSource === 'screen') stopVideo();
    else {
      try {
        stopVideo();
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setActiveVideoSource('screen');
        stream.getVideoTracks()[0].onended = () => stopVideo();
      } catch (err) { console.warn("Screen share denied", err); }
    }
  };

  const captureVideoFrame = () => { 
    if (!activeVideoSource || !videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleDeviceUpload = (e) => { 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
      setShowActionMenu(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSmartSphereUpload = () => {
    setIsVaultOpen(true);
    setShowActionMenu(false);
  };

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
            resolve(response ? response.map : []);
          });
        });
      } else {
        resolve([]);
      }
    });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (isLoading) return;

    let imageToSend = selectedImage;
    if (activeVideoSource) imageToSend = captureVideoFrame();
    if (!input.trim() && !imageToSend) return;

    const userMsg = { role: 'user', text: input, image: imageToSend };
    const textToSend = input;
    
    setInput('');
    setSelectedImage(null);
    setShowTextInput(false); // Hide text input upon sending

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const currentDomMap = await fetchDomMap();

      const res = await apiClient.post('/chat', {
        message: textToSend,
        image: imageToSend,
        modelType: selectedModel,
        allowAutomation: automationEnabled,
        domMap: currentDomMap,
        vaultData: selectedModel === 'smartsphere-rag' ? vaultData : null,
        projectId,
        history: updatedMessages.map(m => ({
          role: m.role === 'ai' ? 'model' : m.role,
          text: m.text,
          ...(m.image && { image: m.image })
        }))
      });

      const replyText = res.data.reply;
      const aiMessage = { role: 'ai', text: replyText };
      if (res.data.actionInstruction) {
        aiMessage.pendingAction = { ...res.data.actionInstruction, status: 'waiting' };
      }
      setMessages(prev => [...prev, aiMessage]);
      
      speakText(replyText);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to Indra.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Condition to check if we should render the Text Input area instead of the Action Hub
  const isInputModeActive = showTextInput || isRecording || activeVideoSource || selectedImage;

  return (
    <div id="indra-chat-core-container" className="flex flex-col h-full w-full relative z-10">
      
      {/* MODAL: IMAGE SAVE OPTIONS */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-xl w-full max-w-sm p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold">Save Image</h3>
              <button onClick={() => setShowSaveDialog(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <img src={showSaveDialog} className="rounded-lg max-h-48 object-contain bg-black/50" alt="Preview" />
            <div className="flex flex-col gap-2">
              <button onClick={() => downloadToDevice(showSaveDialog)} className="flex items-center justify-center gap-2 bg-amber-500 text-black py-2.5 rounded-lg font-bold hover:bg-amber-400 transition-colors">
                <Download size={18} /> Download to Device
              </button>
              <button onClick={() => saveToSmartSphere(showSaveDialog)} className="flex items-center justify-center gap-2 bg-white/10 text-white py-2.5 rounded-lg font-bold hover:bg-white/20 transition-colors border border-white/5">
                <Cloud size={18} /> Save to SmartSphere
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMARTSPHERE MODAL */}
      {isVaultOpen && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold flex items-center gap-2">
                <Database size={16}/> SmartSphere Vault
              </h3>
              <button onClick={() => setIsVaultOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <textarea
              value={vaultData}
              onChange={(e) => setVaultData(e.target.value)}
              className="w-full h-48 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-amber-500 focus:outline-none resize-none"
            />
            <button onClick={() => setIsVaultOpen(false)} className="bg-amber-500 text-black py-2.5 rounded-lg font-bold text-sm">Save to Vault</button>
          </div>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <div className="p-3 bg-black/20 border-b border-white/5 flex flex-wrap gap-3 justify-between items-center z-20 backdrop-blur-sm">
        <div className="relative group flex-1 min-w-[150px] max-w-[200px]">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full appearance-none bg-white/5 text-white px-3 py-2 pr-10 rounded-lg border border-white/10 focus:outline-none focus:border-amber-500 cursor-pointer text-sm font-medium truncate"
          >
            {models.map(m => <option className="bg-slate-900" key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-2.5 pointer-events-none text-gray-400" />
        </div>

        <button 
          onClick={() => {
            setVoiceEnabled(!voiceEnabled);
            if (voiceEnabled) window.speechSynthesis?.cancel(); 
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${voiceEnabled ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
          title="AI Voice Output"
        >
          {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span className="text-xs font-bold hidden sm:block">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
        </button>

        {(selectedModel === 'groq-llama-3' || selectedModel === 'deepseek' || selectedModel.startsWith('or-')) && (selectedImage || activeVideoSource) && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded border border-amber-500/20">
            <ShieldAlert size={12} /> Model is text-only
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
          <input type="checkbox" checked={automationEnabled} onChange={(e) => setAutomationEnabled(e.target.checked)} className="hidden" />
          <MousePointerClick size={16} className={automationEnabled ? "text-amber-400" : "text-gray-400"} />
          <span className={`text-sm font-medium select-none hidden sm:block ${automationEnabled ? "text-white" : "text-gray-400"}`}>Web Agent</span>
          <div className={`w-8 h-4 ml-1 rounded-full relative transition-colors ${automationEnabled ? 'bg-amber-500' : 'bg-black/50 border border-white/10'}`}>
            <div className={`absolute top-[1px] left-[1px] bg-white w-3.5 h-3.5 rounded-full transition-transform ${automationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </label>
      </div>

      {/* CHAT HISTORY */}
      <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-3 space-y-4' : 'p-6 space-y-6'}`}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 mt-10">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <Zap className="text-amber-500" size={32} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Hello, I am Indra.</h3>
            <p className="text-slate-400 text-sm max-w-xs">Click the thunderbolt below to search the web, generate images, or automate your tasks.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
              
              <div className={`p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-medium shadow-lg' : 'bg-white/5 border border-white/10 text-slate-200'}`}>
                {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-h-48 object-cover" alt="attachment"/>}
                <div className={isCompact ? 'text-sm whitespace-pre-wrap' : 'text-base whitespace-pre-wrap'}>
                   {renderMessageText(msg.text)}
                </div>
              </div>
            </div>

            {msg.pendingAction && (
              <div className="ml-2 mt-1 p-3 bg-black/40 border border-amber-500/30 rounded-xl max-w-[85%] flex flex-col gap-2 backdrop-blur-md">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-bold uppercase tracking-wide">
                  <Zap size={14} /> Action Requested
                </div>
                <div className="bg-black/60 p-2 rounded text-xs font-mono text-gray-300 border border-white/5">
                  <span className="text-orange-400">{msg.pendingAction.action.toUpperCase()}</span> on element <span className="text-emerald-400">"{msg.pendingAction.selector}"</span>
                </div>
                {msg.pendingAction.status === 'waiting' && (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => approveAction(msg.pendingAction, i)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-2 rounded">Approve</button>
                    <button onClick={() => denyAction(i)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded">Deny</button>
                  </div>
                )}
                {msg.pendingAction.status === 'approved' && <span className="text-xs text-emerald-500 font-bold">✓ Action Executed</span>}
                {msg.pendingAction.status === 'denied' && <span className="text-xs text-red-400 font-bold">✗ Action Denied</span>}
              </div>
            )}
          </div>
        ))}
        {isLoading && <Loader2 className="animate-spin text-amber-500 m-4" size={20} />}
        <div ref={messagesEndRef} />
      </div>

      {/* VIDEO PREVIEW */}
      <div className={`p-2 bg-black/40 border-t border-white/10 flex justify-center backdrop-blur-md ${activeVideoSource ? 'flex' : 'hidden'}`}>
        <div className="relative rounded-lg overflow-hidden border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] max-w-full">
          <video ref={videoRef} className={`h-32 bg-black object-contain ${activeVideoSource === 'camera' ? 'transform scale-x-[-1]' : ''}`} muted playsInline />
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold tracking-wide">
            {activeVideoSource === 'screen' ? 'SHARING SCREEN' : 'LIVE'}
          </span>
          <button onClick={stopVideo} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500"><X size={14} /></button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* --- NEW CENTRAL HUB BOTTOM AREA --- */}
      <div className="p-4 bg-black/20 border-t border-white/10 flex items-center justify-center relative backdrop-blur-md min-h-[90px]">
        
        {/* Floating Image Preview above the hub */}
        {selectedImage && (
          <div className="absolute -top-20 left-4 bg-[#0f172a] p-2 rounded-lg border border-white/10 shadow-xl z-10">
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded border border-white/5" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1"><X size={14} /></button>
            </div>
          </div>
        )}

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleDeviceUpload} className="hidden" />

        {isInputModeActive ? (
          // ACTIVE INPUT MODE (When typing, recording, or media attached)
          <div className="flex items-center gap-2 w-full max-w-3xl transition-all">
            <button 
              onClick={() => {
                setShowTextInput(false);
                if (isRecording) toggleRecording();
              }} 
              className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Listening to your voice..." : activeVideoSource ? "Ask about what I'm seeing..." : "Type your message..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-amber-500 focus:bg-white/10 text-white transition-all placeholder:text-gray-500 shadow-inner"
              autoFocus
            />
            
            <button 
              onClick={handleSend} 
              disabled={isLoading || (!input.trim() && !activeVideoSource && !selectedImage)} 
              className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-2xl disabled:opacity-50 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all"
            >
              <Send size={20} className="ml-0.5" />
            </button>
          </div>
        ) : (
          // THUNDERBOLT HUB MODE
          <div className="flex justify-center items-center w-full relative">
            
            {/* The Expanded Action Menu */}
            {showActionMenu && (
              <div className="absolute bottom-20 flex flex-wrap justify-center gap-2 bg-[#0f172a]/95 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl w-[95%] max-w-[340px]">
                
                <button onClick={() => { setShowTextInput(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-3 w-[90px] hover:bg-white/10 rounded-2xl text-gray-300 hover:text-amber-400 transition-all">
                  <Search size={24} />
                  <span className="text-[10px] font-bold tracking-widest">SEARCH</span>
                </button>

                <button onClick={() => { toggleRecording(); setShowTextInput(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-3 w-[90px] hover:bg-white/10 rounded-2xl text-gray-300 hover:text-amber-400 transition-all">
                  <Mic size={24} />
                  <span className="text-[10px] font-bold tracking-widest">VOICE</span>
                </button>

                <button onClick={() => { toggleCamera(); setShowTextInput(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-3 w-[90px] hover:bg-white/10 rounded-2xl text-gray-300 hover:text-amber-400 transition-all">
                  <Camera size={24} />
                  <span className="text-[10px] font-bold tracking-widest">CAMERA</span>
                </button>

                <button onClick={() => { toggleScreenShare(); setShowTextInput(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-3 w-[90px] hover:bg-white/10 rounded-2xl text-gray-300 hover:text-amber-400 transition-all">
                  <MonitorUp size={24} />
                  <span className="text-[10px] font-bold tracking-widest">PRESENT</span>
                </button>

                <button onClick={() => { fileInputRef.current?.click(); }} className="flex flex-col items-center justify-center gap-2 p-3 w-[90px] hover:bg-white/10 rounded-2xl text-gray-300 hover:text-amber-400 transition-all">
                  <HardDrive size={24} />
                  <span className="text-[10px] font-bold tracking-widest">DEVICE</span>
                </button>

                <button onClick={() => handleSmartSphereUpload()} className="flex flex-col items-center justify-center gap-2 p-3 w-[90px] hover:bg-white/10 rounded-2xl text-gray-300 hover:text-amber-400 transition-all">
                  <Database size={24} />
                  <span className="text-[10px] font-bold tracking-widest">VAULT</span>
                </button>

              </div>
            )}

            {/* The Thunderbolt Button */}
            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all duration-300 z-20 
              ${showActionMenu ? 'bg-white/20 rotate-45 text-white shadow-none scale-90' : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-110 hover:shadow-[0_0_50px_rgba(245,158,11,0.6)]'}`}
            >
              {showActionMenu ? <X size={28} /> : <Zap size={28} fill="currentColor" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}