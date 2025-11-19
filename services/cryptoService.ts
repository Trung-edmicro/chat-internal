// Handling End-to-End Encryption logic
// We use ECDH (Elliptic Curve Diffie-Hellman) to derive a shared secret
// Then we use AES-GCM to encrypt the actual messages.

export class CryptoService {
  private keyPair: CryptoKeyPair | null = null;
  private sharedSecret: CryptoKey | null = null;

  // 1. Generate our own Key Pair (ECDH P-256)
  async generateKeyPair(): Promise<JsonWebKey> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      true,
      ["deriveKey", "deriveBits"]
    );

    // Export public key to send to peer
    const publicKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      this.keyPair.publicKey
    );

    return publicKeyJwk;
  }

  // 2. Receive Peer's Public Key and Derive Shared Secret (AES-GCM)
  async deriveSharedSecret(peerPublicKeyJwk: JsonWebKey): Promise<boolean> {
    if (!this.keyPair) throw new Error("Key pair not generated");

    try {
      const peerPublicKey = await window.crypto.subtle.importKey(
        "jwk",
        peerPublicKeyJwk,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        []
      );

      this.sharedSecret = await window.crypto.subtle.deriveKey(
        {
          name: "ECDH",
          public: peerPublicKey,
        },
        this.keyPair.privateKey,
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );

      return true;
    } catch (e) {
      console.error("Error deriving shared secret:", e);
      return false;
    }
  }

  // 3. Encrypt Message
  async encrypt(text: string): Promise<{ iv: number[]; data: number[] }> {
    if (!this.sharedSecret) throw new Error("Secure channel not established");

    const encoder = new TextEncoder();
    const encodedData = encoder.encode(text);
    
    // IV must be unique for every message
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      this.sharedSecret,
      encodedData
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedBuffer))
    };
  }

  // 4. Decrypt Message
  async decrypt(encryptedData: { iv: number[]; data: number[] }): Promise<string> {
    if (!this.sharedSecret) throw new Error("Secure channel not established");

    const iv = new Uint8Array(encryptedData.iv);
    const data = new Uint8Array(encryptedData.data);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      this.sharedSecret,
      data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  isReady(): boolean {
    return this.sharedSecret !== null;
  }
}

export const cryptoService = new CryptoService();