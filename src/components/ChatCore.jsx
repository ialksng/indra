import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Mic, MicOff, ImagePlus, X } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function ChatCore({ projectId = 'default', isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = reader.result;
            sendMultimodalMessage('', base64Audio, null);
            stream.getTracks().forEach(track => track.stop());
          };
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Please allow microphone access to use voice chat.");
      }
    }
  };

  const sendMultimodalMessage = async (textOverride, audioBase64 = null, imageBase64 = null) => {
    const textToSend = textOverride !== undefined ? textOverride : input;

    if (!textToSend.trim() && !audioBase64 && !imageBase64) return;

    const userMsg = {
      role: 'user',
      text: audioBase64 ? '🎤 [Voice Message]' : textToSend,
      image: imageBase64
    };

    setInput('');
    setSelectedImage(null);
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/chat', {
        message: textToSend,
        audio: audioBase64,
        image: imageBase64,
        projectId: projectId,
        history: messages
      });

      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-white">
      <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-3 space-y-4' : 'p-6 space-y-6'}`}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center px-4">
            <Bot size={48} className="mb-4 text-purple-500/50" />
            <p className="text-lg font-medium text-gray-300">Hi! I am Indra.</p>
            <p className="text-sm">I can read text, look at images, and hear your voice.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && !isCompact && <Bot className="text-purple-400 mt-1" size={20} />}
            <div className={`p-3 rounded-2xl max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-800 border border-slate-700 text-gray-200'}`}>
              {msg.image && <img src={msg.image} alt="User Upload" className="rounded-lg max-w-full h-auto max-h-48 object-cover" />}
              {msg.text && <p className={isCompact ? 'text-sm' : 'text-base'}>{msg.text}</p>}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            {!isCompact && <Bot className="text-purple-400 mt-1" size={20} />}
            <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 flex items-center gap-2">
              <Loader2 className="animate-spin text-purple-400" size={16} />
              <span className={isCompact ? 'text-sm text-gray-400' : 'text-base text-gray-400'}>Processing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-800/50 border-t border-slate-700 flex flex-col gap-2">
        {selectedImage && (
          <div className="relative inline-block w-max">
            <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-600" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-slate-700 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="relative flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
          >
            <ImagePlus size={20} />
          </button>

          <button
            onClick={toggleRecording}
            className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-gray-400 hover:text-purple-400'}`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMultimodalMessage(undefined, null, selectedImage);
            }}
            placeholder={isRecording ? "Listening..." : "Type a message..."}
            disabled={isRecording}
            className={`flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 focus:outline-none focus:border-purple-500 transition-colors ${isCompact ? 'py-2 text-sm' : 'py-3 text-base'}`}
          />

          <button
            onClick={() => sendMultimodalMessage(undefined, null, selectedImage)}
            disabled={isLoading || (!input.trim() && !selectedImage) || isRecording}
            className="p-2 bg-purple-600 hover:bg-purple-500 transition-colors rounded-lg disabled:opacity-50 text-white"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}