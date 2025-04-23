"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import type { AuthContextType, AuthResponse, User } from "@/utils/types"
import { loginUser, registerUser, logoutUser, getUsers } from "@/utils/auth"

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => ({ success: false, user: null, message: "Not implemented" }),
  register: async () => ({ success: false, user: null, message: "Not implemented" }),
  logout: () => {},
  allUsers: [],
  refreshUsers: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Omit<User, "password"> | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [allUsers, setAllUsers] = useState<Omit<User, "password">[]>([])

  // Fetch all users
  const refreshUsers = async () => {
    try {
      const users = await getUsers()
      setAllUsers(users.map(({ password, ...rest }) => rest))
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        setIsAuthenticated(true)

        // Initialize twilio service if user is stored
        if (typeof window !== "undefined" && parsedUser?.id) {
          import("@/utils/twilio-service").then(({ twilioService }) => {
            twilioService.initialize(parsedUser.id)
          })
        }
      } catch (error) {
        console.error("Error parsing stored user:", error)
        localStorage.removeItem("user")
      }
    }

    // Load all users
    refreshUsers()

    // Set up interval to refresh users
    const interval = setInterval(refreshUsers, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Update the login function to ensure twilio service is initialized after user is set
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await loginUser(email, password)

    if (response.success && response.user) {
      // Set user state first
      setUser(response.user)
      setIsAuthenticated(true)
      localStorage.setItem("user", JSON.stringify(response.user))

      // Initialize twilio service after user is set
      // This ensures the twilio service has the user ID available
      if (typeof window !== "undefined") {
        try {
          const { twilioService } = await import("@/utils/twilio-service")
          twilioService.initialize(response.user.id)
        } catch (error) {
          console.error("Error initializing twilio service:", error)
        }
      }

      // Refresh users list
      await refreshUsers()
    }

    return response
  }

  // Update the register function similarly
  const register = async (userData: Omit<User, "id" | "createdAt">): Promise<AuthResponse> => {
    const response = await registerUser(userData)

    if (response.success && response.user) {
      // Set user state first
      setUser(response.user)
      setIsAuthenticated(true)
      localStorage.setItem("user", JSON.stringify(response.user))

      // Initialize twilio service after user is set
      if (typeof window !== "undefined") {
        try {
          const { twilioService } = await import("@/utils/twilio-service")
          twilioService.initialize(response.user.id)
        } catch (error) {
          console.error("Error initializing twilio service:", error)
        }
      }

      // Refresh users list
      await refreshUsers()
    }

    return response
  }

  // Logout function
  const logout = async () => {
    if (user) {
      await logoutUser(user.id)
    }

    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("user")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        allUsers,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
