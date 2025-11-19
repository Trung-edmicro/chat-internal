import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Cpu, ArrowRight, Link as LinkIcon, Copy, Check, Loader2 } from 'lucide-react';

interface InitialScreenProps {
  myPeerId: string | null;
  onConnect: (peerId: string) => void;
  status: string;
  isGroup?: boolean;
  roomId?: string | null;
}

export const InitialScreen: React.FC<InitialScreenProps> = ({ myPeerId, onConnect, status, isGroup = false, roomId }) => {
  const [targetId, setTargetId] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyMode, setCopyMode] = useState<'id' | 'link'>('id');
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const hasAttemptedAutoConnect = useRef(false);

  // Handle URL Params and Auto-connect
  useEffect(() => {
    if (!isGroup) return;
    
    const params = new URLSearchParams(window.location.search);
    const connectTo = params.get('room');
    
    if (connectTo && myPeerId && !hasAttemptedAutoConnect.current && status === 'disconnected') {
      // Avoid connecting to self
      if (connectTo === myPeerId) return;

      console.log("Auto-joining room:", connectTo);
      hasAttemptedAutoConnect.current = true;
      setIsAutoConnecting(true);
      onConnect(connectTo);
    }
  }, [myPeerId, status, onConnect, isGroup]);

  const handleCopy = (mode: 'id' | 'link') => {
    if (!roomId) return;
    
    let textToCopy = roomId;

    if (mode === 'link') {
        // Construct clean URL without existing params
        const baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        textToCopy = `${baseUrl}?room=${roomId}`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopyMode(mode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-lg mx-auto text-center space-y-8 animate-fade-in">
      <div className="bg-cyber-800 p-6 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.2)] border border-cyber-700 relative">
        <Shield className="w-16 h-16 text-cyber-accent" />
        {status === 'connecting' && (
            <div className="absolute inset-0 rounded-full border-4 border-cyber-accent border-t-transparent animate-spin"></div>
        )}
      </div>
      
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 tracking-tighter">
          SECURE SIGNAL
        </h1>
      </div>

      <div className="w-full bg-cyber-800 p-6 rounded-xl border border-cyber-700 space-y-4 transition-all duration-300">
        
        {/* Room ID Section */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">ID Phòng Chat Nhóm</label>
          <div className="bg-cyber-900 p-3 rounded border border-cyber-700 flex items-center justify-between group">
            <div className="flex items-center space-x-2 overflow-hidden w-full">
               <div className={`w-2 h-2 min-w-[0.5rem] rounded-full ${roomId ? 'bg-cyber-accent' : 'bg-yellow-500'} animate-pulse`}></div>
               <code className="text-lg text-cyber-accent font-mono truncate w-full text-left">
                 {roomId || 'Đang tạo phòng...'}
               </code>
            </div>
          </div>
          
          {/* Copy Actions */}
          <div className="flex space-x-2">
             <button
               onClick={() => handleCopy('id')}
               disabled={!roomId}
               className="flex-1 flex items-center justify-center space-x-2 bg-cyber-700 hover:bg-cyber-600 text-xs py-2 rounded transition-colors text-gray-300"
             >
               {copied && copyMode === 'id' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
               <span>Copy Room ID</span>
             </button>
             <button
               onClick={() => handleCopy('link')}
               disabled={!roomId}
               className={`flex-1 flex items-center justify-center space-x-2 text-xs py-2 rounded transition-colors ${copied && copyMode === 'link' ? 'bg-emerald-900 text-emerald-200' : 'bg-cyber-accent text-cyber-900 hover:bg-emerald-400 font-bold'}`}
             >
               {copied && copyMode === 'link' ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
               <span>Copy Link Mời</span>
             </button>
          </div>
          <p className="text-[10px] text-gray-500">
             *Gửi link này cho đồng nghiệp để họ tự động tham gia phòng chat nhóm.
          </p>
        </div>

      </div>

      <div className="flex space-x-4 text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <Lock className="w-3 h-3" />
          <span>AES-256-GCM</span>
        </div>
        <div className="flex items-center space-x-1">
          <Cpu className="w-3 h-3" />
          <span>P2P WebRTC</span>
        </div>
      </div>
    </div>
  );
};