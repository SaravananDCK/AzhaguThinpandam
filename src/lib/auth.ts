import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizePhone, verifyOtp } from "@/lib/otp";

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({
  // 180-day rolling sessions: every visit renews the window, so regular
  // customers never re-login (each OTP send costs money)
  session: { strategy: "jwt", maxAge: 180 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    // Customers: phone number + one-time code sent over WhatsApp.
    // First successful login creates the account (passwordless).
    Credentials({
      id: "phone-otp",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const phone = normalizePhone((credentials?.phone as string | undefined) ?? "");
        const code = ((credentials?.code as string | undefined) ?? "").trim();
        if (!phone || !/^\d{6}$/.test(code)) return null;

        const valid = await verifyOtp(phone, code);
        if (!valid) return null;

        const user = await prisma.user.upsert({
          where: { phone },
          update: {},
          create: { phone },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        };
      },
    }),
    // Admins (and legacy accounts): email + password.
    Credentials({
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)
          ?.toLowerCase()
          .trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone ?? null;
      }
      // Profile completion updates the live session token
      if (trigger === "update" && session?.user) {
        if (session.user.name !== undefined) token.name = session.user.name;
        if (session.user.email !== undefined) token.email = session.user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.phone = (token.phone as string | null) ?? null;
      }
      return session;
    },
  },
});
