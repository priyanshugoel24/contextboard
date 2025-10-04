'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderOpen } from 'lucide-react';
import { TeamWithRelations } from '@/interfaces/teams';
import { TeamsDisplayProps } from '@/interfaces/ui-components';
import { CreateTeamModal } from './modals';
import PendingInvitations from './PendingInvitations';
import { TeamService } from '@/services';

export default function TeamsDisplay({ initialTeams }: TeamsDisplayProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamWithRelations[]>(initialTeams || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only fetch teams when explicitly needed (e.g., after creating/joining a team)
  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TeamService.getAllTeams();
      setTeams(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null
        ? error.response as { status?: number; data?: { error?: string } }
        : null;

      if (errorMessage?.status === 401) {
        console.error('Unauthorized - please log in again');
        setError('Please log in again to access your teams');
      } else if (errorMessage?.status === 404) {
        console.warn('User not found, treating as no teams available');
        setTeams([]);
      } else {
        console.error(`Failed to fetch teams: ${errorMessage?.status || 'unknown'}`);
        setError('Unable to load teams. Please try again.');
      }
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  // Prefetch team routes when teams are available
  useEffect(() => {
    teams.forEach((team) => {
      if (team.slug) {
        // Prefetch main team page for all teams
        router.prefetch(`/team/${team.slug}`);
        
        // Prefetch important sub-pages for teams with projects
        if (team._count?.projects && team._count.projects > 0) {
          router.prefetch(`/team/${team.slug}/analytics`);
          router.prefetch(`/team/${team.slug}/settings`);
        }
      }
    });
  }, [teams, router]);

  // Handle team card hover - prefetch related routes immediately
  const handleTeamHover = useCallback((teamSlug: string) => {
    // Prefetch main routes that are likely to be visited
    router.prefetch(`/team/${teamSlug}`);
    router.prefetch(`/team/${teamSlug}/analytics`);
    router.prefetch(`/team/${teamSlug}/settings`);
    router.prefetch(`/team/${teamSlug}/assigned-cards`);
  }, [router]);

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Teams</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Collaborate and manage projects across your teams
          </p>
        </div>
        <CreateTeamModal onTeamCreated={fetchTeams} />
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading teams
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"
                  onClick={() => {
                    setError(null);
                    fetchTeams();
                  }}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      <div className="mb-8">
        <PendingInvitations onInvitationAccepted={fetchTeams} />
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
              <CardFooter>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            No teams found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first team to get started with collaborative project management.
          </p>
          <CreateTeamModal onTeamCreated={fetchTeams} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card 
              key={team.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onMouseEnter={() => handleTeamHover(team.slug)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{team.name}</span>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    {team.role}
                  </span>
                </CardTitle>
                {team.description && (
                  <CardDescription className="line-clamp-2">
                    {team.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{team._count?.members || 0} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FolderOpen className="h-4 w-4" />
                    <span>{team._count?.projects || 0} projects</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => router.push(`/team/${team.slug}`)}
                >
                  View Team
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
