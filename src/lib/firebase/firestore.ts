import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "./client";
import { User } from "firebase/auth";

export type UserRole = "admin" | "manager" | "staff";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: any;
}

export interface AppNotification {
  id?: string;
  userId: string; // The user who should receive this
  title: string;
  message: string;
  isRead: boolean;
  createdAt: any;
  link?: string; // Optional URL to navigate to when clicked
}

export async function saveUserRoleAfterLogin(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Pengguna sudah ada, kembalikan datanya
    return userSnap.data() as UserProfile;
  } else {
    // Pengguna baru, berikan role default "staff"
    const newUser: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0] || "User",
      role: "staff", 
      createdAt: serverTimestamp(),
    };
    
    await setDoc(userRef, newUser);
    return newUser;
  }
}

export interface ProjectData {
  id?: string;
  projectName: string;
  clientName: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  currency: string;
  ratePerPoint: number;
  configJson: string;
  clientLogoUrl?: string;
  clientLogoPublicId?: string;
  createdAt?: any;
  createdBy?: string;
  status?: string;
  isPinned?: boolean;
  rowColor?: string;
  boardColumns?: { name: string; color: string }[];
  shareSettings?: {
    isPublic: boolean;
    permission: "view" | "edit";
  };
  documentSettings?: {
    logoUrl?: string;
    themeColor?: string;
    customProjectName?: string;
    customClientName?: string;
    notes?: string;
    isDraft?: boolean;
    showPageNumbers?: boolean;
    showToc?: boolean;
    watermarkType?: "text" | "image";
    watermarkText?: string;
    watermarkImageUrl?: string;
    watermarkSize?: number;
    watermarkOpacity?: number;
    estimatedDuration?: string;
    projectDescription?: string;
  };
  memberIds?: string[];
  members?: {
    userId: string;
    role: "owner" | "editor" | "viewer";
    joinedAt?: any;
  }[];
}

export async function saveProject(project: ProjectData, userId: string) {
  const { collection, addDoc } = await import("firebase/firestore");
  const projectsRef = collection(db, "projects");
  
  const docRef = await addDoc(projectsRef, {
    ...project,
    createdBy: userId,
    createdAt: serverTimestamp(),
    memberIds: [userId],
    members: [{
      userId,
      role: "owner",
      joinedAt: new Date().toISOString()
    }]
  });
  
  return docRef.id;
}

export async function getProjectById(projectId: string): Promise<ProjectData | null> {
  const { doc, getDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ProjectData;
  }
  return null;
}

