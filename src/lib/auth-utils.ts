import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { UserInfo } from '@/interfaces/common';
import { JWTToken } from '@/interfaces/auth';
/**
 * Gets user information from middleware headers and ensures user exists in database
 * This should be called at the start of API routes that need authenticated user data
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<UserInfo> {
  const email = request.headers.get('X-User-Email');
  const userId = request.headers.get('X-User-ID');
  const name = request.headers.get('X-User-Name');
  const picture = request.headers.get('X-User-Picture');

  if (!email || !userId) {
    throw new Error('No authenticated user found');
  }

  // Ensure user exists in database with latest info from auth provider
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: name || undefined,
      image: picture || undefined,
    },
    create: {
      email,
      name: name || undefined,
      image: picture || undefined,
    },
  });

  return {
    id: user.id,
    email: user.email!,
    name: user.name || undefined,
    image: user.image || undefined,
  };
}

/**
 * Gets user information from middleware headers in server actions
 * This should be called at the start of server actions that need authenticated user data
 */
export async function getAuthenticatedUserFromAction(): Promise<UserInfo> {
  const headersList = await headers();
  const email = headersList.get('X-User-Email');
  const userId = headersList.get('X-User-ID');
  const name = headersList.get('X-User-Name');
  const picture = headersList.get('X-User-Picture');

  if (!email || !userId) {
    throw new Error('No authenticated user found');
  }

  // Ensure user exists in database with latest info from auth provider
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: name || undefined,
      image: picture || undefined,
    },
    create: {
      email,
      name: name || undefined,
      image: picture || undefined,
    },
  });

  return {
    id: user.id,
    email: user.email!,
    name: user.name || undefined,
    image: user.image || undefined,
  };
}

/**
 * Gets user information from NextAuth session and ensures user exists in database
 * This should be called in server components that have access to NextAuth session
 */
export async function getAuthenticatedUserFromSession(session: Session | null): Promise<UserInfo | null> {
  if (!session?.user?.email) {
    return null;
  }

  // Ensure user exists in database with latest info from auth provider
  const user = await prisma.user.upsert({
    where: { email: session.user.email },
    update: {
      name: session.user.name || undefined,
      image: session.user.image || undefined,
    },
    create: {
      email: session.user.email,
      name: session.user.name || undefined,
      image: session.user.image || undefined,
    },
  });

  return {
    id: user.id,
    email: user.email!,
    name: user.name || undefined,
    image: user.image || undefined,
  };
}

/**
 * Legacy function for routes that still need token-based auth
 */
export async function getUserFromToken(token: JWTToken): Promise<UserInfo> {
  if (!token?.email) {
    throw new Error('No authenticated user found');
  }

  const user = await prisma.user.upsert({
    where: { email: token.email },
    update: {
      name: token.name,
      image: token.picture,
    },
    create: {
      email: token.email,
      name: token.name,
      image: token.picture,
    },
  });

  return {
    id: user.id,
    email: user.email!,
    name: user.name || undefined,
    image: user.image || undefined,
  };
}
