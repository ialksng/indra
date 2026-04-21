import { useState, useRef, useEffect } from 'react';
import { Send, X, ChevronDown, Zap, MousePointerClick, Volume2, VolumeX } from 'lucide-react';

export default function ChatCore() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedMode, setSelectedMode] = useState('lite');
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const messagesEndRef = useRef(null);

  const modes = [
    { id: 'lite', name: '⚡ Lite' },
    { id: 'smart', name: '🧠 Smart' },
    { id: 'ultra', name: '🚀 Ultra' }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages(prev => [
      ...prev,
      { role: 'user', text: input },
      { role: 'ai', text: `Mode: ${selectedMode} (handled by backend)` }
    ]);

    setInput('');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0b0f1a] text-slate-200">
      {/* HEADER */}
      <div className="p-3 bg-black/40 border-b border-white/5 flex justify-between items-center">
        <div className="relative min-w-[150px] max-w-[220px]">
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="w-full appearance-none bg-white/5 text-white px-4 py-2 pr-10 rounded-xl border border-white/10 focus:outline-none focus:border-amber-500 text-xs font-bold"
          >
            {modes.map(m => (
              <option key={m.id} value={m.id} className="bg-slate-900">
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-400" />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:text-white">
            <Volume2 size={18} />
          </button>

          <label className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
            <MousePointerClick size={16} />
            <span className="text-[10px] font-bold">AGENT</span>
            <input
              type="checkbox"
              checked={automationEnabled}
              onChange={(e) => setAutomationEnabled(e.target.checked)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* CHAT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center opacity-40">
            <Zap className="mx-auto mb-2 text-amber-500" size={40} />
            <p>INDRA CORE UI</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 max-w-[80%]">
              {msg.text}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
          />

          <button
            onClick={handleSend}
            className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-black"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}