import { UserStatus } from "@/interfaces/common";

export const statusConfig = {
  options: [
    { value: "Available" as UserStatus, label: "Available", color: "bg-green-500" },
    { value: "Busy" as UserStatus, label: "Busy", color: "bg-yellow-500" },
    { value: "Focused" as UserStatus, label: "Focused", color: "bg-red-500" },
  ],
  
  defaultStatus: "Available" as UserStatus,
  
  // Presence update intervals
  PRESENCE_UPDATE_INTERVAL: 30000, // 30 seconds
  PRESENCE_TIMEOUT: 60000, // 1 minute
  
  // Status persistence
  STATUS_PERSIST_INTERVAL: 5000, // 5 seconds
} as const;
