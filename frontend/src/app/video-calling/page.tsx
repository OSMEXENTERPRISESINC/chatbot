"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sidebar } from "@/components/sidebar"
import { Menu, Phone, Video, Search, X } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/lib/sidebar-context"
import { useAuth } from "@/lib/auth-context"
import { twilioService } from "@/utils/twilio-service"
import type { Call } from "@/utils/types"
import type { User } from "@/utils/types"

export default function VideoCallingPage() {
  const { showSidebar, setShowSidebar, toggleSidebar } = useSidebar()
  const { user, allUsers } = useAuth()
  const [inCall, setInCall] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeContact, setActiveContact] = useState<Omit<User, "password"> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentCall, setCurrentCall] = useState<Call | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  // Initialize WebRTC
  useEffect(() => {
    // Initialize twilio when user is available
    if (user) {
      twilioService.initialize(user.id)

      // Check for active calls
      const activeCall = twilioService.getActiveCall()
      if (activeCall) {
        setCurrentCall(activeCall)

        // Find the other user in the call
        const otherUserId = activeCall.callerId === user.id ? activeCall.receiverId : activeCall.callerId

        const otherUser = allUsers.find((u) => u.id === otherUserId)
        if (otherUser) {
          setActiveContact(otherUser)
          setInCall(activeCall.status === "ongoing")

          // If we're in an ongoing call, start WebRTC
          if (activeCall.status === "ongoing") {
            startLocalStream()
          }
        }
      }

      // Listen for call requests
      const callRequestUnsubscribe = twilioService.on("call-request", (call: Call) => {
        if (call.receiverId === user.id) {
          setCurrentCall(call)
          const caller = allUsers.find((u) => u.id === call.callerId)
          if (caller) {
            setActiveContact(caller)
          }
        }
      })

      // Listen for call accepts
      const callAcceptUnsubscribe = twilioService.on("call-accept", (call: Call) => {
        if (call.callerId === user.id) {
          setCurrentCall(call)
          setInCall(true)

          // Start WebRTC connection
          startLocalStream()
        }
      })

      // Listen for call ends
      const callEndUnsubscribe = twilioService.on("call-end", (call: Call) => {
        if (call.callerId === user.id || call.receiverId === user.id) {
          endCall()
        }
      })

      return () => {
        callRequestUnsubscribe()
        callAcceptUnsubscribe()
        callEndUnsubscribe()

        // Clean up WebRTC
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop())
        }

        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
        }
      }
    }
  }, [user, allUsers])

  // Set up local video stream
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      setLocalStream(stream)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Set up peer connection
      setupPeerConnection(stream)
    } catch (error) {
      console.error("Error accessing media devices:", error)
    }
  }

  // Set up WebRTC peer connection
  const setupPeerConnection = (stream: MediaStream) => {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    }

    const peerConnection = new RTCPeerConnection(configuration)
    peerConnectionRef.current = peerConnection

    // Add local stream tracks to peer connection
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream)
    })

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0])

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0]
        }
      }
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && currentCall && activeContact) {
        // In a real app, you would send this to the other peer
        // For simplicity, we're not implementing the full signaling
      }
    }

    // Create offer if we're the caller
    if (currentCall && user && currentCall.callerId === user.id) {
      peerConnection
        .createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .then(() => {
          // In a real app, you would send this offer to the other peer
          // For simplicity, we're not implementing the full signaling
        })
        .catch((error) => console.error("Error creating offer:", error))
    }
  }

  // Start a call
  const startCall = async () => {
    if (!user || !activeContact) return

    // Create a call
    const call = twilioService.initiateCall(activeContact.id)
    setCurrentCall(call)

    // In a real app, we would wait for the other user to accept
    // For demo purposes, we'll auto-accept after a delay
    setTimeout(() => {
      if (call.receiverId === activeContact.id) {
        twilioService.acceptCall(call.id)
        setInCall(true)
        startLocalStream()
      }
    }, 2000)
  }

  // End the call
  const endCall = () => {
    if (currentCall) {
      twilioService.endCall(currentCall.id)
    }

    setInCall(false)
    setCurrentCall(null)

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    setRemoteStream(null)
  }

  // Filter contacts based on search query
  const filteredContacts = allUsers
    .filter((u) => u.id !== user?.id) // Filter out current user
    .filter((contact) => `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))

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

      {/* Main content */}
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
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Video Calling</h1>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Avatar className="h-8 w-8">
              <img src={user?.avatar || "/placeholder.svg?height=32&width=32"} alt="User" />
            </Avatar>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row">
          {/* Contacts list */}
          {!inCall ? (
            <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>

                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Contacts</h2>

                {isLoading ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">Loading contacts...</div>
                ) : filteredContacts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">No contacts found</div>
                ) : (
                  <div className="space-y-2">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-3 rounded-lg flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => setActiveContact(contact)}
                      >
                        <div className="flex items-center">
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
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {contact.firstName} {contact.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {contact.online
                                ? "Online"
                                : `Last seen: ${new Date(contact.lastSeen || "").toLocaleString()}`}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveContact(contact)
                            startCall()
                          }}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Video call area */}
          <div className={`flex-1 ${inCall ? "bg-gray-900" : "bg-gray-50 dark:bg-gray-900"}`}>
            {inCall && activeContact ? (
              <div className="relative h-full">
                {/* Call header */}
                <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <img
                          src={activeContact.avatar || "/placeholder.svg"}
                          alt={`${activeContact.firstName} ${activeContact.lastName}`}
                        />
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {activeContact.firstName} {activeContact.lastName}
                        </div>
                        <div className="text-xs text-gray-300">{activeContact.online ? "Online" : "Offline"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm">
                    {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {/* Main video display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {remoteStream ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <Avatar className="h-32 w-32 mb-4">
                          <img
                            src={activeContact.avatar || "/placeholder.svg"}
                            alt={`${activeContact.firstName} ${activeContact.lastName}`}
                          />
                        </Avatar>
                        <h2 className="text-2xl font-bold text-white mb-2">
                          {activeContact.firstName} {activeContact.lastName}
                        </h2>
                        <p className="text-gray-300">Connecting...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Self view */}
                <div className="absolute bottom-24 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                  {localStream ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700">
                      <Avatar className="h-16 w-16">
                        <img src={user?.avatar || "/placeholder.svg?height=64&width=64"} alt="You" />
                      </Avatar>
                    </div>
                  )}
                </div>

                {/* Call controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-gray-800 bg-opacity-70 px-6 py-3 rounded-full">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-red-500 text-white hover:bg-red-600"
                    onClick={endCall}
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : activeContact ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="text-center mb-8">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <img
                      src={activeContact.avatar || "/placeholder.svg"}
                      alt={`${activeContact.firstName} ${activeContact.lastName}`}
                    />
                  </Avatar>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    {activeContact.firstName} {activeContact.lastName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {activeContact.online
                      ? "Online"
                      : `Last seen: ${new Date(activeContact.lastSeen || "").toLocaleString()}`}
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={startCall}>
                      <Video className="mr-2 h-5 w-5" />
                      Start Video Call
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-gray-300 dark:border-gray-600"
                      onClick={() => setActiveContact(null)}
                    >
                      <X className="mr-2 h-5 w-5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <div className="text-center mb-8">
                  <Video className="h-16 w-16 mx-auto mb-4 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Video Calling</h2>
                  <p className="text-gray-600 dark:text-gray-300 max-w-md">
                    Select a contact from the list to start a video call
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
