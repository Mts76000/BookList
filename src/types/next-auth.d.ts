import "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    hasSeenOnboarding?: boolean
  }

  interface Session {
    user: User & {
      id: string
      hasSeenOnboarding?: boolean
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    hasSeenOnboarding?: boolean
  }
}
