import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      email: string
      name: string
      image?: string | null
      department?: string | null   // NEW — required for HOD scoping
    }
  }

  interface User {
    role?: string
    department?: string | null     // NEW
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    department?: string | null     // NEW
  }
}
