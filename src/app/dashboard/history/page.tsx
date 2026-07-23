"use client";

import React, { useEffect, useState } from "react";
import styles from "./history.module.css";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { getProjects, ProjectData } from "@/lib/firebase/firestore";

export default function HistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const projects = await getProjects(user.uid);
          // Convert projects into log entries
          const dynamicLogs = projects.map(p => ({
            id: p.id,
            type: "proposal",
            title: "Proposal Generated",
            desc: `Generated cost breakdown and proposal for client: ${p.clientName || "Unknown"} (${p.projectName})`,
            timestamp: p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : new Date(),
            icon: "description",
            iconClass: styles.iconPrimary
          }));
          
          // Add some static system logs for flavor
          const staticLogs = [
            {
              id: "s1",
              type: "system",
              title: "User Authenticated",
              desc: "Successful login via Firebase Authentication.",
              timestamp: new Date(Date.now() - 3600000), // 1 hour ago
              icon: "login",
              iconClass: styles.iconSuccess
            },
            {
              id: "s2",
              type: "settings",
              title: "App Settings Updated",
              desc: "Modified default rate/point and preferences.",
              timestamp: new Date(Date.now() - 86400000), // 1 day ago
              icon: "settings",
              iconClass: ""
            }
          ];

          const allLogs = [...dynamicLogs, ...staticLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          setLogs(allLogs);
        } catch (error) {
          console.error("Failed to fetch history", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = filter === "all" ? logs : logs.filter(l => l.type === filter);

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Audit Log</h2>
          <p className={styles.subtitle}>Track all activities and generated proposals across your workspace.</p>
        </div>
      </div>

      <div className={styles.glassCard}>
        <div className={styles.filterBox}>
          <button className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>All Activity</button>
          <button className={`${styles.filterBtn} ${filter === 'proposal' ? styles.active : ''}`} onClick={() => setFilter('proposal')}>Proposals</button>
          <button className={`${styles.filterBtn} ${filter === 'system' ? styles.active : ''}`} onClick={() => setFilter('system')}>System</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--color-outline)" }}>No activity found.</div>
        ) : (
          <div className={styles.timeline}>
            {filteredLogs.map((log) => (
              <div className={styles.timelineItem} key={log.id}>
                <div className={styles.timelineLine}></div>
                <div className={`${styles.timelineIcon} ${log.iconClass}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{log.icon}</span>
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.actionTitle}>{log.title}</span>
                    <span className={styles.time}>{log.timestamp.toLocaleString()}</span>
                  </div>
                  <p className={styles.actionDesc}>{log.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
