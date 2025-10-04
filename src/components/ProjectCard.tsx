"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/ui";
import { Folder, Calendar, Archive } from "lucide-react";
import { ProjectCardData } from "@/interfaces/projects";
import { ProjectService } from "@/services";

export default function ProjectCardGrid({ onRefreshNeeded }: { 
  onRefreshNeeded?: (refreshFn: () => void) => void;
}) {
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();

  // Handle project hover - prefetch related routes
  const handleProjectHover = useCallback((projectSlug: string) => {
    router.prefetch(`/projects/${projectSlug}`);
    // Also prefetch potential team-based project routes if this is accessed from a team context
    // This covers cases where projects might be viewed through teams
    router.prefetch(`/projects/${projectSlug}/analytics`);
    router.prefetch(`/projects/${projectSlug}/settings`);
  }, [router]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ProjectService.getAllProjects(true);
      setAllProjects(data.projects || []);
      // Filter out archived projects
      const filteredProjects = data.projects?.filter((project: ProjectCardData) => 
        showArchived ? true : !project.isArchived
      );
      setProjects(filteredProjects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchProjects();
    // Expose refresh function to parent
    onRefreshNeeded?.(fetchProjects);
  }, [onRefreshNeeded, fetchProjects]);

  useEffect(() => {
    // Filter projects based on showArchived state
    if (allProjects.length > 0) {
      const filteredProjects = allProjects.filter((project) => 
        showArchived ? true : !project.isArchived
      );
      setProjects(filteredProjects);
    }
  }, [showArchived, allProjects]);

  const toggleShowArchived = () => {
    setShowArchived(!showArchived);
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2">Loading projects...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
        <Folder className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-medium text-gray-800 dark:text-gray-100">No projects found</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">Create your first project to get started!</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleProjectClick = (projectSlug: string) => {
    router.push(`/projects/${projectSlug}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Projects</h2>
          <button
            onClick={toggleShowArchived}
            className="flex items-center space-x-1 text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Archive className="h-3.5 w-3.5 mr-1" />
            {showArchived ? "Hide Archived" : "Show Archived"}
          </button>
          {showArchived && allProjects.some(project => project.isArchived) && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {allProjects.filter(project => project.isArchived).length} archived
            </span>
          )}
        </div>
        {/* <button
          onClick={() => router.push('/projects/new')}
          className="bg-blue-600 dark:bg-blue-700 text-white rounded-md px-3 py-1.5 text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          New Project
        </button> */}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card
            key={project.id}
            className={cn(
              "cursor-pointer group hover:shadow-md hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition border border-gray-200 dark:border-gray-700 h-full rounded-lg bg-white dark:bg-gray-900 p-2",
              project.isArchived && "opacity-60"
            )}
            onClick={() => handleProjectClick(project.slug)}
            onMouseEnter={() => handleProjectHover(project.slug)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2 flex-1">
                <div className="flex items-center space-x-2">
                  <Folder className="h-5 w-5 text-blue-500" />
                  {project.isArchived && <Archive className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
                </div>
                <CardTitle className="text-[15px] font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                  {project.name}
                </CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-2 px-2 pb-3">
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(project.lastActivityAt)}</span>
                </div>
              </div>
              
              {project._count && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {project._count.contextCards} context card{project._count.contextCards !== 1 ? 's' : ''}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 overflow-x-auto max-w-full scrollbar-hide">
                {project.tags && project.tags.length > 0 && (
                  <>
                    {project.tags.slice(0, 3).map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs rounded-md">
                        {tag}
                      </Badge>
                    ))}
                    {project.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs rounded-md">
                        +{project.tags.length - 3} more
                      </Badge>
                    )}
                  </>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs rounded-md">
                    {project.isArchived ? "Archived" : "Active"}
                  </Badge>
                  {project.createdBy && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      by {project.createdBy.name || project.createdBy.email}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}