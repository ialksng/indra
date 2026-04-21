import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, Camera, Database, HardDrive, ChevronDown, MonitorUp, Zap, MousePointerClick, Mic, Volume2, VolumeX, Download, Cloud, Search } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useMedia } from '../hooks/useMedia';

export default function ChatCore({ projectId = 'default', _isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false); // Tracks live browser automation
  
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
  const visionIntervalRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for pre-fill text from the host website
  useEffect(() => {
    const handleWindowMsg = (e) => {
      if (e.data && e.data.type === 'PREFILL_MSG') {
        setInput(e.data.payload);
        setShowTextInput(true); 
      }
    };
    window.addEventListener('message', handleWindowMsg);
    return () => window.removeEventListener('message', handleWindowMsg);
  }, []);

  // ⚡ CHROME EXTENSION HELPERS
  const getActiveTabContext = async () => {
    if (!window.chrome || !chrome.tabs) return null;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return null;
      return await chrome.tabs.sendMessage(tab.id, { type: 'GET_LIVE_CONTEXT' });
    } catch (e) {
      console.warn("Chrome Extension context not available.");
      return null;
    }
  };

  const executeWebAction = async (actionData) => {
    if (!window.chrome || !chrome.tabs) return false;
    try {
      setIsExecuting(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_ACTION', payload: actionData });
        } catch (msgErr) {
          // Silently handle the "channel closed" error when a page navigates
          console.log("Action executed, but channel closed.");
        }
      }
      return true;
    } catch (e) {
      console.error("Failed to execute action", e);
      return false;
    } finally {
      setIsExecuting(false);
    }
  };

  // ⚡ LIVE VISION LOOP
  useEffect(() => {
    let isProcessing = false;

    if (activeVideoSource === 'camera' || activeVideoSource === 'screen') {
      setVoiceEnabled(true); 

      const backgroundPrompt = activeVideoSource === 'camera'
        ? "Identify the main object in this image. Reply with ONLY 1 to 4 words. No markdown, no extra text."
        : "Briefly state what is open on this screen. Reply with ONLY 1 to 6 words. No markdown, no extra text.";

      visionIntervalRef.current = setInterval(async () => {
        if (isProcessing) return;
        
        const frame = captureVideoFrame();
        if (!frame) return;

        isProcessing = true;
        try {
          let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
          if (baseUrl.endsWith('/api/v1/indra')) {
            baseUrl = baseUrl.replace('/api/v1/indra', '');
          }

          const response = await fetch(`${baseUrl}/api/v1/indra/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: backgroundPrompt, 
              image: frame, 
              modelType: 'flash', 
              allowAutomation: false,
              history: [], 
              projectId 
            })
          });

          if (response.ok) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let finalAnswer = "";
            let buffer = "";

            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true }); 
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ') && !trimmed.includes('[DONE]')) {
                  try {
                    const data = JSON.parse(trimmed.substring(6));
                    if (data.text) finalAnswer += data.text;
                  } catch(e) {}
                }
              }
            }
            
            if (finalAnswer.trim()) {
              const prefix = activeVideoSource === 'camera' ? "I see " : "You are looking at ";
              speakText(`${prefix} ${finalAnswer.trim().replace(/[*#.`]/g, '')}`);
            }
          }
        } catch (e) {
          console.error("Live Vision Fetch Error:", e);
        } finally {
          isProcessing = false;
        }
      }, 5000); 
    }

    return () => {
      if (visionIntervalRef.current) clearInterval(visionIntervalRef.current);
    };
  }, [activeVideoSource, captureVideoFrame, projectId, setVoiceEnabled, speakText]);

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
    setShowTextInput(true); 
    setVoiceEnabled(true); 

    toggleRecording(
      (finalText) => {
        setInput(finalText);
        handleSend(null, finalText); 
      },
      (liveText) => setInput(liveText)
    );
  };

  const handleSend = async (e, overrideText = null) => {
    e?.preventDefault();
    
    const textToSend = overrideText !== null ? overrideText : input;
    if (isLoading || (!textToSend.trim() && !selectedImage && !activeVideoSource)) return;

    unlockAudio(); 

    let imageToSend = selectedImage;
    if (activeVideoSource) imageToSend = captureVideoFrame();

    // ⚡ AUTOMATION SYNC: Grab DOM map before sending to AI
    let livePageContext = null;
    if (automationEnabled) {
       livePageContext = await getActiveTabContext();
    }

    const userMsg = { role: 'user', text: textToSend, image: imageToSend };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    setInput('');
    setSelectedImage(null);
    setShowTextInput(false);
    if (activeVideoSource) stopVideo();

    try {
      setMessages(prev => [...prev, { role: 'ai', text: '', isStreaming: true }]);

      let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      if (baseUrl.endsWith('/api/v1/indra')) {
        baseUrl = baseUrl.replace('/api/v1/indra', '');
      }

      const response = await fetch(`${baseUrl}/api/v1/indra/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: textToSend, 
          image: imageToSend, 
          modelType: selectedModel, 
          allowAutomation: automationEnabled,
          pageContext: livePageContext, 
          history: messages, 
          projectId 
        })
      });

      if (!response.ok) throw new Error(`Server Error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";
      let buffer = ""; 

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true }); 
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const payload = trimmedLine.substring(6);
            if (payload === '[DONE]') continue;

            try {
              const data = JSON.parse(payload);
              
              // ⚡ NATIVE IMAGE HANDLING: Catches tool-call images from the backend
              if (data.imageUrl) {
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]) {
                    updated[lastIndex].generatedImages = updated[lastIndex].generatedImages || [];
                    updated[lastIndex].generatedImages.push(data.imageUrl);
                  }
                  return updated;
                });
              }

              if (data.text) {
                streamedText += data.text;
                
                // ⚡ ACTION INTERCEPTOR: Execute code mid-stream
                if (automationEnabled && streamedText.includes('<<<EXECUTE:')) {
                  const match = streamedText.match(/<<<EXECUTE:(.*?)>>>/);
                  if (match && match[1]) {
                     try {
                        const actionPayload = JSON.parse(match[1]);
                        await executeWebAction(actionPayload);
                        // Clean output for the user
                        streamedText = streamedText.replace(match[0], '\n⚡ *Action Executed*');
                     } catch(err) { console.error("Action parse failed", err); }
                  }
                }

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

  // ⚡ UPDATED: Forces direct download using CORS fetch to prevent redirects
  const downloadToDevice = async (url) => {
    try {
      const response = await fetch(url, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) throw new Error("Network response was not ok");
      
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
      console.error("Direct download blocked. Attempting fallback...", e);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = `indra_gen_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShowSaveDialog(null);
    }
  };

  const saveToSmartSphere = (url) => {
    setVaultData(prev => prev + (prev ? '\n\n' : '') + `[Saved Reference Image]: ${url}`);
    setIsVaultOpen(true);
    setShowSaveDialog(null);
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
    <div id="indra-chat-core-container" className="flex flex-col h-full w-full relative z-10 bg-[#0b0f1a] text-slate-200">
      
      {/* MODALS */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl w-full max-w-sm">
            <div className="flex justify-between items-center">
              <h3 className="text-amber-400 font-bold tracking-wide">SAVE GENERATED IMAGE</h3>
              <button onClick={() => setShowSaveDialog(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <img src={showSaveDialog} crossOrigin="anonymous" className="rounded-xl max-h-48 object-contain bg-black/50 border border-white/5" alt="Preview" />
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

      {isVaultOpen && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl w-full max-w-md">
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
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(245, 158, 11, 0.5) transparent' }}
      >
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
              <div className={msg.role === 'user' ? 'p-4 rounded-2xl shadow-xl bg-gradient-to-br from-amber-500 to-orange-500 text-black font-semibold' : 'p-4 rounded-2xl shadow-xl bg-white/5 border border-white/10 text-slate-200'}>
                {msg.image && <img src={msg.image} className="rounded-xl mb-3 max-h-48 object-cover border border-white/10 shadow-lg" alt="upload"/>}
                <div className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
                   
                   {/* ⚡ UPDATED: Native Image & Text Renderer */}
                   {msg.role === 'ai' && !msg.text && (!msg.generatedImages || msg.generatedImages.length === 0) && msg.isStreaming ? (
                     <div className="flex gap-1.5 items-center h-6 px-1">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                     </div>
                   ) : (
                     <>
                        {msg.text && <span>{msg.text}</span>}
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-4 bg-amber-500 ml-1 rounded-sm align-middle animate-pulse shadow-[0_0_5px_rgba(245,158,11,0.5)]"></span>
                        )}
                        
                        {/* Native Tool Images Map */}
                        {msg.generatedImages && msg.generatedImages.map((imgUrl, idx) => (
                          <div key={`gen-img-${idx}`} className="relative group mt-4 mb-2 block">
                            <img 
                              src={imgUrl} 
                              crossOrigin="anonymous" 
                              alt="AI Generated" 
                              className="rounded-xl max-h-64 w-auto object-cover border border-white/10 shadow-lg" 
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-sm">
                               <button onClick={() => setShowSaveDialog(imgUrl)} className="bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transform hover:scale-105 transition-all shadow-xl">
                                 <Download size={16} /> Save Options
                               </button>
                            </div>
                          </div>
                        ))}
                     </>
                   )}

                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && !messages[messages.length-1]?.isStreaming && <Loader2 className="animate-spin text-amber-500 mx-auto" size={24} />}
        {isExecuting && <div className="flex justify-center text-[10px] text-amber-500 font-bold animate-pulse mt-2">EXECUTING BROWSER ACTION...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* ⚡ LIVE VIDEO PREVIEW */}
      <div className={`p-2 bg-black/40 border-t border-white/10 flex justify-center backdrop-blur-md ${activeVideoSource ? 'flex' : 'hidden'}`}>
        <div className="relative rounded-xl overflow-hidden border-2 border-amber-500/30 shadow-2xl">
          {(activeVideoSource === 'camera' || activeVideoSource === 'screen') && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md border border-amber-500/30">
              <span className="w-1.5 h-1.5 bg-red-500 animate-pulse rounded-full"></span>
              <span className="text-[9px] text-amber-500 font-bold tracking-widest uppercase">Live Vision</span>
            </div>
          )}
          <video ref={videoRef} className={`h-32 bg-black object-contain ${activeVideoSource === 'camera' ? 'scale-x-[-1]' : ''}`} muted playsInline />
          <button onClick={stopVideo} className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-red-500 z-10"><X size={12} /></button>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* --- CENTRAL THUNDERBOLT ACTION HUB --- */}
      <div className="p-6 bg-black/20 border-t border-white/10 flex flex-col items-center justify-center relative min-h-[100px]">
        
        {selectedImage && (
          <div className="absolute -top-16 left-6 bg-[#0f172a] p-1.5 rounded-xl border border-white/10 shadow-2xl z-10 transition-all duration-300">
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="h-12 w-12 object-cover rounded-lg" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleDeviceUpload} className="hidden" />

        {isInputModeActive ? (
          <div className="flex items-center gap-3 w-full max-w-4xl transition-all duration-300">
            <button onClick={() => { setShowTextInput(false); stopVideo(); if(isRecording) toggleRecording(); setInput(''); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-500">
              <X size={20} />
            </button>

            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isRecording ? "Listening..." : "Type your command..."}
                className={`w-full bg-white/5 border ${isRecording ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-white/10'} rounded-2xl px-6 py-4 focus:outline-none focus:border-amber-500 focus:bg-white/10 text-white transition-all shadow-2xl placeholder:text-gray-600`}
                autoFocus
              />
              {isRecording && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span className="w-1 h-3 bg-amber-500 animate-pulse rounded-full" style={{animationDuration: '0.5s'}}></span>
                  <span className="w-1 h-5 bg-amber-500 animate-pulse rounded-full" style={{animationDuration: '0.7s'}}></span>
                  <span className="w-1 h-3 bg-amber-500 animate-pulse rounded-full" style={{animationDuration: '0.6s'}}></span>
                </div>
              )}
            </div>
            
            <button onClick={(e) => handleSend(e)} disabled={isLoading || (!input.trim() && !selectedImage && !activeVideoSource)} className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl disabled:opacity-20 text-black shadow-lg shadow-amber-500/40 transition-all">
              <Send size={22} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center items-center w-full relative">
            {showActionMenu && (
              <div className="absolute bottom-24 flex flex-wrap justify-center gap-2 bg-[#0f172a]/95 backdrop-blur-2xl p-4 rounded-[40px] border border-white/10 shadow-2xl w-[95%] max-w-[360px] duration-200">
                <button onClick={() => { setShowTextInput(true); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[30px] transition-all group">
                  <Search size={24} className="group-hover:text-amber-400 group-hover:scale-110 transition-all"/>
                  <span className="text-[9px] font-black tracking-widest text-gray-500">SEARCH</span>
                </button>
                <button onClick={() => { handleMicClick(); setShowActionMenu(false); }} className="flex flex-col items-center justify-center gap-2 p-4 w-[100px] hover:bg-white/5 rounded-[30px] transition-all group">
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
              className={`w-20 h-20 rounded-full flex items-center justify-center text-black shadow-2xl transition-all duration-500 z-20 ${showActionMenu ? 'bg-white/10 rotate-45 text-white shadow-none' : 'bg-gradient-to-br from-amber-500 to-orange-500 hover:scale-110 shadow-lg'}`}
            >
              {showActionMenu ? <X size={32} /> : <Zap size={32} fill="currentColor" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}