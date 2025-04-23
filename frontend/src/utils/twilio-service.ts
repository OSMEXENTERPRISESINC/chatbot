import type { ChatMessage, Call, User } from "./types"
import { getUsers, saveUsers } from "./auth"

// Event types
export type SocketEventType = "message" | "user-status" | "call-request" | "call-accept" | "call-reject" | "call-end"

// Event data
export interface SocketEvent {
  type: SocketEventType
  data: any
  timestamp: string
  senderId: string
  receiverId?: string
}

// Twilio service class
class TwilioService {
  private listeners: Map<SocketEventType, Function[]> = new Map()
  private userId: string | null = null
  private initialized = false
  private twilioSid = "SK9583c6440b3a683905021ad625ae8a70"
  private twilioSecret = "vilpWov097SwaQoWx45Uv5LyfnyXAt8a"
  private pollingInterval: NodeJS.Timeout | null = null
  private storageKey = "twilio_events"

  // Initialize the Twilio service
  initialize(userId: string) {
    // If already initialized with the same userId, just return
    if (this.initialized && this.userId === userId) return

    // If initialized with a different userId, disconnect first
    if (this.initialized && this.userId !== userId) {
      this.disconnect()
    }

    this.userId = userId

    // Set up polling for new messages and events
    this.pollingInterval = setInterval(() => {
      this.pollForEvents()
    }, 3000)

    // Listen for storage events (for cross-tab communication)
    window.addEventListener("storage", this.handleStorageEvent)

    // Set user as online
    this.updateUserStatus(userId, true)

    // Set up beforeunload event to mark user as offline
    window.addEventListener("beforeunload", () => {
      if (this.userId) {
        this.updateUserStatus(this.userId, false)
      }
    })

    this.initialized = true
    console.log(`Twilio service initialized for user ${userId}`)
  }

  // Clean up
  disconnect() {
    if (!this.initialized) return

    if (this.userId) {
      this.updateUserStatus(this.userId, false)
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }

    window.removeEventListener("storage", this.handleStorageEvent)
    this.listeners.clear()
    this.userId = null
    this.initialized = false
    console.log("Twilio service disconnected")
  }

  // Poll for new events from Twilio
  private async pollForEvents() {
    if (!this.userId || !this.initialized) return

    try {
      // In a real implementation, this would make an API call to fetch new messages/events
      // For this demo, we'll simulate by checking localStorage
      const messages = this.getMessages()
      const recentMessages = messages.filter(
        (msg) => 
          msg.receiverId === this.userId && 
          !msg.read && 
          new Date(msg.timestamp).getTime() > Date.now() - 5000
      )

      // Process any new messages
      for (const message of recentMessages) {
        this.dispatchEvent({
          type: "message",
          data: message,
          timestamp: message.timestamp,
          senderId: message.senderId,
          receiverId: message.receiverId
        })
        
        // Mark as read
        message.read = true
      }

      // Save updated read status
      if (recentMessages.length > 0) {
        localStorage.setItem("chat_messages", JSON.stringify(messages))
      }

      // Check for active calls
      const calls = this.getCalls()
      const pendingCalls = calls.filter(
        (call) => 
          call.receiverId === this.userId && 
          call.status === "ringing" &&
          new Date(call.startTime).getTime() > Date.now() - 10000
      )

      // Dispatch call events
      for (const call of pendingCalls) {
        this.dispatchEvent({
          type: "call-request",
          data: call,
          timestamp: call.startTime,
          senderId: call.callerId,
          receiverId: call.receiverId
        })
      }
    } catch (error) {
      console.error("Error polling for events:", error)
    }
  }

