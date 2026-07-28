"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./DirectChat.module.css";
import {
  UserProfile,
  getAllUsers,
  DirectMessage,
  sendDirectMessage,
  getDirectChatId,
  markDirectMessagesAsRead
} from "@/lib/firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";

interface DirectChatProps {
  currentUserId: string;
}

export default function DirectChat({ currentUserId }: DirectChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch users real-time when opened
  useEffect(() => {
    if (!isOpen) return;

    const usersQuery = query(collection(db, "users"), orderBy("displayName", "asc"));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const loadedUsers: UserProfile[] = [];
      snapshot.forEach(doc => {
        const u = doc.data() as UserProfile;
        if (u.uid !== currentUserId) {
          loadedUsers.push(u);
        }
      });
      setUsers(loadedUsers);
      
      setSelectedUser(prev => {
        if (!prev) return prev;
        const updated = loadedUsers.find(u => u.uid === prev.uid);
        return updated || prev;
      });
    });

    return () => unsubscribe();
  }, [isOpen, currentUserId]);

  // Subscribe to messages when a user is selected
  useEffect(() => {
    if (!selectedUser || !isOpen) return;

    const chatId = getDirectChatId(currentUserId, selectedUser.uid);
    const chatQuery = query(
      collection(db, "direct_chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const loadedMessages: DirectMessage[] = [];
      const unreadIds: string[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const msg = { id: doc.id, ...data } as DirectMessage;
        loadedMessages.push(msg);

        // If message is from the other person and it's not read yet
        if (msg.senderId === selectedUser.uid && !msg.isRead) {
          unreadIds.push(msg.id!);
        }
      });

      setMessages(loadedMessages);

      if (unreadIds.length > 0) {
        markDirectMessagesAsRead(chatId, unreadIds).catch(err => console.error("Error marking as read", err));
      }
    });

    return () => unsubscribe();
  }, [selectedUser, isOpen, currentUserId]);

  useEffect(() => {
    if (selectedUser) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !selectedUser) return;

    setIsSending(true);
    try {
      await sendDirectMessage(currentUserId, selectedUser.uid, inputText.trim());
      setInputText("");
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button className={styles.fabChat} onClick={() => setIsOpen(true)} title="Open Messages">
        <span className="material-symbols-outlined">chat</span>
      </button>

      <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`} onClick={() => setIsOpen(false)} />

      <div className={`${styles.chatDrawer} ${isOpen ? styles.chatDrawerOpen : ''}`}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {selectedUser && (
              <button className={styles.backButton} onClick={() => setSelectedUser(null)}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div>
              <h2 className={styles.headerTitle}>
                {selectedUser ? selectedUser.displayName || "User" : "Messages"}
              </h2>
              {selectedUser && (
                <div className={styles.headerSubtitle}>
                  {selectedUser.isOnline ? "Online" : "Offline"}
                </div>
              )}
            </div>
          </div>
          <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        {!selectedUser ? (
          // SCREEN 1: CONTACTS LIST
          <div className={styles.contactsList}>
            {users.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>group</span>
                <h3>No contacts found</h3>
                <p>There are no other users registered yet.</p>
              </div>
            ) : (
              users.map(user => (
                <div key={user.uid} className={styles.contactItem} onClick={() => setSelectedUser(user)}>
                  <div className={styles.avatarContainer}>
                    <img
                      src={user.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuCyI4Df_EA0qn_sQX-LKgmcvoOz0_dH-FOKtWuPJoKcVBOl0oBs00VV517zAjLO80jbWYMrbFsB0F3Mp7-kHVm3OdRaVU_m14cTdDB1aegWVzzJJZl5y7IwbXEaZoRWnUpbgXtvIm20MZCR9gdJx9ElvW4AfYkogtxGFGkx_tyHCA7kL4hvLRMgnvXJsy5mU_dztGM4am8AFBwqgUL8LJf9F80VcWRCsihhDw1BYLYFKQMuKhhQ4QlwaRvZIc3nzLSpFlZQ08zh19Q"}
                      alt={user.displayName || "User"}
                      className={styles.avatar}
                    />
                    <span className={`${styles.presenceDot} ${user.isOnline ? styles.online : ''}`}></span>
                  </div>
                  <div className={styles.contactInfo}>
                    <div className={styles.contactName}>{user.displayName || "Unknown User"}</div>
                    <div className={`${styles.contactStatus} ${user.isOnline ? styles.onlineText : ''}`}>
                      {user.isOnline ? "Online" : "Offline"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // SCREEN 2: CHAT ROOM
          <>
            <div className={styles.messageList}>
              {messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>forum</span>
                  <p>No messages yet.</p>
                  <p style={{ fontSize: 13, marginTop: 4 }}>Say hello to {selectedUser.displayName}!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;

                  return (
                    <div key={msg.id} className={`${styles.messageRow} ${isMine ? styles.isMine : ''}`}>
                      <div className={styles.messageContent}>
                        <div className={styles.bubble}>
                          {msg.text}
                        </div>
                        <div className={styles.messageFooter}>
                          {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "..."}
                          {isMine && (
                            <span className={`${styles.readReceipts} ${msg.isRead ? styles.isRead : ''}`} title={msg.isRead ? "Read" : "Sent"}>
                              <span className="material-symbols-outlined">
                                {msg.isRead ? 'done_all' : 'check'}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className={styles.inputArea} onSubmit={handleSend}>
              <input
                type="text"
                className={styles.input}
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending}
              />
              <button type="submit" className={styles.sendButton} disabled={!inputText.trim() || isSending}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
