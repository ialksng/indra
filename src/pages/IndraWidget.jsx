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
                   border-b border-white/10 shadow-lg"
        style={{
          background: "linear-gradient(90deg, #FACC15, #F97316)"
        }}
      >

        {/* LOGO - Made wider/bigger and added contrast filter */}
        <div className="relative flex items-center">
          <img 
            src="/favicon.svg"
            alt="Indra Logo"
            // Increased width to w-10 and height to h-10. 
            // Added brightness(0) drop-shadow to make it black/dark for contrast against yellow.
            className="w-10 h-10 relative z-10 filter brightness-0 drop-shadow-md"
            onError={(e) => { e.target.style.display = 'none' }}
          />

          {/* Glow (kept but subdued slightly since logo is now dark) */}
          <div 
            className="absolute inset-0 blur-lg opacity-50 rounded-full scale-125"
            style={{ backgroundColor: "#FACC15" }}
          ></div>
        </div>

        {/* BUTTON */}
        <button 
          onClick={openFullSite}
          className="group flex items-center justify-center 
                     w-9 h-9 rounded-lg 
                     bg-black/20 hover:bg-black/30 
                     transition-all duration-200"
          title="Open full experience"
        >
          <Maximize2 
            size={18} 
            className="text-white group-hover:text-yellow-200"
          />
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-hidden relative">

        {/* Ambient energy glow */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 30% 20%, rgba(250,204,21,0.18), transparent 60%)"
          }}
        />

        {/* Chat */}
        <div className="h-full w-full backdrop-blur-[2px]">
          <ChatCore projectId={projectId} isCompact={true} />
        </div>
      </div>
    </div>
  );
}