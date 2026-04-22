import { useState, useRef } from 'react';
import { Send, Loader2, X, Camera, Database, HardDrive, MonitorUp, Zap, MousePointerClick, Mic, Volume2, VolumeX, Download, Cloud, Search } from 'lucide-react';
import './ChatCore.css'; 
import apiClient from '../services/apiClient';

export default function ChatCore() {
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

  // 🎤 VOICE REFS
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // =========================
  // 💬 TEXT CHAT
  // =========================
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() && !selectedImage && !activeVideoSource) return;

    const userMessage = input;

    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/v1/indra/chat', {
        message: userMessage,
        mode: selectedModel,
        agent: automationEnabled
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.data.message }]);

    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Server error" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // 🎤 VOICE LOGIC
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
            {
              method: 'POST',
              body: formData
            }
          );

          const data = await res.json();

          setMessages(prev => [
            ...prev,
            { role: 'user', text: data.input_text || '[voice]' },
            { role: 'ai', text: data.response }
          ]);

          // 🔊 play response
          if (data.audio_url) {
            const audio = new Audio(
              `${import.meta.env.VITE_API_BASE_URL}${data.audio_url}`
            );
            audio.play();
          }

        } catch (err) {
          console.error("Voice error:", err);
        } finally {
          setIsLoading(false);
        }
      };

      recorder.start();

    } catch (err) {
      console.error("Mic permission error:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const toggleVoice = () => {
    if (!voiceEnabled) {
      setVoiceEnabled(true);
      startRecording();
    } else {
      setVoiceEnabled(false);
      stopRecording();
    }
  };

  const handleDeviceUpload = (e) => { 
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
      setShowTextInput(true); 
    };
    reader.readAsDataURL(file);
  };

  const isInputModeActive = showTextInput || activeVideoSource || selectedImage;

  return (
    <div className="indra-container">

      {/* HEADER */}
      <div className="indra-header">

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
          <button onClick={toggleVoice} className={`indra-voice-btn ${voiceEnabled ? 'active' : ''}`}>
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <label className="indra-agent-toggle">
            <input type="checkbox" checked={automationEnabled} onChange={(e) => setAutomationEnabled(e.target.checked)} style={{ display: 'none' }} />
            <MousePointerClick size={16} color={automationEnabled ? '#fbbf24' : '#6b7280'} />
            <span>AGENT</span>
          </label>
        </div>
      </div>

      {/* CHAT */}
      <div className="indra-chat-area">
        {messages.map((msg, i) => (
          <div key={i} className={`indra-msg-wrapper ${msg.role}`}>
            <div className={`indra-msg-bubble ${msg.role}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && <Loader2 className="animate-spin" />}
      </div>

      {/* INPUT */}
      <div className="indra-action-hub">

        <input type="file" ref={fileInputRef} onChange={handleDeviceUpload} style={{ display: 'none' }} />

        {isInputModeActive ? (
          <div className="indra-input-form">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
              placeholder="Type..."
              className="indra-main-input"
            />
            <button onClick={handleSend}>
              <Send size={20} />
            </button>
          </div>
        ) : (
          <div className="indra-center-hub">

            <button onClick={() => setShowTextInput(true)}>
              <Search size={18} />
            </button>

            {/* 🎤 FIXED VOICE BUTTON */}
            <button onClick={toggleVoice}>
              <Mic size={18} />
            </button>

            <button onClick={() => fileInputRef.current?.click()}>
              <HardDrive size={18} />
            </button>

            <button onClick={() => setShowActionMenu(!showActionMenu)}>
              <Zap size={24} />
            </button>

          </div>
        )}
      </div>
    </div>
  );
}