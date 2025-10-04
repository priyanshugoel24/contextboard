import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import dynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { AssignedCardsTeam } from '@/interfaces/teams';
import { Session } from 'next-auth';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { fetchTeamBySlug } from '@/lib/teams-utils';

// Lazy load AssignedCardsPageClient
const AssignedCardsPageClient = dynamic(() => import('@/components/client/AssignedCardsPageClient'), {
  loading: () => (
    <div className="container mx-auto p-6">
      <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>
    </div>
  )
});

import { AssignedCardsPageProps } from '@/interfaces/ui-components';

// Server-side data fetching using auth and teams utilities
async function fetchTeam(teamSlug: string): Promise<AssignedCardsTeam | null> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return null;
    }

    // Fetch team using utility
    const team = await fetchTeamBySlug(teamSlug);
    if (!team) {
      return null;
    }

    // Check if user is a member of this team
    const userMembership = team.members.find(
      (member) => member.user.id === user.id
    );

    if (!userMembership) {
      return null;
    }

    return {
      ...team,
      userRole: userMembership.role,
      currentUserId: user.id,
      members: team.members.map(member => ({
        ...member,
        team: team,
      })),
    } as unknown as AssignedCardsTeam;
  } catch (error) {
    console.error('Error fetching team:', error);
    return null;
  }
}

export default async function TeamAssignedCardsPage({ params }: AssignedCardsPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  const { teamSlug } = await params;
  const team = await fetchTeam(teamSlug);

  if (!team) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Team not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AssignedCardsPageClient team={team} />;
}
