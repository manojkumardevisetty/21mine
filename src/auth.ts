import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { rateLimit } from "@/lib/ratelimit";

declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; name: string; role: "CUSTOMER" | "STAFF" | "ADMIN" };
  }
  interface User { role?: "CUSTOMER" | "STAFF" | "ADMIN"; sessionVersion?: number }
}

class TooManyAttempts extends CredentialsSignin { code = "rate_limited"; }

const creds = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/account/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = creds.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        if (!(await rateLimit(`login:${email}`, 8, 15 * 60))) throw new TooManyAttempts();
        const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
        // Compare against a dummy hash when the user doesn't exist (uniform timing)
        const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2b$12$LhV2Bf5ePnBW7/958On7zOPTc30X0CSzeiW0ybbuFE6LWAh8i8M8a");
        if (!user || !ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id; token.role = user.role; token.sv = user.sessionVersion ?? 0;
        return token;
      }
      if (!token.uid) return null;
      // Re-validate on every request: deleted users, role changes, password resets and
      // "sign out everywhere" (sessionVersion bump) take effect immediately.
      const u = await db.query.users.findFirst({
        where: eq(schema.users.id, token.uid as string),
        columns: { id: true, role: true, sessionVersion: true, name: true, email: true },
      });
      if (!u || u.sessionVersion !== token.sv) return null;
      token.role = u.role; token.name = u.name; token.email = u.email;
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as "CUSTOMER" | "STAFF" | "ADMIN";
      return session;
    },
  },
});