export async function updateProjectShareSettings(projectId: string, isPublic: boolean, permission: "view" | "edit") {
  const { doc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  await updateDoc(docRef, {
    shareSettings: { isPublic, permission }
  });
}

export async function updateProjectDocumentSettings(projectId: string, settings: any) {
  const { doc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  await updateDoc(docRef, {
    documentSettings: settings
  });
}

export async function updateProjectRowSettings(projectId: string, updates: { isPinned?: boolean, rowColor?: string }) {
  const { doc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  await updateDoc(docRef, updates);
}


export async function getProjects(userId?: string) {
  const { collection, getDocs, query, where, or } = await import("firebase/firestore");
  const projectsRef = collection(db, "projects");
  
  let q;
  if (userId) {
    q = query(projectsRef, or(
      where("createdBy", "==", userId),
      where("memberIds", "array-contains", userId)
    ));
  } else {
    q = query(projectsRef);
  }
  
  const snapshot = await getDocs(q);
  const projects: ProjectData[] = [];
  snapshot.forEach(doc => {
    projects.push({ id: doc.id, ...doc.data() } as ProjectData);
  });
  
  // Sort by createdAt descending in JS to avoid Firebase composite index requirement
  projects.sort((a, b) => {
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });
  
  return projects;
}

// --- Notification Helpers ---
export async function addNotification(userId: string, title: string, message: string, link?: string) {
  const notifRef = collection(db, "users", userId, "notifications");
  await addDoc(notifRef, {
    userId,
    title,
    message,
    isRead: false,
    createdAt: serverTimestamp(),
    link: link || null,
  });
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const notifRef = doc(db, "users", userId, "notifications", notificationId);
  await updateDoc(notifRef, {
    isRead: true
  });
}

export async function deleteProject(projectId: string) {
  const { doc, deleteDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  await deleteDoc(docRef);
}

export async function updateProjectStatus(projectId: string, status: string) {
  const { doc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  await updateDoc(docRef, { status });
}

export async function updateProjectColumns(projectId: string, columns: { name: string; color: string }[]) {
  const { doc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  await updateDoc(docRef, { boardColumns: columns });
}

export async function updateProject(projectId: string, project: Partial<ProjectData>) {
  const { doc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  await updateDoc(docRef, project);
}

// --- Logo Helpers ---
export interface SavedLogo {
  id: string;
  url: string;
  publicId?: string;
  createdAt?: string;
}

export async function saveUserLogo(userId: string, url: string, publicId?: string) {
  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  
  const newLogo: SavedLogo = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    url,
    publicId: publicId || "",
    createdAt: new Date().toISOString(),
  };
  
  await updateDoc(userRef, {
    savedLogos: arrayUnion(newLogo)
  });
  
  return newLogo.id;
}

export async function getSavedLogos(userId: string): Promise<SavedLogo[]> {
  const { doc, getDoc } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    const logos: SavedLogo[] = data.savedLogos || [];
    logos.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return logos;
  }
  
  return [];
}

export async function deleteSavedLogo(userId: string, logo: SavedLogo) {
  const { doc, updateDoc, arrayRemove } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    savedLogos: arrayRemove(logo)
  });
}

// --- Watermark Helpers ---
export interface SavedWatermark {
  id: string;
  url: string;
  publicId?: string;
  createdAt?: string;
}

export async function saveUserWatermark(userId: string, url: string, publicId?: string) {
  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  
  const newWatermark: SavedWatermark = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    url,
    publicId: publicId || "",
    createdAt: new Date().toISOString(),
  };
  
  await updateDoc(userRef, {
    savedWatermarks: arrayUnion(newWatermark)
  });
  
  return newWatermark.id;
}

export async function getSavedWatermarks(userId: string): Promise<SavedWatermark[]> {
  const { doc, getDoc } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    const watermarks: SavedWatermark[] = data.savedWatermarks || [];
    watermarks.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return watermarks;
  }
  
  return [];
}

export async function deleteSavedWatermark(userId: string, watermark: SavedWatermark) {
  const { doc, updateDoc, arrayRemove } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    savedWatermarks: arrayRemove(watermark)
  });
}

// --- Project Tasks (Kanban) ---
export type TaskStatus = string;

export interface ProjectTask {
  id?: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt?: any;
  createdBy?: string;
  apiDocs?: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url: string;
    headers?: string;
    body?: string;
    response?: string;
  };
  assigneeIds?: string[];
  comments?: any[];
}
export async function saveProjectTask(task: ProjectTask, userId?: string) {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", task.projectId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const tasks = data.kanbanTasks || [];
    
    const newTask = {
      ...task,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      createdBy: userId || "",
      createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    await updateDoc(docRef, { kanbanTasks: tasks });
    return newTask.id;
  }
  return null;
}

export async function getProjectTasks(projectId: string) {
  const { doc, getDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const tasks: ProjectTask[] = data.kanbanTasks || [];
    
    tasks.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
    
    return tasks;
  }
  return [];
}

export async function updateProjectTaskStatus(projectId: string, taskId: string, newStatus: TaskStatus) {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const tasks: ProjectTask[] = data.kanbanTasks || [];
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    
    await updateDoc(docRef, { kanbanTasks: updatedTasks });
  }
}

export async function deleteProjectTask(projectId: string, taskId: string) {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const tasks: ProjectTask[] = data.kanbanTasks || [];
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    
    await updateDoc(docRef, { kanbanTasks: updatedTasks });
  }
}

export async function updateProjectTaskFull(projectId: string, taskId: string, updates: Partial<ProjectTask>) {
  const { doc, getDoc, updateDoc } = await import("firebase/firestore");
  const docRef = doc(db, "projects", projectId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const tasks: ProjectTask[] = data.kanbanTasks || [];
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    
    await updateDoc(docRef, { kanbanTasks: updatedTasks });
  }
}

