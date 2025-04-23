// Contact type
export interface Contact {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  avatar: string;
  online?: boolean;
}

// Message type
export interface Message {
  id: string;
  contactId: number;
  sender: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  attachments?: {
    name: string;
    type: string;
  }[];
}

// Dashboard message type
export interface DashboardMessage {
  id: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  /** Optional name of an attached file */
  attachmentName?: string;
}

// Video contact type
export interface VideoContact {
  id: number;
  name: string;
  lastSeen: string;
  time: string;
  avatar: string;
  online?: boolean;
}

// User type
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  createdAt: string;
  lastSeen?: string;
  online?: boolean;
  avatar?: string;
}

// Auth response type
export interface AuthResponse {
  success: boolean;
  user: Omit<User, "password"> | null;
  message: string;
}

// Auth context type
export interface AuthContextType {
  user: Omit<User, "password"> | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (userData: Omit<User, "id" | "createdAt">) => Promise<AuthResponse>;
  logout: () => void;
  allUsers: Omit<User, "password">[];
  refreshUsers: () => Promise<void>;
}

// Chat message type
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

// Call type
export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  status: "ringing" | "ongoing" | "ended";
  startTime: string;
  endTime?: string;
}
