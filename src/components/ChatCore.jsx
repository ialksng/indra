import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ImagePlus, X, Camera, Database, HardDrive, ChevronDown, MonitorUp } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function ChatCore({ projectId = 'default', isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState('gemini-flash');
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [activeVideoSource, setActiveVideoSource] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); 
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const models = [
    { id: 'gemini-flash', name: 'Gemini Flash (Fast)' },
    { id: 'gemini-pro', name: 'Gemini Pro (Advanced)' },
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setActiveVideoSource('camera');
      } catch (err) {
        console.error("Camera access denied", err);
        alert("Please allow camera access.");
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
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setActiveVideoSource('screen');

        stream.getVideoTracks()[0].onended = () => {
          stopVideo();
        };
      } catch (err) {
        console.error("Screen share denied/cancelled", err);
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
    alert("Opening SmartSphere Vault...");
    setShowUploadMenu(false);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (isLoading) return;

    let imageToSend = selectedImage;
    if (activeVideoSource) {
      imageToSend = captureVideoFrame();
    }

    if (!input.trim() && !imageToSend) return;

    const userMsg = {
      role: 'user',
      text: input,
      image: imageToSend
    };

    const textToSend = input;
    setInput('');
    setSelectedImage(null);

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/chat', {
        message: textToSend,
        image: imageToSend,
        modelType: selectedModel,
        projectId,
        history: updatedMessages
      });

      if (res.data.actionInstruction) {
        const targetOrigin = document.referrer ? new URL(document.referrer).origin : '*';
        window.parent.postMessage({
          type: 'INDRA_ACTION',
          payload: res.data.actionInstruction
        }, targetOrigin);
      }

      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to Indra.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-white">
      
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center z-20">
        <div className="relative group">
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="appearance-none bg-slate-700 text-white px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer text-sm font-medium"
          >
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-3 pointer-events-none text-gray-400" />
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-3 space-y-4' : 'p-6 space-y-6'}`}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-purple-600' : 'bg-slate-800 border border-slate-700'}`}>
              {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-h-48 object-cover" alt="attachment"/>}
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && <Loader2 className="animate-spin text-purple-400 m-4" size={20} />}
        <div ref={messagesEndRef} />
      </div>

      {activeVideoSource && (
        <div className="p-2 bg-slate-800 border-t border-slate-700 flex justify-center">
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
      )}

      <div className="p-3 bg-slate-800/50 border-t border-slate-700 flex flex-col gap-2 relative">
        
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