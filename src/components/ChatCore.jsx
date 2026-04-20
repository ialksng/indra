import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ImagePlus, X, Camera, Database, HardDrive, ChevronDown, MonitorUp, MousePointerClick, ShieldAlert } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function ChatCore({ projectId = 'default', isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState('gemini-flash');
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
    { id: 'gemini-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-pro', name: 'Gemini 1.5 Pro' },
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
        history: updatedMessages
      });

      const aiMessage = { role: 'ai', text: res.data.reply };
      if (res.data.actionInstruction) {
        aiMessage.pendingAction = { ...res.data.actionInstruction, status: 'waiting' };
      }
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to Indra.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="indra-chat-core-container" className="flex flex-col h-full w-full text-white relative bg-transparent">
      
      {/* SMARTSPHERE MODAL */}
      {isVaultOpen && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl w-full max-w-md p-6 flex flex-col gap-4 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold flex items-center gap-2">
                <Database size={18}/> SmartSphere Vault
              </h3>
              <button onClick={() => setIsVaultOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            <p className="text-sm text-slate-300">
              Paste custom data, website content, or business rules here. When the <b>SmartSphere</b> model is selected, Indra will use this knowledge to answer.
            </p>
            <textarea
              value={vaultData}
              onChange={(e) => setVaultData(e.target.value)}
              className="w-full h-48 bg-black/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
              placeholder="e.g., 'Our return policy is 30 days. Contact support@store.com...'"
            />
            <button 
              onClick={() => setIsVaultOpen(false)} 
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-lg font-bold text-sm transition-all"
            >
              Save to Vault
            </button>
          </div>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <div className="p-3 bg-slate-900/50 backdrop-blur-sm border-b border-white/5 flex flex-wrap gap-3 justify-between items-center z-20">
        <div className="relative group flex-1 min-w-[150px] max-w-[200px]">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full appearance-none bg-slate-800 text-slate-200 px-3 py-2 pr-10 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer text-sm font-medium truncate transition-colors hover:border-slate-600"
          >
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-2.5 pointer-events-none text-slate-400" />
        </div>

        {selectedModel.startsWith('groq') && (selectedImage || activeVideoSource) && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
            <ShieldAlert size={12} /> Llama 3 is text-only
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
          <input 
            type="checkbox" 
            checked={automationEnabled}
            onChange={(e) => setAutomationEnabled(e.target.checked)}
            className="hidden" 
          />
          <MousePointerClick size={16} className={automationEnabled ? "text-amber-400" : "text-slate-400"} />
          <span className={`text-sm font-medium select-none hidden sm:block ${automationEnabled ? "text-slate-200" : "text-slate-400"}`}>
            Web Agent
          </span>
          <div className={`w-8 h-4 ml-1 rounded-full relative transition-colors ${automationEnabled ? 'bg-amber-500' : 'bg-slate-950 border border-slate-700'}`}>
            <div className={`absolute top-[1px] left-[1px] bg-white w-3 h-3 rounded-full transition-transform ${automationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </label>
      </div>

      {/* CHAT HISTORY & EMPTY STATE */}
      <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-3 space-y-4' : 'p-6 space-y-6'}`}>
        
        {/* EMPTY STATE */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="relative mb-6">
              <img 
                src="/favicon.svg" 
                alt="Indra" 
                className="w-20 h-20 relative z-10 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div className="absolute inset-0 blur-2xl opacity-40 rounded-full scale-150 bg-amber-500"></div>
            </div>
            <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
              I can help you automate this page or answer questions securely from your vault.
            </p>
            {isCompact && (
              <button 
                onClick={() => window.open('https://indra.ialksng.me', '_blank', 'noopener,noreferrer')}
                className="text-xs font-bold text-amber-500 hover:text-amber-400 uppercase tracking-widest transition-colors bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 hover:bg-amber-500/20"
              >
                Launch Full Workspace
              </button>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
              
              {/* Message Avatar */}
              {msg.role !== 'user' && !isCompact && (
                <div className="w-8 h-8 mt-1 shrink-0 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                  <img 
                    src="/favicon.svg" 
                    alt="Indra" 
                    className="w-5 h-5 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" 
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
              
              <div className={`p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-amber-500 text-slate-950 font-medium shadow-[0_4px_15px_rgba(245,158,11,0.2)]' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}>
                {msg.image && <img src={msg.image} className="rounded-lg mb-3 max-h-48 object-cover border border-slate-700/50" alt="attachment"/>}
                <p className={isCompact ? 'text-sm whitespace-pre-wrap' : 'text-base whitespace-pre-wrap leading-relaxed'}>{msg.text}</p>
              </div>
            </div>

            {msg.pendingAction && (
              <div className={`ml-11 mt-1 p-4 bg-slate-800/80 border border-amber-500/30 rounded-xl max-w-[85%] flex flex-col gap-3 shadow-lg backdrop-blur-sm ${isCompact ? 'ml-0 max-w-full' : ''}`}>
                <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
                  <img src="/favicon.svg" className="w-4 h-4" alt="Icon"/> Indra requests permission to:
                </div>
                <div className="bg-black/50 p-2.5 rounded-lg text-xs font-mono text-slate-300 border border-slate-700">
                  <span className="text-amber-500 font-bold">{msg.pendingAction.action.toUpperCase()}</span> on element <span className="text-blue-400">"{msg.pendingAction.selector}"</span>
                </div>
                
                {msg.pendingAction.status === 'waiting' && (
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => approveAction(msg.pendingAction, i)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold py-2.5 rounded-lg transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => denyAction(i)}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
                    >
                      Deny
                    </button>
                  </div>
                )}
                {msg.pendingAction.status === 'approved' && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">✓ Action Executed</span>}
                {msg.pendingAction.status === 'denied' && <span className="text-xs text-red-400 font-bold flex items-center gap-1">✗ Action Denied</span>}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
           <div className="flex items-center gap-2 m-4 text-amber-500">
             <Loader2 className="animate-spin" size={20} />
             <span className="text-sm font-medium animate-pulse">Indra is thinking...</span>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* VIDEO PREVIEW */}
      <div className={`p-3 bg-slate-900/80 backdrop-blur-md border-t border-white/5 flex justify-center ${activeVideoSource ? 'flex' : 'hidden'}`}>
        <div className="relative rounded-xl overflow-hidden border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] max-w-full">
          <video 
            ref={videoRef} 
            className={`h-32 bg-black object-contain ${activeVideoSource === 'camera' ? 'transform scale-x-[-1]' : ''}`} 
            muted 
            playsInline 
          />
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-lg">
            {activeVideoSource === 'screen' ? 'SHARING SCREEN' : 'LIVE'}
          </span>
          <button 
            onClick={stopVideo}
            className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors backdrop-blur-sm"
          >
            <X size={14} />
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* INPUT AREA */}
      <div className="p-3 bg-slate-900/80 backdrop-blur-md border-t border-white/5 flex flex-col gap-2 relative">
        
        {selectedImage && (
          <div className="absolute -top-24 left-4 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-xl z-10">
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-600" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {showUploadMenu && (
          <div className="absolute bottom-[70px] left-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-50 min-w-[200px]">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 rounded-lg text-sm w-full text-slate-200 transition-colors">
              <HardDrive size={16} className="text-blue-400" /> Device Upload
            </button>
            <button onClick={handleSmartSphereUpload} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 rounded-lg text-sm w-full text-slate-200 transition-colors">
              <Database size={16} className="text-amber-400" /> SmartSphere Vault
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleDeviceUpload} className="hidden" />
          
          <div className="flex bg-slate-800 rounded-xl border border-slate-700 p-1 h-11 items-center">
            <button onClick={() => setShowUploadMenu(!showUploadMenu)} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 rounded-lg transition-colors" title="Attach">
              <ImagePlus size={18} />
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
            <button onClick={toggleCamera} className={`p-2 rounded-lg transition-colors ${activeVideoSource === 'camera' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700/50'}`} title="Camera">
              <Camera size={18} />
            </button>
            <button onClick={toggleScreenShare} className={`p-2 rounded-lg transition-colors ${activeVideoSource === 'screen' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-700/50'}`} title="Screen Share">
              <MonitorUp size={18} />
            </button>
          </div>

          <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl flex items-center pr-1.5 overflow-hidden focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 transition-all">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={activeVideoSource ? "Ask about what I'm seeing..." : "Type a message..."}
              className="flex-1 bg-transparent border-none px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0"
            />
            <button 
              onClick={handleSend} 
              disabled={isLoading || (!input.trim() && !activeVideoSource && !selectedImage)} 
              className="p-2 bg-amber-500 hover:bg-amber-400 rounded-lg disabled:opacity-30 disabled:hover:bg-amber-500 text-slate-950 transition-colors my-1 shrink-0"
            >
              <Send size={16} className={isLoading || (!input.trim() && !activeVideoSource && !selectedImage) ? 'opacity-50' : ''} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}