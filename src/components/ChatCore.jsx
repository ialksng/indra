import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, Camera, Database, HardDrive, ChevronDown, MonitorUp, Zap, MousePointerClick, Mic, Volume2, VolumeX, Download, Cloud, Search } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useMedia } from '../hooks/useMedia';
import './ChatCore.css'; // Import the new Vanilla CSS file

// UTILITY: Cleans URLs so HTML pages are converted to direct raw image links
const getCleanImageUrl = (rawUrl) => {
  try {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('data:')) return rawUrl; 
    
    let url = new URL(rawUrl);
    if (url.hostname === 'pollinations.ai' && url.pathname.startsWith('/p/')) {
      const promptPath = url.pathname.replace('/p/', '/prompt/');
      return `https://image.pollinations.ai${promptPath}${url.search}`;
    }
    return rawUrl;
  } catch (e) {
    return rawUrl;
  }
};

export default function ChatCore({ projectId = 'default', _isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false); 
  
  // Custom Hooks
  const { isRecording, voiceEnabled, setVoiceEnabled, toggleRecording, speakText, unlockAudio } = useAudio();
  const { activeVideoSource, videoRef, canvasRef, stopVideo, toggleCamera, toggleScreenShare, captureVideoFrame } = useMedia();

  // UI States
  const [selectedModel, setSelectedModel] = useState('smart'); // 3-way toggle state: 'lite', 'smart', 'ultra'
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

    const userMsg = { role: 'user', text: textToSend, image: imageToSend };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    setInput('');
    setSelectedImage(null);
    setShowTextInput(false);
    if (activeVideoSource) stopVideo();

    // ⚡ TODO: PYTHON BACKEND INTEGRATION HERE
    // Send `textToSend`, `imageToSend`, `selectedModel` (lite/smart/ultra) to your Python API.
    // Replace the setTimeout below with your actual fetch logic.
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: `Echoing from Python backend! Model used: ${selectedModel}`, 
        isStreaming: false 
      }]);
      setIsLoading(false);
    }, 1000);
  };

  const downloadToDevice = async (url) => {
    try {
      const targetUrl = getCleanImageUrl(url);
      const response = await fetch(targetUrl, { method: 'GET', mode: 'cors', cache: 'no-cache' });
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
      const targetUrl = getCleanImageUrl(url);
      const a = document.createElement('a');
      a.href = targetUrl;
      a.target = '_blank';
      a.download = `indra_gen_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShowSaveDialog(null);
    }
  };

  const saveToSmartSphere = (url) => {
    const cleanUrl = getCleanImageUrl(url);
    setVaultData(prev => prev + (prev ? '\n\n' : '') + `[Saved Reference Image]: ${cleanUrl}`);
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
    <div id="indra-chat-core-container" className="indra-container">
      
      {/* MODALS */}
      {showSaveDialog && (
        <div className="indra-modal-overlay">
          <div className="indra-modal-content indra-modal-sm">
            <div className="indra-modal-header">
              <h3 className="indra-modal-title">SAVE GENERATED IMAGE</h3>
              <button onClick={() => setShowSaveDialog(null)} className="indra-icon-btn"><X size={20}/></button>
            </div>
            <img src={getCleanImageUrl(showSaveDialog)} crossOrigin="anonymous" className="indra-preview-img" alt="Preview" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={() => downloadToDevice(showSaveDialog)} className="indra-btn-primary">
                <Download size={18} /> Download to Device
              </button>
              <button onClick={() => saveToSmartSphere(showSaveDialog)} className="indra-btn-secondary">
                <Cloud size={18} /> Save to SmartSphere
              </button>
            </div>
          </div>
        </div>
      )}

      {isVaultOpen && (
        <div className="indra-modal-overlay">
          <div className="indra-modal-content indra-modal-md">
            <div className="indra-modal-header">
              <h3 className="indra-modal-title"><Database size={16}/> SMARTSPHERE VAULT</h3>
              <button onClick={() => setIsVaultOpen(false)} className="indra-icon-btn"><X size={20}/></button>
            </div>
            <textarea
              value={vaultData}
              onChange={(e) => setVaultData(e.target.value)}
              className="indra-textarea"
              placeholder="Paste reference data here..."
            />
            <button onClick={() => setIsVaultOpen(false)} className="indra-btn-primary" style={{ letterSpacing: '0.1em' }}>SAVE TO VAULT</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="indra-header">
        
        {/* 3-Way Toggle Replacing Select */}
        <div className="indra-model-toggle">
          {['lite', 'smart', 'ultra'].map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedModel(mode)}
              className={`indra-toggle-btn ${selectedModel === mode ? 'active' : ''}`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="indra-header-actions">
          <button 
            onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) window.speechSynthesis?.cancel(); }}
            className={`indra-voice-btn ${voiceEnabled ? 'active' : ''}`}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <label className="indra-agent-toggle">
            <input type="checkbox" checked={automationEnabled} onChange={(e) => setAutomationEnabled(e.target.checked)} style={{ display: 'none' }} />
            <MousePointerClick size={16} color={automationEnabled ? '#fbbf24' : '#6b7280'} />
            <span className="indra-agent-text text-[10px] font-bold hidden sm:block">AGENT</span>
            <div className={`indra-switch ${automationEnabled ? 'active' : ''}`}>
              <div className="indra-switch-thumb" />
            </div>
          </label>
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div className="indra-chat-area">
        {messages.length === 0 && (
          <div className="indra-empty-state">
            <Zap className="indra-empty-icon" size={48} fill="currentColor" />
            <h3 className="indra-empty-title">INDRA CORE</h3>
            <p className="indra-empty-subtitle">AI Assistant ready for search, vision, and web automation.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`indra-msg-wrapper ${msg.role}`}>
            <div className="indra-msg-row">
              <div className={`indra-msg-bubble ${msg.role}`}>
                {msg.image && <img src={msg.image} className="indra-msg-img" alt="upload"/>}
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                   {msg.role === 'ai' && !msg.text && (!msg.generatedImages || msg.generatedImages.length === 0) && msg.isStreaming ? (
                     <div className="indra-typing-dots">
                        <div className="indra-dot animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="indra-dot animate-pulse" style={{ animationDelay: '200ms' }}></div>
                        <div className="indra-dot animate-pulse" style={{ animationDelay: '400ms' }}></div>
                     </div>
                   ) : (
                     <>
                        {msg.text && (
                          <div style={{ display: 'inline' }}>
                            {msg.text.split(/(!\[.*?\]\(.*?\))/g).map((part, idx) => {
                              const match = part.match(/!\[(.*?)\]\((.*?)\)/);
                              if (match) {
                                const altText = match[1];
                                const rawUrl = match[2];
                                const cleanUrl = getCleanImageUrl(rawUrl);
                                return (
                                  <div key={`md-img-${idx}`} className="indra-media-box">
                                    <img src={cleanUrl} crossOrigin="anonymous" alt={altText || "AI Generated"} className="indra-media-img" />
                                    <div className="indra-media-overlay">
                                       <button onClick={() => setShowSaveDialog(cleanUrl)} className="indra-save-btn">
                                         <Download size={16} /> Save Options
                                       </button>
                                    </div>
                                  </div>
                                );
                              }
                              return <span key={`text-${idx}`}>{part}</span>;
                            })}
                          </div>
                        )}
                        
                        {msg.generatedImages && msg.generatedImages.map((imgUrl, idx) => {
                          const cleanUrl = getCleanImageUrl(imgUrl);
                          return (
                            <div key={`gen-img-${idx}`} className="indra-media-box">
                              <img src={cleanUrl} crossOrigin="anonymous" alt="AI Generated" className="indra-media-img" />
                              <div className="indra-media-overlay">
                                 <button onClick={() => setShowSaveDialog(cleanUrl)} className="indra-save-btn">
                                   <Download size={16} /> Save Options
                                 </button>
                              </div>
                            </div>
                          );
                        })}
                     </>
                   )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && !messages[messages.length-1]?.isStreaming && <Loader2 className="animate-spin indra-empty-icon" size={24} style={{ margin: '0 auto' }} />}
        {isExecuting && <div style={{ display: 'flex', justifyContent: 'center', fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', marginTop: '0.5rem' }} className="animate-pulse">EXECUTING BROWSER ACTION...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* ⚡ LIVE VIDEO PREVIEW */}
      <div className="indra-video-panel" style={{ display: activeVideoSource ? 'flex' : 'none' }}>
        <div className="indra-video-wrapper">
          {(activeVideoSource === 'camera' || activeVideoSource === 'screen') && (
            <div className="indra-video-tag">
              <span className="indra-red-dot animate-pulse"></span>
              <span className="indra-tag-text">Live Vision</span>
            </div>
          )}
          <video ref={videoRef} className={`indra-video-element ${activeVideoSource === 'camera' ? 'mirror' : ''}`} muted playsInline />
          <button onClick={stopVideo} className="indra-close-video"><X size={12} /></button>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* --- CENTRAL THUNDERBOLT ACTION HUB --- */}
      <div className="indra-action-hub">
        
        {selectedImage && (
          <div className="indra-selected-img-preview">
            <div style={{ position: 'relative' }}>
              <img src={selectedImage} alt="Preview" />
              <button onClick={() => setSelectedImage(null)} className="indra-selected-img-close"><X size={12} /></button>
            </div>
          </div>
        )}

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleDeviceUpload} style={{ display: 'none' }} />

        {isInputModeActive ? (
          <div className="indra-input-form">
            <button onClick={() => { setShowTextInput(false); stopVideo(); if(isRecording) toggleRecording(); setInput(''); }} className="indra-icon-btn" style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '9999px' }}>
              <X size={20} />
            </button>

            <div className="indra-input-wrapper">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isRecording ? "Listening..." : "Type your command..."}
                className={`indra-main-input ${isRecording ? 'recording' : ''}`}
                autoFocus
              />
              {isRecording && (
                <div className="indra-recording-indicator">
                  <span className="indra-rec-bar animate-pulse" style={{ height: '0.75rem', animationDuration: '0.5s'}}></span>
                  <span className="indra-rec-bar animate-pulse" style={{ height: '1.25rem', animationDuration: '0.7s'}}></span>
                  <span className="indra-rec-bar animate-pulse" style={{ height: '0.75rem', animationDuration: '0.6s'}}></span>
                </div>
              )}
            </div>
            
            <button onClick={(e) => handleSend(e)} disabled={isLoading || (!input.trim() && !selectedImage && !activeVideoSource)} className="indra-send-btn">
              <Send size={22} />
            </button>
          </div>
        ) : (
          <div className="indra-center-hub">
            {showActionMenu && (
              <div className="indra-action-menu">
                <button onClick={() => { setShowTextInput(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <Search size={24} className="indra-menu-item-icon"/>
                  <span>SEARCH</span>
                </button>
                <button onClick={() => { handleMicClick(); setShowActionMenu(false); }} className="indra-menu-item">
                  <Mic size={24} className="indra-menu-item-icon"/>
                  <span>VOICE</span>
                </button>
                <button onClick={() => { toggleCamera(); setShowTextInput(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <Camera size={24} className="indra-menu-item-icon"/>
                  <span>CAMERA</span>
                </button>
                <button onClick={() => { toggleScreenShare(); setShowTextInput(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <MonitorUp size={24} className="indra-menu-item-icon"/>
                  <span>PRESENT</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="indra-menu-item">
                  <HardDrive size={24} className="indra-menu-item-icon"/>
                  <span>DEVICE</span>
                </button>
                <button onClick={() => { setIsVaultOpen(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <Database size={24} className="indra-menu-item-icon"/>
                  <span>VAULT</span>
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className={`indra-thunder-btn ${showActionMenu ? 'open' : ''}`}
            >
              {showActionMenu ? <X size={32} /> : <Zap size={32} fill="currentColor" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}