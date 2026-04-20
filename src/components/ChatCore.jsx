import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ImagePlus, X, Camera, Database, HardDrive, ChevronDown, MonitorUp, Bot, MousePointerClick } from 'lucide-react';
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

  const stopVideo = () => { /* ... existing ... */
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setActiveVideoSource(null);
  };

  const toggleCamera = async () => { /* ... existing ... */
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
      } catch (err) {}
    }
  };

  const toggleScreenShare = async () => { /* ... existing ... */
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
      } catch (err) {}
    }
  };

  const captureVideoFrame = () => { /* ... existing ... */
    if (!activeVideoSource || !videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleDeviceUpload = (e) => { /* ... existing ... */
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
    const targetOrigin = document.referrer ? new URL(document.referrer).origin : '*';
    window.parent.postMessage({ type: 'INDRA_ACTION', payload: actionDetails }, targetOrigin);
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

  // --- NEW: DOM Map Fetcher ---
  const fetchDomMap = () => {
    return new Promise((resolve) => {
      if (!automationEnabled) return resolve([]);

      if (window.self !== window.top) {
        // Embedded Widget Mode: Ask loader.js for the map
        const handleMessage = (event) => {
          if (event.data?.type === 'DOM_MAP_RESPONSE') {
            window.removeEventListener('message', handleMessage);
            resolve(event.data.payload);
          }
        };
        window.addEventListener('message', handleMessage);
        window.parent.postMessage({ type: 'REQUEST_DOM_MAP' }, '*');
        
        setTimeout(() => { // Fallback timeout
          window.removeEventListener('message', handleMessage);
          resolve([]);
        }, 1000);
      } else {
        // Standalone Website Mode: Scrape directly
        const elements = document.querySelectorAll('a, button, input, select, textarea');
        const map = [];
        let idCounter = 0;

        elements.forEach((el) => {
          if (el.closest('#indra-chat-core-container')) return; // Ignore chat UI
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
      // Pause to collect the map of the current webpage
      const currentDomMap = await fetchDomMap();

      const res = await apiClient.post('/chat', {
        message: textToSend,
        image: imageToSend,
        modelType: selectedModel,
        allowAutomation: automationEnabled,
        domMap: currentDomMap, // --- SEND MAP TO BACKEND ---
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
    // ADDED id="indra-chat-core-container" here
    <div id="indra-chat-core-container" className="flex flex-col h-full w-full bg-slate-900 text-white relative">
      
      {/* --- SMARTSPHERE MODAL --- */}
      {isVaultOpen && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                <Database size={18}/> SmartSphere Vault
              </h3>
              <button onClick={() => setIsVaultOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <p className="text-sm text-gray-300">
              Paste your custom data, website content, or business rules here. When the <b>SmartSphere</b> model is selected, Indra will use this knowledge to answer.
            </p>
            <textarea
              value={vaultData}
              onChange={(e) => setVaultData(e.target.value)}
              className="w-full h-48 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
              placeholder="e.g., 'Our return policy is 30 days. Shipping takes 2-4 days. Contact support@store.com...'"
            />
            <button 
              onClick={() => setIsVaultOpen(false)} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-bold text-sm transition-colors"
            >
              Save to Vault
            </button>
          </div>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex flex-wrap gap-3 justify-between items-center z-20">
        <div className="relative group flex-1 min-w-[150px]">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full appearance-none bg-slate-700 text-white px-3 py-2 pr-10 rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500 cursor-pointer text-sm font-medium"
          >
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-2.5 pointer-events-none text-gray-400" />
        </div>

        {/* AUTOMATION TOGGLE */}
        <label className="flex items-center gap-2 cursor-pointer bg-slate-700 px-3 py-2 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors">
          <input 
            type="checkbox" 
            checked={automationEnabled}
            onChange={(e) => setAutomationEnabled(e.target.checked)}
            className="hidden" 
          />
          <MousePointerClick size={16} className={automationEnabled ? "text-purple-400" : "text-gray-400"} />
          <span className={`text-sm font-medium select-none ${automationEnabled ? "text-white" : "text-gray-400"}`}>
            Web Agent
          </span>
          <div className={`w-8 h-4 ml-1 rounded-full relative transition-colors ${automationEnabled ? 'bg-purple-500' : 'bg-slate-900'}`}>
            <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${automationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </label>
      </div>

      {/* CHAT HISTORY */}
      <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-3 space-y-4' : 'p-6 space-y-6'}`}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            
            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-[90%]`}>
              {msg.role !== 'user' && !isCompact && <Bot className="text-purple-400 mt-1 shrink-0" size={20} />}
              <div className={`p-3 rounded-2xl ${msg.role === 'user' ? 'bg-purple-600' : 'bg-slate-800 border border-slate-700'}`}>
                {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-h-48 object-cover" alt="attachment"/>}
                <p className={isCompact ? 'text-sm whitespace-pre-wrap' : 'text-base whitespace-pre-wrap'}>{msg.text}</p>
              </div>
            </div>

            {msg.pendingAction && (
              <div className="ml-8 mt-1 p-3 bg-slate-800 border border-blue-500/50 rounded-xl max-w-[85%] flex flex-col gap-2">
                <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold">
                  <Bot size={16} /> Indra requests permission to:
                </div>
                <div className="bg-slate-900 p-2 rounded text-xs font-mono text-gray-300">
                  <span className="text-purple-400">{msg.pendingAction.action.toUpperCase()}</span> on element <span className="text-emerald-400">"{msg.pendingAction.selector}"</span>
                </div>
                
                {msg.pendingAction.status === 'waiting' && (
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => approveAction(msg.pendingAction, i)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded transition-colors"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => denyAction(i)}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded transition-colors"
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
        {isLoading && <Loader2 className="animate-spin text-purple-400 m-4" size={20} />}
        <div ref={messagesEndRef} />
      </div>

      {/* VIDEO PREVIEW */}
      <div className={`p-2 bg-slate-800 border-t border-slate-700 flex justify-center ${activeVideoSource ? 'flex' : 'hidden'}`}>
        <div className="relative rounded-lg overflow-hidden border-2 border-purple-500 max-w-full">
          <video 
            ref={videoRef} 
            className={`h-32 bg-black object-contain ${activeVideoSource === 'camera' ? 'transform scale-x-[-1]' : ''}`} 
            muted 
            playsInline 
          />
          <span className="absolute top-1 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
            {activeVideoSource === 'screen' ? 'SHARING SCREEN' : 'LIVE'}
          </span>
          <button 
            onClick={stopVideo}
            className="absolute top-1 right-2 bg-slate-900/80 p-1 rounded-full text-white hover:bg-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* INPUT AREA */}
      <div className="p-3 bg-slate-800/50 border-t border-slate-700 flex flex-col gap-2 relative">
        
        {selectedImage && (
          <div className="absolute -top-20 left-2 bg-slate-700 p-2 rounded-lg border border-slate-600 shadow-xl z-10">
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded border border-slate-500" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {showUploadMenu && (
          <div className="absolute bottom-16 left-2 bg-slate-700 border border-slate-600 rounded-lg shadow-xl p-2 flex flex-col gap-1 z-50">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-600 rounded-md text-sm w-full">
              <HardDrive size={16} className="text-blue-400" /> Device Upload
            </button>
            <button onClick={handleSmartSphereUpload} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-600 rounded-md text-sm w-full">
              <Database size={16} className="text-emerald-400" /> SmartSphere Vault
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleDeviceUpload} className="hidden" />
          
          <button onClick={() => setShowUploadMenu(!showUploadMenu)} className="p-2 text-gray-400 hover:text-white">
            <ImagePlus size={20} />
          </button>

          <button onClick={toggleCamera} className={`p-2 rounded-full ${activeVideoSource === 'camera' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>
            <Camera size={20} />
          </button>

          <button onClick={toggleScreenShare} className={`p-2 rounded-full ${activeVideoSource === 'screen' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>
            <MonitorUp size={20} />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={activeVideoSource ? "Ask about what I'm seeing..." : "Type a message..."}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 ml-1 focus:outline-none focus:border-purple-500"
          />
          
          <button onClick={handleSend} disabled={isLoading || (!input.trim() && !activeVideoSource && !selectedImage)} className="p-2 ml-1 bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50 text-white">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}