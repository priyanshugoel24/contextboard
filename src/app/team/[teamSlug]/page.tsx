import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Navbar } from '@/components';
import { TeamPageClient } from '@/components/client';
import { TeamPageTeam, TeamWithRelations } from '@/interfaces/teams';
import { TeamPageProps } from '@/interfaces/ui-components';
import { Session } from 'next-auth';
import { Metadata } from 'next';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { findTeamBySlugWithRelations, getUserTeamMembership } from '@/queries/team-queries';
import { findTeamActivities } from '@/queries/activity-queries';
import { getProjectStatistics } from '@/queries/project-queries';

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { teamSlug } = await params;
  
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.email) {
      return {
        title: 'Team Dashboard',
        description: 'Access your team dashboard to collaborate on projects and tasks.',
      };
    }

    // Get team data for metadata
    const team = await findTeamBySlugWithRelations(teamSlug);

    if (!team) {
      return {
        title: 'Team Not Found',
        description: 'The requested team could not be found.',
      };
    }

    const title = `${team.name} - Team Dashboard`;
    const description = team.description || `Collaborate with ${team._count.members} members across ${team._count.projects} projects in ${team.name} team dashboard.`;

    return {
      title,
      description,
      keywords: ['team collaboration', 'project management', 'team dashboard', team.name],
      openGraph: {
        title: `${team.name} - Team Dashboard | Context Board`,
        description,
        type: 'website',
        locale: 'en_US',
        siteName: 'Context Board',
      },
      twitter: {
        card: 'summary',
        title: `${team.name} - Team Dashboard | Context Board`,
        description,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for team page:', error);
    return {
      title: 'Team Dashboard',
      description: 'Access your team dashboard to collaborate on projects and tasks.',
    };
  }
}

// Server-side data fetching
async function fetchTeam(teamSlug: string): Promise<TeamPageTeam | null> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return null;
    }

    // Get team with relations
    const team = await findTeamBySlugWithRelations(teamSlug);
    if (!team) {
      return null;
    }

    // Check if user is a member of this
    const userMembership = await getUserTeamMembership(user.id, teamSlug);
    if (!userMembership) {
      return null;
    }

    // Calculate task completion stats for each project
    const projectsWithStats = await Promise.all(
      team.projects.map(async (project) => {
        // Get project statistics
        const stats = await getProjectStatistics(project.id);

        return {
          ...project,
          createdAt: project.createdAt.toISOString(),
          lastActivityAt: project.lastActivityAt.toISOString(),
          stats,
        };
      })
    );

    // Get team activities
    const activities = await findTeamActivities([team.id], {
      includeProjects: true,
      take: 100,
    });

    return {
      ...team,
      projects: projectsWithStats,
      userRole: userMembership.role,
      currentUserId: user.id,
      hackathonDeadline: team.hackathonDeadline?.toISOString(),
      activities: activities.map(activity => ({
        ...activity,
        createdAt: activity.createdAt.toISOString(),
      })),
    } as unknown as TeamPageTeam;
  } catch (error) {
    console.error('Error fetching team:', error);
    return null;
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const session = await getServerSession(authOptions) as Session | null;
  
  if (!session) {
    redirect('/');
  }

  const { teamSlug } = await params;
  const team = await fetchTeam(teamSlug);
  
  if (!team) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Team not found</h1>
            <p className="text-muted-foreground">The team you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          </div>
        </div>
      </div>
    );
  }

  return <TeamPageClient initialTeam={team as unknown as TeamWithRelations} teamSlug={teamSlug} />;
}