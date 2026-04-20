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
    <div className="h-screen w-screen flex flex-col 
                    bg-[#020617] text-white overflow-hidden">

      {/* HEADER */}
      <div 
        className="flex items-center justify-between px-4 py-3 
                   border-b border-white/10 shadow-lg relative overflow-hidden"
        style={{
          background: "linear-gradient(90deg, #FACC15, #F97316)"
        }}
      >
        {/* Subtle texture overlay for the header */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMwMDAiLz48L3N2Zz4=')] mix-blend-overlay"></div>

        {/* LOGO - Text removed, size increased, centered in a dark circle */}
        <div className="relative flex items-center justify-center z-10 bg-black/40 p-2 rounded-full border border-white/10 shadow-sm backdrop-blur-md">
          <img 
            src="/favicon.svg"
            alt="Indra Logo"
            className="w-9 h-9 object-contain drop-shadow-md"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>

        {/* MAXIMIZE BUTTON - Scaled up slightly to match the larger logo */}
        <button 
          onClick={openFullSite}
          className="relative z-10 group flex items-center justify-center 
                     w-10 h-10 rounded-full 
                     bg-black/20 hover:bg-black/40 border border-transparent hover:border-white/20
                     transition-all duration-200 shadow-sm"
          title="Open full workspace"
        >
          <Maximize2 
            size={18} 
            className="text-white group-hover:text-amber-300 group-hover:scale-110 transition-transform"
          />
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-hidden relative">

        {/* Ambient energy glow behind the chat */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(250,204,21,0.1), transparent 70%)"
          }}
        />

        {/* Chat Component */}
        <div className="h-full w-full backdrop-blur-sm">
          <ChatCore projectId={projectId} isCompact={true} />
        </div>
      </div>
    </div>
  );
}