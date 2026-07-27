"use client";

import React, { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProjects, ProjectData } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const data = await getProjects(user.uid);
          setProjects(data);
        } catch (error) {
          console.error("Failed to fetch projects", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const totalProposals = projects.length;
  // A simple mockup calculation for total revenue for display purposes
  const totalRevenue = projects.reduce((sum, p) => sum + (p.ratePerPoint * 100), 0);
  
  // Format currency
  const formatCurrency = (amount: number, currencyCode: string = "IDR") => {
    // Basic formatting for demo purposes
    if (currencyCode.includes("IDR")) return `Rp ${amount.toLocaleString('id-ID')}`;
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className={styles.container}>
      {/* Dashboard Header */}
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Dashboard</h2>
          <p className={styles.subtitle}>
            Welcome back. Here's what's happening with your projects today.
          </p>
        </div>
        <div className={styles.actionRow}>
          <button className={styles.btnSecondary} onClick={() => alert("Time filter changed")}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              calendar_today
            </span>
            Last 30 Days
          </button>
          <button className={styles.btnPrimary} onClick={() => window.print()}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              file_download
            </span>
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconWrapper} ${styles.iconPrimary}`}>
              <span className="material-symbols-outlined">description</span>
            </div>
            <span className={`${styles.badge} ${styles.badgePrimary}`}>+12%</span>
          </div>
          <p className={styles.statLabel}>Total Proposals</p>
          <h3 className={styles.statValue}>{loading ? "..." : totalProposals}</h3>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconWrapper} ${styles.iconSecondary}`}>
              <span className="material-symbols-outlined">pending</span>
            </div>
            <span className={`${styles.badge} ${styles.badgeSecondary}`}>5.4%</span>
          </div>
          <p className={styles.statLabel}>Pending Approval</p>
          <h3 className={styles.statValue}>{loading ? "..." : Math.floor(totalProposals / 3)}</h3>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconWrapper} ${styles.iconPrimary}`}>
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <span className={`${styles.badge} ${styles.badgePrimary}`}>82%</span>
          </div>
          <p className={styles.statLabel}>Completed Projects</p>
          <h3 className={styles.statValue}>{loading ? "..." : Math.max(0, totalProposals - 2)}</h3>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconWrapper} ${styles.iconPrimary}`}>
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className={`${styles.badge} ${styles.badgePrimary}`}>+24%</span>
          </div>
          <p className={styles.statLabel}>Total Revenue (Est)</p>
          <h3 className={styles.statValue}>{loading ? "..." : formatCurrency(totalRevenue)}</h3>
        </div>
      </div>

      {/* Main Layout: Left Col (Table) + Right Col (Activity) */}
      <div className={styles.mainLayout}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h4>Recent Projects</h4>
              <Link href="/dashboard/estimates">View All</Link>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tr}>
                    <th className={styles.th}>Project Name</th>
                    <th className={styles.th}>Client</th>
                    <th className={styles.th}>Date</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th} style={{ textAlign: "right" }}>Amount</th>
                    <th className={styles.th} style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className={styles.tr}>
                      <td colSpan={6} style={{ textAlign: "center", padding: "24px" }}>Loading projects...</td>
                    </tr>
                  ) : projects.length === 0 ? (
                    <tr className={styles.tr}>
                      <td colSpan={6} style={{ textAlign: "center", padding: "48px 24px" }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative', width: 'fit-content', margin: '0 auto' }}>
                          <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 100, color: 'var(--color-primary)', opacity: 0.8, animation: 'floatMain 3s ease-in-out infinite', zIndex: 2 }}>folder_open</span>
                            
                            <span className="material-symbols-outlined" style={{ position: 'absolute', top: 10, left: 10, fontSize: 36, color: 'var(--color-secondary, #009d7b)', opacity: 0.6, animation: 'floatDoc1 4s ease-in-out infinite' }}>description</span>
                            
                            <span className="material-symbols-outlined" style={{ position: 'absolute', bottom: 20, right: 10, fontSize: 28, color: 'var(--color-tertiary, #4a6572)', opacity: 0.5, animation: 'floatDoc2 5s ease-in-out infinite' }}>draft</span>
                            
                            <span className="material-symbols-outlined" style={{ position: 'absolute', top: 30, right: 20, fontSize: 24, color: '#f59e0b', animation: 'pulseStar 2s ease-in-out infinite' }}>temp_preferences_custom</span>
                          </div>
                          <span style={{ color: "var(--color-on-surface-variant)", fontWeight: 500, fontSize: '15px' }}>No projects found. Create one!</span>
                        </div>
                        <style>{`
                          @keyframes floatMain {
                            0% { transform: translateY(0px); }
                            50% { transform: translateY(-10px); }
                            100% { transform: translateY(0px); }
                          }
                          @keyframes floatDoc1 {
                            0% { transform: translateY(0px) rotate(-15deg); }
                            50% { transform: translateY(-15px) rotate(-5deg); }
                            100% { transform: translateY(0px) rotate(-15deg); }
                          }
                          @keyframes floatDoc2 {
                            0% { transform: translateY(0px) rotate(20deg); }
                            50% { transform: translateY(-8px) rotate(25deg); }
                            100% { transform: translateY(0px) rotate(20deg); }
                          }
                          @keyframes pulseStar {
                            0% { transform: scale(1) rotate(0deg); opacity: 0.5; }
                            50% { transform: scale(1.3) rotate(15deg); opacity: 1; }
                            100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
                          }
                        `}</style>
                      </td>
                    </tr>
                  ) : (
                    projects.slice(0, 5).map((project) => {
                      // Formatting date safely
                      let dateStr = "Unknown";
                      if (project.createdAt?.seconds) {
                        dateStr = new Date(project.createdAt.seconds * 1000).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric"
                        });
                      }

                      return (
                        <tr 
                          className={styles.tr} 
                          key={project.id} 
                          onClick={() => router.push('/dashboard/estimates')}
                          style={{ cursor: "pointer" }}
                        >
                          <td className={styles.td} style={{ fontWeight: 500, color: "var(--color-on-surface)" }}>
                            {project.projectName || "Unnamed Project"}
                          </td>
                          <td className={styles.td} style={{ color: "var(--color-on-surface-variant)" }}>
                            {project.clientName || "Unknown Client"}
                          </td>
                          <td className={styles.td} style={{ color: "var(--color-outline)" }}>
                            {dateStr}
                          </td>
                          <td className={styles.td}>
                            <span className={styles.statusActive}>Active</span>
                          </td>
                          <td className={styles.td} style={{ textAlign: "right", fontWeight: 700 }}>
                            {formatCurrency(project.ratePerPoint * 100, project.currency)}
                          </td>
                          <td className={styles.td} style={{ textAlign: "center" }}>
                            <button 
                              className={styles.btnIconOnly} 
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '8px', background: 'var(--color-surface-container)', color: 'var(--color-primary)' }}
                              onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/project-board?id=${project.id}`); }}
                              title="Kanban Board / Notes"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>view_kanban</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          <div className={styles.activityCard}>
            <h4>Recent Activity</h4>
            <div className={styles.activityList}>
              {projects.slice(0, 3).map((project, index) => (
                <div className={styles.activityItem} key={project.id || index}>
                  <div className={styles.activityLine}></div>
                  <div className={`${styles.activityIcon} ${index % 2 === 0 ? styles.iconA : styles.iconB}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      description
                    </span>
                  </div>
                  <div className={styles.activityContent}>
                    <p>
                      Proposal generated for <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{project.clientName || "Client"}</span>
                    </p>
                    <p className={styles.time}>
                      {project.createdAt?.seconds 
                        ? new Date(project.createdAt.seconds * 1000).toLocaleString() 
                        : "Recently"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <button className={styles.btnFull} onClick={() => window.location.href = '/dashboard/history'}>
              View Full Audit Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
