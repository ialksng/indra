import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ChatCore({ projectId = 'default' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 NEW MODE SYSTEM
  const [mode, setMode] = useState('fast');

  const modes = [
    { id: 'fast', name: '⚡ Fast' },
    { id: 'smart', name: '🧠 Smart' },
    { id: 'agent', name: '🤖 Agent' }
  ];

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🔥 AGENT EXECUTOR
  const executeActions = (actions) => {
    if (!actions) return;

    actions.forEach(action => {
      switch (action.action) {
        case "OPEN_PAGE":
          navigate(`/${action.target}`);
          break;

        case "FILL_INPUT":
          const input = document.querySelector(`[name="${action.field}"]`);
          if (input) input.value = action.value;
          break;

        default:
          console.log("Unknown action:", action);
      }
    });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);

    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: "user1",
          message: userMsg.text,
          mode: mode
        })
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        { role: 'ai', text: data.message }
      ]);

      // 🔥 EXECUTE AGENT ACTIONS
      executeActions(data.actions);

    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: '❌ Connection failed' }
      ]);
    }

    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0b0f1a] text-slate-200">

      {/* HEADER */}
      <div className="p-3 bg-black/40 border-b border-white/5 flex justify-between items-center">

        <div className="flex items-center gap-2">
          <Zap className="text-amber-500" size={18} />
          <span className="font-bold text-sm">INDRA</span>
        </div>

        {/* 🔥 MODE SELECTOR (REPLACED MODEL DROPDOWN) */}
        <div className="relative">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="appearance-none bg-white/5 text-white px-4 py-2 pr-8 rounded-xl border border-white/10 text-xs font-bold"
          >
            {modes.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
        </div>

      </div>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
            <Zap className="text-amber-500 mb-3" size={40} />
            <h3 className="text-white font-bold">INDRA CORE</h3>
            <p className="text-sm">Your personal AI assistant</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-xl max-w-[80%] ${
              msg.role === 'user'
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 border border-white/10'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="text-center text-sm opacity-50">
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Indra..."
          className="flex-1 bg-white/5 px-4 py-3 rounded-xl outline-none"
        />

        <button
          type="submit"
          className="bg-amber-500 px-4 rounded-xl text-black"
        >
          <Send size={18} />
        </button>
      </form>

    </div>
  );
}