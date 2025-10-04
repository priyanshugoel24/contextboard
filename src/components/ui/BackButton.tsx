"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/utils/ui";
import { BackButtonProps } from "@/interfaces/ui-components";

export default function BackButton({ 
  label = "Back", 
  className,
  variant = "ghost",
  size = "default"
}: BackButtonProps) {
  const router = useRouter();

  // Prefetch common parent routes when BackButton mounts
  useEffect(() => {
    // Prefetch common dashboard routes that users might navigate back to
    router.prefetch('/');
    
    // Get current path to determine likely parent routes
    const currentPath = window.location.pathname;
    
    // Team project -> team page
    const teamProjectMatch = currentPath.match(/\/team\/([^\/]+)\/project\/[^\/]+/);
    if (teamProjectMatch) {
      router.prefetch(`/team/${teamProjectMatch[1]}`);
    }
    
    // Team analytics -> team page  
    const teamAnalyticsMatch = currentPath.match(/\/team\/([^\/]+)\/analytics/);
    if (teamAnalyticsMatch) {
      router.prefetch(`/team/${teamAnalyticsMatch[1]}`);
    }
    
    // Project analytics -> project page
    const projectAnalyticsMatch = currentPath.match(/\/team\/([^\/]+)\/project\/([^\/]+)\/analytics/);
    if (projectAnalyticsMatch) {
      router.prefetch(`/team/${projectAnalyticsMatch[1]}/project/${projectAnalyticsMatch[2]}`);
    }
    
    // Project settings -> project page
    const projectSettingsMatch = currentPath.match(/\/team\/([^\/]+)\/project\/([^\/]+)\/settings/);
    if (projectSettingsMatch) {
      router.prefetch(`/team/${projectSettingsMatch[1]}/project/${projectSettingsMatch[2]}`);
    }
  }, [router]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBack}
      className={cn("flex items-center gap-2", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
