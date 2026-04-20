import { useSearchParams } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import ChatCore from '../components/ChatCore';

export default function IndraWidget() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || 'default';

  const openFullSite = () => {
    window.open('https://indra.ialksng.me', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 m-0 p-0 overflow-hidden">

      {/* HEADER */}
      <div className="relative flex items-center justify-between px-4 py-3 
                      bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 
                      shadow-lg border-b border-white/10">

        {/* LEFT: LOGO + TITLE */}
        <div className="flex items-center gap-3">
          
          {/* LOGO */}
          <div className="relative">
            <img 
              src="/favicon.svg"
              alt="Indra Logo"
              className="w-7 h-7 object-contain relative z-10"
              onError={(e) => { e.target.style.display = 'none' }}
            />

            {/* Glow behind logo */}
            <div className="absolute inset-0 blur-md opacity-70 bg-purple-400 rounded-full scale-125"></div>
          </div>

          {/* TEXT */}
          <div className="flex flex-col leading-tight">
            <span className="text-white text-sm font-semibold tracking-wide">
              Indra
            </span>
            <span className="text-white/60 text-[11px]">
              AI Assistant
            </span>
          </div>
        </div>

        {/* RIGHT: MAXIMIZE BUTTON */}
        <button 
          onClick={openFullSite}
          className="group flex items-center justify-center 
                     w-8 h-8 rounded-lg 
                     bg-white/10 hover:bg-white/20 
                     transition-all duration-200"
          title="Open full experience"
        >
          <Maximize2 
            size={16} 
            className="text-white/80 group-hover:text-white transition"
          />
        </button>
      </div>

      {/* CHAT CORE */}
      <div className="flex-1 overflow-hidden">
        <ChatCore projectId={projectId} isCompact={true} />
      </div>
    </div>
  );
}