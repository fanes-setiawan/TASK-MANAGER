"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";
import { auth } from "@/lib/firebase/client"; 
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { saveUserRoleAfterLogin } from "@/lib/firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await saveUserRoleAfterLogin(userCred.user);
      router.push("/dashboard"); 
    } catch (error: any) {
      console.error("Login Error:", error);
      setErrorMsg(error.message || "Email atau kata sandi salah.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const provider = new GoogleAuthProvider();
    try {
      const userCred = await signInWithPopup(auth, provider);
      await saveUserRoleAfterLogin(userCred.user);
      router.push("/dashboard"); 
    } catch (error: any) {
      console.error("Google Login Error:", error);
      setErrorMsg(error.message || "Gagal login dengan akun Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        <div className={styles.animatedBg}>
          <div className={styles.illustrationContainer}>
            <div className={styles.glassCardMain}>
              <img
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
                alt="Dashboard Mockup"
              />
            </div>
            <div className={styles.floatingAsset1}>
              <div style={{ height: 8, width: "75%", background: "rgba(0,105,81,0.2)", borderRadius: 4, marginBottom: 8 }}></div>
              <div style={{ height: 8, width: "50%", background: "rgba(0,105,81,0.1)", borderRadius: 4, marginBottom: 16 }}></div>
              <div style={{ flex: 1, border: "1px dashed rgba(0,105,81,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>description</span>
              </div>
            </div>
            <div className={styles.floatingAsset2}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-secondary-container)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--color-on-secondary-container)" }}>bar_chart</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 8, width: "100%", background: "var(--color-outline-variant)", borderRadius: 4, marginBottom: 8 }}></div>
                <div style={{ height: 8, width: "66%", background: "var(--color-outline-variant)", borderRadius: 4 }}></div>
              </div>
            </div>
          </div>
          <h1 className={styles.titleLeft}>Kelola tugas & estimasi proyek.</h1>
          <p className={styles.subtitleLeft}>Akses workspace terintegrasi Anda untuk manajemen proposal klien dan estimasi biaya secara profesional.</p>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.headerLogo}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', backgroundColor: 'var(--color-primary)', borderRadius: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 3H5C3.89 3 3.01 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM19 19H5V5H19V19ZM17 12H15V17H17V12ZM13 7H11V17H13V7ZM9 14H7V17H9V14Z" fill="white"/>
            </svg>
          </div>
          <span>Task Manager</span>
        </div>

        <div className={styles.loginWrapper}>
          <div className={styles.welcomeText}>
            <h2>Selamat Datang</h2>
            <p>Akses dashboard Anda untuk mengelola pekerjaan.</p>
          </div>

          <div className={styles.loginCard}>
            {errorMsg && (
              <div style={{ padding: 12, backgroundColor: "var(--color-error-container)", color: "var(--color-error)", borderRadius: 8, marginBottom: 24, fontSize: 14 }}>
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label>Alamat Email</label>
                <div className={styles.inputWrapper}>
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <span className={`material-symbols-outlined ${styles.icon}`}>mail</span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ margin: 0 }}>Kata Sandi</label>
                  <a href="#" style={{ fontSize: 14, color: "var(--color-primary)", textDecoration: "none" }}>Lupa Kata Sandi?</a>
                </div>
                <div className={styles.inputWrapper}>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span className={`material-symbols-outlined ${styles.icon}`}>lock</span>
                </div>
              </div>

              <button type="submit" className={styles.primaryBtn} disabled={isLoading}>
                {isLoading ? "Memproses..." : "Masuk ke Dashboard"}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            <div className={styles.divider}>
              <span>Atau lanjutkan dengan</span>
            </div>

            <button type="button" onClick={handleGoogleLogin} className={styles.googleBtn} disabled={isLoading}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
              </svg>
              Lanjutkan dengan Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
