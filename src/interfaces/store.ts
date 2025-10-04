// Store Interfaces

export interface PresenceUser {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  status?: string;
  lastSeen?: string;
}

export interface PresenceState {
  onlineUsers: PresenceUser[];
  isConnected: boolean;
  currentStatus: string;
  setOnlineUsers: (users: PresenceUser[]) => void;
  addOrUpdateUser: (user: PresenceUser) => void;
  removeUser: (userId: string) => void;
  setIsConnected: (isConnected: boolean) => void;
  setCurrentStatus: (status: string) => void;
  updateUserStatus: (userId: string, status: string) => void;
}