  // Handle storage events for cross-tab communication
  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== this.storageKey) return

    try {
      const socketEvent: SocketEvent = JSON.parse(event.newValue || "{}")

      // Ignore events from self
      if (socketEvent.senderId === this.userId) return

      // If the event has a receiverId, check if it's for this user
      if (socketEvent.receiverId && socketEvent.receiverId !== this.userId) return

      // Dispatch to listeners
      this.dispatchEvent(socketEvent)
    } catch (error) {
      console.error("Error handling storage event:", error)
    }
  }

  // Dispatch event to listeners
  private dispatchEvent(event: SocketEvent) {
    const listeners = this.listeners.get(event.type) || []
    listeners.forEach((listener) => listener(event.data))
  }

  // Add event listener
  on(eventType: SocketEventType, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }

    this.listeners.get(eventType)?.push(callback)

    return () => {
      const listeners = this.listeners.get(eventType) || []
      const index = listeners.indexOf(callback)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // Emit event
  async emit(eventType: SocketEventType, data: any, receiverId?: string) {
    if (!this.userId || !this.initialized) {
      console.log(`Twilio service not initialized or no userId set. Event ${eventType} not emitted.`)
      return
    }

    const event: SocketEvent = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      senderId: this.userId,
      receiverId,
    }

    // In a real implementation, this would make an API call to Twilio
    // For this demo, we'll simulate by using localStorage
    
    // Store in localStorage to trigger storage event in other tabs/windows
    localStorage.setItem(this.storageKey, JSON.stringify(event))

    // Immediately remove to allow future events with same data
    setTimeout(() => {
      localStorage.removeItem(this.storageKey)
    }, 100)

    // For a real Twilio implementation, we would make API calls here
    // Example (pseudocode):
    // if (eventType === "message" && receiverId) {
    //   await this.sendTwilioMessage(data.content, receiverId);
    // }
  }

  // Update user status
  async updateUserStatus(userId: string, online: boolean) {
    try {
      // Skip emitting event if service is not initialized
      const shouldEmit = this.initialized && this.userId !== null

      const users = await getUsers()
      const userIndex = users.findIndex((u) => u.id === userId)

      if (userIndex !== -1) {
        users[userIndex].online = online
        users[userIndex].lastSeen = new Date().toISOString()
        await saveUsers(users)

        // Only emit if service is initialized
        if (shouldEmit) {
          this.emit("user-status", { userId, online })
        }
      }
    } catch (error) {
      console.error("Error updating user status:", error)
    }
  }

  // Get all users
  async getUsers(): Promise<User[]> {
    try {
      return await getUsers()
    } catch (error) {
      console.error("Error getting users:", error)
      return []
    }
  }

  // Send message
  sendMessage(receiverId: string, content: string): ChatMessage {
    if (!this.userId) {
      throw new Error("Twilio service not initialized")
    }

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: this.userId,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    }

    // In a real implementation, this would make an API call to Twilio
    // Example (pseudocode):
    // this.twilioClient.messages.create({
    //   body: content,
    //   from: this.userId,
    //   to: receiverId
    // });

    // Save message to localStorage for demo
    this.saveMessage(message)

    // Emit message event
    this.emit("message", message, receiverId)

    return message
  }

  // Save message
  saveMessage(message: ChatMessage) {
    const messages = this.getMessages()
    messages.push(message)
    localStorage.setItem("chat_messages", JSON.stringify(messages))
  }

  // Get all messages
  getMessages(): ChatMessage[] {
    try {
      const messagesJson = localStorage.getItem("chat_messages") || "[]"
      return JSON.parse(messagesJson)
    } catch (error) {
      console.error("Error getting messages:", error)
      return []
    }
  }

  // Get messages between users
  getMessagesBetweenUsers(user1Id: string, user2Id: string): ChatMessage[] {
    const messages = this.getMessages()
    return messages
      .filter(
        (msg) =>
          (msg.senderId === user1Id && msg.receiverId === user2Id) ||
          (msg.senderId === user2Id && msg.receiverId === user1Id),
      )
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  // Mark messages as read
  markMessagesAsRead(senderId: string) {
    if (!this.userId) return

    const messages = this.getMessages()
    let updated = false

    messages.forEach((msg) => {
      if (msg.senderId === senderId && msg.receiverId === this.userId && !msg.read) {
        msg.read = true
        updated = true
      }
    })

    if (updated) {
      localStorage.setItem("chat_messages", JSON.stringify(messages))
    }
  }

  // Initiate call
  initiateCall(receiverId: string): Call {
    if (!this.userId) {
      throw new Error("Twilio service not initialized")
    }

    const call: Call = {
      id: Date.now().toString(),
      callerId: this.userId,
      receiverId,
      status: "ringing",
      startTime: new Date().toISOString(),
    }

    // In a real implementation, this would make an API call to Twilio Video
    // Example (pseudocode):
    // const twilioRoom = await this.twilioClient.video.rooms.create({
    //   uniqueName: call.id,
    //   type: 'group'
    // });

    // Save call to localStorage for demo
    this.saveCall(call)

    // Emit call request event
    this.emit("call-request", call, receiverId)

    return call
  }

  // Accept call
  acceptCall(callId: string) {
    const calls = this.getCalls()
    const callIndex = calls.findIndex((c) => c.id === callId)

    if (callIndex !== -1) {
      calls[callIndex].status = "ongoing"
      this.saveCalls(calls)

      // In a real implementation, this would make an API call to Twilio Video
      // Example (pseudocode):
      // await this.twilioClient.video.rooms(callId).participants.create({
      //   identity: this.userId
      // });

      // Emit call accept event
      this.emit("call-accept", calls[callIndex], calls[callIndex].callerId)

      return calls[callIndex]
    }

    return null
  }

  // End call
  endCall(callId: string) {
    const calls = this.getCalls()
    const callIndex = calls.findIndex((c) => c.id === callId)

    if (callIndex !== -1) {
      calls[callIndex].status = "ended"
      calls[callIndex].endTime = new Date().toISOString()
      this.saveCalls(calls)

      // In a real implementation, this would make an API call to Twilio Video
      // Example (pseudocode):
      // await this.twilioClient.video.rooms(callId).update({status: 'completed'});

      // Emit call end event
      const call = calls[callIndex]
      const otherUserId = call.callerId === this.userId ? call.receiverId : call.callerId
      this.emit("call-end", call, otherUserId)

      return calls[callIndex]
    }

    return null
  }

  // Save call
  saveCall(call: Call) {
    const calls = this.getCalls()
    calls.push(call)
    this.saveCalls(calls)
  }

  // Save calls
  saveCalls(calls: Call[]) {
    localStorage.setItem("calls", JSON.stringify(calls))
  }

  // Get all calls
  getCalls(): Call[] {
    try {
      const callsJson = localStorage.getItem("calls") || "[]"
      return JSON.parse(callsJson)
    } catch (error) {
      console.error("Error getting calls:", error)
      return []
    }
  }

  // Get active call
  getActiveCall(): Call | null {
    if (!this.userId) return null

    const calls = this.getCalls()
    return (
      calls.find(
        (call) => (call.callerId === this.userId || call.receiverId === this.userId) && call.status !== "ended",
      ) || null
    )
  }
}

// Create singleton instance - renamed from socketService to twilioService
export const twilioService = new TwilioService()
