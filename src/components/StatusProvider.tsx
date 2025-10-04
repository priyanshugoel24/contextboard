"use client";
import React, { createContext, useContext, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePresenceStore } from "@/lib/store";
import { UserStatus } from "@/interfaces/common";
import { useAblyPresence } from "@/lib/ably/useAblyPresence";

interface StatusContextType {
  status: UserStatus;
  onlineUsers: unknown[];
  isConnected: boolean;
  updateStatus: (status: UserStatus) => void;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

export function StatusProvider({ children }: { children: React.ReactNode }) {
  // Initialize the Ably presence hook, which handles the connection
  useAblyPresence();
  const { data: session } = useSession();

  const {
    currentStatus,
    onlineUsers,
    isConnected,
    updateUserStatus,
    setCurrentStatus,
  } = usePresenceStore();

  const updateStatus = useCallback((newStatus: UserStatus) => {
    const userEmail = session?.user?.email;
    if (userEmail) {
      updateUserStatus(userEmail, newStatus);
    }
    setCurrentStatus(newStatus);
  }, [session, updateUserStatus, setCurrentStatus]);

  const contextValue = {
    status: currentStatus as UserStatus,
    updateStatus,
    onlineUsers,
    isConnected,
  };

  return (
    <StatusContext.Provider value={contextValue}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const context = useContext(StatusContext);
  if (context === undefined) {
    throw new Error("useStatus must be used within a StatusProvider");
  }
  return context;
}
