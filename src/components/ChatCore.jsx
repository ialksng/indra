import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, Camera, Database, HardDrive, ChevronDown, MonitorUp, Zap, MousePointerClick, Mic, Volume2, VolumeX, Download, Cloud, Search } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useMedia } from '../hooks/useMedia';
import './ChatCore.css';

export default function ChatCore({ projectId = 'default', _isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom Hooks
  const { isRecording, voiceEnabled, setVoiceEnabled, toggleRecording, speakText, unlockAudio } = useAudio();
  const { activeVideoSource, videoRef, canvasRef, stopVideo, toggleCamera, toggleScreenShare, captureVideoFrame } = useMedia();

  // UI States
  const [selectedModel, setSelectedModel] = useState('flash');
  const [automationEnabled, setAutomationEnabled] = useState(false); 
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultData, setVaultData] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(null); 
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const models = [
    { id: 'flash', name: '⚡ Gemini 2.0 Flash' },
    { id: 'flash-lite', name: '🍃 Gemini Flash Lite' },
    { id: 'pro', name: '🧠 Gemini Pro (Complex)' },
    { id: 'gemini-search', name: '🌐 Web Search (Live Data)' },
    { id: 'deepseek', name: '🤔 DeepSeek R1 (Math/Logic)' },
    { id: 'groq-llama-3', name: '🦙 Llama 3.3 70B' },
    { id: 'groq-vision', name: '👁️ Llama Vision' },
    { id: 'image-generator', name: '🎨 Image Generator' },
    { id: 'smartsphere-rag', name: '📚 SmartSphere (My Data)' }
  ];

  const handleMicClick = () => {
    setShowTextInput(true); // FIX: Force input box to open immediately
    toggleRecording((transcript) => {
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (isLoading || (!input.trim() && !selectedImage && !activeVideoSource)) return;

    unlockAudio(); 

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
      setMessages(prev => [...prev, { role: 'ai', text: '', isStreaming: true }]);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/v1/indra/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messagePayload, image: imageToSend, modelType: selectedModel, allowAutomation: automationEnabled, history: messages, projectId })
      });

      if (!response.ok) throw new Error(`Server Error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // FIX: stream: true prevents broken JSON chunks
        const chunk = decoder.decode(value, { stream: true }); 
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                streamedText += data.text;
                
                // FIX: Immutable React State. This stops the "Hollow Dot" issue.
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex] && updated[lastIndex].role === 'ai') {
                    updated[lastIndex] = { ...updated[lastIndex], text: streamedText };
                  }
                  return updated;
                });
              }
            } catch (_e) {}
          }
        }
      }
      speakText(streamedText);
    } catch (err) {
      console.error("Chat fetch error:", err);
      // FIX: Replace the empty streaming dot with an actual error message
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex] && updated[lastIndex].isStreaming) {
          updated[lastIndex] = { ...updated[lastIndex], text: 'Connection failed. Check backend.', isStreaming: false };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (updated[lastIndex]) updated[lastIndex].isStreaming = false;
        return updated;
      });
    }
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
    } catch (_e) {
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
    if (!text) return "";
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

  const handleDeviceUpload = (e) => { 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
      setShowActionMenu(false);
      setShowTextInput(true); 
    };
    reader.readAsDataURL(file);
  };

  const isInputModeActive = showTextInput || isRecording || activeVideoSource || selectedImage;

  return (
    <div id="indra-chat-core-container" className="chat-core-wrapper">
      
      {/* MODALS */}
      {showSaveDialog && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold tracking-wide">SAVE GENERATED IMAGE</h3>
              <button onClick={() => setShowSaveDialog(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <img src={showSaveDialog} className="rounded-xl max-h-48 object-contain bg-black/50 border border-white/5" alt="Preview" />
            <div className="flex flex-col gap-2">
              <button onClick={() => downloadToDevice(showSaveDialog)} className="btn-primary">
                <Download size={18} /> Download to Device
              </button>
              <button onClick={() => saveToSmartSphere(showSaveDialog)} className="btn-secondary">
                <Cloud size={18} /> Save to SmartSphere
              </button>
            </div>
          </div>
        </div>
      )}

      {isVaultOpen && (
        <div className="modal-overlay">
          <div className="modal-box w-full max-w-md">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold flex items-center gap-2"><Database size={16}/> SMARTSPHERE VAULT</h3>
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
      <div className="chat-header-bar">
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 chat-scroll-area">
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
              <div className={msg.role === 'user' ? 'msg-bubble-user' : 'msg-bubble-ai'}>
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
      <div className="action-hub-container">
        
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
          <div className="flex items-center gap-3 w-full max-w-4xl transition-all duration-300">
            <button onClick={() => { setShowTextInput(false); stopVideo(); if(isRecording) toggleRecording(); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-500">
              <X size={20} />
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? "Listening..." : "Type your command..."}
              className="chat-input-field"
              autoFocus
            />
            
            <button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedImage && !activeVideoSource)} className="send-btn">
              <Send size={22} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-center w-full relative">
            {showActionMenu && (
              <div className="action-menu-popup">
                <button onClick={() => { setShowTextInput(true); setShowActionMenu(false); }} className="action-icon-btn">
                  <Search size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="action-icon-text">SEARCH</span>
                </button>
                <button onClick={() => { handleMicClick(); setShowActionMenu(false); }} className="action-icon-btn">
                  <Mic size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="action-icon-text">VOICE</span>
                </button>
                <button onClick={() => { toggleCamera(); setShowTextInput(true); setShowActionMenu(false); }} className="action-icon-btn">
                  <Camera size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="action-icon-text">CAMERA</span>
                </button>
                <button onClick={() => { toggleScreenShare(); setShowTextInput(true); setShowActionMenu(false); }} className="action-icon-btn">
                  <MonitorUp size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="action-icon-text">PRESENT</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="action-icon-btn">
                  <HardDrive size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="action-icon-text">DEVICE</span>
                </button>
                <button onClick={() => { setIsVaultOpen(true); setShowActionMenu(false); }} className="action-icon-btn">
                  <Database size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="action-icon-text">VAULT</span>
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className={`thunderbolt-main-btn ${showActionMenu ? 'bg-white/10 rotate-45 text-white shadow-none' : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-110 shadow-amber-500/40'}`}
            >
              {showActionMenu ? <X size={32} /> : <Zap size={32} fill="currentColor" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}