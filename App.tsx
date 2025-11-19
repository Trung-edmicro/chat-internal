import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InitialScreen } from './components/InitialScreen';
import { ChatInterface } from './components/ChatInterface';
import { Message, MessageType, ConnectionState } from './types';
import { cryptoService } from './services/cryptoService';
import { v4 as uuidv4 } from 'uuid';

// NOTE: In a real production app, you would use a custom STUN/TURN server in the Peer config
// for better firewall traversal in restrictive corporate networks.
// For this demo, we use the default Google STUN servers provided implicitly by PeerJS defaults.

const STORAGE_KEY_PEER_ID = 'secure-signal-peer-id';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    peerId: null,
    secure: false
  });
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Refs to hold mutable objects without re-rendering
  const peerRef = useRef<any>(null);
  const connRef = useRef<any>(null);
  const isInitialized = useRef(false);

  // Initialize PeerJS
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initPeer = async (retryWithNewId = false) => {
      if (!window.Peer) {
        console.error("PeerJS library not loaded");
        setConnectionState(prev => ({ ...prev, error: "Thư viện mạng không tải được." }));
        return;
      }

      // Try to recover old ID from localStorage to keep links valid
      const savedId = !retryWithNewId ? localStorage.getItem(STORAGE_KEY_PEER_ID) : null;
      
      // If we have a saved ID, try to use it. If not, PeerJS generates one.
      const peer = savedId 
        ? new window.Peer(savedId, { debug: 2 }) 
        : new window.Peer(null, { debug: 2 });

      peer.on('open', (id: string) => {
        console.log('My peer ID is: ' + id);
        localStorage.setItem(STORAGE_KEY_PEER_ID, id); // Save for next time
        setConnectionState(prev => ({ ...prev, status: 'disconnected', peerId: id }));
      });

      peer.on('connection', (conn: any) => {
        handleConnection(conn);
      });

      peer.on('error', (err: any) => {
        console.error('Peer Error:', err);
        
        // If the ID is taken (e.g., user has app open in another tab), retry with a new random ID
        if (err.type === 'unavailable-id') {
            console.warn("ID is taken, generating new one...");
            peer.destroy();
            initPeer(true); // Retry with forced new ID
            return;
        }

        setConnectionState(prev => ({ ...prev, error: "Lỗi kết nối mạng P2P: " + err.type }));
      });

      peerRef.current = peer;
    };

    initPeer();

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Handle incoming connection or established connection
  const handleConnection = (conn: any) => {
    setConnectionState(prev => ({ ...prev, status: 'connecting' }));
    
    conn.on('open', async () => {
      connRef.current = conn;
      
      // Immediately start Key Exchange
      // 1. Generate my key pair
      const myPublicKey = await cryptoService.generateKeyPair();
      
      // 2. Send my public key to peer
      conn.send({
        type: 'KEY_EXCHANGE',
        payload: myPublicKey
      });
      
      setConnectionState(prev => ({ ...prev, status: 'connected' }));
      addSystemMessage(`Đã kết nối với ${conn.peer}. Đang thiết lập mã hóa...`);
    });

    conn.on('data', async (data: any) => {
      await handleData(data);
    });

    conn.on('close', () => {
      setConnectionState(prev => ({ ...prev, status: 'disconnected', secure: false }));
      addSystemMessage("Đối phương đã ngắt kết nối.");
      connRef.current = null;
    });
    
    conn.on('error', () => {
        addSystemMessage("Lỗi đường truyền.");
    })
  };

  // Handle incoming data
  const handleData = async (data: any) => {
    if (data.type === 'KEY_EXCHANGE') {
      // Peer sent their public key.
      // We accept it and derive the shared secret.
      const success = await cryptoService.deriveSharedSecret(data.payload);
      if (success) {
        setConnectionState(prev => ({ ...prev, secure: true }));
        addSystemMessage("Kênh bảo mật E2EE đã được thiết lập. Admin mạng không thể đọc tin nhắn.");
      } else {
        addSystemMessage("Lỗi thiết lập mã hóa. Không an toàn.");
      }
    } else if (data.type === 'ENCRYPTED_MESSAGE') {
      // Decrypt incoming message
      try {
        const decryptedText = await cryptoService.decrypt(data.payload);
        addMessage({
          id: uuidv4(),
          sender: 'peer',
          content: decryptedText,
          timestamp: Date.now(),
          type: MessageType.TEXT,
          isEncrypted: true
        });
      } catch (e) {
        console.error("Decryption failed", e);
        addSystemMessage("Nhận được tin nhắn không thể giải mã.");
      }
    }
  };

  // Initiate connection
  const connectToPeer = (targetId: string) => {
    if (!peerRef.current) return;
    
    // Don't connect to self
    if (targetId === connectionState.peerId) {
        alert("Không thể tự kết nối với chính mình.");
        return;
    }

    const conn = peerRef.current.connect(targetId);
    handleConnection(conn);
  };

  // Send Message
  const sendMessage = async (text: string) => {
    if (!connRef.current || !connectionState.secure) {
      alert("Chưa có kết nối bảo mật!");
      return;
    }

    try {
      // Encrypt before sending
      const encryptedData = await cryptoService.encrypt(text);

      // Send encrypted blob
      connRef.current.send({
        type: 'ENCRYPTED_MESSAGE',
        payload: encryptedData
      });

      // Add to my UI
      addMessage({
        id: uuidv4(),
        sender: 'me',
        content: text,
        timestamp: Date.now(),
        type: MessageType.TEXT,
        isEncrypted: true
      });
    } catch (e) {
      console.error("Encryption failed", e);
      addSystemMessage("Lỗi mã hóa tin nhắn.");
    }
  };

  const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
  };

  const addSystemMessage = (text: string) => {
    addMessage({
      id: uuidv4(),
      sender: 'system',
      content: text,
      timestamp: Date.now(),
      type: MessageType.SYSTEM
    });
  };

  const handleDisconnect = () => {
      if (connRef.current) {
          connRef.current.close();
      }
      setConnectionState(prev => ({...prev, status: 'disconnected', secure: false}));
      setMessages([]);
  }

  // Render
  if (connectionState.status === 'connected' || connectionState.status === 'connecting') {
    return (
      <ChatInterface 
        messages={messages}
        onSendMessage={sendMessage}
        onClear={() => setMessages([])}
        onDisconnect={handleDisconnect}
        peerId={connRef.current?.peer || ''}
        isSecure={connectionState.secure}
      />
    );
  }

  return (
    <InitialScreen 
      myPeerId={connectionState.peerId}
      onConnect={connectToPeer}
      status={connectionState.status}
    />
  );
};

export default App;