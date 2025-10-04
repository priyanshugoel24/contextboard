"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAblyClient } from "@/lib/ably/ably";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectService, TeamService } from "@/services";
import type * as Ably from 'ably';
import { ActivityFeedProps } from "@/interfaces/ui-components";
import { ActivityWithRelations } from "@/interfaces/activities";
import { channelsConfig } from '@/config/channels';

export default function ActivityFeed({ projectId, slug, teamSlug, initialActivities }: ActivityFeedProps) {
  const { data: session } = useSession();
  const [activities, setActivities] = useState<ActivityWithRelations[]>(initialActivities || []);
  const [loading, setLoading] = useState(!initialActivities);
  const [actualProjectId, setActualProjectId] = useState<string | null>(null);

  const identifier = projectId || slug;

  useEffect(() => {
    // If we have initial activities, don't fetch them again
    if (initialActivities && initialActivities.length > 0) {
      setLoading(false);
      return;
    }

    if (!identifier && !teamSlug) return;

    const fetchActivities = async () => {
      try {
        let data;
        if (teamSlug) {
          // Fetch team activities
          data = await TeamService.getTeamActivities(teamSlug);
        } else if (identifier) {
          // Fetch project activities
          data = await ProjectService.getProjectActivities(identifier);
        } else {
          return;
        }
        
        setActivities((data?.activities ?? []) as unknown as ActivityWithRelations[]);
        
        // If we used slug, we need to get the actual projectId for Ably channel
        if (slug && !projectId && !teamSlug) {
          const projectData = await ProjectService.getProject(slug);
          if (projectData.project?.id) {
            setActualProjectId(projectData.project.id);
          }
        } else if (projectId) {
          setActualProjectId(projectId);
        }
      } catch (err) {
        console.error("Failed to fetch activity log:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [identifier, projectId, slug, teamSlug, initialActivities]);

  // Subscribe to activity updates
  useEffect(() => {
    if (!actualProjectId || !session?.user) return;

    const user = session.user as { id: string };
    if (!user.id) return;
    
    const ably = getAblyClient(user.id);
    const channel = ably.channels.get(channelsConfig.PROJECT_CHANNEL(actualProjectId));

    const handleNewActivity = (msg: Ably.Message) => {
      if (msg.name === "activity:created") {
        const activityData = msg.data as ActivityWithRelations;
        setActivities((prev) => [activityData, ...prev]);
      }
    };

    channel.subscribe("activity:created", handleNewActivity);

    return () => {
      channel.unsubscribe("activity:created", handleNewActivity);
      // Don't release channels as they might be used by other components
      // Just unsubscribe from our specific events
    };
  }, [actualProjectId, session?.user]);

  if (loading) {
    return <Skeleton className="h-24 w-full bg-gray-100 dark:bg-gray-800" />;
  }

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1 custom-scrollbar">
      {activities.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          <p>No activity yet. Start by creating context cards or adding comments!</p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }} 
              className="flex items-start gap-3 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all"
            >
              {activity.user?.image ? (
                <Image
                  src={activity.user.image}
                  alt={activity.user.name || 'User'}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-semibold">
                  👤
                </div>
              )}

              <div>
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-tight">
                  <span className="font-semibold text-gray-900 dark:text-white">{activity.user?.name}</span> {activity.description}
                  {activity.project && teamSlug && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      in {activity.project.name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}