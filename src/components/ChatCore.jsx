import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function ChatCore({ projectId = 'default', isCompact = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
            <p className="text-sm">How can I help you today?</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && !isCompact && <Bot className="text-purple-400 mt-1" size={20} />}
            <div className={`p-3 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-800 border border-slate-700 text-gray-200'}`}>
              <p className={isCompact ? 'text-sm' : 'text-base'}>{msg.text}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            {!isCompact && <Bot className="text-purple-400 mt-1" size={20} />}
            <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 flex items-center gap-2">
              <Loader2 className="animate-spin text-purple-400" size={16} /> 
              <span className={isCompact ? 'text-sm text-gray-400' : 'text-base text-gray-400'}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-800/50 border-t border-slate-700">
        <form onSubmit={sendMessage} className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className={`w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 focus:outline-none focus:border-purple-500 transition-colors ${isCompact ? 'py-3 text-sm' : 'py-4 text-base'}`}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 p-2 bg-purple-600 hover:bg-purple-500 transition-colors rounded-lg disabled:opacity-50 ${isCompact ? 'p-1.5' : 'p-2'}`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}