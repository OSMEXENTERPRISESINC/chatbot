"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sidebar } from "@/components/sidebar"
import { Menu, Send, Paperclip } from "lucide-react"
import { useSidebar } from "@/lib/sidebar-context"
import type { DashboardMessage } from "@/utils/types"
import { Avatar } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
  const { showSidebar, setShowSidebar, toggleSidebar } = useSidebar()
  const { user } = useAuth()
  const [inputMessage, setInputMessage] = useState("")
  const [messages, setMessages] = useState<DashboardMessage[]>([])
  const [attachment, setAttachment] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load and save messages to localStorage as before...
  useEffect(() => {
    const saved = localStorage.getItem("dashboard_messages")
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (messages.length) {
      localStorage.setItem("dashboard_messages", JSON.stringify(messages))
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() && !attachment) return

    // User message
    const userMsg: DashboardMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      timestamp: "Just now",
      isUser: true,
      attachmentName: attachment?.name,
    }
    setMessages(prev => [...prev, userMsg])
    setInputMessage("")

    // Convert attachment to base64 if present
    let attachmentPayload: { filename: string, data: string } | undefined
    if (attachment) {
      const dataUrl: string = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(attachment)
      })
      attachmentPayload = { filename: attachment.name, data: dataUrl }
      setAttachment(null)
    }

    setIsLoading(true)
    try {
      const body: any = { contents: [{ parts: [{ text: inputMessage }] }] }
      if (attachmentPayload) {
        body.attachments = [attachmentPayload]
      }

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAM1tPg2oa70s7DrY8r3b1YjJZfCFTbW7E",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      const data = await res.json()
      const aiMsg: DashboardMessage = {
        id: (Date.now() + 1).toString(),
        content: data.candidates?.[0]?.content || "I couldn't process that.",
        timestamp: "Just now",
        isUser: false,
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {showSidebar && <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20" onClick={toggleSidebar} />}
      <div className={`${showSidebar ? "translate-x-0" : "-translate-x-full"} fixed md:static inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out`}>
        <Sidebar onClose={toggleSidebar} isMobile showSidebar={showSidebar} setShowSidebar={setShowSidebar} />
      </div>
      <div className="flex-1 flex flex-col h-screen">
        <div className="p-4 border-b flex items-center justify-between bg-white dark:bg-gray-800">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={toggleSidebar}>
              <Menu />
            </Button>
            <h1 className="text-xl font-bold">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Avatar><img src={user?.avatar || "/placeholder.svg"} alt="User" /></Avatar>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 
              ? <div className="text-center text-gray-500">Start a conversation below</div>
              : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                  {!msg.isUser && <Avatar><img src="/placeholder.svg" alt="AI" /></Avatar>}
                  <div className={`${msg.isUser ? "bg-purple-600 text-white" : "bg-white dark:bg-gray-800 text-gray-800"} rounded-lg p-3`}>
                    <div>{msg.content}</div>
                    {msg.attachmentName && (
                      <div className="mt-1 text-sm">
                        <a href="#" download={msg.attachmentName}>📎 {msg.attachmentName}</a>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">{msg.timestamp}</div>
                  </div>
                  {msg.isUser && <Avatar><img src={user?.avatar || "/placeholder.svg"} alt="You" /></Avatar>}
                </div>
              ))
            }
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="p-4 border-t bg-white dark:bg-gray-800">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center">
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
              <Paperclip />
            </Button>
            <input type="file" ref={fileInputRef} hidden onChange={e => setAttachment(e.target.files?.[0] ?? null)} />
            <Input 
              type="text" 
              placeholder="Message Fastwork AI..." 
              value={inputMessage} 
              onChange={e => setInputMessage(e.target.value)} 
              disabled={isLoading}
              className="mx-2" 
            />
            <Button type="submit" size="icon" disabled={isLoading || (!inputMessage.trim() && !attachment)}>
              <Send />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
