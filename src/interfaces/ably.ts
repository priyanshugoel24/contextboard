// Ably Real-time Interfaces

export interface AblyPresenceData {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  status?: string;
  lastSeen?: string;
}

export interface AblyStatusData {
  userId: string;
  status: string;
  state?: string;
  timestamp: string;
}