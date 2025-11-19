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
    secure: false,
    isHost: false,
    roomId: null,
    connectedPeers: []
  });
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Refs to hold mutable objects without re-rendering
  const peerRef = useRef<any>(null);
  const connectionsRef = useRef<Map<string, any>>(new Map()); // peerId -> connection
  const isInitialized = useRef(false);

  // Get room from URL
  const getRoomFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
  };

  // Generate anonymous name
  const getAnonymousName = (peerId: string) => {
    return `Anonymous-${peerId.substring(0, 4)}`;
  };

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
        
        const roomId = getRoomFromUrl();
        const isHost = !roomId || roomId === id;
        
        setConnectionState(prev => ({ 
          ...prev, 
          status: 'disconnected', 
          peerId: id,
          isHost,
          roomId: isHost ? id : roomId,
          connectedPeers: []
        }));

        if (!isHost) {
          // Join as member
          connectToHost(roomId);
        }
      });

      peer.on('connection', (conn: any) => {
        handleIncomingConnection(conn);
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

  // Handle incoming connection (for host)
  const handleIncomingConnection = (conn: any) => {
    console.log('Incoming connection from:', conn.peer);
    
    conn.on('open', () => {
      connectionsRef.current.set(conn.peer, conn);
      setConnectionState(prev => ({
        ...prev,
        connectedPeers: [...prev.connectedPeers, conn.peer]
      }));
      addSystemMessage(`${getAnonymousName(conn.peer)} đã tham gia phòng.`);
      
      // Send existing messages to new peer
      messages.forEach(msg => {
        if (msg.type === MessageType.TEXT) {
          conn.send({
            type: 'MESSAGE',
            payload: msg
          });
        }
      });
    });

    conn.on('data', (data: any) => {
      handleData(conn.peer, data);
    });

    conn.on('close', () => {
      connectionsRef.current.delete(conn.peer);
      setConnectionState(prev => ({
        ...prev,
        connectedPeers: prev.connectedPeers.filter(id => id !== conn.peer)
      }));
      addSystemMessage(`${getAnonymousName(conn.peer)} đã rời phòng.`);
    });
    
    conn.on('error', () => {
      addSystemMessage(`Lỗi kết nối với ${getAnonymousName(conn.peer)}.`);
    });
  };

  // Connect to host (for members)
  const connectToHost = (hostId: string) => {
    if (!peerRef.current) return;
    
    setConnectionState(prev => ({ ...prev, status: 'connecting' }));
    
    const conn = peerRef.current.connect(hostId);
    
    conn.on('open', () => {
      connectionsRef.current.set(hostId, conn);
      setConnectionState(prev => ({
        ...prev,
        status: 'connected',
        connectedPeers: [hostId]
      }));
      addSystemMessage(`Đã tham gia phòng chat nhóm.`);
    });

    conn.on('data', (data: any) => {
      handleData(hostId, data);
    });

    conn.on('close', () => {
      setConnectionState(prev => ({
        ...prev,
        status: 'disconnected',
        connectedPeers: []
      }));
      addSystemMessage("Đã ngắt kết nối khỏi phòng.");
      connectionsRef.current.clear();
    });
    
    conn.on('error', () => {
      addSystemMessage("Lỗi kết nối đến host.");
      setConnectionState(prev => ({ ...prev, status: 'disconnected' }));
    });
  };

  // Handle incoming data
  const handleData = (fromPeer: string, data: any) => {
    if (data.type === 'MESSAGE') {
      const msg = data.payload;
      // Add message from peer
      addMessage({
        ...msg,
        sender: 'peer',
        senderName: getAnonymousName(fromPeer)
      });
    } else if (data.type === 'BROADCAST') {
      // Host broadcasting to members
      const msg = data.payload;
      addMessage({
        ...msg,
        sender: 'peer',
        senderName: getAnonymousName(fromPeer)
      });
    }
  };

  // Send Message
  const sendMessage = async (text: string) => {
    if (connectionState.status !== 'connected') {
      alert("Chưa tham gia phòng!");
      return;
    }

    const msg = {
      id: uuidv4(),
      sender: 'me',
      senderName: getAnonymousName(connectionState.peerId!),
      content: text,
      timestamp: Date.now(),
      type: MessageType.TEXT,
      isEncrypted: false // No encryption for group
    };

    // Add to my UI
    addMessage(msg);

    // Send to all connected peers
    connectionsRef.current.forEach(conn => {
      conn.send({
        type: connectionState.isHost ? 'BROADCAST' : 'MESSAGE',
        payload: msg
      });
    });
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
    connectionsRef.current.forEach(conn => conn.close());
    connectionsRef.current.clear();
    setConnectionState(prev => ({
      ...prev,
      status: 'disconnected',
      connectedPeers: [],
      secure: false
    }));
    setMessages([]);
  };

  // Render
  if (connectionState.status === 'connected' || connectionState.status === 'connecting') {
    return (
      <ChatInterface 
        messages={messages}
        onSendMessage={sendMessage}
        onClear={() => setMessages([])}
        onDisconnect={handleDisconnect}
        peerId={connectionState.roomId || ''}
        isSecure={connectionState.secure}
        connectedPeers={connectionState.connectedPeers}
        isHost={connectionState.isHost}
      />
    );
  }

  return (
    <InitialScreen 
      myPeerId={connectionState.peerId}
      onConnect={(id) => connectToHost(id)} // For manual connect, but now auto
      status={connectionState.status}
      isGroup={true}
      roomId={connectionState.roomId}
    />
  );
};

export default App;