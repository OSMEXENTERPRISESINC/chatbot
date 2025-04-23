"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sidebar } from "@/components/sidebar"
import { Menu, Paperclip, Send, Users, X } from "lucide-react"
import { useSidebar } from "@/lib/sidebar-context"
import { useAuth } from "@/lib/auth-context"
import { twilioService } from "@/utils/twilio-service"
import type { ChatMessage, User } from "@/utils/types"

export default function ChatPage() {
  const { showSidebar, setShowSidebar, toggleSidebar } = useSidebar()
  const { user, allUsers, refreshUsers } = useAuth()
  const [inputMessage, setInputMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeContact, setActiveContact] = useState<Omit<User, "password"> | null>(null)
  const [showContacts, setShowContacts] = useState(false) // Default to false on mobile
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize twilio when user is available
  useEffect(() => {
    if (user) {
      twilioService.initialize(user.id)

      // Listen for new messages
      const unsubscribe = twilioService.on("message", (message: ChatMessage) => {
        if (
          (message.senderId === user.id || message.receiverId === user.id) &&
          activeContact &&
          (message.senderId === activeContact.id || message.receiverId === activeContact.id)
        ) {
          setMessages((prev) => [...prev, message])

          // Mark message as read if we're the receiver
          if (message.receiverId === user.id) {
            twilioService.markMessagesAsRead(message.senderId)
          }
        }

        // Refresh users to update last message
        refreshUsers()
      })

      return () => {
        unsubscribe()
      }
    }
  }, [user, activeContact, refreshUsers])

  // Load messages when active contact changes
  useEffect(() => {
    if (user && activeContact) {
      setIsLoading(true)

      // Get messages between users
      const userMessages = twilioService.getMessagesBetweenUsers(user.id, activeContact.id)
      setMessages(userMessages)

      // Mark messages from this contact as read
      twilioService.markMessagesAsRead(activeContact.id)

      setIsLoading(false)
    } else {
      setMessages([])
    }
  }, [user, activeContact])

  // Initialize contacts sidebar based on screen size
  useEffect(() => {
    const handleResize = () => {
      // On desktop (lg and above), always show contacts
      if (window.innerWidth >= 1024) {
        setShowContacts(true)
      } else {
        // On mobile, don't show contacts by default
        setShowContacts(false)
      }
    }

    // Set initial state
    handleResize()

    // Add event listener for window resize
    window.addEventListener("resize", handleResize)

    // Clean up
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Function to toggle contacts sidebar
  const toggleContacts = () => {
    setShowContacts(!showContacts)
  }

  // Update the contact click handler to close the contacts sidebar on mobile
  const handleContactClick = (contact: Omit<User, "password">) => {
    setActiveContact(contact)

    if (window.innerWidth < 1024) {
      setShowContacts(false)
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim() === "" || !activeContact || !user) return

    // Send message via twilio service
    const newMessage = twilioService.sendMessage(activeContact.id, inputMessage)

    // Add to local messages
    setMessages((prev) => [...prev, newMessage])

    setInputMessage("")
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Filter out current user from contacts
  const contacts = allUsers.filter((u) => u.id !== user?.id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {showSidebar && <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20" onClick={toggleSidebar} />}

      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } fixed md:static inset-y-0 left-0 z-30 md:transform-none md:transition-none transition-transform duration-300 ease-in-out`}
      >
        <Sidebar onClose={toggleSidebar} isMobile={true} showSidebar={showSidebar} setShowSidebar={setShowSidebar} />
      </div>

      {/* Mobile contacts overlay */}
      {showContacts && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10" onClick={() => setShowContacts(false)} />
      )}

      {/* Middle section - Contacts/Messages */}
      <div
        className={`${
          showContacts ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } fixed lg:static inset-y-0 left-0 ml-[${showSidebar ? "16rem" : "0"}] lg:ml-0 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen z-20 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-gray-700 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Contacts</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-500 dark:text-gray-400"
            onClick={toggleContacts}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Online Users</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">No other users found</div>
          ) : (
            contacts.map((contact) => {
              // Get last message between users
              const lastMessage = user ? twilioService.getMessagesBetweenUsers(user.id, contact.id).pop() : null

              // Count unread messages
              const unreadCount = user
                ? twilioService
                    .getMessages()
                    .filter((m) => m.senderId === contact.id && m.receiverId === user.id && !m.read).length
                : 0

              return (
                <div
                  key={contact.id}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${activeContact?.id === contact.id ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 mr-3">
                      <img
                        src={contact.avatar || "/placeholder.svg"}
                        alt={`${contact.firstName} ${contact.lastName}`}
                      />
                    </Avatar>
                    {contact.online && (
                      <span className="absolute bottom-0 right-2 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {lastMessage
                        ? lastMessage.content.length > 20
                          ? lastMessage.content.substring(0, 20) + "..."
                          : lastMessage.content
                        : contact.online
                          ? "Online"
                          : `Last seen: ${new Date(contact.lastSeen || "").toLocaleString()}`}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <div className="ml-2 bg-purple-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right section - Chat */}
      <div className="flex-1 flex flex-col h-screen">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 md:hidden text-gray-500 dark:text-gray-400"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 lg:hidden text-gray-500 dark:text-gray-400"
              onClick={toggleContacts}
            >
              <Users className="h-5 w-5" />
            </Button>
            {activeContact ? (
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <img
                    src={activeContact.avatar || "/placeholder.svg?height=32&width=32"}
                    alt={`${activeContact.firstName} ${activeContact.lastName}`}
                  />
                </Avatar>
                <div className="text-lg font-semibold text-gray-800 dark:text-white">
                  {activeContact.firstName} {activeContact.lastName}
                </div>
                {activeContact.online && <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>}
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-800 dark:text-white">Select a contact</div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {!activeContact ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Select a contact to start chatting
                </h3>
              </div>
            </div>
          ) : isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">No messages yet. Start a conversation!</div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
                >
                  {message.senderId !== user?.id && (
                    <Avatar className="h-8 w-8 mr-3 mt-1">
                      <img
                        src={activeContact.avatar || "/placeholder.svg?height=32&width=32"}
                        alt={activeContact.firstName}
                      />
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] ${message.senderId === user?.id ? "bg-purple-600 text-white" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white"} rounded-lg p-3 shadow-sm`}
                  >
                    <div>{message.content}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(message.timestamp).toLocaleTimeString()}</div>
                  </div>
                  {message.senderId === user?.id && (
                    <Avatar className="h-8 w-8 ml-3 mt-1">
                      <img src={user.avatar || "/placeholder.svg?height=32&width=32"} alt="You" />
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              disabled={!activeContact}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              type="text"
              placeholder={activeContact ? "Type a message..." : "Select a contact to start chatting"}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="mx-2 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              disabled={!activeContact}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!activeContact || !inputMessage.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

