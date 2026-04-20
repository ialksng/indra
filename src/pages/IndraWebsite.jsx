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
          if (action === 'scroll') element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    <div className="flex h-screen bg-[#020617] text-slate-200 selection:bg-amber-500/30 overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="hidden md:flex w-[280px] bg-slate-950 border-r border-white/5 flex-col z-10 shadow-2xl relative">
        {/* Subtle Side Glow */}
        <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-amber-500/20 to-transparent"></div>

        {/* LOGO HEADER */}
        <div className="p-6 flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <img 
              src="/favicon.svg" 
              alt="Indra Logo" 
              className="w-8 h-8 relative z-10 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" 
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <div className="absolute inset-0 blur-md opacity-60 rounded-full bg-amber-500"></div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Indra</h1>
        </div>
        
        {/* NAVIGATION */}
        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-amber-400 rounded-xl font-medium shadow-[inset_0_0_20px_rgba(245,158,11,0.05)] transition-all hover:border-amber-500/40">
            <Plus size={18} /> New Workspace
          </button>
          
          <div className="pt-4 pb-2 px-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dashboard</p>
          </div>

          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-xl font-medium transition-colors group">
            <History size={18} className="group-hover:text-amber-400 transition-colors" /> Session History
          </button>
          
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-xl font-medium transition-colors group">
            <Settings size={18} className="group-hover:text-amber-400 transition-colors" /> Settings & API
          </button>
        </nav>

        {/* BOTTOM ACTION */}
        <div className="p-4 border-t border-white/5 bg-slate-950/50 backdrop-blur-md">
          <a 
            id="backtohubButton"
            href="https://smartsphere.ialksng.me" 
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 hover:text-white border border-slate-800 hover:border-slate-600 bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <ArrowLeft size={16} /> Return to Hub
          </a>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative w-full bg-slate-900 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        {/* Background Ambient Glow */}
        <div 
          className="absolute top-0 right-0 w-[800px] h-[600px] pointer-events-none opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, #FACC15, #F97316, transparent 60%)" }}
        />
        
        {/* The ChatCore instance */}
        <div className="flex-1 relative z-10 backdrop-blur-[1px]">
           <ChatCore isCompact={false} />
        </div>
      </div>

    </div>
  );
}