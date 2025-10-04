import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { NextAuthUser, NextAuthAccount, NextAuthToken, NextAuthSession } from "@/interfaces/auth";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  jwt: {
    maxAge: 60 * 60 * 24, // 1 day
  },
  callbacks: {
    async jwt({ token, user }: { token: NextAuthToken; user?: NextAuthUser }) {
      // Add user profile info to token when user signs in
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }: { session: NextAuthSession; token: NextAuthToken }) {
      // Add user ID from token to session
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.image = token.picture as string;
      }
      return session;
    },
    async signIn({ user, account }: { user: NextAuthUser; account: NextAuthAccount | null }) {
      if (account?.provider && user.email) {
        try {
          // Check if user already exists with this email
          const existingUser = await prisma.user.findFirst({
            where: { email: user.email },
            include: { accounts: true }
          });

          if (existingUser) {
            if (!existingUser.image && user.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { image: user.image },
              });
            }
            // Check if this provider account is already linked
            const existingAccount = existingUser.accounts.find(
              acc => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
            );

            if (!existingAccount) {
              // Link this account to the existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
              console.log(`Linked ${account.provider} account to existing user ${existingUser.id}`);
            }
            return true;
          }
        } catch (error) {
          console.error("Error during sign-in:", error);
          return false;
        }
      }
      return true;
    },
  },
  events: {
    async linkAccount({ user, account }: { user: NextAuthUser; account: NextAuthAccount }) {
      console.log(`Account ${account.provider} linked to user ${user.id}`);
    },
    async signIn({ user, account, isNewUser }: { user: NextAuthUser; account: NextAuthAccount | null; isNewUser?: boolean }) {
      if (account && user.email) {
        console.log(`User ${user.email} signed in with ${account.provider}${isNewUser ? ' (new user)' : ''}`);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};