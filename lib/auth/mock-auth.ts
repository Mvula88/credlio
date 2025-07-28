// Mock authentication system for demo purposes
export interface User {
  id: string
  email: string
  full_name: string
  phone_number?: string
  role: "borrower" | "lender" | "admin"
  created_at: string
}

export interface AuthSession {
  user: User
  access_token: string
}

class MockAuthService {
  private users: User[] = [
    {
      id: "1",
      email: "borrower@demo.com",
      full_name: "John Borrower",
      phone_number: "+1234567890",
      role: "borrower",
      created_at: new Date().toISOString(),
    },
    {
      id: "2",
      email: "lender@demo.com",
      full_name: "Jane Lender",
      phone_number: "+1234567891",
      role: "lender",
      created_at: new Date().toISOString(),
    },
    {
      id: "3",
      email: "admin@demo.com",
      full_name: "Admin User",
      phone_number: "+1234567892",
      role: "admin",
      created_at: new Date().toISOString(),
    },
  ]

  private currentSession: AuthSession | null = null

  constructor() {
    // Load session from localStorage if available
    if (typeof window !== "undefined") {
      const savedSession = localStorage.getItem("mock-auth-session")
      if (savedSession) {
        this.currentSession = JSON.parse(savedSession)
      }
    }
  }

  async signUp(email: string, password: string, userData: { full_name: string; phone_number?: string; role: string }) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Check if user already exists
    const existingUser = this.users.find((u) => u.email === email)
    if (existingUser) {
      throw new Error("User already exists with this email")
    }

    // Create new user
    const newUser: User = {
      id: (this.users.length + 1).toString(),
      email,
      full_name: userData.full_name,
      phone_number: userData.phone_number,
      role: userData.role as "borrower" | "lender" | "admin",
      created_at: new Date().toISOString(),
    }

    this.users.push(newUser)

    // Create session
    const session: AuthSession = {
      user: newUser,
      access_token: `mock-token-${newUser.id}`,
    }

    this.currentSession = session
    this.saveSession()

    return { data: { user: newUser, session }, error: null }
  }

  async signIn(email: string, password: string) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const user = this.users.find((u) => u.email === email)
    if (!user) {
      throw new Error("Invalid email or password")
    }

    // Create session
    const session: AuthSession = {
      user,
      access_token: `mock-token-${user.id}`,
    }

    this.currentSession = session
    this.saveSession()

    return { data: { user, session }, error: null }
  }

  async signOut() {
    this.currentSession = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("mock-auth-session")
    }
    return { error: null }
  }

  getSession(): AuthSession | null {
    return this.currentSession
  }

  getUser(): User | null {
    return this.currentSession?.user || null
  }

  private saveSession() {
    if (typeof window !== "undefined" && this.currentSession) {
      localStorage.setItem("mock-auth-session", JSON.stringify(this.currentSession))
    }
  }

  // Demo users for quick login
  getDemoUsers() {
    return this.users.map((u) => ({ email: u.email, role: u.role }))
  }
}

export const mockAuth = new MockAuthService()
