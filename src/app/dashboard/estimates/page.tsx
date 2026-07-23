"use client";

import React from "react";
import styles from "./estimates.module.css";
import Link from "next/link";

export default function EstimatesPage() {
  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>Report #2024-082</span>
            <span className={styles.subtitle}>• Project Phoenix</span>
          </div>
          <h2 className={styles.pageTitle}>Cost Breakdown Report</h2>
          <p className={styles.pageDesc}>Detailed fiscal analysis for the Q3 Enterprise Modernization project.</p>
        </div>
        
        <div className={styles.actionRow}>
          <button className={styles.btnSecondary}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>file_download</span>
            Export PDF
          </button>
          <button className={styles.btnPrimary}>
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
          <p className={styles.statValue}>$142,500</p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendUp}`} style={{ fontSize: 16 }}>trending_up</span>
            <span className={`${styles.trendText} ${styles.trendUp}`}>+4.2% vs Estimated</span>
          </div>
        </div>

        {/* Story Points */}
        <div className={`${styles.glassCard} ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Scope</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>poker_chip</span>
          </div>
          <p className={styles.statValue}>850 <span className={styles.statUnit}>pts</span></p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendNeutral}`} style={{ fontSize: 16 }}>schedule</span>
            <span className={`${styles.trendText} ${styles.trendNeutral}`}>High Confidence</span>
          </div>
        </div>

        {/* Price / Point */}
        <div className={`${styles.glassCard} ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Price per Point</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>analytics</span>
          </div>
          <p className={styles.statValue}>$167.65</p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendDown}`} style={{ fontSize: 16 }}>trending_down</span>
            <span className={`${styles.trendText} ${styles.trendDown}`}>-2.1% Margin</span>
          </div>
        </div>

        {/* Duration */}
        <div className={`${styles.glassCard} ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Duration</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>calendar_today</span>
          </div>
          <p className={styles.statValue}>18 <span className={styles.statUnit}>weeks</span></p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendUp}`} style={{ fontSize: 16 }}>check_circle</span>
            <span className={`${styles.trendText} ${styles.trendUp}`}>On Track</span>
          </div>
        </div>
      </div>

      {/* Middle: Detailed Table */}
      <div className={`${styles.glassCard} ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Module Breakdown</h3>
          <div className={styles.searchBox}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-on-surface-variant)", fontSize: 20 }}>search</span>
            <input className={styles.searchInput} placeholder="Search modules..." type="text" />
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tr}>
                <th className={styles.th}>Module</th>
                <th className={styles.th}>Task</th>
                <th className={styles.th} style={{ textAlign: "center" }}>Pts</th>
                <th className={styles.th} style={{ textAlign: "center" }}>Hours</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Cost</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tr}>
                <td className={`${styles.td} ${styles.tdBold}`}>User Authentication</td>
                <td className={styles.td}>OAuth2 Integration</td>
                <td className={styles.td} style={{ textAlign: "center" }}>55</td>
                <td className={styles.td} style={{ textAlign: "center" }}>110</td>
                <td className={`${styles.td} ${styles.tdCost}`} style={{ textAlign: "right" }}>$18,200</td>
                <td className={styles.td}>
                  <div className={styles.weightBar}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: "12%" }}></div>
                    </div>
                    <span>12%</span>
                  </div>
                </td>
              </tr>
              <tr className={styles.tr}>
                <td className={`${styles.td} ${styles.tdBold}`}>Core Database</td>
                <td className={styles.td}>Schema Architecture</td>
                <td className={styles.td} style={{ textAlign: "center" }}>120</td>
                <td className={styles.td} style={{ textAlign: "center" }}>240</td>
                <td className={`${styles.td} ${styles.tdCost}`} style={{ textAlign: "right" }}>$32,500</td>
                <td className={styles.td}>
                  <div className={styles.weightBar}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: "22%" }}></div>
                    </div>
                    <span>22%</span>
                  </div>
                </td>
              </tr>
              <tr className={styles.tr}>
                <td className={`${styles.td} ${styles.tdBold}`}>Dashboard UI</td>
                <td className={styles.td}>Responsive Templates</td>
                <td className={styles.td} style={{ textAlign: "center" }}>210</td>
                <td className={styles.td} style={{ textAlign: "center" }}>420</td>
                <td className={`${styles.td} ${styles.tdCost}`} style={{ textAlign: "right" }}>$45,000</td>
                <td className={styles.td}>
                  <div className={styles.weightBar}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: "32%" }}></div>
                    </div>
                    <span>32%</span>
                  </div>
                </td>
              </tr>
              <tr className={styles.tr}>
                <td className={`${styles.td} ${styles.tdBold}`}>API Gateway</td>
                <td className={styles.td}>Service Mesh Setup</td>
                <td className={styles.td} style={{ textAlign: "center" }}>85</td>
                <td className={styles.td} style={{ textAlign: "center" }}>170</td>
                <td className={`${styles.td} ${styles.tdCost}`} style={{ textAlign: "right" }}>$24,800</td>
                <td className={styles.td}>
                  <div className={styles.weightBar}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: "17%" }}></div>
                    </div>
                    <span>17%</span>
                  </div>
                </td>
              </tr>
              <tr className={styles.tr}>
                <td className={`${styles.td} ${styles.tdBold}`}>DevOps & CI/CD</td>
                <td className={styles.td}>Pipeline Automation</td>
                <td className={styles.td} style={{ textAlign: "center" }}>75</td>
                <td className={styles.td} style={{ textAlign: "center" }}>150</td>
                <td className={`${styles.td} ${styles.tdCost}`} style={{ textAlign: "right" }}>$22,000</td>
                <td className={styles.td}>
                  <div className={styles.weightBar}>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: "15%" }}></div>
                    </div>
                    <span>15%</span>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot className={styles.tfoot}>
              <tr className={styles.tr}>
                <td className={styles.td} colSpan={2} style={{ color: "var(--color-on-surface)" }}>Total Estimates</td>
                <td className={styles.td} style={{ textAlign: "center" }}>545</td>
                <td className={styles.td} style={{ textAlign: "center" }}>1,090</td>
                <td className={styles.td} style={{ textAlign: "right", color: "var(--color-primary)" }}>$142,500</td>
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
          <h3 className={styles.chartTitle}>Cost Allocation</h3>
          <div className={styles.pieWrapper}>
            <div className={styles.pieCircle}>
              <div className={styles.pieSeg1}></div>
              <div className={styles.pieSeg2}></div>
              <div className={styles.pieText}>
                <p className={styles.pieValue}>5</p>
                <p className={styles.pieLabel}>Modules</p>
              </div>
            </div>
            
            <div className={styles.legendList}>
              <div className={styles.legendItem}>
                <div className={styles.legendInfo}>
                  <div className={`${styles.legendDot} ${styles.legendDot1}`}></div>
                  <span className={styles.legendName}>Engineering</span>
                </div>
                <span className={styles.legendPercent}>65%</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendInfo}>
                  <div className={`${styles.legendDot} ${styles.legendDot2}`}></div>
                  <span className={styles.legendName}>Design & UX</span>
                </div>
                <span className={styles.legendPercent}>20%</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendInfo}>
                  <div className={`${styles.legendDot} ${styles.legendDot3}`}></div>
                  <span className={styles.legendName}>Infrastructure</span>
                </div>
                <span className={styles.legendPercent}>15%</span>
              </div>
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
