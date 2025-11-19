import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Cpu, ArrowRight, Link as LinkIcon, Copy, Check, Loader2 } from 'lucide-react';

interface InitialScreenProps {
  myPeerId: string | null;
  onConnect: (peerId: string) => void;
  status: string;
}

export const InitialScreen: React.FC<InitialScreenProps> = ({ myPeerId, onConnect, status }) => {
  const [targetId, setTargetId] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyMode, setCopyMode] = useState<'id' | 'link'>('id');
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const hasAttemptedAutoConnect = useRef(false);

  // Handle URL Params and Auto-connect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectTo = params.get('connect');
    
    if (connectTo) {
      setTargetId(connectTo);
      
      // Only auto-connect if:
      // 1. We have a target ID from URL
      // 2. We have generated our own ID (myPeerId)
      // 3. We haven't tried to auto-connect yet in this session
      // 4. Current status is disconnected
      if (myPeerId && !hasAttemptedAutoConnect.current && status === 'disconnected') {
        // Avoid connecting to self
        if (connectTo === myPeerId) return;

        console.log("Auto-connecting to:", connectTo);
        hasAttemptedAutoConnect.current = true;
        setIsAutoConnecting(true);
        onConnect(connectTo);
      }
    }
  }, [myPeerId, status, onConnect]);

  const handleCopy = (mode: 'id' | 'link') => {
    if (!myPeerId) return;
    
    let textToCopy = myPeerId;

    if (mode === 'link') {
        // Construct clean URL without existing params
        const baseUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        textToCopy = `${baseUrl}?connect=${myPeerId}`;
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
        <p className="text-gray-400 text-sm">
          Giao thức chat nội bộ ẩn danh & mã hóa đầu cuối (E2EE).
          <br />
          Admin mạng không thể đọc nội dung tin nhắn của bạn.
        </p>
      </div>

      <div className="w-full bg-cyber-800 p-6 rounded-xl border border-cyber-700 space-y-4 transition-all duration-300">
        
        {/* My ID Section */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">ID Bảo Mật Của Bạn (Cố định)</label>
          <div className="bg-cyber-900 p-3 rounded border border-cyber-700 flex items-center justify-between group">
            <div className="flex items-center space-x-2 overflow-hidden w-full">
               <div className={`w-2 h-2 min-w-[0.5rem] rounded-full ${myPeerId ? 'bg-cyber-accent' : 'bg-yellow-500'} animate-pulse`}></div>
               <code className="text-lg text-cyber-accent font-mono truncate w-full text-left">
                 {myPeerId || 'Đang khởi tạo mạng P2P...'}
               </code>
            </div>
          </div>
          
          {/* Copy Actions */}
          <div className="flex space-x-2">
             <button
               onClick={() => handleCopy('id')}
               disabled={!myPeerId}
               className="flex-1 flex items-center justify-center space-x-2 bg-cyber-700 hover:bg-cyber-600 text-xs py-2 rounded transition-colors text-gray-300"
             >
               {copied && copyMode === 'id' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
               <span>Copy ID</span>
             </button>
             <button
               onClick={() => handleCopy('link')}
               disabled={!myPeerId}
               className={`flex-1 flex items-center justify-center space-x-2 text-xs py-2 rounded transition-colors ${copied && copyMode === 'link' ? 'bg-emerald-900 text-emerald-200' : 'bg-cyber-accent text-cyber-900 hover:bg-emerald-400 font-bold'}`}
             >
               {copied && copyMode === 'link' ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
               <span>Copy Link Mời</span>
             </button>
          </div>
          <p className="text-[10px] text-gray-500">
             *Gửi link này cho đồng nghiệp để họ tự động kết nối vào phòng chat.
          </p>
        </div>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-cyber-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-cyber-800 text-gray-500">HOẶC KẾT NỐI</span>
          </div>
        </div>

        {/* Target ID Input */}
        <div className="space-y-2">
           <label className="text-xs font-mono text-gray-500 uppercase tracking-widest">
             {isAutoConnecting ? 'Đang tự động kết nối...' : 'Nhập ID Hoặc Link'}
           </label>
           <div className="flex space-x-2">
             <input 
              type="text" 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Paste ID đối phương..."
              disabled={isAutoConnecting}
              className={`flex-1 bg-cyber-900 border rounded p-3 text-white focus:border-cyber-accent focus:outline-none font-mono placeholder-gray-600 text-sm transition-colors ${isAutoConnecting ? 'border-cyber-accent text-cyber-accent' : 'border-cyber-600'}`}
             />
             <button 
              onClick={() => onConnect(targetId)}
              disabled={!targetId || status === 'connecting' || !myPeerId}
              className="bg-cyber-accent text-cyber-900 font-bold p-3 rounded hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
              {status === 'connecting' ? <Loader2 className="animate-spin" /> : <ArrowRight />}
             </button>
           </div>
           {isAutoConnecting && (
             <p className="text-xs text-cyber-accent animate-pulse">Đang tìm kiếm thiết bị đối phương trong mạng...</p>
           )}
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