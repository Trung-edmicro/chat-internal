export enum MessageType {
  TEXT = 'TEXT',
  KEY_EXCHANGE = 'KEY_EXCHANGE',
  SYSTEM = 'SYSTEM'
}

export interface Message {
  id: string;
  sender: 'me' | 'peer' | 'system' | 'ai';
  content: string;
  timestamp: number;
  type: MessageType;
  isEncrypted?: boolean;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  peerId: string | null;
  error?: string;
  secure: boolean; // True if keys exchanged
}

// Define global for PeerJS loaded via CDN
declare global {
  interface Window {
    Peer: any;
  }
}