export async function searchUsersByEmail(emailQuery: string): Promise<UserProfile[]> {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", emailQuery));
  const snap = await getDocs(q);
  const users: UserProfile[] = [];
  snap.forEach(d => users.push(d.data() as UserProfile));
  return users;
}

export async function addTeamMember(projectId: string, userId: string, role: "editor" | "viewer") {
  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const pRef = doc(db, "projects", projectId);
  
  const memberObj = {
    userId,
    role,
    joinedAt: new Date().toISOString()
  };
  
  await updateDoc(pRef, {
    memberIds: arrayUnion(userId),
    members: arrayUnion(memberObj)
  });
}

export async function removeTeamMember(projectId: string, userId: string, memberObj: any) {
  const { doc, updateDoc, arrayRemove } = await import("firebase/firestore");
  const pRef = doc(db, "projects", projectId);
  
  await updateDoc(pRef, {
    memberIds: arrayRemove(userId),
    members: arrayRemove(memberObj)
  });
}


// --- Presence & Online Status ---
export async function updateUserPresence(userId: string, isOnline: boolean) {
  const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  try {
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating presence:", error);
  }
}

// --- Project Chat ---
export interface ChatMessage {
  id?: string;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt?: any;
  readBy: string[]; // Array of user IDs who have read this
}

export async function sendChatMessage(projectId: string, message: ChatMessage) {
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  const chatRef = collection(db, "projects", projectId, "chats");
  
  const newMsg = {
    ...message,
    createdAt: serverTimestamp(),
  };
  
  await addDoc(chatRef, newMsg);
}

export async function markMessagesAsRead(projectId: string, messageIds: string[], userId: string) {
  const { doc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const promises = messageIds.map(msgId => {
    const msgRef = doc(db, "projects", projectId, "chats", msgId);
    return updateDoc(msgRef, {
      readBy: arrayUnion(userId)
    });
  });
  await Promise.all(promises);
}

// --- Direct Messaging ---
export interface DirectMessage {
  id?: string;
  senderId: string;
  text: string;
  createdAt?: any;
  isRead: boolean;
  attachment?: {
    url: string;
    publicId: string;
    type: string;
  };
  replyTo?: {
    messageId: string;
    text: string;
    senderName?: string;
    attachmentUrl?: string;
  };
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { collection, getDocs } = await import("firebase/firestore");
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  const users: UserProfile[] = [];
  snapshot.forEach(doc => {
    users.push({ uid: doc.id, ...doc.data() } as UserProfile);
  });
  
  // Sort locally by email or displayName to ensure all users are returned
  users.sort((a, b) => {
    const nameA = a.displayName || a.email || "";
    const nameB = b.displayName || b.email || "";
    return nameA.localeCompare(nameB);
  });
  
  return users;
}

export function getDirectChatId(uid1: string, uid2: string) {
  // Sort UIDs to ensure consistent chat ID regardless of who started it
  return [uid1, uid2].sort().join("_");
}

export async function sendDirectMessage(
  senderId: string, 
  receiverId: string, 
  text: string,
  attachment?: { url: string; publicId: string; type: string; },
  replyTo?: { messageId: string; text: string; senderName?: string; attachmentUrl?: string; }
) {
  const { collection, addDoc, serverTimestamp, setDoc, doc } = await import("firebase/firestore");
  const chatId = getDirectChatId(senderId, receiverId);
  
  // Ensure the chat document exists with participants
  const chatRef = doc(db, "direct_chats", chatId);
  const displayLastMessage = attachment ? (text ? `🖼️ ${text}` : `🖼️ Gambar`) : text;
  
  await setDoc(chatRef, {
    participants: [senderId, receiverId],
    updatedAt: serverTimestamp(),
    lastMessage: displayLastMessage,
    lastMessageTime: serverTimestamp(),
    lastMessageSenderId: senderId
  }, { merge: true });

  const messagesRef = collection(db, "direct_chats", chatId, "messages");
  const newMsg: any = {
    senderId,
    text,
    createdAt: serverTimestamp(),
    isRead: false
  };
  if (attachment) {
    newMsg.attachment = attachment;
  }
  if (replyTo) {
    newMsg.replyTo = replyTo;
  }
  await addDoc(messagesRef, newMsg);
}

export async function markDirectMessagesAsRead(chatId: string, messageIds: string[]) {
  const { doc, updateDoc } = await import("firebase/firestore");
  const promises = messageIds.map(msgId => {
    const msgRef = doc(db, "direct_chats", chatId, "messages", msgId);
    return updateDoc(msgRef, {
      isRead: true
    });
  });
  await Promise.all(promises);
}

export async function deleteDirectChat(chatId: string) {
  const { doc, collection, getDocs, deleteDoc } = await import("firebase/firestore");
  
  // Delete all messages in the subcollection first
  const messagesRef = collection(db, "direct_chats", chatId, "messages");
  const messagesSnap = await getDocs(messagesRef);
  
  const publicIdsToDelete: string[] = [];
  
  const deletePromises = messagesSnap.docs.map(msgDoc => {
    const data = msgDoc.data() as DirectMessage;
    if (data.attachment && data.attachment.publicId) {
      publicIdsToDelete.push(data.attachment.publicId);
    }
    return deleteDoc(msgDoc.ref);
  });
  
  if (publicIdsToDelete.length > 0) {
    try {
      await fetch('/api/chat-attachment/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicIds: publicIdsToDelete })
      });
    } catch (err) {
      console.error("Failed to delete attachments from Cloudinary:", err);
    }
  }
  
  await Promise.all(deletePromises);
  
  // Delete the chat document
  const chatRef = doc(db, "direct_chats", chatId);
  await deleteDoc(chatRef);
}

