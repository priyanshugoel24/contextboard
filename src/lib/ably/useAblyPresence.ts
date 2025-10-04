"use client";
import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getAblyClient, type AblyPresenceData } from "@/lib/ably/ably";
import { channelsConfig } from '@/config';
import type Ably from 'ably';
import axios from "axios";
import { usePresenceStore } from '@/lib/store';
import { PresenceUser } from '@/interfaces/store';
import { UserStatus } from '@/interfaces/common';

export function useAblyPresence() {
  const { data: session, status: sessionStatus } = useSession();
  const {
    setOnlineUsers,
    addOrUpdateUser,
    removeUser,
    setIsConnected,
    setCurrentStatus,
    updateUserStatus,
    currentStatus,
  } = usePresenceStore();

  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const presenceRef = useRef<Ably.RealtimePresence | null>(null);

  const convertPresenceMembers = useCallback((members: Ably.PresenceMessage[]): PresenceUser[] => {
    return members.map(member => {
      const data = member.data as AblyPresenceData;
      const presenceEmail = data?.email || '';
      return {
        id: presenceEmail,
        name: data?.name || presenceEmail.split('@')[0] || 'User',
        image: data?.image,
        status: (data?.status as UserStatus) || 'Unavailable',
        lastSeen: data?.lastSeen || new Date().toISOString(),
      };
    });
  }, []);

  const updatePresenceMembers = useCallback(async () => { 
    if (!presenceRef.current) return;
    try {
      const members = await presenceRef.current.get();
      const users = convertPresenceMembers(members);
      setOnlineUsers(users);
    } catch (error) {
      console.error("❌ Failed to get presence members:", error);
    }
  }, [convertPresenceMembers, setOnlineUsers]);

  const handlePresenceEvent = useCallback((presenceMessage: Ably.PresenceMessage) => {
    const data = presenceMessage.data as AblyPresenceData;
    const presenceEmail = data?.email;

    if (!presenceEmail) return;

    const user: PresenceUser = {
      id: presenceEmail,
      name: data.name || presenceEmail.split('@')[0] || "User",
      image: data.image,
      status: (data.status as UserStatus) || "Available",
      lastSeen: data.lastSeen || new Date().toISOString(),
    };

    if (presenceMessage.action === 'enter' || presenceMessage.action === 'update') {
      addOrUpdateUser(user);
    } else if (presenceMessage.action === 'leave') {
      removeUser(user.id);
    }
  }, [addOrUpdateUser, removeUser]);

  const updateStatus = useCallback(async (newStatus: UserStatus): Promise<void> => {
    const user = session?.user as { id: string; name?: string; email?: string; image?: string };
    if (!user?.id || !presenceRef.current || !user.email) return;

    const oldStatus = currentStatus;
    // Optimistically update the UI
    updateUserStatus(user.email, newStatus);
    setCurrentStatus(newStatus);

    try {
      const presenceData: AblyPresenceData = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || "User",
        email: user.email || "",
        image: user.image,
        status: newStatus,
        lastSeen: new Date().toISOString(),
      };

      presenceRef.current.update(presenceData);
      await axios.post("/api/status", { state: newStatus });
    } catch (error) {
      console.error("❌ Failed to update status, reverting:", error);
      // Revert UI on error
      updateUserStatus(user.email, oldStatus);
      setCurrentStatus(oldStatus);
      throw error;
    }
  }, [session?.user, currentStatus, updateUserStatus, setCurrentStatus]);

  const fetchInitialStatus = useCallback(async () => {
    const user = session?.user as { id: string };
    if (!user?.id) return;
    try {
      const response = await axios.get("/api/status");
      const initialStatus = response.data.status?.state || "Available";
      setCurrentStatus(initialStatus as UserStatus);
    } catch (error) {
      console.error("❌ Error fetching initial status:", error);
    }
  }, [session?.user, setCurrentStatus]);

  const enterPresence = useCallback(async () => {
    const user = session?.user as { id: string; name?: string; email?: string; image?: string };
    if (!user?.id || !channelRef.current) return;
    try {
      const presenceData: AblyPresenceData = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || "User",
        email: user.email || "",
        image: user.image,
        status: currentStatus,
        lastSeen: new Date().toISOString(),
      };
      await channelRef.current.presence.enter(presenceData);
    } catch (error) {
      console.error("❌ Failed to enter presence:", error);
    }
  }, [session?.user, currentStatus]);

  const leavePresence = useCallback(async () => {
    if (!channelRef.current) return;
    try {
      await channelRef.current.presence.leave();
    } catch (error) {
      console.error("❌ Failed to leave presence:", error);
    }
  }, []);

  const handleConnectionStateChange = useCallback((stateChange: Ably.ConnectionStateChange) => {
    setIsConnected(stateChange.current === 'connected');
    if (stateChange.current === 'connected') {
      setTimeout(() => enterPresence(), 1000);
    }
  }, [enterPresence, setIsConnected]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !session?.user) {
      setIsConnected(false);
      return;
    }

    const initializeAbly = async () => {
      try {
        const user = session.user as { id: string };
        const client = getAblyClient(user.id);
        const channel = client.channels.get(channelsConfig.PRESENCE_GLOBAL);
        
        channelRef.current = channel;
        presenceRef.current = channel.presence;

        channel.presence.subscribe(['enter', 'leave', 'update'], handlePresenceEvent);
        client.connection.on(handleConnectionStateChange);

        setIsConnected(client.connection.state === 'connected');

        await fetchInitialStatus();
        await enterPresence();
        await updatePresenceMembers();
      } catch (error) {
        console.error("❌ Failed to initialize Ably presence:", error);
        setIsConnected(false);
      }
    };

    initializeAbly();

    return () => {
      const client = getAblyClient();
      if (client.connection) {
        client.connection.off(handleConnectionStateChange);
      }
      leavePresence();
      if (channelRef.current) {
        channelRef.current.presence.unsubscribe();
        channelRef.current = null;
      }
      presenceRef.current = null;
      setIsConnected(false);
    };
  }, [
    sessionStatus,
    session?.user,
    handlePresenceEvent,
    handleConnectionStateChange,
    fetchInitialStatus,
    enterPresence,
    updatePresenceMembers,
    leavePresence,
    setIsConnected,
  ]);

  return { updateStatus };
}
