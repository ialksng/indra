import { useEffect } from 'react';
import ChatCore from '../components/ChatCore';
import { Settings, History, ArrowLeft, Plus } from 'lucide-react';

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
    <div className="flex h-screen bg-[#020617] text-white">
      
      {/* SIDEBAR */}
      <div className="hidden md:flex w-64 bg-black/40 border-r border-white/10 flex-col backdrop-blur-md">
        
        {/* LOGO AREA */}
        <div className="p-6 flex items-center gap-3">
          <div className="relative flex items-center">
            <img 
              src="/favicon.svg" 
              alt="Indra Logo" 
              className="w-8 h-8 relative z-10" 
              onError={(e) => { e.target.style.display = 'none' }} 
            />
            <div 
              className="absolute inset-0 blur-lg opacity-70 rounded-full scale-125 pointer-events-none" 
              style={{ backgroundColor: "#FACC15" }}
            ></div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500"></h1>
        </div>
        
        {/* NAV */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium rounded-xl hover:bg-amber-500/20 transition-colors">
            <Plus size={18} /> New Chat
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <History size={18} /> History
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
            <Settings size={18} /> Settings
          </button>
        </nav>

        {/* BOTTOM BUTTON */}
        <a 
          id="backtohubButton"
          href="https://smartsphere.ialksng.me" 
          className="m-4 flex items-center justify-center gap-2 p-3 text-gray-400 hover:text-amber-400 border border-white/10 hover:border-amber-500/30 bg-black/20 rounded-xl transition-all"
        >
          <ArrowLeft size={16} /> Back to Hub
        </a>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 relative w-full border-x border-white/5 shadow-2xl overflow-hidden">
        {/* Ambient background glow for workspace */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background: "radial-gradient(circle at 50% -20%, rgba(245,158,11,0.15), transparent 70%)"
          }}
        />
        <ChatCore isCompact={false} />
      </div>
    </div>
  );
}