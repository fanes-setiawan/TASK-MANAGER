"use client";

import React, { useEffect, useState } from "react";
import styles from "./estimates.module.css";
import Link from "next/link";
import { auth } from "@/lib/firebase/client";
import { getProjects, ProjectData } from "@/lib/firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function EstimatesPage() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const projects = await getProjects(user.uid);
          if (projects.length > 0) {
            // Get the most recent project
            setProject(projects[0]);
          }
        } catch (error) {
          console.error("Failed to fetch projects", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className={styles.container} style={{ padding: "40px", textAlign: "center" }}>Loading estimates data...</div>;
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2>No projects found</h2>
          <p style={{ color: "var(--color-on-surface-variant)", marginTop: 8 }}>Create a project first to see its cost breakdown.</p>
          <Link href="/dashboard/new-project">
            <button className={styles.btnPrimary} style={{ margin: "24px auto" }}>Create New Project</button>
          </Link>
        </div>
      </div>
    );
  }

  // Parse config JSON to calculate modules
  let modules: any[] = [];
  try {
    const parsed = JSON.parse(project.configJson || "{}");
    modules = Array.isArray(parsed.modules) ? parsed.modules : [];
  } catch (e) {
    console.error("Failed to parse configJson", e);
  }

  const totalPoints = modules.reduce((sum, mod) => sum + (mod.points || 0), 0);
  const totalCost = totalPoints * project.ratePerPoint;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: project.currency.substring(0, 3) || 'USD' }).format(amount);
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>Report #{project.id?.slice(0, 6).toUpperCase()}</span>
            <span className={styles.subtitle}>• {project.projectName || "Unnamed Project"}</span>
          </div>
          <h2 className={styles.pageTitle}>Cost Breakdown Report</h2>
          <p className={styles.pageDesc}>Detailed fiscal analysis for {project.clientName || "the client"}.</p>
        </div>
        
        <div className={styles.actionRow}>
          <button className={styles.btnSecondary} onClick={() => window.print()}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>file_download</span>
            Export PDF
          </button>
          <button className={styles.btnPrimary} onClick={() => alert("Share link copied to clipboard!")}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>share</span>
            Share Report
          </button>
        </div>
      </div>

      {/* Top: Large Summary Cards */}
      <div className={styles.statsGrid}>
        {/* Total Budget */}
        <div className={`${styles.glassCard} ${styles.statCard} ${styles.goldAccent}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Budget</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontVariationSettings: "'FILL' 1" }}>payments</span>
          </div>
          <p className={styles.statValue}>{formatCurrency(totalCost)}</p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendUp}`} style={{ fontSize: 16 }}>trending_up</span>
            <span className={`${styles.trendText} ${styles.trendUp}`}>Based on JSON input</span>
          </div>
        </div>

        {/* Story Points */}
        <div className={`${styles.glassCard} ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Scope</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>poker_chip</span>
          </div>
          <p className={styles.statValue}>{totalPoints} <span className={styles.statUnit}>pts</span></p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendNeutral}`} style={{ fontSize: 16 }}>schedule</span>
            <span className={`${styles.trendText} ${styles.trendNeutral}`}>From {modules.length} modules</span>
          </div>
        </div>

        {/* Price / Point */}
        <div className={`${styles.glassCard} ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Price per Point</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>analytics</span>
          </div>
          <p className={styles.statValue}>{formatCurrency(project.ratePerPoint)}</p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendNeutral}`} style={{ fontSize: 16 }}>tag</span>
            <span className={`${styles.trendText} ${styles.trendNeutral}`}>Standard rate</span>
          </div>
        </div>

        {/* Duration */}
        <div className={`${styles.glassCard} ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Est. Duration</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>calendar_today</span>
          </div>
          {/* Rough estimate: 10 points = 1 week */}
          <p className={styles.statValue}>{Math.ceil(totalPoints / 10)} <span className={styles.statUnit}>weeks</span></p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendUp}`} style={{ fontSize: 16 }}>check_circle</span>
            <span className={`${styles.trendText} ${styles.trendUp}`}>Calculated Estimate</span>
          </div>
        </div>
      </div>

      {/* Middle: Detailed Table */}
      <div className={`${styles.glassCard} ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Module Breakdown</h3>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tr}>
                <th className={styles.th}>Module Name</th>
                <th className={styles.th}>Complexity</th>
                <th className={styles.th} style={{ textAlign: "center" }}>Pts</th>
                <th className={styles.th} style={{ textAlign: "center" }}>Est. Hours</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Cost</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod, idx) => {
                const pts = mod.points || 0;
                const hours = pts * 2; // Assuming 1 pt = 2 hours for demo
                const cost = pts * project.ratePerPoint;
                const weight = totalPoints > 0 ? Math.round((pts / totalPoints) * 100) : 0;
                
                return (
                  <tr className={styles.tr} key={idx}>
                    <td className={`${styles.td} ${styles.tdBold}`}>{mod.name || "Unnamed Module"}</td>
                    <td className={styles.td} style={{ textTransform: "capitalize" }}>{mod.complexity || "Medium"}</td>
                    <td className={styles.td} style={{ textAlign: "center" }}>{pts}</td>
                    <td className={styles.td} style={{ textAlign: "center" }}>{hours}</td>
                    <td className={`${styles.td} ${styles.tdCost}`} style={{ textAlign: "right" }}>{formatCurrency(cost)}</td>
                    <td className={styles.td}>
                      <div className={styles.weightBar}>
                        <div className={styles.barTrack}>
                          <div className={styles.barFill} style={{ width: `${weight}%` }}></div>
                        </div>
                        <span>{weight}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {modules.length === 0 && (
                <tr className={styles.tr}>
                  <td className={styles.td} colSpan={6} style={{ textAlign: "center", padding: "24px" }}>
                    No modules found in the project configuration.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className={styles.tfoot}>
              <tr className={styles.tr}>
                <td className={styles.td} colSpan={2} style={{ color: "var(--color-on-surface)" }}>Total Estimates</td>
                <td className={styles.td} style={{ textAlign: "center" }}>{totalPoints}</td>
                <td className={styles.td} style={{ textAlign: "center" }}>{totalPoints * 2}</td>
                <td className={styles.td} style={{ textAlign: "right", color: "var(--color-primary)" }}>{formatCurrency(totalCost)}</td>
                <td className={styles.td} style={{ textAlign: "right" }}>100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bottom: Charts Row */}
      <div className={styles.chartsGrid}>
        
        {/* Pie Chart Representation */}
        <div className={`${styles.glassCard} ${styles.chartCard}`}>
          <h3 className={styles.chartTitle}>Cost Allocation (Demo)</h3>
          <div className={styles.pieWrapper}>
            <div className={styles.pieCircle}>
              <div className={styles.pieSeg1}></div>
              <div className={styles.pieSeg2}></div>
              <div className={styles.pieText}>
                <p className={styles.pieValue}>{modules.length}</p>
                <p className={styles.pieLabel}>Modules</p>
              </div>
            </div>
            
            <div className={styles.legendList}>
              {modules.slice(0, 3).map((mod, i) => (
                <div className={styles.legendItem} key={i}>
                  <div className={styles.legendInfo}>
                    <div className={`${styles.legendDot} ${i === 0 ? styles.legendDot1 : i === 1 ? styles.legendDot2 : styles.legendDot3}`}></div>
                    <span className={styles.legendName} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>
                      {mod.name}
                    </span>
                  </div>
                  <span className={styles.legendPercent}>
                    {totalPoints > 0 ? Math.round(((mod.points || 0) / totalPoints) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart Representation */}
        <div className={`${styles.glassCard} ${styles.chartCard}`}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle} style={{ margin: 0 }}>Velocity Forecast</h3>
            <span className="material-symbols-outlined" style={{ color: "var(--color-outline)" }}>more_vert</span>
          </div>
          
          <div className={styles.barChart}>
            <div className={styles.barCol}>
              <div className={styles.bar} style={{ height: "40%", backgroundColor: "var(--color-surface-container)" }}></div>
              <span className={styles.barLabel}>W1</span>
            </div>
            <div className={styles.barCol}>
              <div className={styles.bar} style={{ height: "60%", backgroundColor: "var(--color-surface-container)" }}></div>
              <span className={styles.barLabel}>W2</span>
            </div>
            <div className={styles.barCol}>
              <div className={styles.bar} style={{ height: "85%", backgroundColor: "var(--color-primary)" }}></div>
              <span className={styles.barLabel}>W3</span>
            </div>
            <div className={styles.barCol}>
              <div className={styles.bar} style={{ height: "55%", backgroundColor: "var(--color-surface-container)" }}></div>
              <span className={styles.barLabel}>W4</span>
            </div>
            <div className={styles.barCol}>
              <div className={styles.bar} style={{ height: "95%", backgroundColor: "var(--color-secondary)" }}></div>
              <span className={styles.barLabel}>W5</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
