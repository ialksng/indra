import { useEffect } from 'react';
import ChatCore from '../components/ChatCore';
import { Bot, Settings, History, ArrowLeft } from 'lucide-react';

export default function IndraWebsite() {
  
  useEffect(() => {
    const handleActionMessage = (event) => {
      const data = event.data;
      if (data && data.type === 'INDRA_ACTION') {
        const { action, selector, value } = data.payload;
        console.log(`[Indra Site Agent] Executing: ${action} on ${selector}`);

        try {
          const element = document.querySelector(selector);
          
          if (!element) {
            console.warn(`[Indra Site Agent] Element not found: ${selector}`);
            return;
          }

          if (action === 'click') element.click();
          if (action === 'navigate') window.location.href = value;
          if (action === 'scroll') element.scrollIntoView({ behavior: 'smooth' });
          if (action === 'fill') {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch (error) {
          console.error('[Indra Site Agent] Action failed:', error);
        }
      }
    };

    window.addEventListener('message', handleActionMessage);
    return () => window.removeEventListener('message', handleActionMessage);
  }, []);

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

        <a 
          id="backtohubButton"
          href="https://smartsphere.ialksng.me" 
          className="m-4 flex items-center justify-center gap-2 p-3 text-gray-400 hover:text-white border border-slate-700 rounded-xl"
        >
          <ArrowLeft size={18} /> Back to Hub
        </a>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full border-x border-slate-800 shadow-2xl">
        <ChatCore isCompact={false} />
      </div>
    </div>
  );
}