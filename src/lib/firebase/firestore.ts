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
  };
}

export async function saveProject(project: ProjectData, userId: string) {
  const { collection, addDoc } = await import("firebase/firestore");
  const projectsRef = collection(db, "projects");
  
  const docRef = await addDoc(projectsRef, {
    ...project,
    createdBy: userId,
    createdAt: serverTimestamp(),
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


export async function getProjects(userId?: string) {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const projectsRef = collection(db, "projects");
  
  let q;
  if (userId) {
    q = query(projectsRef, where("createdBy", "==", userId));
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
