// Consolidated Authentication Interfaces

export interface AuthProfile {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
}

export interface AuthToken {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface AuthSession {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

export interface AuthAccount {
  provider: string;
  providerAccountId: string;
  type: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}

// NextAuth specific interfaces
export interface NextAuthUser { 
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface NextAuthSession {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
}

export interface NextAuthToken {
  sub?: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
  [key: string]: unknown;
}

export interface NextAuthAccount {
  provider: string;
  type: string;
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
}

// Auth Types from AuthTypes.ts
export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface TeamMemberResponse {
  status: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

// JWT Token interface
export interface JWTToken {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}