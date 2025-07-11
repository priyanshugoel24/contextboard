"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, User, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Invitation {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  status: string;
  joinedAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    link?: string;
    tags: string[];
    createdAt: string;
    lastActivityAt: string;
  };
  addedBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  } | null;
}

export default function PendingInvitations({ onInvitationAccepted }: { onInvitationAccepted?: () => void }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchInvitations = async () => {
    try {
      const res = await fetch("/api/invitations");
      const data = await res.json();
      setInvitations(data.invitations || []);
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

  const handleAccept = async (projectSlug: string, invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    
    try {
      const res = await fetch(`/api/projects/${projectSlug}/accept-invite`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Invitation accepted! Project added to your dashboard.");
        // Remove from invitations list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        // Notify parent component to refresh project list
        onInvitationAccepted?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to accept invitation");
      }
    } catch {
      toast.error("Error accepting invitation");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const handleDecline = async (projectSlug: string, invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    
    try {
      const res = await fetch(`/api/projects/${projectSlug}/decline-invite`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Invitation declined");
        // Remove from invitations list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to decline invitation");
      }
    } catch {
      toast.error("Error declining invitation");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-medium">No pending invitations</p>
        <p className="text-sm">You&apos;re all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Pending Invitations ({invitations.length})
      </h2>
      
      {invitations.map((invitation) => (
        <Card
          key={invitation.id}
          className="border border-orange-200 dark:border-orange-400 bg-orange-50 dark:bg-orange-950 shadow-sm rounded-lg"
        >
          <CardHeader className="pb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {invitation.addedBy?.image ? (
                  <img
                    src={invitation.addedBy.image}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-orange-300 text-white rounded-full flex items-center justify-center text-sm">
                    {invitation.addedBy?.name?.[0] || "?"}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {invitation.project.name}
                </CardTitle>
                {invitation.project.description && (
                  <p className="text-sm text-muted-foreground dark:text-gray-400">{invitation.project.description}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-500 self-start mt-2 sm:mt-0">
              Pending
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

            {invitation.project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {invitation.project.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs dark:text-gray-200 dark:border-gray-500">
                    {tag}
                  </Badge>
                ))}
                {invitation.project.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs dark:text-gray-200 dark:border-gray-500">
                    +{invitation.project.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            <div className="flex gap-2  border-t pt-3">
              <Button
                size="sm"
                onClick={() => handleAccept(invitation.project.slug, invitation.id)}
                disabled={processingIds.has(invitation.id)}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                {processingIds.has(invitation.id) ? "Accepting..." : "Accept"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDecline(invitation.project.slug, invitation.id)}
                disabled={processingIds.has(invitation.id)}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                {processingIds.has(invitation.id) ? "Declining..." : "Decline"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
