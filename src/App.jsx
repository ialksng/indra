import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ArrowLeft, Loader2 } from 'lucide-react';
import apiClient from './services/apiClient';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await apiClient.get('/chat/history');
        setMessages(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/chat', { 
        message: userMessage,
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
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="text-purple-400" size={28} />
          <h1 className="text-xl font-bold">Indra AI</h1>
        </div>
        <a href="https://smartsphere.ialksng.me" className="text-sm text-gray-400 hover:text-white flex items-center gap-2">
          <ArrowLeft size={16} /> Exit
        </a>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && <Bot className="text-purple-400 mt-1" size={20} />}
            <div className={`p-4 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-slate-700'}`}>
              {msg.text}
            </div>
            {msg.role === 'user' && <User className="text-blue-400 mt-1" size={20} />}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <Bot className="text-purple-400 mt-1" size={20} />
            <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Indra anything..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 pl-4 pr-12 focus:outline-none focus:border-purple-500"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 p-2 bg-purple-600 rounded-lg disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatInterface />} />
      </Routes>
    </BrowserRouter>
  );
}