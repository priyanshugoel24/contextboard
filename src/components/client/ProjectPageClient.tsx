"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components";
import ContextCardList from "@/components/ContextCardList";
import OnlineUsers from "@/components/OnlineUsers";
import ActivityFeed from "@/components/ActivityFeed";
import BackButton from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Archive,
  Settings,
  UserRound,
  BarChart3,
} from "lucide-react";
import { ProjectPageClientProps } from '@/interfaces/ui-components';
import { ContextCardWithRelations } from '@/interfaces/context-cards';
import { ActivityWithRelations } from '@/interfaces/activities';

export default function ProjectPageClient({ 
  project, 
  team, 
  teamSlug, 
  projectSlug 
}: ProjectPageClientProps) {
  const router = useRouter();

  // Prefetch related routes when component mounts
  useEffect(() => {
    router.prefetch(`/team/${teamSlug}/project/${projectSlug}/analytics`);
    router.prefetch(`/team/${teamSlug}/project/${projectSlug}/settings`);
    router.prefetch(`/team/${teamSlug}`); // Back to team page
  }, [teamSlug, projectSlug, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 md:px-10 md:py-10">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
          <Link 
            href={`/team/${teamSlug}`}
            className="hover:text-gray-900 dark:hover:text-white transition"
            onMouseEnter={() => router.prefetch(`/team/${teamSlug}`)}
          >
            {team.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{project.name}</span>
        </div>

        {/* Back Button */}
        <BackButton 
          label="Back to Team" 
          className="mb-8"
        />

        {/* Project Header */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 tracking-tight">
                  {project.name}
                </h1>
                {project.isArchived && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>

              {project.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                  {project.description}
                </p>
              )}

              {/* Progress Bar */}
              {project.stats && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Task Progress
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {project.stats.completedTasks}/{project.stats.totalTasks} tasks completed
                    </span>
                  </div>
                  <Progress value={project.stats.progress} className="h-2" />
                </div>
              )}

              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Updated {project.lastActivityAt ? formatDate(project.lastActivityAt) : formatDate(project.updatedAt)}</span>
                </div>
              </div>

              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {project.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-2 ml-6">
              <Button variant="outline" size="sm" asChild>
                <Link 
                  href={`/team/${teamSlug}/project/${projectSlug}/analytics`}
                  onMouseEnter={() => router.prefetch(`/team/${teamSlug}/project/${projectSlug}/analytics`)}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Analytics
                </Link>
              </Button>

              <Button variant="outline" size="sm" asChild>
                <Link 
                  href={`/team/${teamSlug}/project/${projectSlug}/settings`}
                  onMouseEnter={() => router.prefetch(`/team/${teamSlug}/project/${projectSlug}/settings`)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Context Cards */}
          <div className="lg:col-span-3">
            <ContextCardList 
              projectSlug={projectSlug}
              initialCards={project.contextCards as unknown as ContextCardWithRelations[] || []}
              project={project}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Recent Activity
              </h3>
              <ActivityFeed 
                projectId={project.id} 
                initialActivities={project.activities as unknown as ActivityWithRelations[] || []}
              />
            </div>

            {/* Online Team Members */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <UserRound className="h-4 w-4 mr-2" />
                Online Now
              </h3>
              <OnlineUsers />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
