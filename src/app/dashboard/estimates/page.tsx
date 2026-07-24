"use client";

import React, { useEffect, useState, useRef } from "react";
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

  // Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <div style={{ textAlign: "center", padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "24px" }}>
            <defs>
              <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="#0a8760" />
              </linearGradient>
            </defs>
            <style>
              {`
                @keyframes floatUpDown {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-15px); }
                }
                .floatingItem {
                  animation: floatUpDown 4s ease-in-out infinite;
                  transform-origin: center;
                }
              `}
            </style>
            <circle cx="100" cy="100" r="80" fill="#d1fae5" opacity="0.3" />
            
            <g className="floatingItem">
              {/* Folder Back */}
              <path d="M 40,80 L 160,80 C 170,80 175,85 175,95 L 175,150 C 175,160 170,165 160,165 L 40,165 C 30,165 25,160 25,150 L 25,95 C 25,85 30,80 40,80 Z" fill="#999" opacity="0.2" />
              
              {/* Document */}
              <rect x="55" y="50" width="90" height="110" rx="8" fill="white" stroke="var(--color-outline-variant)" strokeWidth="2" />
              <line x1="70" y1="70" x2="130" y2="70" stroke="var(--color-outline)" strokeWidth="4" strokeLinecap="round" />
              <line x1="70" y1="90" x2="110" y2="90" stroke="var(--color-outline)" strokeWidth="4" strokeLinecap="round" />
              <line x1="70" y1="110" x2="130" y2="110" stroke="var(--color-outline)" strokeWidth="4" strokeLinecap="round" />
              
              {/* Folder Front */}
              <path d="M 30,95 L 170,95 C 180,95 185,100 185,110 L 175,165 C 172,175 165,180 155,180 L 45,180 C 35,180 28,175 25,165 L 15,110 C 15,100 20,95 30,95 Z" fill="url(#primaryGradient)" />
              
              {/* Folder Tag */}
              <path d="M 40,80 L 70,80 L 85,95 L 40,95 Z" fill="url(#primaryGradient)" opacity="0.8" />
            </g>
          </svg>
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
            <div 
              className={styles.selectWrapper} 
              style={{ cursor: 'pointer', padding: '6px 16px 6px 12px', minWidth: '260px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
              ref={dropdownRef} 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '20px' }}>work</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-on-surface)', lineHeight: '1.2' }}>{project.projectName || "Unnamed Project"}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', lineHeight: '1.4' }}>{project.clientName || "Unknown Client"}</span>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-primary)', transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
              
              {isDropdownOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: '100%', backgroundColor: 'white', border: '1px solid var(--color-outline-variant)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', zIndex: 50, maxHeight: '300px', overflowY: 'auto', padding: '8px 0', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: '4px 16px 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-outline)', letterSpacing: '0.05em' }}>Switch Project</div>
                  {projectsList.map(p => (
                    <div 
                      key={p.id} 
                      style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: p.id === project.id ? 'var(--color-surface-container-low)' : 'transparent', transition: 'background-color 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-container)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = p.id === project.id ? 'var(--color-surface-container-low)' : 'transparent'}
                      onClick={() => {
                        setProject(p);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="material-symbols-outlined" style={{ color: p.id === project.id ? 'var(--color-primary)' : 'var(--color-outline)', fontSize: '20px' }}>{p.id === project.id ? 'folder_special' : 'folder'}</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: p.id === project.id ? 700 : 500, color: p.id === project.id ? 'var(--color-primary)' : 'var(--color-on-surface)', lineHeight: '1.2' }}>{p.projectName || "Unnamed Project"}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{p.clientName || "Unknown Client"}</span>
                        </div>
                      </div>
                      {p.id === project.id && <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>check</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <h2 className={styles.pageTitle}>Cost Breakdown Report</h2>
          <p className={styles.pageDesc}>Detailed fiscal analysis for {project.clientName || "the client"}.</p>
        </div>
        
        <div className={styles.actionRow}>
          <Link href={`/dashboard/proposal-preview?projectId=${project.id}`}>
            <button className={styles.btnSecondary}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>file_download</span>
              Export PDF
            </button>
          </Link>
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
                                  <div style={{ padding: "30px", textAlign: "center", border: "1px dashed var(--color-outline-variant)", borderRadius: "8px", color: "var(--color-on-surface-variant)", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                                    <svg viewBox="0 0 100 100" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
                                      <style>
                                        {`
                                          @keyframes dash {
                                            to { stroke-dashoffset: 0; }
                                          }
                                          .animatedLine {
                                            stroke-dasharray: 100;
                                            stroke-dashoffset: 100;
                                            animation: dash 2s ease-out forwards infinite alternate;
                                          }
                                        `}
                                      </style>
                                      <rect x="20" y="20" width="60" height="60" rx="8" fill="var(--color-surface-container)" />
                                      <line x1="30" y1="40" x2="70" y2="40" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" className="animatedLine" />
                                      <line x1="30" y1="55" x2="60" y2="55" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" className="animatedLine" style={{ animationDelay: "0.5s" }} />
                                      <line x1="30" y1="70" x2="50" y2="70" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" className="animatedLine" style={{ animationDelay: "1s" }} />
                                    </svg>
                                    <span>No sub-tasks yet. Breakdown your module into smaller chunks.</span>
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
                                    type="text" 
                                    className={styles.input} 
                                    style={{ width: '120px', padding: '10px 12px' }}
                                    placeholder="Price"
                                    value={newTaskPrice ? newTaskPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""}
                                    onChange={e => {
                                      const rawValue = e.target.value.replace(/\D/g, "");
                                      setNewTaskPrice(rawValue);
                                    }}
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
