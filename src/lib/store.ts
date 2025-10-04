import { create } from 'zustand';
import { PresenceState } from '@/interfaces/store';

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: [],
  isConnected: false,
  currentStatus: 'Available',
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  addOrUpdateUser: (user) =>
    set((state) => {
      const existingIndex = state.onlineUsers.findIndex((u) => u.id === user.id);
      if (existingIndex >= 0) {
        const updatedUsers = [...state.onlineUsers];
        updatedUsers[existingIndex] = user;
        return { onlineUsers: updatedUsers };
      } else {
        return { onlineUsers: [...state.onlineUsers, user] };
      }
    }),
  removeUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.id !== userId),
    })),
  setIsConnected: (isConnected) => set({ isConnected }),
  setCurrentStatus: (status) => set({ currentStatus: status }),
  updateUserStatus: (userId, status) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.map((user) =>
        user.id === userId ? { ...user, status } : user
      ),
      currentStatus: state.currentStatus, // ensure currentStatus is maintained
    })),
}));
