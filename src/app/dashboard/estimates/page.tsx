"use client";

import React, { useEffect, useState } from "react";
import styles from "./estimates.module.css";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { getProjects, ProjectData } from "@/lib/firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";

export default function EstimatesPage() {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editComplexity, setEditComplexity] = useState("Medium");
  const [editCost, setEditCost] = useState<number>(0);
  const [editTasks, setEditTasks] = useState<{name: string, price: number}[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskPrice, setNewTaskPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const fetchedProjects = await getProjects(user.uid);
          setProjectsList(fetchedProjects);
          if (fetchedProjects.length > 0) {
            // Get the most recent project initially
            setProject(fetchedProjects[0]);
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

  const totalCost = modules.reduce((sum, mod) => {
    return sum + (mod.price !== undefined ? mod.price : (mod.points || 0) * project.ratePerPoint);
  }, 0);
  const totalDays = modules.reduce((sum, mod) => {
    const cost = mod.price !== undefined ? mod.price : (mod.points || 0) * project.ratePerPoint;
    return sum + Math.ceil((cost / project.ratePerPoint * 2) / 8);
  }, 0);
  
  const formatCurrency = (amount: number) => {
    const currency = project.currency || 'IDR';
    if (currency.includes('IDR')) {
      return `Rp ${amount.toLocaleString('id-ID')}`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.substring(0, 3) }).format(amount);
  };

  const handleRowClick = (idx: number, mod: any) => {
    if (expandedRow === idx) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow(idx);
    setEditName(mod.name || "");
    setEditComplexity(mod.complexity || "Medium");
    setEditCost(mod.price !== undefined ? mod.price : (mod.points || 0) * project.ratePerPoint);
    setEditTasks(mod.tasks || []);
    setNewTaskName("");
    setNewTaskPrice("");
  };

  const handleSaveModule = async () => {
    if (expandedRow === null || !project || !project.id) return;
    setIsSaving(true);
    
    const updatedModules = [...modules];
    updatedModules[expandedRow] = {
      ...updatedModules[expandedRow],
      name: editName,
      complexity: editComplexity,
      price: editCost,
      tasks: editTasks
    };

    const newConfigJson = JSON.stringify({ modules: updatedModules });

    try {
      const projectRef = doc(db, "projects", project.id);
      await updateDoc(projectRef, { configJson: newConfigJson });
      
      // Update local state
      setProject({ ...project, configJson: newConfigJson });
      setExpandedRow(null);
    } catch (error) {
      console.error("Error updating module:", error);
      alert("Failed to save module.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>Report #{project.id?.slice(0, 6).toUpperCase()}</span>
            <select 
              value={project.id} 
              onChange={(e) => {
                const selected = projectsList.find(p => p.id === e.target.value);
                if (selected) setProject(selected);
              }}
              style={{
                background: "transparent",
                border: "none",
                fontFamily: "var(--font-label-md)",
                color: "var(--color-outline)",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {projectsList.map(p => (
                <option key={p.id} value={p.id}>• {p.projectName || "Unnamed Project"}</option>
              ))}
            </select>
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

        {/* Total Scope */}
        <div className={`${styles.glassCard} ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Total Modules</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-secondary)" }}>view_module</span>
          </div>
          <p className={styles.statValue}>{modules.length} <span className={styles.statUnit}>items</span></p>
          <div className={styles.statTrendRow}>
            <span className={`material-symbols-outlined ${styles.trendNeutral}`} style={{ fontSize: 16 }}>list</span>
            <span className={`${styles.trendText} ${styles.trendNeutral}`}>Counted from list</span>
          </div>
        </div>

        {/* Price / Point (Now Average Cost) */}
        <div className={`${styles.glassCard} ${styles.statCard}`}>
          <div className={styles.statHeader}>
            <span className={styles.statLabel}>Average Cost/Module</span>
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
          {/* Rough estimate */}
          <p className={styles.statValue}>{totalDays} <span className={styles.statUnit}>days</span></p>
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
                <th className={styles.th} style={{ textAlign: "center" }}>Est. Days</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Cost</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod, idx) => {
                const cost = mod.price !== undefined ? mod.price : (mod.points || 0) * project.ratePerPoint;
                const days = Math.ceil((cost / project.ratePerPoint * 2) / 8);
                const weight = totalCost > 0 ? Math.round((cost / totalCost) * 100) : 0;
                
                const isExpanded = expandedRow === idx;
                
                return (
                  <React.Fragment key={idx}>
                    <tr 
                      className={styles.tr} 
                      onClick={() => handleRowClick(idx, mod)}
                      style={{ cursor: "pointer", backgroundColor: isExpanded ? "var(--color-surface-container)" : undefined }}
                    >
                      <td className={`${styles.td} ${styles.tdBold}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span 
                            className="material-symbols-outlined" 
                            style={{ 
                              fontSize: '20px', 
                              transition: 'transform 0.2s', 
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              color: 'var(--color-on-surface-variant)'
                            }}
                          >
                            chevron_right
                          </span>
                          {mod.name || "Unnamed Module"}
                        </div>
                      </td>
                      <td className={styles.td} style={{ textTransform: "capitalize" }}>{mod.complexity || "Medium"}</td>
                      <td className={styles.td} style={{ textAlign: "center" }}>{days}</td>
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
                    
                    {isExpanded && (
                      <tr className={styles.tr}>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <div style={{ padding: "24px", background: "var(--color-surface-container-lowest)", borderBottom: "1px solid var(--color-outline-variant)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-outline-variant)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h4 style={{ margin: 0, fontFamily: "var(--font-headline-sm)", color: "var(--color-on-surface)" }}>Sub-tasks Breakdown</h4>
                                <button 
                                  className={styles.btnPrimary} 
                                  onClick={handleSaveModule} 
                                  disabled={isSaving}
                                  style={{ padding: "8px 16px", fontSize: "14px" }}
                                >
                                  {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                              </div>
                                
                                {editTasks.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                    {editTasks.map((t, i) => (
                                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-surface-container-lowest)', borderRadius: '6px', border: '1px solid var(--color-outline-variant)', alignItems: 'center' }}>
                                        <span style={{ fontSize: '14px', color: 'var(--color-on-surface)' }}>{t.name}</span>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{formatCurrency(t.price)}</span>
                                          <button 
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                                            onClick={() => {
                                              const newT = [...editTasks];
                                              newT.splice(i, 1);
                                              setEditTasks(newT);
                                              if (newT.length > 0) {
                                                const sum = newT.reduce((acc, curr) => acc + curr.price, 0);
                                                setEditCost(sum);
                                              } else {
                                                setEditCost(0);
                                              }
                                            }}
                                          >
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-error)' }}>delete</span>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 4px 4px 4px', fontWeight: 'bold', fontSize: '15px', borderTop: '1px dashed var(--color-outline-variant)' }}>
                                      <span>Total Tasks Cost:</span>
                                      <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(editTasks.reduce((a, c) => a + c.price, 0))}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ padding: "20px", textAlign: "center", border: "1px dashed var(--color-outline-variant)", borderRadius: "8px", color: "var(--color-on-surface-variant)" }}>
                                    No sub-tasks yet. Breakdown your module into smaller chunks.
                                  </div>
                                )}
                                
                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                  <input 
                                    type="text" 
                                    className={styles.input} 
                                    style={{ flex: 1, padding: '10px 12px' }}
                                    placeholder="e.g. API Integration"
                                    value={newTaskName}
                                    onChange={e => setNewTaskName(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter" && newTaskName && newTaskPrice) {
                                        const newT = [...editTasks, { name: newTaskName, price: Number(newTaskPrice) }];
                                        setEditTasks(newT);
                                        setNewTaskName("");
                                        setNewTaskPrice("");
                                        const sum = newT.reduce((acc, curr) => acc + curr.price, 0);
                                        setEditCost(sum);
                                      }
                                    }}
                                  />
                                  <input 
                                    type="number" 
                                    className={styles.input} 
                                    style={{ width: '120px', padding: '10px 12px' }}
                                    placeholder="Price"
                                    value={newTaskPrice}
                                    onChange={e => setNewTaskPrice(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter" && newTaskName && newTaskPrice) {
                                        const newT = [...editTasks, { name: newTaskName, price: Number(newTaskPrice) }];
                                        setEditTasks(newT);
                                        setNewTaskName("");
                                        setNewTaskPrice("");
                                        const sum = newT.reduce((acc, curr) => acc + curr.price, 0);
                                        setEditCost(sum);
                                      }
                                    }}
                                  />
                                  <button 
                                    type="button" 
                                    className={styles.btnSecondary}
                                    style={{ padding: '8px 12px' }}
                                    onClick={() => {
                                      if (!newTaskName || !newTaskPrice) return;
                                      const newT = [...editTasks, { name: newTaskName, price: Number(newTaskPrice) }];
                                      setEditTasks(newT);
                                      setNewTaskName("");
                                      setNewTaskPrice("");
                                      // Auto-calculate points based on total price
                                      const sum = newT.reduce((acc, curr) => acc + curr.price, 0);
                                      setEditCost(sum);
                                    }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                                  </button>
                                </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
                <td className={styles.td} style={{ textAlign: "center" }}>{totalDays}</td>
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
                    {totalCost > 0 ? Math.round(((mod.price !== undefined ? mod.price : (mod.points || 0) * project.ratePerPoint) / totalCost) * 100) : 0}%
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
