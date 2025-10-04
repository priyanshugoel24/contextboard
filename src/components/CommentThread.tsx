"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { getAblyClient } from "@/lib/ably/ably";
import { CommentService } from "@/services";
import type * as Ably from 'ably';
import { Comment } from "@/interfaces/comments";
import { paginationConfig } from '@/config/pagination';
import { channelsConfig } from '@/config/channels';
import ErrorBoundary from './ErrorBoundary';

// Helper function to merge and sort comments with deduplication
const mergeAndSortComments = (existingComments: Comment[], newComments: Comment[]): Comment[] => {
  const commentMap = new Map();
  
  // Add existing comments
  existingComments.forEach(comment => {
    commentMap.set(comment.id, comment);
  });
  
  // Add new comments
  newComments.forEach(comment => {
    commentMap.set(comment.id, comment);
  });
  
  // Return sorted array
  return Array.from(commentMap.values()).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

export default function CommentThread({ cardId }: { cardId: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchComments = useCallback(async (cursor?: string) => {
    setIsLoading(true);
    try {
      const data = await CommentService.getComments(cardId, paginationConfig.commentLimit, cursor);

      if (cursor) {
        // For pagination, append older comments and ensure no duplicates
        setComments((prev) => mergeAndSortComments(prev, data.comments));
      } else {
        // For initial load, replace all comments
        setComments(data.comments);
      }
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      console.error("Error loading comments", err);
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    if (!cardId) return;

    setComments([]);
    setNextCursor(null);
    setNewComment("");
    fetchComments();

    const user = session?.user as { id: string } | undefined;
    if (!user?.id) return;

    const ably = getAblyClient(user.id);
    const channel = ably.channels.get(channelsConfig.CARD_COMMENTS(cardId));

    const handleNewComment = (msg: Ably.Message) => {
      setComments((prev) => {
        // Add or update the new comment - msg.data contains the comment data
        const commentData = msg.data as Comment;
        return mergeAndSortComments(prev, [commentData]);
      });
    };

    // Subscribe to the channel
    channel.subscribe("comment:created", handleNewComment);

    return () => {
      // Only unsubscribe from our specific event handler
      channel.unsubscribe("comment:created", handleNewComment);
      
      // cleanup to prevent race conditions
      const cleanupChannel = async () => {
        try {
          // Check if channel is in a state where it can be safely detached
          if (channel.state === 'attached') {
            // Wait a small amount to allow any pending operations to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Only detach if still attached after the wait
            if (channel.state === 'attached') {
              await channel.detach();
            }
          }
        } catch (error) {
          console.debug('Channel cleanup completed with minor issues:', error instanceof Error ? error.message : 'Unknown error');
        }
      };
      
      cleanupChannel();
    };
  }, [cardId, session?.user, fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);

    try {
      await CommentService.createComment(cardId, {
        content: newComment
      });

      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="space-y-4 mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white">💬 Comments</h4>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Unable to load comments</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs text-blue-600 hover:text-blue-700 mt-2"
            >
              Refresh to try again
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-white">💬 Comments</h4>

      {/* New Comment Input */}
      <div className="flex items-start gap-2">
        <Avatar className="w-8 h-8">
          <AvatarImage src={session?.user?.image || ""} />
          <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            placeholder="Write a comment..."
            className="w-full text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 border border-gray-300 dark:border-gray-700"
          />
          <Button
            size="sm"
            className="text-sm"
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      {/* Comment List */}
      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={c.author.image} />
              <AvatarFallback>{c.author.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 w-full">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{c.author.name}</div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
              <div className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(c.createdAt))} ago
              </div>
            </div>
          </div>
        ))}
        
        {/* Load More Button */}
        {nextCursor && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchComments(nextCursor)}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load More Comments"}
            </Button>
          </div>
        )}
        </div>
      </div>
    </ErrorBoundary>
  );
}