"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { StandupService } from "@/services";

export default function TeamStandupDigest({ teamSlug }: { teamSlug: string }) {
  const [open, setOpen] = useState(false);
  const [digest, setDigest] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { status } = useSession();

  const handleFetchDigest = async () => {
    if (status !== "authenticated") return;
    setIsLoading(true);
    try {
      const data = await StandupService.getTeamStandup(teamSlug);
      setDigest(data.summary || null);
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Failed to retrieve the latest team updates";
      
      toast.error("Could not fetch team digest", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="flex items-center gap-2">
        📣 Team Standup Digest
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              📣 Team Standup Digest
            </DialogTitle>
          </DialogHeader>

          <div className="border border-border bg-background rounded-md p-4 whitespace-pre-wrap text-lg font-semibold leading-relaxed text-foreground min-h-[100px] shadow-sm">
            {digest ?? "Click refresh to load the latest team digest."}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={handleFetchDigest} 
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
