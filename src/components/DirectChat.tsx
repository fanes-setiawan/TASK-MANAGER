"use client";

import React, { useState, useEffect, useRef, MouseEvent } from "react";
import styles from "./DirectChat.module.css";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import imageCompression from "browser-image-compression";
import {
  UserProfile,
  DirectMessage,
  sendDirectMessage,
  getDirectChatId,
  markDirectMessagesAsRead,
  deleteDirectChat,
  ActiveChatSession,
} from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

type View = "activeChats" | "newChat" | "chatRoom";

const DEFAULT_AVATAR = (name?: string | null) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=6366f1&color=fff&size=128&bold=true&rounded=true`;

function formatTime(ts: any): string {
  if (!ts?.seconds) return "";
  const d = new Date(ts.seconds * 1000);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Kemarin";
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function formatLastSeen(ts: any): string {
  if (!ts?.seconds) return "Offline";
  const d = new Date(ts.seconds * 1000);
  return `Terakhir dilihat ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

interface ActiveChatWithUser extends ActiveChatSession {
  otherUser: UserProfile | null;
}

interface DirectChatProps {
  currentUserId?: string | null;
}

export default function DirectChat({ currentUserId: propUserId }: DirectChatProps = {}) {
  const router = useRouter();
  const [authUserId, setAuthUserId] = useState<string | null>(propUserId ?? auth?.currentUser?.uid ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>("activeChats");

  useEffect(() => {
    if (propUserId !== undefined) {
      setAuthUserId(propUserId);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUserId(user ? user.uid : null);
    });
    return () => unsub();
  }, [propUserId]);

  const activeUserId = propUserId || authUserId;

  const handleOpenChat = () => {
    if (!activeUserId) {
      router.push("/login");
      return;
    }
    setIsOpen(true);
  };

  useEffect(() => {
    const handleCustomOpen = () => {
      handleOpenChat();
    };
    window.addEventListener("open-direct-chat", handleCustomOpen);
    return () => window.removeEventListener("open-direct-chat", handleCustomOpen);
  }, [activeUserId]);

  // Data for views
  const [activeChats, setActiveChats] = useState<ActiveChatWithUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Chat room state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File, previewUrl: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  // Profile modal
  const [showProfile, setShowProfile] = useState(false);

  // Resizable drawer
  const [drawerWidth, setDrawerWidth] = useState(420);
  const isResizing = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onMouseMove = (e: globalThis.MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setDrawerWidth(Math.min(Math.max(newWidth, 320), 800));
    };
    const onMouseUp = () => { isResizing.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // ── Listen to active chats for current user ──────────────────────
  useEffect(() => {
    if (!isOpen || !activeUserId) return;

    // Query without orderBy to avoid composite index requirement — sort client-side
    const q = query(
      collection(db, "direct_chats"),
      where("participants", "array-contains", activeUserId)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const sessions: ActiveChatWithUser[] = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as ActiveChatSession;
        const otherId = data.participants.find((p) => p !== activeUserId);
        let otherUser: UserProfile | null = null;
        if (otherId) {
          const userSnap = await getDoc(doc(db, "users", otherId));
          if (userSnap.exists()) otherUser = userSnap.data() as UserProfile;
        }
        sessions.push({ ...data, chatId: docSnap.id, otherUser });
      }
      // Sort by most recent message client-side
      sessions.sort((a, b) => {
        const aTime = a.lastMessageTime?.seconds ?? 0;
        const bTime = b.lastMessageTime?.seconds ?? 0;
        return bTime - aTime;
      });
      setActiveChats(sessions);
    });

    return () => unsub();
  }, [isOpen, activeUserId]);

  // ── Listen to all users for contact picker ─────────────────────────
  useEffect(() => {
    if (view !== "newChat" || !isOpen || !activeUserId) return;

    const q = query(collection(db, "users"), orderBy("displayName", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const users: UserProfile[] = [];
      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.uid !== activeUserId) users.push(u);
      });
      setAllUsers(users);
    });

    return () => unsub();
  }, [view, isOpen, activeUserId]);

  // ── Listen to selected user's profile (presence) ──────────────────
  useEffect(() => {
    if (!selectedUser) return;
    const unsub = onSnapshot(doc(db, "users", selectedUser.uid), (snap) => {
      if (snap.exists()) setSelectedUser(snap.data() as UserProfile);
    });
    return () => unsub();
  }, [selectedUser?.uid]);

  // ── Listen to messages in chat room ───────────────────────────────
  useEffect(() => {
    if (!currentChatId || !activeUserId) return;

    const q = query(
      collection(db, "direct_chats", currentChatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(150)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs: DirectMessage[] = [];
      const unreadIds: string[] = [];
      snap.forEach((d) => {
        const msg = { id: d.id, ...d.data() } as DirectMessage;
        msgs.push(msg);
        if (msg.senderId !== activeUserId && !msg.isRead) unreadIds.push(msg.id!);
      });
      setMessages(msgs);
      if (unreadIds.length > 0) {
        markDirectMessagesAsRead(currentChatId, unreadIds).catch(() => {});
      }
    });

    return () => unsub();
  }, [currentChatId, activeUserId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderMessageWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.chatLink}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInputText((prev) => prev + emojiData.emoji);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingAttachment({ file, previewUrl });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = () => {
    if (pendingAttachment) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  };

  const handleDownloadImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objUrl;
      link.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objUrl);
    } catch (e) {
      console.error("Gagal mendownload gambar:", e);
      window.open(url, "_blank");
    }
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add(styles.highlightMessage);
      setTimeout(() => el.classList.remove(styles.highlightMessage), 2000);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────
  const openChatWith = (user: UserProfile) => {
    if (!activeUserId) return;
    const chatId = getDirectChatId(activeUserId, user.uid);
    setSelectedUser(user);
    setCurrentChatId(chatId);
    setView("chatRoom");
    setShowProfile(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !pendingAttachment) || isSending || !selectedUser || !currentChatId || !activeUserId) return;
    setIsSending(true);
    try {
      let attachmentData;

      if (pendingAttachment) {
        setIsUploading(true);
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(pendingAttachment.file, options);
        
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.readAsDataURL(compressedFile);
          reader.onloadend = () => resolve(reader.result as string);
        });
        const base64data = await base64Promise;
        
        const response = await fetch('/api/chat-attachment/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64data }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed");
        
        attachmentData = {
          url: data.url,
          publicId: data.publicId,
          type: "image",
        };
        setIsUploading(false);
      }

      let replyData;
      if (replyingTo) {
        const senderName = replyingTo.senderId === activeUserId ? "Anda" : selectedUser.displayName || "User";
        replyData = {
          messageId: replyingTo.id!,
          text: replyingTo.text || (replyingTo.attachment ? "Gambar" : ""),
          senderName,
          attachmentUrl: replyingTo.attachment?.url
        };
      }

      await sendDirectMessage(
        activeUserId, 
        selectedUser.uid, 
        inputText.trim(),
        attachmentData,
        replyData
      );

      setInputText("");
      handleRemoveAttachment();
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim pesan.");
      setIsUploading(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!currentChatId || !selectedUser) return;
    const ok = confirm(`Hapus semua percakapan dengan ${selectedUser.displayName}?`);
    if (!ok) return;
    try {
      await deleteDirectChat(currentChatId);
      setView("activeChats");
      setSelectedUser(null);
      setCurrentChatId(null);
      setMessages([]);
      setShowProfile(false);
    } catch {
      alert("Gagal menghapus chat.");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowProfile(false);
    handleRemoveAttachment();
    setReplyingTo(null);
  };

  const goBack = () => {
    if (showProfile) { setShowProfile(false); return; }
    if (view === "chatRoom") { 
      setView("activeChats"); 
      setSelectedUser(null); 
      setCurrentChatId(null); 
      setMessages([]); 
      handleRemoveAttachment(); 
      setReplyingTo(null);
    }
    else if (view === "newChat") setView("activeChats");
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
      {/* FAB */}
      <button className={styles.fabChat} onClick={handleOpenChat} title="Open Messages">
        <span className="material-symbols-outlined">chat</span>
      </button>

      {/* Overlay */}
      <div className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ""}`} onClick={handleClose} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`${styles.chatDrawer} ${isOpen ? styles.chatDrawerOpen : ""}`}
        style={{ width: drawerWidth }}
      >
        {/* Resize handle */}
        <div
          className={styles.resizeHandle}
          onMouseDown={(e) => { e.preventDefault(); isResizing.current = true; }}
          title="Drag to resize"
        />

        {/* ── VIEW: ACTIVE CHATS ─────────────────────────── */}
        {view === "activeChats" && (
          <>
            <div className={styles.chatListHeader}>
              <span className={styles.chatListTitle}>Messages</span>
              <button className={styles.newChatBtn} onClick={() => setView("newChat")} title="New Chat">
                <span className="material-symbols-outlined">edit_square</span>
              </button>
              <button className={styles.iconBtn} onClick={handleClose}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.chatList}>
              {activeChats.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIllustration} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="80" fill="#f0fdf4"/>
                    <rect x="44" y="60" width="112" height="80" rx="14" fill="#d1fae5"/>
                    <rect x="56" y="72" width="60" height="10" rx="5" fill="#6ee7b7"/>
                    <rect x="56" y="88" width="40" height="10" rx="5" fill="#a7f3d0"/>
                    <rect x="72" y="110" width="72" height="10" rx="5" fill="#6ee7b7"/>
                    <circle cx="148" cy="148" r="24" fill="#10b981"/>
                    <path d="M140 148h16M148 140v16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  <h3>Belum ada obrolan</h3>
                  <p>Mulai percakapan baru dengan rekan tim Anda.</p>
                  <button className={styles.startChatBtn} onClick={() => setView("newChat")}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    Mulai Chat Baru
                  </button>
                </div>
              ) : (
                activeChats.map((chat) => {
                  const user = chat.otherUser;
                  if (!user) return null;
                  return (
                    <div key={chat.chatId} className={styles.chatCard} onClick={() => openChatWith(user)}>
                      <div className={styles.avatarWrap}>
                        <img src={user.avatarUrl || DEFAULT_AVATAR(user.displayName)} alt={user.displayName || "User"} className={styles.chatAvatar} />
                        <span className={`${styles.presenceDot} ${user.isOnline ? styles.online : ""}`} />
                      </div>
                      <div className={styles.chatCardInfo}>
                        <div className={styles.chatCardTop}>
                          <span className={styles.chatCardName}>{user.displayName || "Unknown"}</span>
                          <span className={styles.chatCardTime}>{formatTime(chat.lastMessageTime)}</span>
                        </div>
                        <div className={styles.chatCardLastMsg}>
                          {chat.lastMessageSenderId === activeUserId ? "Anda: " : ""}
                          {chat.lastMessage || "Mulai percakapan..."}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ── VIEW: NEW CHAT CONTACT PICKER ──────────────── */}
        {view === "newChat" && (
          <>
            <div className={styles.drawerHeader}>
              <button className={styles.headerBackBtn} onClick={goBack}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div className={styles.headerInfo} style={{ cursor: "default" }}>
                <span className={styles.headerName}>Kontak Baru</span>
              </div>
              <button className={styles.iconBtn} onClick={handleClose}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.chatList}>
              {allUsers.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>group</span>
                  <h3>Tidak ada pengguna</h3>
                  <p>Belum ada pengguna lain yang terdaftar.</p>
                </div>
              ) : (
                allUsers.map((user) => (
                  <div key={user.uid} className={styles.contactItem} onClick={() => openChatWith(user)}>
                    <div className={styles.avatarWrap}>
                      <img src={user.avatarUrl || DEFAULT_AVATAR(user.displayName)} alt={user.displayName || "User"} className={styles.chatAvatar} />
                      <span className={`${styles.presenceDot} ${user.isOnline ? styles.online : ""}`} />
                    </div>
                    <div>
                      <div className={styles.contactName}>{user.displayName || "Unknown"}</div>
                      <div className={`${styles.contactStatus} ${user.isOnline ? styles.onlineText : ""}`}>
                        {user.isOnline ? "Online" : formatLastSeen(user.lastSeen)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── VIEW: CHAT ROOM ────────────────────────────── */}
        {view === "chatRoom" && selectedUser && (
          <>
            {/* Profile Modal */}
            {showProfile && (
              <div className={styles.profileModal}>
                <div className={styles.profileBanner} />
                <div className={styles.profileAvatarSection}>
                  <img src={selectedUser.avatarUrl || DEFAULT_AVATAR(selectedUser.displayName)} className={styles.profileAvatarLarge} alt="Profile" />
                  <div className={styles.headerActions}>
                    <button className={`${styles.iconBtn} ${styles.danger}`} onClick={handleDeleteChat} title="Hapus Chat">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                    <button className={styles.iconBtn} onClick={() => setShowProfile(false)}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>
                <div className={styles.profileBody}>
                  <div className={styles.profileDisplayName}>{selectedUser.displayName || "Unknown"}</div>
                  <div className={`${styles.profileStatusText} ${!selectedUser.isOnline ? styles.offline : ""}`}>
                    {selectedUser.isOnline ? "Online" : formatLastSeen(selectedUser.lastSeen)}
                  </div>
                  <div className={styles.profileInfoRow}>
                    <span className="material-symbols-outlined">mail</span>
                    <span>{selectedUser.email || "–"}</span>
                  </div>
                  <div className={styles.profileInfoRow}>
                    <span className="material-symbols-outlined">badge</span>
                    <span style={{ textTransform: "capitalize" }}>{selectedUser.role || "staff"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Header */}
            <div className={styles.drawerHeader}>
              <button className={styles.headerBackBtn} onClick={goBack}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <img
                src={selectedUser.avatarUrl || DEFAULT_AVATAR(selectedUser.displayName)}
                alt={selectedUser.displayName || "User"}
                className={styles.headerAvatar}
                onClick={() => setShowProfile(true)}
              />
              <div className={styles.headerInfo} onClick={() => setShowProfile(true)}>
                <span className={styles.headerName}>{selectedUser.displayName || "User"}</span>
                <span className={`${styles.headerStatus} ${selectedUser.isOnline ? styles.online : ""}`}>
                  {selectedUser.isOnline ? "Online" : formatLastSeen(selectedUser.lastSeen)}
                </span>
              </div>
              <div className={styles.headerActions}>
                <button className={styles.iconBtn} onClick={handleClose}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messageList}>
              {messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>waving_hand</span>
                  <h3>Belum ada pesan</h3>
                  <p>Sapa {selectedUser.displayName}!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === activeUserId;
                  return (
                    <div key={msg.id} id={`msg-${msg.id}`} className={`${styles.messageRow} ${isMine ? styles.isMine : ""}`}>
                      <div className={styles.messageBubbleWrap}>
                        <div className={styles.messageContent}>
                          <div className={styles.bubble}>
                            {msg.replyTo && (
                              <div 
                                className={styles.replyQuote} 
                                onClick={() => scrollToMessage(msg.replyTo!.messageId)}
                                style={{ cursor: "pointer" }}
                                title="Lihat pesan asli"
                              >
                                <div className={styles.replyQuoteName}>{msg.replyTo.senderName}</div>
                                <div className={styles.replyQuoteText}>
                                  {msg.replyTo.attachmentUrl && (
                                    <img src={msg.replyTo.attachmentUrl} alt="Reply Attachment" className={styles.replyQuoteImg} />
                                  )}
                                  <span>{msg.replyTo.text}</span>
                                </div>
                              </div>
                            )}
                            {msg.attachment && msg.attachment.type === "image" && (
                              <img 
                                src={msg.attachment.url} 
                                alt="Attachment" 
                                className={`${styles.attachmentImage} ${styles.clickable}`}
                                onClick={() => setFullScreenImage(msg.attachment!.url)} 
                              />
                            )}
                            {msg.text && renderMessageWithLinks(msg.text)}
                          </div>
                          <div className={styles.messageFooter}>
                            {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "..."}
                            {isMine && (
                              <span className={`${styles.readReceipts} ${msg.isRead ? styles.isRead : ""}`}>
                                <span className="material-symbols-outlined">{msg.isRead ? "done_all" : "check"}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          className={styles.replyActionBtn} 
                          title="Balas Pesan"
                          onClick={() => setReplyingTo(msg)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>reply</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Previews */}
            {(pendingAttachment || replyingTo) && (
              <div className={styles.inputPreviewsContainer}>
                {replyingTo && (
                  <div className={styles.previewBox}>
                    <div className={styles.previewContent}>
                      <span className={styles.previewTitle}>
                        Membalas {replyingTo.senderId === activeUserId ? "pesan Anda" : selectedUser.displayName}
                      </span>
                      <span className={styles.previewText}>{replyingTo.text || "Gambar"}</span>
                    </div>
                    <button type="button" className={styles.previewCloseBtn} onClick={() => setReplyingTo(null)}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                )}
                {pendingAttachment && (
                  <div className={styles.previewBox}>
                    <img src={pendingAttachment.previewUrl} alt="Preview" className={styles.previewImage} />
                    <div className={styles.previewContent}>
                      <span className={styles.previewTitle}>Lampiran Gambar</span>
                      <span className={styles.previewText}>{pendingAttachment.file.name}</span>
                    </div>
                    <button type="button" className={styles.previewCloseBtn} onClick={handleRemoveAttachment}>
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <form className={styles.inputArea} onSubmit={handleSend}>
              <div className={styles.emojiPickerContainer}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className={styles.emojiButton}
                  onClick={() => fileInputRef.current?.click()}
                  title="Lampirkan Gambar"
                  disabled={isUploading}
                >
                  <span className="material-symbols-outlined">attach_file</span>
                </button>
                <button
                  type="button"
                  className={styles.emojiButton}
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  title="Emoji"
                  disabled={isUploading}
                >
                  <span className="material-symbols-outlined">mood</span>
                </button>
                {showEmojiPicker && (
                  <div className={styles.emojiPickerWrapper}>
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </div>
                )}
              </div>
              <input
                type="text"
                className={styles.input}
                placeholder={`Pesan ke ${selectedUser.displayName}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isSending || isUploading}
              />
              <button type="submit" className={styles.sendButton} disabled={(!inputText.trim() && !pendingAttachment) || isSending || isUploading}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </>
        )}
      </div>

      {/* Image Viewer */}
      {fullScreenImage && (
        <div className={styles.imageViewerOverlay} onClick={() => setFullScreenImage(null)}>
          <div className={styles.imageViewerHeader} onClick={e => e.stopPropagation()}>
            <button className={styles.viewerBtn} onClick={() => handleDownloadImage(fullScreenImage)} title="Download Gambar">
              <span className="material-symbols-outlined">download</span>
            </button>
            <button className={styles.viewerBtn} onClick={() => setFullScreenImage(null)} title="Tutup">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <img src={fullScreenImage} className={styles.fullScreenImage} alt="Fullscreen" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
