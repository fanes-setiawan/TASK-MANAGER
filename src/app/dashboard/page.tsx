"use client";

import React, { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import Link from "next/link";
import { getProjects, ProjectData } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardPage() {
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
  const formatCurrency = (amount: number, currencyCode: string = "USD") => {
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
          <button className={styles.btnSecondary}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              calendar_today
            </span>
            Last 30 Days
          </button>
          <button className={styles.btnPrimary}>
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
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className={styles.tr}>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>Loading projects...</td>
                    </tr>
                  ) : projects.length === 0 ? (
                    <tr className={styles.tr}>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>No projects found. Create one!</td>
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
                        <tr className={styles.tr} key={project.id}>
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
            
            <button className={styles.btnFull}>
              View Full Audit Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
