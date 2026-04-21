import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

// 🔥 Agent Executor
const executeActions = (actions, navigate) => {
  if (!actions) return;

  actions.forEach((action) => {
    switch (action.action) {
      case "OPEN_PAGE":
        navigate(`/${action.target}`);
        break;

      case "FILL_INPUT":
        const input = document.querySelector(
          `[name="${action.field}"]`
        );
        if (input) input.value = action.value;
        break;

      default:
        console.log("Unknown action:", action);
    }
  });
};

export default function ChatCore() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("fast");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔥 Send message
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    setInput("");
    setLoading(true);

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

      setMessages((prev) => [
        ...prev,
        { role: "ai", text: data.message }
      ]);

      // 🔥 Execute agent actions
      executeActions(data.actions, navigate);

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "❌ Error connecting to AI" }
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0f1a] text-white">

      {/* 🔹 HEADER */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <h1 className="font-bold text-lg">INDRA</h1>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="bg-white/10 px-3 py-2 rounded-lg text-sm"
        >
          <option value="fast">⚡ Fast</option>
          <option value="smart">🧠 Smart</option>
          <option value="agent">🤖 Agent</option>
        </select>
      </div>

      {/* 🔹 CHAT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center opacity-40 mt-20">
            <h2 className="text-xl font-bold">Indra AI</h2>
            <p className="text-sm">Your personal AI assistant</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-xl max-w-[80%] ${
                msg.role === "user"
                  ? "bg-amber-500 text-black"
                  : "bg-white/10"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-center text-sm opacity-50">
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 🔹 INPUT */}
      <div className="p-4 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Indra..."
          className="flex-1 bg-white/10 px-4 py-3 rounded-xl outline-none"
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <button
          onClick={handleSend}
          className="bg-amber-500 px-4 rounded-xl text-black"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}