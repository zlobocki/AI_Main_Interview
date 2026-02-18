import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const db = getDb();
          const users = await db
            .select()
            .from(schema.adminUsers)
            .where(eq(schema.adminUsers.username, credentials.username as string))
            .limit(1);

          if (users.length === 0) return null;

          const user = users[0];
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) return null;

          return {
            id: String(user.id),
            name: user.username,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
});
