import ChatCore from '../components/ChatCore';
import { Bot, Settings, History, ArrowLeft } from 'lucide-react';

export default function IndraWebsite() {
  return (
    <div className="flex h-screen bg-black">
      <div className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col">
        <div className="p-6 flex items-center gap-3">
          <Bot className="text-purple-500" size={32} />
          <h1 className="text-2xl font-bold text-white">Indra</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-purple-600/20 text-purple-400 rounded-xl">
            <Bot size={20} /> New Chat
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <History size={20} /> History
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <Settings size={20} /> Settings
          </button>
        </nav>

        <a href="https://smartsphere.ialksng.me" className="m-4 flex items-center justify-center gap-2 p-3 text-gray-400 hover:text-white border border-slate-700 rounded-xl">
          <ArrowLeft size={18} /> Back to Hub
        </a>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full border-x border-slate-800 shadow-2xl">
        <ChatCore isCompact={false} />
      </div>
    </div>
  );
}