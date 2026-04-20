import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ImagePlus, X, Camera, Database, HardDrive, ChevronDown, MonitorUp, Zap, MousePointerClick, ShieldAlert } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function ChatCore({ projectId = 'default', isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [automationEnabled, setAutomationEnabled] = useState(false); 
  
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [activeVideoSource, setActiveVideoSource] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); 

  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultData, setVaultData] = useState('');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const models = [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'groq-llama-3', name: 'Groq Llama-3.3 70B' },
    { id: 'groq-mixtral', name: 'Groq Llama-3.1 8B' },
    { id: 'smartsphere-rag', name: 'SmartSphere (My Data)' }
  ];

  const stopVideo = () => { 
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setActiveVideoSource(null);
  };

  const toggleCamera = async () => { 
    if (activeVideoSource === 'camera') {
      stopVideo();
    } else {
      try {
        stopVideo();
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setActiveVideoSource('camera');
      } catch (err) {
        console.warn("Camera access denied or unavailable", err);
      }
    }
  };

  const toggleScreenShare = async () => { 
    if (activeVideoSource === 'screen') {
      stopVideo();
    } else {
      try {
        stopVideo();
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setActiveVideoSource('screen');
        stream.getVideoTracks()[0].onended = () => stopVideo();
      } catch (err) {
        console.warn("Screen share denied/cancelled", err);
      }
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
      setShowUploadMenu(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSmartSphereUpload = () => {
    setIsVaultOpen(true);
    setShowUploadMenu(false);
  };

  const approveAction = (actionDetails, messageIndex) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:'))) {
            console.warn("[Indra] Cannot execute actions on internal browser pages.");
            return;
          }
          chrome.tabs.sendMessage(activeTab.id, { 
            type: 'EXECUTE_ACTION', 
            payload: actionDetails 
          }, () => {
            if (chrome.runtime.lastError) {
              console.warn("[Indra] Execution failed. Content script not found.");
            }
          });
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
          
          if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:'))) {
            console.warn("[Indra] Cannot run Web Agent on internal browser pages.");
            return resolve([]); 
          }

          chrome.tabs.sendMessage(activeTab.id, { type: 'GET_LIVE_CONTEXT' }, (response) => {
            if (chrome.runtime.lastError) {
               console.warn("[Indra] Content script not found. Did you refresh the page?");
               return resolve([]);
            }
            if (!response) return resolve([]);
            resolve(response.map);
          });
        });
      } 
      else {
        const elements = document.querySelectorAll('a, button, input, select, textarea');
        const map = [];
        let idCounter = 0;

        elements.forEach((el) => {
          if (el.closest('#indra-chat-core-container')) return; 
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          const indraId = 'indra-standalone-' + (idCounter++);
          el.setAttribute('data-indra-id', indraId);

          let textContent = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim().substring(0, 50);
          if (textContent) {
            map.push({ type: el.tagName.toLowerCase(), text: textContent, selector: `[data-indra-id="${indraId}"]` });
          }
        });
        resolve(map);
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

      const aiMessage = { role: 'ai', text: res.data.reply };
      if (res.data.actionInstruction) {
        aiMessage.pendingAction = { ...res.data.actionInstruction, status: 'waiting' };
      }
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to Indra.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="indra-chat-core-container" className="flex flex-col h-full w-full relative z-10">
      
      {/* SMARTSPHERE MODAL */}
      {isVaultOpen && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold flex items-center gap-2 tracking-wide uppercase text-sm">
                <Database size={16}/> SmartSphere Vault
              </h3>
              <button onClick={() => setIsVaultOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <p className="text-sm text-gray-400">
              Paste your custom data, website content, or business rules here. When the <b>SmartSphere</b> model is selected, Indra will use this knowledge to answer.
            </p>
            <textarea
              value={vaultData}
              onChange={(e) => setVaultData(e.target.value)}
              className="w-full h-48 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
              placeholder="e.g., 'Our return policy is 30 days. Shipping takes 2-4 days. Contact support@store.com...'"
            />
            <button 
              onClick={() => setIsVaultOpen(false)} 
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black py-2.5 rounded-lg font-bold text-sm transition-colors shadow-lg"
            >
              Save to Vault
            </button>
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

        {selectedModel.startsWith('groq') && (selectedImage || activeVideoSource) && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded border border-amber-500/20">
            <ShieldAlert size={12} /> Llama 3 is text-only
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
          <input 
            type="checkbox" 
            checked={automationEnabled}
            onChange={(e) => setAutomationEnabled(e.target.checked)}
            className="hidden" 
          />
          <MousePointerClick size={16} className={automationEnabled ? "text-amber-400" : "text-gray-400"} />
          <span className={`text-sm font-medium select-none hidden sm:block ${automationEnabled ? "text-white" : "text-gray-400"}`}>
            Web Agent
          </span>
          <div className={`w-8 h-4 ml-1 rounded-full relative transition-colors ${automationEnabled ? 'bg-amber-500' : 'bg-black/50 border border-white/10'}`}>
            <div className={`absolute top-[1px] left-[1px] bg-white w-3.5 h-3.5 rounded-full transition-transform ${automationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </label>
      </div>

      {/* CHAT HISTORY & EMPTY STATE */}
      <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-3 space-y-4' : 'p-6 space-y-6'}`}>
        
        {/* EMPTY STATE */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 mt-10">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
              <Zap className="text-amber-500" size={24} />
            </div>
            <p className="text-slate-400 text-sm mb-4 max-w-xs">Ready to automate this page or answer questions from your SmartSphere vault.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
              
              <div className={`p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black font-medium shadow-lg' : 'bg-white/5 border border-white/10 text-slate-200'}`}>
                {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-h-48 object-cover" alt="attachment"/>}
                <p className={isCompact ? 'text-sm whitespace-pre-wrap' : 'text-base whitespace-pre-wrap'}>{msg.text}</p>
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
                    <button 
                      onClick={() => approveAction(msg.pendingAction, i)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-2 rounded transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => denyAction(i)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded transition-colors"
                    >
                      Deny
                    </button>
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
          <video 
            ref={videoRef} 
            className={`h-32 bg-black object-contain ${activeVideoSource === 'camera' ? 'transform scale-x-[-1]' : ''}`} 
            muted 
            playsInline 
          />
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold tracking-wide">
            {activeVideoSource === 'screen' ? 'SHARING SCREEN' : 'LIVE'}
          </span>
          <button 
            onClick={stopVideo}
            className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* INPUT AREA */}
      <div className="p-3 bg-black/20 border-t border-white/10 flex flex-col gap-2 relative backdrop-blur-md">
        
        {selectedImage && (
          <div className="absolute -top-20 left-2 bg-[#0f172a] p-2 rounded-lg border border-white/10 shadow-xl z-10">
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded border border-white/5" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform shadow-lg"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {showUploadMenu && (
          <div className="absolute bottom-16 left-2 bg-[#0f172a] border border-white/10 rounded-lg shadow-2xl p-2 flex flex-col gap-1 z-50">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-md text-sm w-full transition-colors">
              <HardDrive size={16} className="text-amber-400" /> Device Upload
            </button>
            <button onClick={handleSmartSphereUpload} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-md text-sm w-full transition-colors">
              <Database size={16} className="text-orange-400" /> SmartSphere Vault
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleDeviceUpload} className="hidden" />
          
          <button onClick={() => setShowUploadMenu(!showUploadMenu)} className="p-2 text-gray-400 hover:text-amber-400 transition-colors" title="Attach">
            <ImagePlus size={20} />
          </button>

          <button onClick={toggleCamera} className={`p-2 rounded-full transition-colors ${activeVideoSource === 'camera' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-amber-400'}`} title="Camera">
            <Camera size={20} />
          </button>

          <button onClick={toggleScreenShare} className={`p-2 rounded-full transition-colors ${activeVideoSource === 'screen' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-amber-400'}`} title="Screen Share">
            <MonitorUp size={20} />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={activeVideoSource ? "Ask about what I'm seeing..." : "Type a message..."}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 ml-1 focus:outline-none focus:border-amber-500 focus:bg-white/10 text-white transition-all placeholder:text-gray-500"
          />
          
          <button onClick={handleSend} disabled={isLoading || (!input.trim() && !activeVideoSource && !selectedImage)} className="p-2.5 ml-1 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl disabled:opacity-50 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all">
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}