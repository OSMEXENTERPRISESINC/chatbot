import type { User, AuthResponse } from "./types"
import { twilioService } from "./twilio-service"

// Simulate network delay
const apiDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch the list of users from the API, falling back to localStorage
 */
export async function getUsers(): Promise<User[]> {
  await apiDelay(100)
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error("Error fetching from API, falling back to localStorage:", error)
    }
    const usersJson = localStorage.getItem("users") || "[]"
    return JSON.parse(usersJson)
  }
  return []
}

/**
 * Save the list of users to both localStorage and the API
 */
export async function saveUsers(users: User[]): Promise<void> {
  await apiDelay(100)
  if (typeof window !== "undefined") {
    // Always persist locally
    localStorage.setItem("users", JSON.stringify(users))
    // Try to persist via API
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(users),
      })
    } catch (error) {
      console.error("Error saving to API:", error)
    }
  }
}

/**
 * Attempt to log in a user by email+password
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  await apiDelay(800)
  const users = await getUsers()
  const user = users.find(u => u.email === email && u.password === password)
  if (user) {
    const updated = users.map(u =>
      u.id === user.id
        ? { ...u, online: true, lastSeen: new Date().toISOString() }
        : u
    )
    await saveUsers(updated)
    const { password: _, ...userWithoutPassword } = user
    return {
      success: true,
      user: { ...userWithoutPassword, online: true, lastSeen: new Date().toISOString() },
      message: "Login successful",
    }
  }
  return { success: false, user: null, message: "Invalid email or password" }
}

/**
 * Register a new user
 */
export async function registerUser(userData: Omit<User, "id" | "createdAt">): Promise<AuthResponse> {
  await apiDelay(1000)
  const users = await getUsers()
  if (users.some(u => u.email === userData.email)) {
    return { success: false, user: null, message: "Email already in use" }
  }
  const newUser: User = {
    id: Date.now().toString(),
    ...userData,
    createdAt: new Date().toISOString(),
    online: true,
    lastSeen: new Date().toISOString(),
    avatar: `/placeholder.svg?height=200&width=200&text=${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`,
  }
  users.push(newUser)
  await saveUsers(users)
  const { password: _, ...userWithoutPassword } = newUser
  return { success: true, user: userWithoutPassword, message: "Registration successful" }
}

/**
 * Log out a user
 */
export async function logoutUser(userId: string): Promise<void> {
  const users = await getUsers()
  const updated = users.map(u =>
    u.id === userId
      ? { ...u, online: false, lastSeen: new Date().toISOString() }
      : u
  )
  await saveUsers(updated)
  twilioService.disconnect()
}
