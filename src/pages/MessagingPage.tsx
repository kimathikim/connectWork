"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Send, User, Search, Phone, Video, MoreHorizontal, ArrowLeft, Plus, X, Briefcase } from "lucide-react"
import { supabase } from "../lib/supabase"
import { SearchButton } from "../components/SearchButton"

interface Conversation {
  id: string
  otherUser: {
    id: string
    name: string
    avatar: string
    lastSeen?: string
  }
  lastMessage?: {
    text: string
    timestamp: string
    isRead: boolean
  }
  unreadCount: number
  jobId?: string
  jobTitle?: string
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  is_read: boolean
}

function MessagingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const jobId = searchParams.get("job")
  const userId = searchParams.get("user")

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)
  const [showConversations, setShowConversations] = useState(true)
  const [showNewMessageModal, setShowNewMessageModal] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [availableJobs, setAvailableJobs] = useState<any[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    checkCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchConversations()
    }
  }, [currentUser])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.otherUser.id)
      if (isMobileView) {
        setShowConversations(false)
      }
    }
  }, [selectedConversation])

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const checkCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate("/login", { state: { from: "/messages" } })
      return
    }

    setCurrentUser(user)
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)

      // In a real app, you would fetch actual conversations from the database
      // This is a simplified example
      const { data: sentMessages } = await supabase
        .from("messages")
        .select("receiver_id")
        .eq("sender_id", currentUser.id)
        .order("created_at", { ascending: false })

      const { data: receivedMessages } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("receiver_id", currentUser.id)
        .order("created_at", { ascending: false })

      // Combine unique user IDs from sent and received messages
      const userIds = new Set([
        ...(sentMessages?.map((msg) => msg.receiver_id) || []),
        ...(receivedMessages?.map((msg) => msg.sender_id) || []),
      ])

      // Fetch user details for each conversation
      const conversationPromises = Array.from(userIds).map(async (userId) => {
        const { data: userData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, last_seen")
          .eq("id", userId)
          .single()

        // Get last message and unread count
        const { data: lastMessageData } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", userId)
          .eq("receiver_id", currentUser.id)
          .eq("is_read", false)

        return {
          id: userId,
          otherUser: {
            id: userData?.id || userId,
            name: userData?.full_name || "Unknown User",
            avatar: userData?.avatar_url || "",
            lastSeen: userData?.last_seen,
          },
          lastMessage: lastMessageData
            ? {
                text: lastMessageData.content,
                timestamp: lastMessageData.created_at,
                isRead: lastMessageData.is_read,
              }
            : undefined,
          unreadCount: unreadCount || 0,
        }
      })

      const conversationsData = await Promise.all(conversationPromises)

      // Sort by last message time
      conversationsData.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0
        const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0
        return timeB - timeA
      })

      setConversations(conversationsData)

      // If jobId or userId is provided, select that conversation
      if (userId) {
        const conversation = conversationsData.find((conv) => conv.otherUser.id === userId)
        if (conversation) {
          setSelectedConversation(conversation)
        } else {
          // Fetch user data and create a new conversation
          const { data: userData } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", userId)
            .single()

          if (userData) {
            const newConversation = {
              id: userData.id,
              otherUser: {
                id: userData.id,
                name: userData.full_name || "Unknown User",
                avatar: userData.avatar_url || "",
              },
              unreadCount: 0,
            }
            setSelectedConversation(newConversation)
          }
        }
      } else if (jobId) {
        // Fetch job owner and select that conversation
        const { data: jobData } = await supabase.from("jobs").select("customer_id").eq("id", jobId).single()

        if (jobData) {
          const conversation = conversationsData.find((conv) => conv.otherUser.id === jobData.customer_id)
          if (conversation) {
            setSelectedConversation(conversation)
          } else {
            // Fetch user data and create a new conversation
            const { data: userData } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .eq("id", jobData.customer_id)
              .single()

            if (userData) {
              const newConversation = {
                id: userData.id,
                otherUser: {
                  id: userData.id,
                  name: userData.full_name || "Unknown User",
                  avatar: userData.avatar_url || "",
                },
                unreadCount: 0,
              }
              setSelectedConversation(newConversation)
            }
          }
        }
      }
    } catch (err) {
      console.error("Error fetching conversations:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (otherUserId: string, jobId?: string) => {
    try {
      setMessagesLoading(true);
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      
      let query = supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order("created_at", { ascending: true });
      
      // If jobId is provided, filter messages by job
      if (jobId) {
        query = query.eq("job_id", jobId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setMessages(data || []);
      
      // Mark messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", otherUserId)
        .eq("receiver_id", currentUser.id)
        .eq("is_read", false);
        
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      
      const messageData = {
        sender_id: currentUser.id,
        receiver_id: selectedConversation.otherUser.id,
        content: newMessage,
        created_at: new Date().toISOString(),
        is_read: false
      };
      
      // Add job_id if available
      const messageToSend = selectedConversation.jobId !== undefined 
        ? { ...messageData, job_id: selectedConversation.jobId }
        : messageData;
      
      const { error } = await supabase.from("messages").insert(messageToSend);
      
      if (error) throw error;
      
      setNewMessage("");
      
      // Refresh messages
      await fetchMessages(selectedConversation.otherUser.id, selectedConversation.jobId);
      
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${query}%`)
        .limit(10);
        
      if (error) throw error;
      
      // Filter out current user
      const filteredResults = data.filter(user => user.id !== currentUser.id);
      setSearchResults(filteredResults);
    } catch (err) {
      console.error("Error searching users:", err);
    }
  };

  const getConversation = async (currentUserId: string, otherUserId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
      .order("created_at", { ascending: true });
      
    if (error) throw error;
    return data;
  };

  const markMessagesAsRead = async (senderId: string, receiverId: string) => {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", senderId)
      .eq("receiver_id", receiverId)
      .eq("is_read", false);
      
    if (error) throw error;
  };

  const startNewConversation = async (jobId: string) => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        navigate("/login");
        return;
      }

      // Fetch job details to get the customer ID
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("customer_id, title")
        .eq("id", jobId)
        .single();
      
      if (jobError) throw jobError;
      
      if (!jobData) {
        console.error("Job not found");
        return;
      }
      
      // Create a new conversation with the job poster
      const newConversation = {
        id: jobData.customer_id,
        otherUser: {
          id: jobData.customer_id,
          name: "Job Poster", // This will be updated when user data is fetched
          avatar: "",
        },
        unreadCount: 0,
        jobId: jobId,
        jobTitle: jobData.title
      };
      
      // Fetch user data for the job poster
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url") // Make sure this matches your actual column name
        .eq("id", jobData.customer_id)
        .single();

      // Then check what fields are actually available in userData
      if (userData) {
        console.log("User data:", userData); // Add this to debug
        newConversation.otherUser.name = userData.full_name || "Unknown User";
        // Use the correct field name based on your database schema
        newConversation.otherUser.avatar = userData.avatar_url || "";
      }
      
      // Send initial message about the job
      const initialMessage = `Hello, I'm interested in your job: "${jobData.title}". I'd like to discuss the details.`;
      
      const { error: messageError } = await supabase.from("messages").insert({
        job_id: jobId,
        sender_id: currentUser.id,
        receiver_id: jobData.customer_id,
        content: initialMessage,
        created_at: new Date().toISOString(),
        is_read: false
      });
      
      if (messageError) throw messageError;
      
      // Update the messages list
      if (selectedConversation?.id === jobData.customer_id) {
        // If we're already in this conversation, refresh messages
        await fetchMessages(jobData.customer_id);
      }
      
      setSelectedConversation(newConversation);
      setShowNewMessageModal(false);
      
      // Navigate to include the job ID in the URL
      navigate(`/messages?job=${jobId}&user=${jobData.customer_id}`);
    } catch (err) {
      console.error("Error starting new conversation:", err);
    }
  };

  const searchJobs = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, description, customer_id, created_at")
        .ilike("title", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      setAvailableJobs(data || []);
    } catch (err) {
      console.error("Error searching jobs:", err);
      setAvailableJobs([]);
    }
  };

  const renderNewMessageModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">New Message to Job Poster</h3>
          <button onClick={() => setShowNewMessageModal(false)} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search for jobs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  searchJobs(e.target.value);
                } else {
                  setAvailableJobs([]);
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {availableJobs.length === 0 && searchQuery.trim() !== "" ? (
              <p className="text-center text-gray-500 py-4">No jobs found</p>
            ) : (
              availableJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => startNewConversation(job.id)}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer"
                >
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#CC7357] text-white">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-medium block">{job.title}</span>
                    <span className="text-sm text-gray-500 line-clamp-1">{job.description}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden h-[calc(100vh-6rem)]">
          <div className="flex h-full">
            {/* Conversations List */}
            {(!isMobileView || showConversations) && (
              <div className="w-full md:w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                    <button
                      onClick={() => setShowNewMessageModal(true)}
                      className="p-2 rounded-full bg-[#CC7357] text-white hover:bg-[#B66347]"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search conversations"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#CC7357]"></div>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                      <p className="text-gray-500 mb-2">No conversations yet</p>
                      <p className="text-sm text-gray-400">Start a conversation by booking a worker or posting a job</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          selectedConversation?.otherUser.id === conversation.otherUser.id ? "bg-gray-100" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200">
                              {conversation.otherUser.avatar ? (
                                <img
                                  src={conversation.otherUser.avatar || "/placeholder.svg"}
                                  alt={conversation.otherUser.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <User className="h-full w-full p-2 text-gray-400" />
                              )}
                            </div>
                            {conversation.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 bg-[#CC7357] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                                {conversation.unreadCount}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline">
                              <h3 className="font-medium text-gray-900 truncate">{conversation.otherUser.name}</h3>
                              {conversation.lastMessage && (
                                <span className="text-xs text-gray-500">
                                  {formatLastMessageTime(conversation.lastMessage.timestamp)}
                                </span>
                              )}
                            </div>
                            {conversation.lastMessage && (
                              <p
                                className={`text-sm truncate ${
                                  conversation.unreadCount > 0 ? "font-medium text-gray-900" : "text-gray-500"
                                }`}
                              >
                                {conversation.lastMessage.text}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Chat Area */}
            {(!isMobileView || !showConversations) && (
              <div className="w-full md:w-2/3 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isMobileView && (
                          <button
                            onClick={() => setShowConversations(true)}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <ArrowLeft className="h-5 w-5 text-gray-500" />
                          </button>
                        )}
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200">
                          {selectedConversation.otherUser.avatar ? (
                            <img
                              src={selectedConversation.otherUser.avatar || "/placeholder.svg"}
                              alt={selectedConversation.otherUser.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-full w-full p-2 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{selectedConversation.otherUser.name}</h3>
                          <p className="text-xs text-gray-500">
                            {selectedConversation.otherUser.lastSeen
                              ? `Last seen ${new Date(selectedConversation.otherUser.lastSeen).toLocaleString()}`
                              : "Offline"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-full hover:bg-gray-100">
                          <Phone className="h-5 w-5 text-gray-500" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-gray-100">
                          <Video className="h-5 w-5 text-gray-500" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-gray-100">
                          <MoreHorizontal className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <p className="text-gray-500 mb-2">No messages yet</p>
                          <p className="text-sm text-gray-400">Send a message to start the conversation</p>
                        </div>
                      ) : (
                        messages.map((message) => {
                          const isCurrentUser = message.sender_id === currentUser.id

                          return (
                            <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[75%] rounded-lg px-4 py-2 ${
                                  isCurrentUser
                                    ? "bg-[#CC7357] text-white"
                                    : "bg-white border border-gray-200 text-gray-800"
                                }`}
                              >
                                <p>{message.content}</p>
                                <p
                                  className={`text-xs mt-1 text-right ${
                                    isCurrentUser ? "text-white/70" : "text-gray-500"
                                  }`}
                                >
                                  {formatMessageTime(message.created_at)}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t border-gray-200">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                      }} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || sendingMessage}
                          className="bg-[#CC7357] text-white p-2 rounded-md hover:bg-[#B66347] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingMessage ? (
                            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <p className="text-gray-500 mb-2">Select a conversation</p>
                    <p className="text-sm text-gray-400">Choose a conversation from the list to start messaging</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && renderNewMessageModal()}
    </div>
  )
}

export default MessagingPage