export interface ActiveChatSession {
  chatId: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  lastMessageSenderId?: string;
}

// --- Fixed Price Task Presets ---
export interface FixedPricePreset {
  id: string;
  name: string;
  description?: string;
  price: number;
  createdAt?: string;
}

export const DEFAULT_FIXED_PRESETS: FixedPricePreset[] = [
  { id: "def-1", name: "Release Aplikasi", description: "Build & deploy ke App Store / Play Store", price: 100000 },
  { id: "def-2", name: "Build Android & iOS", description: "Kompilasi installer Android (APK/AAB) & iOS (IPA)", price: 50000 },
  { id: "def-3", name: "Deploy Store", description: "Upload binary ke Console Store & submit review", price: 50000 },
  { id: "def-4", name: "Setup Domain & SSL", description: "Konfigurasi DNS, SSL Certificate & Custom Domain", price: 75000 },
];

export async function getFixedPricePresets(userId: string): Promise<FixedPricePreset[]> {
  const { doc, getDoc } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data.fixedPricePresets && Array.isArray(data.fixedPricePresets) && data.fixedPricePresets.length > 0) {
      return data.fixedPricePresets;
    }
  }
  return DEFAULT_FIXED_PRESETS;
}

export async function saveFixedPricePreset(userId: string, preset: Omit<FixedPricePreset, "id">): Promise<FixedPricePreset> {
  const { doc, getDoc, setDoc, updateDoc, arrayUnion } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  const currentPresets = userSnap.exists() && userSnap.data().fixedPricePresets 
    ? userSnap.data().fixedPricePresets 
    : DEFAULT_FIXED_PRESETS;

  const newPreset: FixedPricePreset = {
    ...preset,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString()
  };

  const updated = [...currentPresets, newPreset];
  await setDoc(userRef, { fixedPricePresets: updated }, { merge: true });
  return newPreset;
}

export async function updateFixedPricePreset(userId: string, preset: FixedPricePreset): Promise<void> {
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  const currentPresets: FixedPricePreset[] = userSnap.exists() && userSnap.data().fixedPricePresets 
    ? userSnap.data().fixedPricePresets 
    : DEFAULT_FIXED_PRESETS;

  const updated = currentPresets.map(p => p.id === preset.id ? preset : p);
  await setDoc(userRef, { fixedPricePresets: updated }, { merge: true });
}

export async function deleteFixedPricePreset(userId: string, presetId: string): Promise<void> {
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  const currentPresets: FixedPricePreset[] = userSnap.exists() && userSnap.data().fixedPricePresets 
    ? userSnap.data().fixedPricePresets 
    : DEFAULT_FIXED_PRESETS;

  const updated = currentPresets.filter(p => p.id !== presetId);
  await setDoc(userRef, { fixedPricePresets: updated }, { merge: true });
}
