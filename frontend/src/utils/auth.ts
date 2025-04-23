import type { User, AuthResponse } from "./types"
import { twilioService } from "./twilio-service"

// Mock API delay to simulate network request
const apiDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Function to get users from JSON file
export async function getUsers(): Promise<User[]> {
  await apiDelay(100) // Small delay for consistency

  try {
    // In a browser environment, we'll use localStorage as a fallback
    if (typeof window !== "undefined") {
      // First try to fetch from the API endpoint that reads the JSON file
      try {
        const response = await fetch("/api/users")
        if (response.ok) {
          return await response.json()
        }
      } catch (error) {
        console.error("Error fetching from API, falling back to localStorage:", error)
      }

      // Fallback to localStorage if API fails
      const usersJson = localStorage.getItem("users") || "[]"
      return JSON.parse(usersJson)
    }

    return []
  } catch (error) {
    console.error("Error getting users:", error)
    return []
  }
}

// Function to save users to JSON file
export async function saveUsers(users: User[]): Promise<void> {
  await apiDelay(100) // Small delay for consistency

  try {
    // In a browser environment, we'll use localStorage and also try to update via API
    if (typeof window !== "undefined") {
      // Save to localStorage
      localStorage.setItem("users", JSON.stringify(users))

      // Also try to save via API endpoint
      try {
        await fetch("/api/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(users),
        })
      } catch (error) {
        console.error("Error saving to API:", error)
      }
    }
  } catch (error) {
    console.error("Error saving users:", error)
    throw new Error("Failed to save user data")
  }
}

// Update the loginUser function to not initialize socket service here
// (we'll do it in the auth context instead)
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  await apiDelay(800) // Simulate API call

  const users = await getUsers()
  const user = users.find((u) => u.email === email && u.password === password)

  if (user) {
    // Update user status
    const updatedUsers = users.map((u) =>
      u.id === user.id ? { ...u, online: true, lastSeen: new Date().toISOString() } : u,
    )
    await saveUsers(updatedUsers)

    // Remove password from returned user object
    const { password: _, ...userWithoutPassword } = user

    // Note: We're not initializing twilio service here anymore
    // It will be initialized in the auth context

    return {
      success: true,
      user: {
        ...userWithoutPassword,
        online: true,
        lastSeen: new Date().toISOString(),
      },
      message: "Login successful",
    }
  }

  return {
    success: false,
    user: null,
    message: "Invalid email or password",
  }
}

// Update the registerUser function similarly
export async function registerUser(userData: Omit<User, "id" | "createdAt">): Promise<AuthResponse> {
  await apiDelay(1000) // Simulate API call

  const users = await getUsers()

  // Check if email already exists
  if (users.some((user) => user.email === userData.email)) {
    return {
      success: false,
      user: null,
      message: "Email already in use",
    }
  }

  // Create new user
  const newUser: User = {
    id: Date.now().toString(),
    ...userData,
    createdAt: new Date().toISOString(),
    online: true,
    lastSeen: new Date().toISOString(),
    avatar: `/placeholder.svg?height=200&width=200&text=${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`,
  }

  // Save to JSON file via API
  users.push(newUser)
  await saveUsers(users)

  // Note: We're not initializing twilio service here anymore
  // It will be initialized in the auth context

  // Remove password from returned user object
  const { password: _, ...userWithoutPassword } = newUser

  return {
    success: true,
    user: userWithoutPassword,
    message: "Registration successful",
  }
}

// Logout function
export async function logoutUser(userId: string): Promise<void> {
  const users = await getUsers()
  const updatedUsers = users.map((u) =>
    u.id === userId ? { ...u, online: false, lastSeen: new Date().toISOString() } : u,
  )
  await saveUsers(updatedUsers)

  // Disconnect twilio
  twilioService.disconnect()
}
