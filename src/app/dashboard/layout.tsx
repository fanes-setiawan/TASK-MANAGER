"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./layout.module.css";
import { auth, db } from "@/lib/firebase/client";
import { doc, getDoc, collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { UserProfile, AppNotification, markNotificationAsRead } from "@/lib/firebase/firestore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserProfile(userSnap.data() as UserProfile);
        }

        // Listen for notifications
        const notifQuery = query(
          collection(db, "users", user.uid, "notifications"),
          orderBy("createdAt", "desc"),
          limit(20)
        );

        const unsubscribeNotifs = onSnapshot(notifQuery, (snapshot) => {
          const notifs: AppNotification[] = [];
          let unread = 0;
          snapshot.forEach((doc) => {
            const data = doc.data();
            notifs.push({ id: doc.id, ...data } as AppNotification);
            if (!data.isRead) unread++;
          });
          setNotifications(notifs);
          setUnreadCount(unread);
        }, (error) => {
          console.error("Notifications snapshot error:", error);
        });

        // Save it to a ref or just ignore cleanup since onAuthStateChanged 
        // will handle session. Or better, we should clean it up in useEffect return.
        
        setLoading(false);
        // Return a cleanup wrapper if needed, or simply don't return here.
        // Actually onAuthStateChanged callback shouldn't return a cleanup function directly.
      } else {
        router.push("/login");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await signOut(auth);
    router.push("/login");
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!userProfile) return;
    if (!notif.isRead && notif.id) {
      await markNotificationAsRead(userProfile.uid, notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
    setShowNotifications(false);
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      {/* SideNavBar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoBox}>
            <img
              alt="Task Manager Logo"
              className={styles.logoImage}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAYxl62mvvaeKBMqiPv_xjWNJzn8AdapjWlfPMNMhCGQVzO059qxdGliakroZemwD6hYRC0dttMr5lZdIfj7k9a-qTbXWgM8KdeAi_HPZjuM0-eQIhd2LCgclnTHZqCjTLOQdKvuyx62Vhww9CZIBD1QxAY3QgquvRm-hx0wECm-OkzeQRKOFalfoO51bFxutpK-aZ6gGhvtmSgAF3cbb4GTeT7UHvko4nkpV_EqYaFg56Zajg8GWSHBTExXH8hmcpRiwZLX1YqVI"
            />
          </div>
          <div>
            <h1 className={styles.title}>Task Manager</h1>
            <p className={styles.subtitle}>Enterprise Tier</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link
            href="/dashboard"
            className={`${styles.navItem} ${pathname === "/dashboard" ? styles.active : ""
              }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className={styles.navLabel}>Dashboard</span>
          </Link>
          <Link
            href="/dashboard/new-project"
            className={`${styles.navItem} ${pathname === "/dashboard/new-project" ? styles.active : ""
              }`}
          >
            <span className="material-symbols-outlined">add_box</span>
            <span className={styles.navLabel}>New Project</span>
          </Link>
          <Link
            href="/dashboard/estimates"
            className={`${styles.navItem} ${pathname === "/dashboard/estimates" ? styles.active : ""
              }`}
          >
            <span className="material-symbols-outlined">description</span>
            <span className={styles.navLabel}>Estimates</span>
          </Link>
          <Link
            href="/dashboard/clients"
            className={`${styles.navItem} ${pathname === "/dashboard/clients" ? styles.active : ""
              }`}
          >
            <span className="material-symbols-outlined">group</span>
            <span className={styles.navLabel}>Clients</span>
          </Link>
          <Link
            href="/dashboard/history"
            className={`${styles.navItem} ${pathname === "/dashboard/history" ? styles.active : ""
              }`}
          >
            <span className="material-symbols-outlined">history</span>
            <span className={styles.navLabel}>History</span>
          </Link>
          <Link
            href="/dashboard/templates"
            className={`${styles.navItem} ${pathname === "/dashboard/templates" ? styles.active : ""
              }`}
          >
            <span className="material-symbols-outlined">auto_awesome_motion</span>
            <span className={styles.navLabel}>Templates</span>
          </Link>

        </nav>

        <div className={styles.bottomSection}>
          <button className={styles.btnPrimary} onClick={() => router.push('/dashboard/new-project')}>
            <span className="material-symbols-outlined">add</span>
            Generate Proposal
          </button>
          <Link href="/dashboard/support" className={styles.navItem} style={{ marginTop: "16px" }}>
            <span className="material-symbols-outlined">help</span>
            <span className={styles.navLabel}>Support</span>
          </Link>
          <a
            href="#"
            onClick={handleLogout}
            className={`${styles.navItem} ${styles.navItemDanger}`}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className={styles.navLabel}>Sign Out</span>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* TopAppBar */}
        <header className={styles.header}>
          <div className={styles.searchBox}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>
              search
            </span>
            <input
              className={styles.searchInput}
              placeholder="Search projects, clients..."
              type="text"
            />
          </div>
          <div className={styles.headerRight}>
            <div style={{ position: "relative" }}>
              <button 
                className={styles.iconButton} 
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className={styles.notificationDropdown}>
                  <div className={styles.notificationHeader}>
                    <h3>Notifications</h3>
                    <button onClick={() => setShowNotifications(false)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                    </button>
                  </div>
                  <div className={styles.notificationList}>
                    {notifications.length === 0 ? (
                      <div className={styles.emptyNotifications}>No new notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`${styles.notificationItem} ${!notif.isRead ? styles.unread : ''}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className={styles.notificationDot}></div>
                          <div className={styles.notificationContent}>
                            <h4>{notif.title}</h4>
                            <p>{notif.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button className={styles.iconButton} onClick={() => router.push('/dashboard/settings')}>
              <span className="material-symbols-outlined">settings</span>
            </button>
            <div className={styles.divider}></div>
            <div className={styles.userProfile} onClick={() => router.push('/dashboard/settings')}>
              <div className={styles.avatar}>
                <img
                  alt="User avatar"
                  src={userProfile?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuCyI4Df_EA0qn_sQX-LKgmcvoOz0_dH-FOKtWuPJoKcVBOl0oBs00VV517zAjLO80jbWYMrbFsB0F3Mp7-kHVm3OdRaVU_m14cTdDB1aegWVzzJJZl5y7IwbXEaZoRWnUpbgXtvIm20MZCR9gdJx9ElvW4AfYkogtxGFGkx_tyHCA7kL4hvLRMgnvXJsy5mU_dztGM4am8AFBwqgUL8LJf9F80VcWRCsihhDw1BYLYFKQMuKhhQ4QlwaRvZIc3nzLSpFlZQ08zh19Q"}
                />
              </div>
              <div className={styles.userInfo}>
                <p className={styles.userName}>
                  {userProfile?.displayName || "Loading..."}
                </p>
                <p className={styles.userRole}>
                  {userProfile?.role === "admin"
                    ? "Administrator"
                    : userProfile?.role === "manager"
                      ? "Manager"
                      : "Staff"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {children}

        {/* Footer */}
        <footer
          style={{
            marginTop: "auto",
            backgroundColor: "var(--color-background)",
            borderTop: "1px solid var(--color-outline-variant)",
            padding: "var(--spacing-unit-md) var(--spacing-margin-desktop)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-unit-md)" }}>
            <img
              alt="Task Manager Logo"
              style={{ height: "32px", width: "auto" }}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAYxl62mvvaeKBMqiPv_xjWNJzn8AdapjWlfPMNMhCGQVzO059qxdGliakroZemwD6hYRC0dttMr5lZdIfj7k9a-qTbXWgM8KdeAi_HPZjuM0-eQIhd2LCgclnTHZqCjTLOQdKvuyx62Vhww9CZIBD1QxAY3QgquvRm-hx0wECm-OkzeQRKOFalfoO51bFxutpK-aZ6gGhvtmSgAF3cbb4GTeT7UHvko4nkpV_EqYaFg56Zajg8GWSHBTExXH8hmcpRiwZLX1YqVI"
            />
            <span style={{ fontSize: "var(--text-label-sm-size)", color: "var(--color-on-surface-variant)" }}>
              © 2026. All rights reserved.
            </span>
          </div>
          <div style={{ display: "flex", gap: "var(--spacing-unit-lg)", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-label-sm-size)", color: "var(--color-outline)" }}>
              v2.4.0
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
