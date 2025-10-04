"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getAblyClient, type AblyStatusData } from "@/lib/ably/ably";
import { channelsConfig } from '@/config';
import type Ably from "ably";
import axios from "axios";
import { UserStatus } from "@/interfaces/common";

export function useAblyStatus() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<UserStatus>("Available");
  const [isConnected, setIsConnected] = useState(false);

  const ablyRef = useRef<Ably.Realtime | null>(null);
  const statusChannelRef = useRef<Ably.RealtimeChannel | null>(null);

  // Update status both locally and via API
  const updateStatus = useCallback(
    async (newStatus: UserStatus) => {
      const user = session?.user as { id: string };
      if (!user?.id) return;

      try {
        // Update local state immediately
        setStatus(newStatus);

        // Update via API (which will also publish to Ably)
        await axios.post("/api/status", { state: newStatus });
        statusChannelRef.current?.presence.update({
          userId: session?.user?.email,
          name: session?.user?.name || session?.user?.email,
          email: session?.user?.email,
          image: session?.user?.image,
          status: newStatus,
        });
        console.log("✅ Status updated via API:", newStatus);
      } catch (error: unknown) {
        console.error("❌ Error updating status:", error);
        // Revert local state if there was an error
        setStatus(status);
      }
    },
    [session?.user, status]
  );

  // Fetch initial status
  const fetchInitialStatus = useCallback(async () => {
    const user = session?.user as { id: string };
    if (!user?.id) return;

    try {
      const response = await axios.get("/api/status");
      const initialStatus = response.data.status?.state || "Available";
      setStatus(initialStatus);
      console.log("📥 Fetched initial status:", initialStatus);
    } catch (error) {
      console.error("❌ Error fetching initial status:", error);
    }
  }, [session?.user]);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback(
    (stateChange: Ably.ConnectionStateChange) => {
      console.log(
        "🌐 Ably status connection state changed:",
        stateChange.current
      );
      setIsConnected(stateChange.current === "connected");
    },
    []
  );

  // Handle status updates from other users (and ourselves)
  const handleStatusMessage = useCallback(
    (message: Ably.Message) => {
      const statusData = message.data as AblyStatusData;
      const user = session?.user as { id?: string };

      // Only update if it's our own status update
      if (statusData.userId === user?.id) {
        setStatus(statusData.state as UserStatus);
        console.log(
          "📡 Received own status update via Ably:",
          statusData.state
        );
      }
    },
    [session?.user]
  );

  // Main effect - initialize connection
  useEffect(() => {
    const user = session?.user as { id: string };
    if (!user?.id) {
      console.log("⏳ useAblyStatus waiting for session");
      setIsConnected(false);
      return;
    }

    console.log("🔌 Starting Ably status connection");

    try {
      const ably = getAblyClient(user.id);
      ablyRef.current = ably;

      const statusChannel = ably.channels.get(channelsConfig.STATUS_UPDATES);
      statusChannelRef.current = statusChannel;

      // Set up connection state listener
      ably.connection.on(handleConnectionStateChange);

      // Set up status message listener
      statusChannel.subscribe("status-update", handleStatusMessage);

      // Set initial connection state
      setIsConnected(ably.connection.state === "connected");

      // Fetch initial status
      fetchInitialStatus();
      // Enter Ably presence with status info
        statusChannel.presence.enter({
        email: session?.user?.email,
        name: session?.user?.name || session?.user?.email,
        image: session?.user?.image,
        status: status,
      });
    } catch (error) {
      console.error("❌ Failed to initialize Ably status:", error);
      setIsConnected(false);
    }

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up Ably status connection");

      if (ablyRef.current) {
        ablyRef.current.connection.off(handleConnectionStateChange);
      }

      if (statusChannelRef.current) {
        statusChannelRef.current.unsubscribe(
          "status-update",
          handleStatusMessage
        );
      }

      setIsConnected(false);
    };
  }, [
    session?.user,
    handleConnectionStateChange,
    handleStatusMessage,
    fetchInitialStatus,
    status,
  ]);

  return {
    status,
    updateStatus,
    isConnected,
  };
}
