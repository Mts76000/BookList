import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          hasSeenOnboarding: user.hasSeenOnboarding,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.hasSeenOnboarding = user.hasSeenOnboarding
      }
      if (trigger === "update" && session?.name !== undefined) {
        token.name = session.name
      }
      if (trigger === "update" && session?.hasSeenOnboarding !== undefined) {
        token.hasSeenOnboarding = session.hasSeenOnboarding
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        if (token.name) {
          session.user.name = token.name as string
        }
        session.user.hasSeenOnboarding = token.hasSeenOnboarding as boolean
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
