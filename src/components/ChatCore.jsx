import { useState, useRef } from 'react';
import { Send, Loader2, X, Camera, Database, HardDrive, MonitorUp, Zap, MousePointerClick, Mic, Volume2, VolumeX, Download, Cloud, Search } from 'lucide-react';
import './ChatCore.css'; 
import apiClient from '../services/apiClient';

// Helper function for WebSocket streaming (kept outside to avoid recreation on render)
function floatTo16BitPCM(float32Arr) {
  const buffer = new ArrayBuffer(float32Arr.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Arr.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Arr[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

export default function ChatCore() {
  // Pure UI State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('smart'); 
  const [automationEnabled, setAutomationEnabled] = useState(false); 
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); 
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [vaultData, setVaultData] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(null); 
  const [activeVideoSource, setActiveVideoSource] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // =========================
  // 💬 TEXT CHAT
  // =========================
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() && !selectedImage && !activeVideoSource) return;
    
    const userMessage = input;

    setMessages(prev => [...prev, { role: 'user', text: userMessage, image: selectedImage }]);
    setInput('');
    setSelectedImage(null);
    setShowTextInput(false);
    setActiveVideoSource(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/v1/indra/chat', {
        message: userMessage,
        mode: selectedModel,
        agent: automationEnabled
      });

      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: response.data.message
      }]);

    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "Sorry, I couldn't reach the server. Please check your connection." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // 🎤 STREAMING VOICE (NEW)
  // =========================
  const startStreamingVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const ws = new WebSocket(
        `${import.meta.env.VITE_API_BASE_URL.replace("http", "ws")}/ws/voice`
      );

      mediaRecorderRef.current = { ws }; // reuse your ref

      // 🔄 Fallback trigger if WebSocket fails to connect
      ws.onerror = (err) => {
        console.error("WebSocket error, falling back to REST:", err);
        ws.close();
        startRecording(); 
      };

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        // Only send if socket is actually open
        if (ws.readyState === WebSocket.OPEN) {
          const input = e.inputBuffer.getChannelData(0);
          ws.send(floatTo16BitPCM(input));
        }
      };

      ws.onmessage = async (event) => {
        // 🔊 AUDIO CHUNKS
        if (event.data instanceof Blob) {
          const audio = new Audio(URL.createObjectURL(event.data));
          audio.play();
          return;
        }

        // 🧠 TEXT EVENTS
        const data = JSON.parse(event.data);

        if (data.type === "transcript") {
          setMessages(prev => [
            ...prev,
            { role: "user", text: data.text }
          ]);
        }

        if (data.type === "response") {
          setMessages(prev => [
            ...prev,
            { role: "ai", text: data.text }
          ]);
        }
      };

    } catch (err) {
      console.error("Streaming setup error, falling back:", err);
      startRecording(); // Fallback if Mic setup/WS initialization totally fails
    }
  };

  const stopStreamingVoice = () => {
    const ws = mediaRecorderRef.current?.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send("interrupt"); // 🔥 stop AI speaking
      ws.close();
    }
  };

  // =========================
  // 🎤 FALLBACK VOICE (OLD)
  // =========================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob);

        try {
          setIsLoading(true);
          const res = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/voice?mode=${selectedModel}`,
            { method: 'POST', body: formData }
          );

          const data = await res.json();

          setMessages(prev => [
            ...prev,
            { role: 'user', text: data.input_text || '[voice]' },
            { role: 'ai', text: data.response }
          ]);

          if (data.audio_url) {
            const audio = new Audio(`${import.meta.env.VITE_API_BASE_URL}${data.audio_url}`);
            audio.play();
          }

        } catch (err) {
          console.error("Voice fallback error:", err);
        } finally {
          setIsLoading(false);
        }
      };

      recorder.start();

    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current instanceof MediaRecorder) {
      mediaRecorderRef.current.stop();
    }
  };

  // =========================
  // 🎤 TOGGLE CONTROLLER
  // =========================
  const toggleVoice = () => {
    if (!voiceEnabled) {
      setVoiceEnabled(true);
      startStreamingVoice(); // 🚀 Tries WS first, handles fallback internally
    } else {
      setVoiceEnabled(false);
      // Safely route to the correct stop function based on what is active
      if (mediaRecorderRef.current?.ws) {
        stopStreamingVoice(); 
      } else {
        stopRecording();
      }
    }
  };

  // =========================
  // 📁 FILE UPLOAD
  // =========================
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

  const isInputModeActive = showTextInput || activeVideoSource || selectedImage;

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
            <img src={showSaveDialog} crossOrigin="anonymous" className="indra-preview-img" alt="Preview" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="indra-btn-primary">
                <Download size={18} /> Download to Device
              </button>
              <button onClick={() => { setIsVaultOpen(true); setShowSaveDialog(null); }} className="indra-btn-secondary">
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
        
        {/* 3-Way Toggle */}
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
            onClick={toggleVoice}
            className={`indra-voice-btn ${voiceEnabled ? 'active' : ''}`}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <label className="indra-agent-toggle">
            <input type="checkbox" checked={automationEnabled} onChange={(e) => setAutomationEnabled(e.target.checked)} style={{ display: 'none' }} />
            <MousePointerClick size={16} color={automationEnabled ? '#fbbf24' : '#6b7280'} />
            <span className="indra-agent-text">AGENT</span>
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
                        {msg.text && <span>{msg.text}</span>}
                        {msg.generatedImages && msg.generatedImages.map((imgUrl, idx) => (
                          <div key={`gen-img-${idx}`} className="indra-media-box">
                            <img src={imgUrl} crossOrigin="anonymous" alt="AI Generated" className="indra-media-img" />
                            <div className="indra-media-overlay">
                               <button onClick={() => setShowSaveDialog(imgUrl)} className="indra-save-btn">
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
        {isLoading && !messages[messages.length-1]?.isStreaming && <Loader2 className="animate-spin indra-empty-icon" size={24} style={{ margin: '0 auto' }} />}
        {isExecuting && <div style={{ display: 'flex', justifyContent: 'center', fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', marginTop: '0.5rem' }} className="animate-pulse">EXECUTING BROWSER ACTION...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* ⚡ LIVE VIDEO PREVIEW */}
      <div className="indra-video-panel" style={{ display: activeVideoSource ? 'flex' : 'none' }}>
        <div className="indra-video-wrapper">
          <div className="indra-video-tag">
            <span className="indra-red-dot animate-pulse"></span>
            <span className="indra-tag-text">Live Vision</span>
          </div>
          <video className={`indra-video-element ${activeVideoSource === 'camera' ? 'mirror' : ''}`} muted playsInline />
          <button onClick={() => setActiveVideoSource(null)} className="indra-close-video"><X size={12} /></button>
        </div>
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
            <button onClick={() => { setShowTextInput(false); setActiveVideoSource(null); setInput(''); }} className="indra-icon-btn" style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '9999px' }}>
              <X size={20} />
            </button>

            <div className="indra-input-wrapper">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
                placeholder="Type your command..."
                className="indra-main-input"
                autoFocus
              />
            </div>
            
            <button onClick={(e) => handleSend(e)} disabled={isLoading || (!input.trim() && !selectedImage && !activeVideoSource)} className="indra-send-btn">
              <Send size={20} />
            </button>
          </div>
        ) : (
          <div className="indra-center-hub">
            
            {/* ⚡ COMPACT EXPANDING DOCK */}
            <div className={`indra-action-dock ${showActionMenu ? 'open' : ''}`}>
              
              {/* Left Icons */}
              <div className="indra-dock-side left">
                <button onClick={() => { setShowTextInput(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <Search size={18} className="indra-menu-item-icon"/>
                  <span>SEARCH</span>
                </button>
                <button onClick={() => { toggleVoice(); setShowTextInput(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <Mic size={18} className="indra-menu-item-icon"/>
                  <span>VOICE</span>
                </button>
                <button onClick={() => { setActiveVideoSource('camera'); setShowTextInput(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <Camera size={18} className="indra-menu-item-icon"/>
                  <span>CAMERA</span>
                </button>
              </div>

              {/* Spacer for the absolute positioned main button */}
              <div className="indra-dock-spacer"></div>

              {/* Right Icons */}
              <div className="indra-dock-side right">
                <button onClick={() => { setActiveVideoSource('screen'); setShowTextInput(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <MonitorUp size={18} className="indra-menu-item-icon"/>
                  <span>PRESENT</span>
                </button>
                <button onClick={() => { fileInputRef.current?.click(); setShowActionMenu(false); }} className="indra-menu-item">
                  <HardDrive size={18} className="indra-menu-item-icon"/>
                  <span>DEVICE</span>
                </button>
                <button onClick={() => { setIsVaultOpen(true); setShowActionMenu(false); }} className="indra-menu-item">
                  <Database size={18} className="indra-menu-item-icon"/>
                  <span>VAULT</span>
                </button>
              </div>
            </div>

            {/* Main Center Button */}
            <button 
              onClick={() => setShowActionMenu(!showActionMenu)}
              className={`indra-thunder-btn ${showActionMenu ? 'open' : ''}`}
            >
              {showActionMenu ? <X size={24} /> : <Zap size={24} fill="currentColor" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}