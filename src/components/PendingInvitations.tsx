"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { InvitationService } from "@/services";
import { TeamInvitation } from "@/interfaces/teams";
import ErrorBoundary from './ErrorBoundary';

export default function PendingInvitations({ onInvitationAccepted }: { onInvitationAccepted?: () => void }) {
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchInvitations = async () => {
    try {
      const data = await InvitationService.getInvitations();
      setTeamInvitations(data.teamInvitations || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast.error("Failed to fetch invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleTeamAccept = async (teamSlug: string, invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    
    try {
      await InvitationService.acceptInvitation(teamSlug);

      toast.success("Team invitation accepted!");
      // Remove from team invitations list
      setTeamInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      // Notify parent component to refresh
      onInvitationAccepted?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Failed to accept team invitation";
      toast.error(errorMessage);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const handleTeamDecline = async (teamSlug: string, invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    
    try {
      await InvitationService.declineInvitation(teamSlug);

      toast.success("Team invitation declined");
      // Remove from team invitations list
      setTeamInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Failed to decline team invitation";
      toast.error(errorMessage);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalInvitations = teamInvitations.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (totalInvitations === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-medium">No pending invitations</p>
        <p className="text-sm">You&apos;re all caught up!</p>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Pending Invitations Error:', error, errorInfo);
      }}
      fallback={
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">Unable to load invitations</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was an error loading your pending invitations.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Pending Invitations ({totalInvitations})
      </h2>
      
      {/* Team Invitations */}
      {teamInvitations.map((invitation) => (
        <Card
          key={`team-${invitation.id}`}
          className="border border-blue-200 dark:border-blue-400 bg-blue-50 dark:bg-blue-950 shadow-sm rounded-lg"
        >
          <CardHeader className="pb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {invitation.addedBy?.image ? (
                  <Image
                    src={invitation.addedBy.image}
                    alt="avatar"
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-300 text-white rounded-full flex items-center justify-center text-sm">
                    {invitation.addedBy?.name?.[0] || "?"}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {invitation.team.name} (Team)
                </CardTitle>
                {invitation.team.description && (
                  <p className="text-sm text-muted-foreground dark:text-gray-400">{invitation.team.description}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-500 self-start mt-2 sm:mt-0">
              Team Invite
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="gap-2 sm:flex justify-between items-center">
              <div className="flex items-center flex-wrap gap-3">
                {invitation.addedBy && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>
                      Invited by {invitation.addedBy.name || invitation.addedBy.email}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(invitation.joinedAt)}</span>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs dark:text-gray-200 dark:bg-gray-700">
                {invitation.role}
              </Badge>
            </div>

            <div className="flex gap-2 border-t pt-3">
              <Button
                size="sm"
                onClick={() => handleTeamAccept(invitation.team.slug, invitation.id)}
                disabled={processingIds.has(invitation.id)}
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Check className="w-4 h-4 mr-1" />
                {processingIds.has(invitation.id) ? "Accepting..." : "Accept"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTeamDecline(invitation.team.slug, invitation.id)}
                disabled={processingIds.has(invitation.id)}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4 mr-1" />
                {processingIds.has(invitation.id) ? "Declining..." : "Decline"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </ErrorBoundary>
  );
}
