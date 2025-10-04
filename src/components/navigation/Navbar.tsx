"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { usePresenceStore } from "@/lib/store";
import { useAblyPresence } from "@/lib/ably/useAblyPresence";
import { ThemeToggle } from "../ThemeToggle";
import { SearchBar } from "@/components";
import { UserStatus } from "@/interfaces/common";
import { ErrorBoundary } from '@/components';
import Image from 'next/image';

export default function Navbar() {
  const { data: session, status } = useSession();
  const { isConnected, currentStatus, updateUserStatus: updateStoreStatus } = usePresenceStore();
  const { updateStatus } = useAblyPresence();
  
  const [statusLoading, setStatusLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const statusOptions: Array<{ value: UserStatus; label: string; color: string }> = [
    { value: "Available", label: "Available", color: "bg-green-500" },
    { value: "Busy", label: "Busy", color: "bg-yellow-500" },
    { value: "Focused", label: "Focused", color: "bg-red-500" },
  ];

  const handleStatusUpdate = async (newState: UserStatus) => {
    if (!session?.user?.email) return;
    
    setStatusLoading(true);
    setError("");
    
    const oldStatus = currentStatus;
    // Optimistically update the Zustand store
    updateStoreStatus(session.user.email, newState);

    try {
      await updateStatus(newState);
      setDropdownOpen(false);
    } catch (err) {
      setError("Failed to update status");
      console.error("❌ Error updating status:", err);
      // Revert status in store if Ably update fails
      updateStoreStatus(session.user.email, oldStatus);
    } finally {
      setStatusLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusConfig =
    statusOptions.find((option) => option.value === currentStatus) ||
    statusOptions[0];

  // Always render the navbar structure to avoid hydration mismatch
  // Show loading state when session is not available or during initial hydration
  if (!isClient || status === "loading") {
    return (
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-6 h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-[200px]">
            <div className="text-lg font-semibold text-gray-800 dark:text-white tracking-tight">
              📋 HackFlow
            </div>
          </div>
          <div className="w-full ml-48">
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border">
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-5 mr-16">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white flex-shrink-0 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-sm" suppressHydrationWarning>
      <div className="px-6 h-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-[200px]">
          <Link
            href="/"
            className="text-lg font-semibold text-gray-800 dark:text-white tracking-tight hover:opacity-80 transition"
          >
            📋 HackFlow
          </Link>
          {!isConnected && (
            <span className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300 px-2 py-1 rounded">
              Reconnecting...
            </span>
          )}
        </div>

        <div className="w-full ml-48">
          <ErrorBoundary
            fallback={
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border">
                  <span className="text-sm text-muted-foreground">Search unavailable</span>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            }
          >
            <SearchBar />
          </ErrorBoundary>
        </div>

        <div className="flex items-center gap-5 mr-16" ref={dropdownRef}>
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Profile Button */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border hover:shadow-sm transition bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white flex-shrink-0"
            disabled={statusLoading}
          >
            <Image
              src={session.user?.image || "/default-avatar.svg"}
              alt="User Avatar"
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
            <span>
              {session.user?.name || session.user?.email?.split("@")[0]}
            </span>
            <div
              className={`w-2 h-2 rounded-full ${statusConfig.color}`}
            ></div>
            <svg
              className={`w-4 h-4 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-14 right-4 w-52 rounded-xl bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black ring-opacity-5 z-20 py-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusUpdate(option.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                    currentStatus === option.value
                      ? "bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  disabled={statusLoading}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${option.color}`}
                    ></div>
                    <span>{option.label}</span>
                  </div>
                  {currentStatus === option.value && (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
              <button
                onClick={() => signOut()}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900 border-t border-gray-100 dark:border-gray-700"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute top-full right-0 mt-2 px-4 py-2 bg-red-50 dark:bg-red-900 text-sm text-red-600 dark:text-red-300 border border-red-300 dark:border-red-500 rounded-md shadow-md z-30">
            {error}
          </div>
        )}
      </div>
    </nav>
  );
}
