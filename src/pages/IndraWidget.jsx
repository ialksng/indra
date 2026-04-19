import { useSearchParams } from 'react-router-dom';
import ChatCore from '../components/ChatCore';
import { Bot } from 'lucide-react';

export default function IndraWidget() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || 'default';

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 m-0 p-0 overflow-hidden">
      <div className="bg-purple-600 p-3 flex items-center gap-2 shadow-md z-10">
        <Bot size={20} className="text-white" />
        <span className="text-white font-medium text-sm">Chat with Indra</span>
      </div>
    
      <div className="flex-1 overflow-hidden">
        <ChatCore projectId={projectId} isCompact={true} />
      </div>
    </div>
  );
}