import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./client";
import { User } from "firebase/auth";

export type UserRole = "admin" | "manager" | "staff";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any;
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
  currency: string;
  ratePerPoint: number;
  configJson: string;
  createdAt?: any;
  createdBy?: string;
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
