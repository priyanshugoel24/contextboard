import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Navbar } from '@/components';
import { TeamSettingsPageClient } from '@/components/client';
import { TeamWithRelations } from '@/interfaces/teams';
import { TeamSettingsPageProps } from '@/interfaces/ui-components';
import { Session } from 'next-auth';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { fetchTeamBySlug } from '@/lib/teams-utils';

// Server-side data fetching 
async function fetchTeam(teamSlug: string): Promise<TeamWithRelations | null> {
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
    } as unknown as TeamWithRelations;
  } catch (error) {
    console.error('Error fetching team:', error);
    return null;
  }
}

export default async function TeamSettingsPage({ params }: TeamSettingsPageProps) {
  const session = await getServerSession(authOptions);
  
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

  return <TeamSettingsPageClient team={team} teamSlug={teamSlug} />;
}
