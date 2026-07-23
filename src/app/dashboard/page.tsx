"use client";

import React from "react";
import styles from "./dashboard.module.css";
import Link from "next/link";

export default function DashboardPage() {
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
          <h3 className={styles.statValue}>1,284</h3>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconWrapper} ${styles.iconSecondary}`}>
              <span className="material-symbols-outlined">pending</span>
            </div>
            <span className={`${styles.badge} ${styles.badgeSecondary}`}>5.4%</span>
          </div>
          <p className={styles.statLabel}>Pending Approval</p>
          <h3 className={styles.statValue}>48</h3>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconWrapper} ${styles.iconPrimary}`}>
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <span className={`${styles.badge} ${styles.badgePrimary}`}>82%</span>
          </div>
          <p className={styles.statLabel}>Completed Projects</p>
          <h3 className={styles.statValue}>912</h3>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconWrapper} ${styles.iconPrimary}`}>
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className={`${styles.badge} ${styles.badgePrimary}`}>+24%</span>
          </div>
          <p className={styles.statLabel}>Total Revenue</p>
          <h3 className={styles.statValue}>Rp 65,1M</h3>
        </div>
      </div>

      {/* Main Layout: Left Col (Table) + Right Col (Activity) */}
      <div className={styles.mainLayout}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h4>Recent Projects</h4>
              <Link href="/dashboard/projects">View All</Link>
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
                  <tr className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 500, color: "var(--color-on-surface)" }}>
                      Modernist Office Complex
                    </td>
                    <td className={styles.td} style={{ color: "var(--color-on-surface-variant)" }}>
                      Lumina Corp
                    </td>
                    <td className={styles.td} style={{ color: "var(--color-outline)" }}>Oct 12, 2024</td>
                    <td className={styles.td}>
                      <span className={styles.statusActive}>Active</span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right", fontWeight: 700 }}>
                      Rp 6.510.000
                    </td>
                  </tr>
                  <tr className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 500, color: "var(--color-on-surface)" }}>
                      Eco-Friendly Residential
                    </td>
                    <td className={styles.td} style={{ color: "var(--color-on-surface-variant)" }}>
                      GreenPath Real Estate
                    </td>
                    <td className={styles.td} style={{ color: "var(--color-outline)" }}>Oct 10, 2024</td>
                    <td className={styles.td}>
                      <span className={styles.statusPending}>Pending</span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right", fontWeight: 700 }}>
                      Rp 2.867.500
                    </td>
                  </tr>
                  <tr className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 500, color: "var(--color-on-surface)" }}>
                      Smart Warehouse Hub
                    </td>
                    <td className={styles.td} style={{ color: "var(--color-on-surface-variant)" }}>
                      Apex Logistics
                    </td>
                    <td className={styles.td} style={{ color: "var(--color-outline)" }}>Oct 08, 2024</td>
                    <td className={styles.td}>
                      <span className={styles.statusActive}>Completed</span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right", fontWeight: 700 }}>
                      Rp 14.570.000
                    </td>
                  </tr>
                  <tr className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 500, color: "var(--color-on-surface)" }}>
                      Downtown Retail Strip
                    </td>
                    <td className={styles.td} style={{ color: "var(--color-on-surface-variant)" }}>
                      Urban Develops Co.
                    </td>
                    <td className={styles.td} style={{ color: "var(--color-outline)" }}>Oct 05, 2024</td>
                    <td className={styles.td}>
                      <span className={styles.statusActive}>Active</span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right", fontWeight: 700 }}>
                      Rp 3.332.500
                    </td>
                  </tr>
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
              <div className={styles.activityItem}>
                <div className={styles.activityLine}></div>
                <div className={`${styles.activityIcon} ${styles.iconA}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    description
                  </span>
                </div>
                <div className={styles.activityContent}>
                  <p>
                    Proposal <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>#PR-204</span> was sent to Lumina Corp
                  </p>
                  <p className={styles.time}>2 hours ago</p>
                </div>
              </div>

              <div className={styles.activityItem}>
                <div className={styles.activityLine}></div>
                <div className={`${styles.activityIcon} ${styles.iconB}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    person_add
                  </span>
                </div>
                <div className={styles.activityContent}>
                  <p>
                    New Client <span style={{ color: "var(--color-secondary)", fontWeight: 700 }}>Apex Logistics</span> added to directory
                  </p>
                  <p className={styles.time}>5 hours ago</p>
                </div>
              </div>

              <div className={styles.activityItem}>
                <div className={styles.activityLine}></div>
                <div className={`${styles.activityIcon} ${styles.iconC}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    edit
                  </span>
                </div>
                <div className={styles.activityContent}>
                  <p>
                    Estimator Sarah updated <span style={{ fontStyle: "italic" }}>Smart Warehouse</span> specs
                  </p>
                  <p className={styles.time}>Yesterday, 4:30 PM</p>
                </div>
              </div>

              <div className={styles.activityItem}>
                <div className={styles.activityLine}></div>
                <div className={`${styles.activityIcon} ${styles.iconA}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    check_circle
                  </span>
                </div>
                <div className={styles.activityContent}>
                  <p>
                    Payment received for <span style={{ fontWeight: 700 }}>Project Alpha</span>
                  </p>
                  <p className={styles.time}>Yesterday, 9:15 AM</p>
                </div>
              </div>
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
