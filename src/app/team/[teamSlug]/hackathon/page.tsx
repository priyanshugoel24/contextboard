import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import dynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { TeamHackathon } from '@/interfaces/teams';
import { ContextCardWithRelations } from '@/interfaces/context-cards';
import { HackathonUpdate } from '@/interfaces/activities';
import { Session } from 'next-auth';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { findTeamBySlugWithRelations, getUserTeamMembership } from '@/queries/team-queries';
import { findTeamAssignedCards } from '@/queries/card-queries';
import { findTeamHackathonUpdates } from '@/queries/activity-queries';

// Lazy load HackathonPageClient for better performance
const HackathonPageClient = dynamic(() => import('@/components/client/HackathonPageClient'), {
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading hackathon room...</p>
      </div>
    </div>
  )
});

import { HackathonPageProps } from '@/interfaces/ui-components';

// Server-side data fetching for team data
async function fetchTeamData(teamSlug: string): Promise<TeamHackathon | null> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return null;
    }

    // get team with relations
    const team = await findTeamBySlugWithRelations(teamSlug);
    if (!team) {
      return null;
    }

    // Check if user is a member of this team 
    const userMembership = await getUserTeamMembership(user.id, teamSlug);
    if (!userMembership) {
      return null;
    }

    return {
      ...team,
      userRole: userMembership.role,
      currentUserId: user.id,
      hackathonDeadline: team.hackathonDeadline?.toISOString(),
      hackathonEndedAt: team.hackathonEndedAt?.toISOString(),
      members: team.members.map(member => ({
        ...member,
        joinedAt: member.joinedAt.toISOString(),
        team: {
          ...team,
          createdAt: team.createdAt.toISOString(),
        },
      })),
      projects: team.projects.map(project => ({
        ...project,
        createdAt: project.createdAt.toISOString(),
        lastActivityAt: project.lastActivityAt.toISOString(),
      })),
    } as unknown as TeamHackathon;
  } catch (error) {
    console.error('Error fetching team:', error);
    return null;
  }
}

// Server-side data fetching for hackathon cards
async function fetchHackathonCards(teamSlug: string): Promise<ContextCardWithRelations[]> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return [];
    }

    // Get team to extract team ID
    const team = await findTeamBySlugWithRelations(teamSlug);
    if (!team) {
      return [];
    }

    // Check if user has access to this team
    const userMembership = await getUserTeamMembership(user.id, teamSlug);
    if (!userMembership) {
      return [];
    }

    // get team assigned cards
    const cards = await findTeamAssignedCards(team.id, undefined, {
      status: 'ACTIVE', // Only active cards for hackathon view
    });

    return cards.map(card => ({
      ...card,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    })) as unknown as ContextCardWithRelations[];
  } catch (error) {
    console.error('Error fetching hackathon cards:', error);
    return [];
  }
}

// Server-side data fetching for hackathon updates
async function fetchHackathonUpdates(teamSlug: string): Promise<HackathonUpdate[]> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return [];
    }

    // Check if user is a member of the team
    const teamMember = await getUserTeamMembership(user.id, teamSlug);
    if (!teamMember) {
      return [];
    }

    // Get hackathon updates for this team 
    const updates = await findTeamHackathonUpdates(teamMember.team.id, {
      take: 50, // Limit to last 50 updates
    });

    // Transform to match expected format
    return updates.map(update => ({
      id: update.id,
      userId: update.userId!,
      content: update.description,
      createdAt: update.createdAt.toISOString(),
      user: {
        name: update.user?.name || update.user?.email?.split('@')[0] || 'User',
        image: update.user?.image,
      },
    })) as unknown as HackathonUpdate[];
  } catch (error) {
    console.error('Error fetching hackathon updates:', error);
    return [];
  }
}

export default async function TeamHackathonPage({ params }: HackathonPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  const { teamSlug } = await params;

  // Fetch initial data server-side
  const team = await fetchTeamData(teamSlug);
  
  // Only fetch cards and updates if hackathon mode is enabled
  const cards = team?.hackathonModeEnabled ? await fetchHackathonCards(teamSlug) : [];
  const updates = team?.hackathonModeEnabled ? await fetchHackathonUpdates(teamSlug) : [];

  return (
    <HackathonPageClient 
      initialTeam={team}
      initialCards={cards}
      initialUpdates={updates}
    />
  );
}
