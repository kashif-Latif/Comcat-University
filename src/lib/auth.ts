import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabaseQuery } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing credentials')
          return null
        }

        try {
          const users = await supabaseQuery('users', {
            query: `email=eq.${encodeURIComponent(credentials.email)}`,
          })

          const user = users[0]

          if (!user) {
            console.log('[AUTH] User not found:', credentials.email)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password as string
          )

          if (!isPasswordValid) {
            console.log('[AUTH] Invalid password for:', credentials.email)
            return null
          }

          console.log('[AUTH] Login success:', credentials.email, 'role:', user.role)
          return {
            id: user.id as string,
            email: user.email as string,
            name: user.name as string,
            role: user.role as string,
            department: (user.department as string) || null,   // NEW — HOD scoping needs this
          }
        } catch (error) {
          console.error('[AUTH] Error during authorize:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as string
        token.id = user.id as string
        // Propagate department into the JWT so the server can read it later
        token.department = (user as { department?: string | null }).department ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).role = token.role
        ;(session.user as Record<string, unknown>).id = token.id
        ;(session.user as Record<string, unknown>).department = token.department ?? null
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
