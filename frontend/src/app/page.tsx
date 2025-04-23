// frontend/src/app/chat/page.tsx
"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Menu } from "lucide-react"
import { useSidebar } from "@/lib/sidebar-context"
import { useAuth } from "@/lib/auth-context"

export default function ChatPage() {
  const router = useRouter()
  const { showSidebar, toggleSidebar } = useSidebar()
  const { user } = useAuth()
  const [contacts, setContacts] = useState<any[]>([])

  useEffect(() => {
    // Fetch contacts from rewritten /users endpoint
    fetch("/users")
      .then(res => res.json())
      .then(data => setContacts(data))
      .catch(() => setContacts([]))
  }, [])

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {showSidebar && <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={toggleSidebar} />}
      <Sidebar isMobile showSidebar={showSidebar} onClose={toggleSidebar} />
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-gray-800">
          <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={toggleSidebar}>
            <Menu />
          </Button>
          <h1 className="text-xl font-bold">Chat</h1>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Avatar><img src={user?.avatar || "/placeholder.svg"} alt="User" /></Avatar>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {contacts.map(contact => (
            <div key={contact.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
              <Avatar><img src={contact.avatar} alt={contact.name} /></Avatar>
              <div>
                <div className="font-medium">{contact.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{contact.lastMessage}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-white dark:bg-gray-800">
          <Input placeholder="Type a message..." />
        </div>
      </div>
    </div>
  )
}
