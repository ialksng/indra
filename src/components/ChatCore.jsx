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

  // Speech-to-Text Initialization
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
        setShowTextInput(true); // Switch to input mode so user can see/edit
      };
      
      recognitionRef.current.onerror = () => setIsRecording(false);
      recognitionRef.current.onend = () => setIsRecording(false);
    }
  }, []);

  // ALL POSSIBLE FREE MODELS
  const models = [
    { id: 'flash', name: '⚡ Gemini 2.0 Flash' },
    { id: 'flash-lite', name: '🍃 Gemini Flash Lite' },
    { id: 'pro', name: '🧠 Gemini Pro (Complex)' },
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

  // --- VOICE & IMAGE UTILS ---

  const toggleRecording = () => {
    if (!recognitionRef.current) return alert("Your browser doesn't support speech recognition.");
    if (isRecording) {
      recognitionRef.current.stop();
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
      a.download = `indra_gen_${Date.now()}.jpg`;
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
          <img src={imgUrl} alt="AI Gen" className="rounded-xl max-h-64 object-cover border border-white/10 shadow-lg" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-sm">
             <button onClick={() => setShowSaveDialog(imgUrl)} className="bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transform hover:scale-105 transition-all shadow-xl">
               <Download size={16} /> Save Options
             </button>
          </div>
        </div>
      );
      lastIndex = imgRegex.lastIndex;
    }
    if (lastIndex < text.length) parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    return parts.length > 0 ? parts : text;
  };

  // --- STREAMING SEND LOGIC ---

  const handleSend = async (e) => {
    e?.preventDefault();
    if (isLoading || (!input.trim() && !selectedImage && !activeVideoSource)) return;

    let imageToSend = selectedImage;
    if (activeVideoSource) imageToSend = captureVideoFrame();

    const userMsg = { role: 'user', text: input, image: imageToSend };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    // Clear inputs and reset UI to Thunderbolt Hub
    const messagePayload = input;
    setInput('');
    setSelectedImage(null);
    setShowTextInput(false);
    if (activeVideoSource) stopVideo();

    try {
      // Create a streaming placeholder in messages
      setMessages(prev => [...prev, { role: 'ai', text: '', isStreaming: true }]);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/indra/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messagePayload,
          image: imageToSend,
          modelType: selectedModel,
          allowAutomation: automationEnabled,
          history: messages,
          projectId
        })
      });

      if (!response.body) throw new Error("ReadableStream not supported.");

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
            } catch (e) { /* partial chunk */ }
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

  // --- CAMERA / SCREEN / FILE HANDLERS ---

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
      } catch (err) { console.warn(err); }
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
      } catch (err) { console.warn(err); }
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
      setShowTextInput(true); // Jump into input mode
    };
    reader.readAsDataURL(file);
  };

  const isInputModeActive = showTextInput || isRecording || activeVideoSource || selectedImage;

  return (
    <div id="indra-chat-core-container" className="flex flex-col h-full w-full relative z-10 bg-[#0b0f1a] text-slate-200">
      
      {/* MODAL: IMAGE SAVE OPTIONS */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold tracking-wide">SAVE GENERATED IMAGE</h3>
              <button onClick={() => setShowSaveDialog(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <img src={showSaveDialog} className="rounded-xl max-h-48 object-contain bg-black/50 border border-white/5" alt="Preview" />
            <div className="flex flex-col gap-2">
              <button onClick={() => downloadToDevice(showSaveDialog)} className="flex items-center justify-center gap-3 bg-amber-500 text-black py-3 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-lg">
                <Download size={18} /> Download to Device
              </button>
              <button onClick={() => saveToSmartSphere(showSaveDialog)} className="flex items-center justify-center gap-3 bg-white/5 text-white py-3 rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10">
                <Cloud size={18} /> Save to SmartSphere
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMARTSPHERE MODAL */}
      {isVaultOpen && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold flex items-center gap-2">
                <Database size={16}/> SMARTSPHERE VAULT
              </h3>
              <button onClick={() => setIsVaultOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <textarea
              value={vaultData}
              onChange={(e) => setVaultData(e.target.value)}
              className="w-full h-56 bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-amber-500 focus:outline-none resize-none shadow-inner"
              placeholder="Paste reference data here..."
            />
            <button onClick={() => setIsVaultOpen(false)} className="bg-amber-500 text-black py-3 rounded-xl font-bold text-sm tracking-widest shadow-lg">SAVE TO VAULT</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="p-3 bg-black/40 border-b border-white/5 flex flex-wrap gap-3 justify-between items-center z-20 backdrop-blur-md">
        <div className="relative group flex-1 min-w-[150px] max-w-[220px]">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full appearance-none bg-white/5 text-white px-4 py-2 pr-10 rounded-xl border border-white/10 focus:outline-none focus:border-amber-500 cursor-pointer text-xs font-bold"
          >
            {models.map(m => <option className="bg-slate-900" key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-2.5 pointer-events-none text-gray-400" />
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) window.speechSynthesis?.cancel(); }}
            className={`p-2 rounded-xl border transition-all ${voiceEnabled ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
            <input type="checkbox" checked={automationEnabled} onChange={(e) => setAutomationEnabled(e.target.checked)} className="hidden" />
            <MousePointerClick size={16} className={automationEnabled ? "text-amber-400" : "text-gray-500"} />
            <span className="text-[10px] font-bold hidden sm:block">AGENT</span>
            <div className={`w-7 h-4 rounded-full relative transition-all ${automationEnabled ? 'bg-amber-500' : 'bg-white/10'}`}>
              <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-all ${automationEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-40">
            <Zap className="text-amber-500 mb-4" size={48} fill="currentColor" />
            <h3 className="text-white font-bold text-xl mb-2 tracking-tighter">INDRA CORE</h3>
            <p className="text-sm max-w-xs">AI Assistant ready for search, vision, and web automation.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
              <div className={`p-4 rounded-2xl shadow-xl ${msg.role === 'user' ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-black font-semibold' : 'bg-white/5 border border-white/10 text-slate-200'}`}>
                {msg.image && <img src={msg.image} className="rounded-xl mb-3 max-h-48 object-cover border border-white/10 shadow-lg" alt="upload"/>}
                <div className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                   {renderMessageText(msg.text)}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && !messages[messages.length-1]?.isStreaming && <Loader2 className="animate-spin text-amber-500 mx-auto" size={24} />}
        <div ref={messagesEndRef} />
      </div>

      {/* LIVE VIDEO PREVIEW */}
      <div className={`p-2 bg-black/40 border-t border-white/10 flex justify-center backdrop-blur-md ${activeVideoSource ? 'flex' : 'hidden'}`}>
        <div className="relative rounded-xl overflow-hidden border-2 border-amber-500/30 shadow-2xl">
          <video ref={videoRef} className={`h-32 bg-black object-contain ${activeVideoSource === 'camera' ? 'scale-x-[-1]' : ''}`} muted playsInline />
          <button onClick={stopVideo} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-red-500"><X size={12} /></button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* --- CENTRAL THUNDERBOLT ACTION HUB --- */}
      <div className="p-6 bg-black/20 border-t border-white/10 flex flex-col items-center justify-center relative min-h-[100px]">
        
        {/* Attachment Preview */}
        {selectedImage && (
          <div className="absolute -top-16 left-6 bg-[#0f172a] p-1.5 rounded-xl border border-white/10 shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-2">
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="h-12 w-12 object-cover rounded-lg" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
            </div>
          </div>
        )}

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleDeviceUpload} className="hidden" />

        {isInputModeActive ? (
          // --- INPUT BOX MODE ---
          <div className="flex items-center gap-3 w-full max-w-4xl transition-all duration-300">
            <button onClick={() => { setShowTextInput(false); if (isRecording) toggleRecording(); stopVideo(); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-500 transition-colors">
              <X size={20} />
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Listening..." : "Type your command..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-amber-500 focus:bg-white/10 text-white transition-all shadow-2xl placeholder:text-gray-600"
              autoFocus
            />
            
            <button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedImage)} className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl disabled:opacity-20 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all">
              <Send size={22} />
            </button>
          </div>
        ) : (
          // --- THUNDERBOLT HUB MODE ---
          <div className="flex justify-center items-center w-full relative">
            
            {showActionMenu && (
              <div className="absolute bottom-24 flex flex-wrap justify-center gap-2 bg-[#0f172a]/95 backdrop-blur-2xl p-4 rounded-[40px] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] w-[95%] max-w-[360px] animate-in fade-in zoom-in-95 duration-200">
                <button onClick={() => { setShowTextInput(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[30px] transition-all group">
                  <Search size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="text-[9px] font-black tracking-widest text-gray-500">SEARCH</span>
                </button>
                <button onClick={() => { toggleRecording(); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[30px] transition-all group">
                  <Mic size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="text-[9px] font-black tracking-widest text-gray-500">VOICE</span>
                </button>
                <button onClick={() => { toggleCamera(); setShowTextInput(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[30px] transition-all group">
                  <Camera size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="text-[9px] font-black tracking-widest text-gray-500">CAMERA</span>
                </button>
                <button onClick={() => { toggleScreenShare(); setShowTextInput(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[30px] transition-all group">
                  <MonitorUp size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="text-[9px] font-black tracking-widest text-gray-500">PRESENT</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[30px] transition-all group">
                  <HardDrive size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="text-[9px] font-black tracking-widest text-gray-500">DEVICE</span>
                </button>
                <button onClick={() => { setIsVaultOpen(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[30px] transition-all group">
                  <Database size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="text-[9px] font-black tracking-widest text-gray-500">VAULT</span>
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-black shadow-2xl transition-all duration-500 z-20 
              ${showActionMenu ? 'bg-white/10 rotate-45 text-white shadow-none' : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-110 shadow-amber-500/40'}`}
            >
              {showActionMenu ? <X size={32} /> : <Zap size={32} fill="currentColor" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}