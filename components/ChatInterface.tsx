import React, { useEffect, useRef, useState } from 'react';
import { Message, MessageType } from '../types';
import { Send, ShieldCheck, AlertTriangle, Eraser, Sparkles, LogOut, Lock } from 'lucide-react';
import { analyzeConversation } from '../services/geminiService';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClear: () => void;
  onDisconnect: () => void;
  peerId: string;
  isSecure: boolean;
  connectedPeers?: string[];
  isHost?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  onClear,
  onDisconnect,
  peerId,
  isSecure,
  connectedPeers = [],
  isHost = false
}) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const textLogs = messages
      .filter(m => m.type === MessageType.TEXT)
      .map(m => `${m.sender === 'me' ? 'Tôi' : 'Đồng nghiệp'}: ${m.content}`);
    
    const result = await analyzeConversation(textLogs);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  return (
    <div className="flex flex-col h-full bg-cyber-900 relative">
      {/* Header */}
      <div className="h-16 border-b border-cyber-700 flex items-center justify-between px-4 bg-cyber-800/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isSecure ? 'bg-cyber-accent shadow-[0_0_10px_#10b981]' : 'bg-yellow-500 animate-pulse'}`}></div>
          <div>
            <h2 className="font-bold text-gray-100">Secure Group Chat</h2>
            <p className="text-[10px] text-gray-400 font-mono flex items-center">
              {isHost ? 'Host' : 'Member'} 
              <span className="mx-2 text-cyber-600">|</span>
              ROOM: {peerId.substring(0, 8)}...
              <span className="mx-2 text-cyber-600">|</span>
              {connectedPeers.length + 1} members
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
             <button 
            onClick={onClear}
            className="p-2 text-gray-400 hover:text-cyber-danger hover:bg-cyber-700/50 rounded-full transition-colors"
            title="Xóa sạch lịch sử (Local)"
          >
            <Eraser className="w-5 h-5" />
          </button>
          <button 
            onClick={onDisconnect}
            className="p-2 text-gray-400 hover:text-white hover:bg-cyber-700/50 rounded-full transition-colors"
            title="Ngắt kết nối"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* AI Analysis Overlay */}
      {aiAnalysis && (
        <div className="absolute top-20 right-4 w-72 bg-cyber-800 border border-cyber-accent/30 p-4 rounded-lg shadow-2xl z-20 animate-fade-in">
           <div className="flex justify-between items-center mb-2">
             <h3 className="text-cyber-accent font-bold flex items-center"><Sparkles className="w-4 h-4 mr-2" /> Gemini Insight</h3>
             <button onClick={() => setAiAnalysis(null)} className="text-gray-500 hover:text-white">×</button>
           </div>
           <p className="text-sm text-gray-300 leading-relaxed">{aiAnalysis}</p>
           <div className="mt-2 text-[10px] text-gray-500 border-t border-cyber-700 pt-2">
             Lưu ý: Dữ liệu được gửi đến Google để phân tích. Đừng gửi mật tin cấp cao.
           </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4 opacity-50">
                <Lock className="w-12 h-12" />
                <p>Hệ thống đã sẵn sàng. Tin nhắn được mã hóa.</p>
            </div>
        )}

        {messages.map((msg) => {
            if (msg.type === MessageType.SYSTEM) {
                return (
                    <div key={msg.id} className="flex justify-center my-2">
                        <span className="text-xs bg-cyber-800 text-gray-400 px-3 py-1 rounded-full border border-cyber-700">
                            {msg.content}
                        </span>
                    </div>
                )
            }

            const isMe = msg.sender === 'me';
            const displayName = msg.senderName || (isMe ? 'You' : 'Peer');
            return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 ${
                        isMe 
                        ? 'bg-cyber-accent text-cyber-900 rounded-br-none' 
                        : 'bg-cyber-700 text-gray-100 rounded-bl-none border border-cyber-600'
                    }`}>
                        {!isMe && (
                            <div className="text-xs text-gray-400 mb-1 font-medium">
                                {displayName}
                            </div>
                        )}
                        <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
                        <div className="flex justify-end items-center mt-1 space-x-1 opacity-70">
                           {msg.isEncrypted && <Lock className="w-3 h-3" />}
                           <span className="text-[10px]">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                </div>
            )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-cyber-800 border-t border-cyber-700">
         {/* Warning Badge */}
         <div className="flex justify-between items-center mb-2">
             <div className="text-[10px] text-gray-500 flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></div>
                Group Chat Active ({connectedPeers.length + 1} members)
             </div>
             <button 
                onClick={handleAnalyze}
                disabled={analyzing || messages.length < 2}
                className="text-[10px] text-cyber-accent hover:underline disabled:opacity-30 flex items-center"
             >
                {analyzing ? 'Đang phân tích...' : 'Phân tích với Gemini'}
             </button>
         </div>

         <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <div className="relative flex-1">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập tin nhắn bảo mật..."
                    className="w-full bg-cyber-900 text-gray-100 border border-cyber-600 rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:border-cyber-accent transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <ShieldCheck className="w-4 h-4" />
                </div>
            </div>
            <button 
                type="submit"
                disabled={!input.trim() || !isSecure}
                className="bg-cyber-accent text-cyber-900 p-3 rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
            >
                <Send className="w-5 h-5" />
            </button>
         </form>
      </div>
    </div>
  );
};