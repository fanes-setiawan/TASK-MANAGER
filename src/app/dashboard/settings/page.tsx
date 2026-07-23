"use client";

import React, { useState, useEffect } from "react";
import styles from "./settings.module.css";
import { auth, db } from "@/lib/firebase/client";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { UserProfile } from "@/lib/firebase/firestore";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        setEmail(user.email || "");
        setDisplayName(user.displayName || "");
        
        // Fetch role from Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          setRole(data.role);
          // If firestore has a different name, we prefer it (or sync them)
          if (data.displayName && !user.displayName) {
            setDisplayName(data.displayName);
          }
        }
      }
      setLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserData();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      // 1. Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: displayName
      });

      // 2. Update Firestore Document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName
      });

      setSuccessMsg("Profile updated successfully! Refresh the page to see changes in the sidebar.");
    } catch (error: any) {
      console.error("Error updating profile", error);
      setErrorMsg(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading settings...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>Manage your profile information and preferences.</p>
      </div>

      {successMsg && (
        <div className={styles.alertSuccess}>
          <span className="material-symbols-outlined">check_circle</span>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className={styles.alertError}>
          <span className="material-symbols-outlined">error</span>
          {errorMsg}
        </div>
      )}

      <form className={styles.card} onSubmit={handleSave}>
        <div className={styles.cardHeader}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>manage_accounts</span>
          <h2 className={styles.cardTitle}>Profile Information</h2>
        </div>

        <div className={styles.profileTop}>
          <div className={styles.avatarWrapper}>
            {/* Fallback dummy image for now */}
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyI4Df_EA0qn_sQX-LKgmcvoOz0_dH-FOKtWuPJoKcVBOl0oBs00VV517zAjLO80jbWYMrbFsB0F3Mp7-kHVm3OdRaVU_m14cTdDB1aegWVzzJJZl5y7IwbXEaZoRWnUpbgXtvIm20MZCR9gdJx9ElvW4AfYkogtxGFGkx_tyHCA7kL4hvLRMgnvXJsy5mU_dztGM4am8AFBwqgUL8LJf9F80VcWRCsihhDw1BYLYFKQMuKhhQ4QlwaRvZIc3nzLSpFlZQ08zh19Q" 
              alt="Avatar" 
              className={styles.avatarImage} 
            />
            <button type="button" className={styles.avatarEditBtn} title="Change Avatar (Coming Soon)">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            </button>
          </div>
          <div className={styles.profileInfo}>
            <h3 className={styles.profileName}>{displayName || "User"}</h3>
            <div>
              <span className={styles.profileRole}>
                {role === "admin" ? "Administrator" : role === "manager" ? "Manager" : "Staff"}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.inputGroupFull}>
            <label className={styles.label}>Full Name</label>
            <input 
              type="text" 
              className={styles.input} 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email Address</label>
            <input 
              type="email" 
              className={styles.input} 
              value={email}
              disabled
              title="Email cannot be changed directly"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Role</label>
            <input 
              type="text" 
              className={styles.input} 
              value={role.charAt(0).toUpperCase() + role.slice(1)}
              disabled
              title="Contact Administrator to change role"
            />
          </div>
        </div>

        <div className={styles.actionRow}>
          <button type="submit" className={styles.btnPrimary} disabled={saving}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
