import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import LoginPage from '@/components/LoginPage';
import TeamsDisplay from '@/components/TeamsDisplay';
import { TeamWithRelations } from '@/interfaces/teams';
import { Session } from 'next-auth';
import { Metadata } from 'next';
import { Navbar } from '@/components';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { fetchUserTeams } from '@/lib/teams-utils';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Your Personal Context Management Dashboard',
    description: 'Organize your projects, teams, and tasks in one collaborative workspace. Create context cards, track progress, and manage your workflow efficiently.',
    keywords: ['project management', 'team collaboration', 'task tracking', 'context board', 'productivity'],
    authors: [{ name: 'Context Board Team' }],
    creator: 'Context Board',
    openGraph: {
      title: 'Context Board - Your Personal Context Management Dashboard',
      description: 'Organize your projects, teams, and tasks in one collaborative workspace. Create context cards, track progress, and manage your workflow efficiently.',
      type: 'website',
      locale: 'en_US',
      siteName: 'Context Board',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Context Board - Your Personal Context Management Dashboard',
      description: 'Organize your projects, teams, and tasks in one collaborative workspace.',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

// Server-side data fetching using auth and teams utilities
async function fetchTeams(session: Session): Promise<TeamWithRelations[]> {
  try {
    // Ensure user exists in database and get user info
    const user = await getAuthenticatedUserFromSession(session);
    
    if (!user) {
      return [];
    }

    // Fetch teams for the authenticated user
    const teams = await fetchUserTeams(user.id);
    return teams;
  } catch (error) {
    console.error('Error fetching teams:', error);
    return [];
  }
}

export default async function Home() {
  const session = await getServerSession(authOptions) as Session | null;

  if (!session) {
    return <LoginPage />;
  }

  // Fetch teams server-side using auth and teams utilities
  const teams = await fetchTeams(session);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-zinc-900 dark:to-zinc-800" suppressHydrationWarning>
      <Navbar />
      <TeamsDisplay initialTeams={teams} />
    </div>
  );
}