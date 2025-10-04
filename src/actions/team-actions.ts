'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { getUserTeamMembership, findProjectWithOwnerAccess } from '@/queries/db-queries';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper function to get authenticated user in server actions
async function getAuthenticatedUserForAction() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw new Error('No authenticated user found');
  }
  
  // Create a proper session object for the auth utils function
  const properSession = {
    user: {
      id: session.user.id || '',
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    },
    expires: session.expires,
  };
  
  const user = await getAuthenticatedUserFromSession(properSession);
  
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  return user;
}

export async function updateTeamHackathonSettings(teamSlug: string, hackathonModeEnabled: boolean, hackathonDeadline?: string) {
  try {
    const user = await getAuthenticatedUserForAction();

    // Check if user is an owner or admin of the team
    const teamMember = await getUserTeamMembership(user.id, teamSlug);

    if (!teamMember || teamMember.role !== 'OWNER') {
      throw new Error('Access denied');
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamMember.team.id },
      data: {
        hackathonModeEnabled,
        hackathonDeadline: hackathonDeadline ? new Date(hackathonDeadline) : null,
      },
    });

    // Revalidate the team page to reflect changes
    revalidatePath(`/team/${teamSlug}`);
    revalidatePath(`/team/${teamSlug}/hackathon`);

    return { success: true, team: updatedTeam };
  } catch (error) {
    console.error('Error updating hackathon settings:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update hackathon settings');
  }
}

export async function archiveProject(projectId: string, isArchived: boolean) {
  try {
    const user = await getAuthenticatedUserForAction();

    // Check if the user has permission to archive this project
    const project = await findProjectWithOwnerAccess(projectId, user.id, {
      include: {
        team: {
          select: {
            slug: true
          }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { 
        isArchived,
        lastActivityAt: new Date()
      },
    });

    // Revalidate relevant paths
    if (project?.team) {
      revalidatePath(`/team/${project.team.slug}`);
      revalidatePath(`/team/${project.team.slug}/project/${project.slug}`);
    }

    return { success: true, project: updatedProject };
  } catch (error) {
    console.error('Error archiving project:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to archive project');
  }
}

// Server Action for creating teams
export async function createTeam(formData: FormData) {
  try {
    const user = await getAuthenticatedUserForAction();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    
    if (!name?.trim()) {
      throw new Error('Team name is required');
    }

    // Generate a unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.team.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER'
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    revalidatePath('/dashboard');

    return { success: true, team };
  } catch (error) {
    console.error('Error creating team:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create team');
  }
}

// Server Action for creating projects
export async function createProject(formData: FormData) {
  try {
    const user = await getAuthenticatedUserForAction();

    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const teamSlug = formData.get('teamSlug') as string;
    
    if (!name?.trim()) {
      throw new Error('Project name is required');
    }

    let teamId = null;
    // Verify user has access to the team
    if (teamSlug) {
      const teamMember = await getUserTeamMembership(user.id, teamSlug);
      if (!teamMember) {
        throw new Error('Access denied');
      }
      teamId = teamMember.team.id;
    }

    // Generate a unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.project.findFirst({ where: { slug, teamId } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        teamId,
        createdById: user.id,
      },
      include: {
        team: {
          select: {
            slug: true,
            name: true
          }
        }
      }
    });

    if (teamSlug) {
      revalidatePath(`/team/${teamSlug}`);
    } else {
      revalidatePath('/dashboard');
    }

    return { success: true, project };
  } catch (error) {
    console.error('Error creating project:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create project');
  }
}

// Server Action for sending team invitations
export async function sendTeamInvitation(formData: FormData) {
  try {
    const user = await getAuthenticatedUserForAction();

    const email = formData.get('email') as string;
    const teamSlug = formData.get('teamSlug') as string;
    const role = formData.get('role') as 'OWNER' | 'MEMBER';

    if (!email?.trim() || !teamSlug) {
      throw new Error('Email and team are required');
    }

    // Verify user has permission to invite members
    const teamMember = await getUserTeamMembership(user.id, teamSlug);
    if (!teamMember || teamMember.role !== 'OWNER') {
      throw new Error('Access denied');
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        team: { slug: teamSlug },
        user: { email: email.trim().toLowerCase() }
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this team');
    }

    // Find or create the user
    let invitedUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!invitedUser) {
      invitedUser = await prisma.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: email.split('@')[0], // Use email prefix as default name
        }
      });
    }

    // Create team membership
    const invitation = await prisma.teamMember.create({
      data: {
        userId: invitedUser.id,
        teamId: teamMember.team.id,
        role: role || 'MEMBER'
      }
    });

    revalidatePath(`/team/${teamSlug}`);

    return { success: true, invitation };
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send invitation');
  }
}
