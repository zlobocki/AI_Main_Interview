import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no Node.js-only imports)
// Used by middleware to validate JWT sessions without DB access
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "fallback-secret-change-in-production",
  trustHost: true,
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
};
