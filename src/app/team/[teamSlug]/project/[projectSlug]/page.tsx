import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Navbar } from "@/components";
import { ProjectPageClient } from "@/components/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProjectPageProps } from '@/interfaces/ui-components';
import { ProjectData } from '@/interfaces/projects';
import { TeamWithRelations } from '@/interfaces/teams';
import { Session } from 'next-auth';
import { Metadata } from 'next';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { findUserAccessibleProject } from '@/queries/project-queries';
import { findTeamActivities } from '@/queries/activity-queries';

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { projectSlug } = await params;
  
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.email) {
      return {
        title: 'Project Dashboard',
        description: 'Access your project dashboard to manage tasks and collaborate.',
      };
    }

    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return {
        title: 'Project Dashboard',
        description: 'Access your project dashboard to manage tasks and collaborate.',
      };
    }

    // Get project data for metadata using service layer
    const project = await findUserAccessibleProject(projectSlug, user.id, {
      include: {
        _count: {
          select: {
            contextCards: true,
          },
        },
        team: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!project) {
      return {
        title: 'Project Not Found',
        description: 'The requested project could not be found.',
      };
    }

    const title = `${project.name} - Project Dashboard | ${project.team?.name}`;
    const description = project.description || `Manage ${project.name} project with ${project._count.contextCards} context cards. Collaborate efficiently on tasks and track progress.`;

    const keywords = [
      'project management',
      'task tracking',
      'team collaboration',
      project.name,
      project.team?.name || '',
      ...(project.tags || []),
    ].filter(Boolean);

    return {
      title,
      description,
      keywords,
      openGraph: {
        title: `${project.name} - Project Dashboard | ${project.team?.name} | Context Board`,
        description,
        type: 'website',
        locale: 'en_US',
        siteName: 'Context Board',
      },
      twitter: {
        card: 'summary',
        title: `${project.name} - Project Dashboard | ${project.team?.name} | Context Board`,
        description,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for project page:', error);
    return {
      title: 'Project Dashboard',
      description: 'Access your project dashboard to manage tasks and collaborate.',
    };
  }
}

// Server-side data fetching
async function fetchProjectData(teamSlug: string, projectSlug: string): Promise<{
  project: ProjectData;
  team: TeamWithRelations;
} | null> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return null;
    }

    // Get project with relations
    const project = await findUserAccessibleProject(projectSlug, user.id, {
      include: {
        team: {
          include: {
            members: {
              include: {
                user: true,
              },
              where: { status: 'ACTIVE' },
            },
          },
        },
        contextCards: {
          include: {
            user: true,
            assignedTo: true,
          },
          where: { isArchived: false },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            contextCards: {
              where: {
                type: 'TASK',
                isArchived: false,
              },
            },
          },
        },
      },
    });

    if (!project || !project.team || project.team.slug !== teamSlug) {
      return null;
    }

    // Check if user is a member of this team
    const userMembership = project.team.members.find(
      (member) => member.userId === user.id
    );

    if (!userMembership) {
      return null;
    }

    // Get project activities 
    const activities = await findTeamActivities([project.team.id], {
      includeProjects: true,
      take: 50,
    });

    // Calculate task stats
    const totalTasks = project._count?.contextCards || 0;
    const completedTasks = project.contextCards?.filter(card => 
      card.type === 'TASK' && card.status === 'CLOSED'
    ).length || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      project: {
        ...project,
        lastActivityAt: project.lastActivityAt.toISOString(),
        activities: activities.map(activity => ({
          ...activity,
          createdAt: activity.createdAt.toISOString(),
        })),
        stats: {
          totalTasks,
          completedTasks,
          progress: Math.round(progress),
        },
      } as unknown as ProjectData,
      team: {
        id: project.team.id,
        name: project.team.name,
        slug: project.team.slug,
        members: project.team.members.map(member => ({
          ...member,
          joinedAt: member.joinedAt.toISOString(),
        })),
      } as unknown as TeamWithRelations,
    };
  } catch (error) {
    console.error('Error fetching project data:', error);
    return null;
  }
}

export default async function TeamProjectPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  const { teamSlug, projectSlug } = await params;
  const data = await fetchProjectData(teamSlug, projectSlug);
  
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Project Not Found
            </h1>
            <p className="text-gray-600 mb-4">
              The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Button onClick={() => redirect(`/team/${teamSlug}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProjectPageClient 
      project={data.project}
      team={data.team}
      teamSlug={teamSlug}
      projectSlug={projectSlug}
    />
  );
}
