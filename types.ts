export enum MessageType {
  TEXT = 'TEXT',
  KEY_EXCHANGE = 'KEY_EXCHANGE',
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  sender: string; // 'me', 'peer', 'system', 'ai', or peerId for group
  senderName?: string; // Display name
  content: string;
  timestamp: number;
  type: MessageType;
  isEncrypted?: boolean;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  peerId: string | null;
  error?: string;
  isHost: boolean;
  roomId: string | null;
  connectedPeers: string[]; // List of connected peer IDs
  secure: boolean; // True if keys exchanged (for group, maybe false)
}

// Define global for PeerJS loaded via CDN
declare global {
  interface Window {
    Peer: any;
  }
}

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}