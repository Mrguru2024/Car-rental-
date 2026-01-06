"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast/ToastProvider";

interface Message {
  id: string;
  message: string;
  sender_id: string;
  sender_role: string;
  created_at: string;
  is_read: boolean;
  profiles?: {
    full_name: string;
  };
}

interface Conversation {
  id: string;
  subject?: string;
  status: string;
  last_message_at?: string;
  messages?: Message[];
}

export default function ChatWidget() {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Check authentication and load conversation
  useEffect(() => {
    checkAuth();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`support-chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_chat_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          scrollToBottom();

          // Mark as unread if message is from support/admin
          if (newMessage.sender_id !== profile?.id) {
            setHasUnread(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, profile?.id, supabase]);

  const checkAuth = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      setUser(authUser);

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("user_id", authUser.id)
        .single();

      if (userProfile) {
        setProfile(userProfile);
        await loadConversation(userProfile.id);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (profileId: string) => {
    try {
      // Try to find existing open conversation
      const { data: existingConv } = await supabase
        .from("support_chat_conversations")
        .select("*")
        .eq("user_id", profileId)
        .in("status", ["open", "waiting"])
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        setConversation(existingConv);
        await loadMessages(existingConv.id);

        // Check for unread messages
        const { count: unreadCount } = await supabase
          .from("support_chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", existingConv.id)
          .eq("is_read", false)
          .neq("sender_id", profileId);

        setHasUnread((typeof unreadCount === "number" ? unreadCount : 0) > 0);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data: messagesData } = await supabase
        .from("support_chat_messages")
        .select(
          `
          *,
          profiles!support_chat_messages_sender_id_fkey(full_name)
        `
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesData) {
        setMessages(messagesData as Message[]);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const createConversation = async () => {
    if (!profile) return;

    try {
      const response = await fetch("/api/support/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "Support Request" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const data = await response.json();
      setConversation(data.conversation);
      setMessages([]);
    } catch (error: any) {
      showToast(error.message || "Failed to start conversation", "error");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile || sending) return;

    setSending(true);
    try {
      // Create conversation if it doesn't exist
      let convId = conversation?.id;
      if (!convId) {
        const createResponse = await fetch("/api/support/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: "Support Request" }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to create conversation");
        }

        const createData = await createResponse.json();
        if (createData.conversation) {
          setConversation(createData.conversation);
          convId = createData.conversation.id;
        } else {
          throw new Error("Failed to create conversation");
        }
      }

      const response = await fetch(
        `/api/support/chat/conversations/${convId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: newMessage.trim() }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      }

      setNewMessage("");
      setHasUnread(false);
    } catch (error: any) {
      showToast(error.message || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);

    // Mark messages as read when opening
    if (conversation?.id && profile) {
      supabase
        .from("support_chat_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("conversation_id", conversation.id)
        .neq("sender_id", profile.id)
        .eq("is_read", false);
    }
  };

  // Show email option for guests
  if (loading) {
    return null;
  }

  if (!user || !profile) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() =>
            (window.location.href =
              "mailto:support@carseraus.com?subject=Support Request")
          }
          className="flex items-center gap-3 bg-brand-blue dark:bg-brand-blue-light text-white px-6 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="font-medium">Email Support</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-brand-blue dark:bg-brand-blue-light text-white px-6 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
        >
          <div className="relative">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-brand-navy animate-pulse" />
            )}
          </div>
          <span className="font-medium">Support Chat</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 bg-white dark:bg-brand-navy-light rounded-2xl shadow-2xl border border-brand-gray/20 dark:border-brand-navy/50 transition-all duration-300 ${
            isMinimized ? "h-16 w-80" : "h-[600px] w-96"
          } flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-brand-gray/20 dark:border-brand-navy/50 bg-gradient-to-r from-brand-blue/10 to-brand-green/10 dark:from-brand-blue/20 dark:to-brand-green/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-blue dark:bg-brand-blue-light rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-brand-navy dark:text-brand-white">
                  Support Chat
                </h3>
                <p className="text-xs text-brand-gray dark:text-brand-white/70">
                  {conversation ? "We're here to help" : "Start a conversation"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-brand-gray dark:text-brand-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={isMinimized ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                  />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-brand-gray/10 dark:hover:bg-brand-navy/50 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-brand-gray dark:text-brand-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!conversation ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <svg
                      className="w-16 h-16 text-brand-gray dark:text-brand-white/30 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <p className="text-brand-gray dark:text-brand-white/70 mb-4">
                      Start a conversation with our support team
                    </p>
                    <button
                      onClick={createConversation}
                      className="px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Start Chat
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-brand-gray dark:text-brand-white/70">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
                      const isOwn = message.sender_id === profile.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isOwn ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                              isOwn
                                ? "bg-brand-blue dark:bg-brand-blue-light text-white"
                                : "bg-brand-gray/10 dark:bg-brand-navy/50 text-brand-navy dark:text-brand-white"
                            }`}
                          >
                            {!isOwn && message.profiles && (
                              <p className="text-xs font-medium mb-1 opacity-70">
                                {message.profiles.full_name || "Support"}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">
                              {message.message}
                            </p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.created_at).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-brand-gray/20 dark:border-brand-navy/50">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={!conversation || sending}
                    className="flex-1 px-4 py-2 border border-brand-gray/20 dark:border-brand-navy/50 rounded-lg bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-white focus:outline-none focus:ring-2 focus:ring-brand-blue dark:focus:ring-brand-blue-light disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || !conversation || sending}
                    className="px-4 py-2 bg-brand-blue dark:bg-brand-blue-light text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <svg
                        className="animate-spin h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
