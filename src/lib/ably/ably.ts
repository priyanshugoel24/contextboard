import Ably from 'ably';

// Client-side Ably instance
let clientAbly: Ably.Realtime | null = null;
let currentClientId: string | null = null;

export function getAblyClient(clientId?: string): Ably.Realtime {
  // If clientId is provided and different from current, create a new client
  if (clientId && clientId !== currentClientId) {
    if (clientAbly) {
      console.log("🔄 Closing existing Ably client and creating new one with clientId:", clientId);
      clientAbly.close();
    }
    clientAbly = null;
    currentClientId = clientId;
  }

  if (!clientAbly) {
    const ablyKey = process.env.NEXT_PUBLIC_ABLY_CLIENT_KEY;
    if (!ablyKey) {
      throw new Error('NEXT_PUBLIC_ABLY_CLIENT_KEY is not set');
    }
    
    console.log("🔌 Creating new Ably client with clientId:", currentClientId);
    
    const ablyOptions: Ably.ClientOptions = {
      key: ablyKey,
      autoConnect: true,
      disconnectedRetryTimeout: 1000, // Faster reconnection
      suspendedRetryTimeout: 2000, // Faster recovery
      httpRequestTimeout: 5000, // Faster timeout
      closeOnUnload: true,
      useBinaryProtocol: false,
      // Optimize for real-time performance
      echoMessages: false, // Don't echo our own messages
      queueMessages: true, // Queue messages when disconnected
    };

    // Only set clientId if we have one
    if (currentClientId) {
      ablyOptions.clientId = currentClientId;
    }
    
    clientAbly = new Ably.Realtime(ablyOptions);

    // Log connection events for debugging
    clientAbly.connection.on('connected', () => {
      console.log("✅ Ably client connected successfully - clientId:", clientAbly?.auth.clientId);
    });

    clientAbly.connection.on('connecting', () => {
      console.log("🔄 Ably client connecting...");
    });

    clientAbly.connection.on('disconnected', () => {
      console.log("❌ Ably client disconnected");
    });

    clientAbly.connection.on('suspended', () => {
      console.log("⏸️ Ably client suspended");
    });

    clientAbly.connection.on('failed', (error) => {
      console.error("❌ Ably connection failed:", error);
    });

    clientAbly.connection.on('update', (stateChange) => {
      console.log("🔄 Ably connection update:", stateChange);
    });
  }
  
  return clientAbly;
}

// Server-side Ably instance (for API routes)
let serverAbly: Ably.Rest | null = null;

export function getAblyServer(): Ably.Rest {
  if (!serverAbly) {
    const ablyKey = process.env.ABLY_SERVER_KEY;
    if (!ablyKey) {
      throw new Error('ABLY_SERVER_KEY is not set');
    }
    
    serverAbly = new Ably.Rest({
      key: ablyKey,
    });
  }
  
  return serverAbly;
}

// Re-export from centralized config
export { channelsConfig as CHANNELS } from '@/config/channels';

// Re-export from interfaces for backwards compatibility
export type { AblyPresenceData, AblyStatusData } from '@/interfaces/ably';
