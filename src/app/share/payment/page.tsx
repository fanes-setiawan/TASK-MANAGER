"use client";

import React, { useEffect, useState, useMemo } from "react";
import styles from "./payment.module.css";
import { getProjects, ProjectData } from "@/lib/firebase/firestore";
import { useSearchParams } from "next/navigation";

// Helper to generate consistent mock data based on project ID
const generateMockData = (projectId: string, createdAtSecs: number | undefined) => {
  const hash = projectId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const absHash = Math.abs(hash);
  
  // Invoice ID
  const year = createdAtSecs ? new Date(createdAtSecs * 1000).getFullYear() : 2026;
  const index = (absHash % 999).toString().padStart(3, '0');
  const invoiceId = `INV-${year}-${index}`;
  
  // Progress (20, 40, 60, 80, 100)
  const progress = (absHash % 5 + 1) * 20;
  
  // Due date (usually +30 days from creation)
  const due = createdAtSecs ? new Date((createdAtSecs + 30 * 24 * 60 * 60) * 1000) : new Date();
  
  return { invoiceId, progress, due };
};

// Calculate total price based on configJson
const calculateTotalPrice = (project: ProjectData) => {
  let totalPoints = 0;
  let totalFixedCost = 0;
  const rate = project.ratePerPoint || 0;
  
  if (project.configJson) {
    try {
      const parsed = JSON.parse(project.configJson);
      const modules = Array.isArray(parsed.modules) ? parsed.modules : [];
      modules.forEach((mod: any) => {
        const modFixed = mod.price ?? mod.cost ?? mod.fixedPrice ?? mod.fixed_price;
        if (modFixed !== undefined && modFixed !== null && modFixed !== "") {
          totalFixedCost += Number(modFixed) || 0;
        } else if (mod.subtasks && Array.isArray(mod.subtasks)) {
          mod.subtasks.forEach((sub: any) => {
            const fixed = sub.price ?? sub.cost ?? sub.fixedPrice ?? sub.fixed_price;
            if (fixed !== undefined && fixed !== null && fixed !== "") {
              totalFixedCost += Number(fixed) || 0;
            } else {
              totalPoints += (sub.points || 0);
            }
          });
        } else {
          totalPoints += (mod.points || 0);
        }
      });
    } catch (e) {
      console.error("Failed to parse configJson for price", e);
    }
  }
  
  return (totalPoints * rate) + totalFixedCost;
};

export default function SharedPaymentPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("u");
  const targetCompany = searchParams.get("c"); // DO NOT default to "All" to prevent unauthorized access
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(targetCompany || "All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest(`.${styles.actionMenuContainer}`)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!userId || !targetCompany) {
      setLoading(false);
      return;
    }
    const fetchProjects = async () => {
      try {
        const data = await getProjects(userId);
        let visible = data.filter(p => !(p as any).paymentHidden);
        if (targetCompany !== "All") {
          visible = visible.filter(p => (p.clientName || p.company) === targetCompany);
        }
        setProjects(visible);
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [userId, targetCompany]);

  const companies = useMemo(() => {
    const uniqueCompanies = new Set<string>();
    projects.forEach((p) => {
      const companyName = p.clientName || p.company;
      if (companyName) uniqueCompanies.add(companyName);
    });
    return Array.from(uniqueCompanies).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = projects;
    
    if (selectedCompany !== "All") {
      result = result.filter(p => (p.clientName || p.company) === selectedCompany);
    }
    
    if (selectedStatus !== "All") {
      // Normalize statuses for filtering
      result = result.filter(p => {
        const s = (p.status || "Active").toLowerCase();
        const sel = selectedStatus.toLowerCase();
        if (sel === "unpaid" && (s.includes("unpaid") || s.includes("pending"))) return true;
        if (sel === "paid" && s === "paid") return true;
        if (sel === "overdue" && (s === "cancelled" || s === "failed")) return true;
        return s === sel;
      });
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.projectName?.toLowerCase().includes(q) || 
        (p.clientName || p.company || "").toLowerCase().includes(q)
      );
    }
    
    // Sorting logic
    result.sort((a, b) => {
      // 1. Pinned items first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 2. Sort by paymentPaidDate (Tanggal Status Payment)
      const dateA = (a as any).paymentPaidDate ? Date.parse((a as any).paymentPaidDate) : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
      const dateB = (b as any).paymentPaidDate ? Date.parse((b as any).paymentPaidDate) : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
      
      return dateB - dateA; // Descending (terbaru di atas)
    });

    return result;
  }, [projects, selectedCompany, selectedStatus, searchQuery]);

  const targetProjectData = useMemo(() => {
    if (targetCompany !== "All" && filteredProjects.length > 0) {
      const p = filteredProjects[0];
      return {
        company: p.company || p.clientName || targetCompany,
        email: p.email || "",
        phone: p.phone || "",
        address: p.address || "",
        logoUrl: p.clientLogoUrl || ""
      };
    }
    return null;
  }, [targetCompany, filteredProjects]);

  // Calculations for Summary Cards
  const summary = useMemo(() => {
    let totalIncome = 0;
    let outstanding = 0;
    let paidCount = 0;
    let overdueCount = 0;

    projects.forEach(p => {
      const s = (p.status || "Active").toLowerCase();
      const amt = calculateTotalPrice(p);
      
      if (s === "paid") {
        totalIncome += amt;
        paidCount++;
      } else if (s.includes("pending") || s.includes("unpaid")) {
        outstanding += amt;
      } else if (s === "cancelled" || s === "failed" || s.includes("overdue")) {
        overdueCount++;
      }
    });

    return { totalIncome, outstanding, paidCount, overdueCount };
  }, [projects]);

  const handleStatusChange = () => {};

  const handleDelete = () => {};

  const handleToggleHide = () => {};

  const getStatusInfo = (status: string | undefined) => {
    const s = (status || "Active").toLowerCase();
    if (s === "paid") return { class: styles.sPaid, dot: true, sub: "Paid securely" };
    if (s.includes("pending") || s.includes("unpaid")) return { class: styles.sPending, dot: true, sub: "Waiting Payment" };
    if (s === "cancelled" || s === "failed") return { class: styles.sUnpaid, dot: true, sub: "Action Required" };
    return { class: styles.sPending, dot: true, sub: "In Progress" };
  };
  
  const getProgressClass = (prog: number) => {
    if (prog >= 100) return styles.green;
    if (prog < 50) return styles.red;
    return styles.yellow;
  };

  const getCategoryClass = (cat: string | undefined) => {
    if (!cat) return styles.catMobile;
    const c = cat.toLowerCase();
    if (c.includes("web")) return styles.catWebsite;
    if (c.includes("dash")) return styles.catDashboard;
    if (c.includes("sys")) return styles.catSystem;
    if (c.includes("deploy")) return styles.catDeploy;
    if (c.includes("featur") || c.includes("add")) return styles.catFeature;
    if (c.includes("fix") || c.includes("bug")) return styles.catFixbug;
    return styles.catMobile;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return (currency.includes("IDR") ? "Rp " : "$") + amount.toLocaleString("id-ID");
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading payments...</div>;
  }

  if (projects.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#cbd5e1', marginBottom: '16px' }}>link_off</span>
        <h2 style={{ color: '#334155', marginBottom: '8px', fontSize: '24px' }}>Tautan Tidak Valid</h2>
        <p style={{ color: '#64748b', maxWidth: '400px', lineHeight: '1.5' }}>
          Tautan yang Anda akses salah, telah diubah, atau sudah tidak berlaku. 
          Silakan periksa kembali URL tautan yang diberikan.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {targetProjectData?.logoUrl && (
              <img 
                src={targetProjectData.logoUrl} 
                alt={`${targetProjectData.company} logo`} 
                style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px' }} 
              />
            )}
            <div>
              <h2>{targetProjectData ? targetProjectData.company : "All Payments"}</h2>
              {targetProjectData && (targetProjectData.email || targetProjectData.phone || targetProjectData.address) ? (
                <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                  {[targetProjectData.email, targetProjectData.phone, targetProjectData.address].filter(Boolean).join(" • ")}
                </p>
              ) : (
                <p>Shared Payment Dashboard</p>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchContainer}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input 
              type="text" 
              className={styles.searchInput} 
              placeholder="Search invoices, projects, clients..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span className={styles.shortcutKey}>⌘K</span>
          </div>
          
        </div>
      </div>



      {/* Filter Bar */}
      <div className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          {targetCompany === "All" && (
            <div className={styles.filterSelectWrapper}>
              <span className={`material-symbols-outlined ${styles.filterSelectIcon}`}>domain</span>
              <select className={styles.filterSelect} value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
                <option value="All">All Companies</option>
                {companies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className={`material-symbols-outlined ${styles.filterSelectArrow}`}>expand_more</span>
            </div>
          )}
          
          <div className={styles.filterSelectWrapper}>
            <span className={`material-symbols-outlined ${styles.filterSelectIcon}`}>assignment</span>
            <select className={styles.filterSelect} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid / Pending</option>
              <option value="Overdue">Overdue / Failed</option>
            </select>
            <span className={`material-symbols-outlined ${styles.filterSelectArrow}`}>expand_more</span>
          </div>
          
          <div className={styles.filterSelectWrapper}>
            <span className={`material-symbols-outlined ${styles.filterSelectIcon}`}>calendar_today</span>
            <select className={styles.filterSelect}>
              <option>1 Aug 2026 - 31 Aug 2026</option>
            </select>
            <span className={`material-symbols-outlined ${styles.filterSelectArrow}`}>expand_more</span>
          </div>
        </div>
        
        <button className={styles.btnExport}>
          <span className="material-symbols-outlined">download</span>
          Export
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>No</th>
              <th>Project Name</th>
              <th>Client</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status Payment</th>
              <th>Progress</th>
              <th>Document</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((project, index) => {
              const mock = generateMockData(project.id || "", project.createdAt?.seconds);
              const due = (project as any).paymentDueDate ? new Date((project as any).paymentDueDate) : mock.due;
              const paidDate = (project as any).paymentPaidDate ? new Date((project as any).paymentPaidDate) : new Date();
              const statusInfo = getStatusInfo(project.status);
              
              let dateStatusClass = styles.green;
              let dateStatusText = "Upcoming";
              
              const now = new Date();
              if (statusInfo.class === styles.sPaid) {
                dateStatusText = "Paid";
                dateStatusClass = styles.green;
              } else if (due < now) {
                dateStatusText = "Overdue";
                dateStatusClass = styles.red;
              } else {
                const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
                dateStatusText = `${diffDays} days left`;
                dateStatusClass = styles.yellow;
              }

              const totalPrice = calculateTotalPrice(project);
              const isHidden = (project as any).paymentHidden;
              const isPinned = project.isPinned;

              return (
                <tr key={project.id} className={isHidden ? styles.rowHidden : ""} style={{ backgroundColor: project.rowColor || 'transparent' }}>
                  <td>
                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 500, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {isPinned && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f59e0b', marginBottom: '4px' }}>keep</span>}
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </div>
                  </td>
                  <td>
                    <div className={styles.cellProject}>
                      <span className={styles.projectNameBold}>{project.projectName || "Unnamed Project"}</span>
                      {(project as any).documentSettings?.estimatedDuration && (
                        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                          {(() => {
                            const ed = (project as any).documentSettings.estimatedDuration;
                            if (ed.includes(" - ")) {
                              const parts = ed.split(" - ");
                              if (parts.length === 2 && parts[0].match(/^\d{4}-\d{2}-\d{2}$/) && parts[1].match(/^\d{4}-\d{2}-\d{2}$/)) {
                                return `${new Date(parts[0]).toLocaleDateString("id-ID", {day: 'numeric', month: 'short', year:'numeric'})} - ${new Date(parts[1]).toLocaleDateString("id-ID", {day: 'numeric', month: 'short', year:'numeric'})}`;
                              }
                            }
                            return ed;
                          })()}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.cellClient}>
                      <div className={styles.clientAvatar}>
                        {(project.clientName || project.company || "U")[0].toUpperCase()}
                      </div>
                      <div className={styles.clientInfo}>
                        <span className={styles.clientName}>{project.clientName || "Unknown Client"}</span>
                        <span className={styles.clientCompany}>{project.company || "Unknown Company"}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className={`${styles.categoryBadge} ${getCategoryClass((project as any).paymentCategory)}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        {(project as any).paymentCategory?.toLowerCase().includes("web") ? "language" 
                        : (project as any).paymentCategory?.toLowerCase().includes("dash") ? "dashboard"
                        : "smartphone"}
                      </span>
                      {(project as any).paymentCategory || "Mobile App"}
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.cellAmount}>
                      <span className={styles.amountVal}>
                        {formatCurrency(totalPrice, project.currency || "IDR")}
                      </span>
                      <span className={styles.amountType}>
                        {totalPrice === 0 ? "Free Project" : "Total Price"}
                      </span>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.cellStatus}>
                      <div className={`${styles.statusBadge} ${statusInfo.class}`}>
                        <div className={styles.statusDot}></div>
                        <span className={styles.statusText}>{project.status || "Active"}</span>
                      </div>
                      <div className={styles.statusSub}>
                        {statusInfo.class === styles.sPaid ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ whiteSpace: 'nowrap' }}>Paid on {paidDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'})}</span>
                            <img 
                              src={(project as any).paymentBank === 'Mandiri' ? "https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg" : 
                                   (project as any).paymentBank === 'BNI' ? "https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg" : 
                                   (project as any).paymentBank === 'BRI' ? "https://upload.wikimedia.org/wikipedia/commons/2/2e/BRI_2020.svg" : 
                                   "https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg"} 
                              alt={(project as any).paymentBank || "BCA"} 
                              style={{ height: '14px', objectFit: 'contain' }} 
                            />
                          </div>
                        ) : (
                          statusInfo.sub
                        )}
                      </div>
                    </div>
                  </td>
                  

                  <td>
                    <div className={styles.cellProgress}>
                      <div className={styles.progressTrack}>
                        <div 
                          className={`${styles.progressFill} ${getProgressClass(statusInfo.class === styles.sPaid ? 100 : mock.progress)}`} 
                          style={{ width: `${statusInfo.class === styles.sPaid ? 100 : mock.progress}%` }}
                        ></div>
                      </div>
                      <span className={styles.progressText}>{statusInfo.class === styles.sPaid ? 100 : mock.progress}%</span>
                    </div>
                  </td>
                  
                  <td>
                    <button 
                      onClick={() => window.open(`/share/${project.id}`, '_blank')}
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        backgroundColor: '#f1f5f9', 
                        color: '#3b82f6', 
                        border: '1px solid #bfdbfe', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                      Document
                    </button>
                  </td>
                </tr>
              );
            })}
            
            {filteredProjects.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "48px", color: "#64748b" }}>
                  No payments/projects found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {filteredProjects.length > 0 && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} invoices
            </span>
            <div className={styles.pageControls}>
              <button 
                className={styles.pageBtn} 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <span className="material-symbols-outlined" style={{fontSize:18}}>chevron_left</span>
              </button>
              
              {Array.from({ length: Math.ceil(filteredProjects.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  className={`${styles.pageBtn} ${currentPage === page ? styles.active : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button 
                className={styles.pageBtn}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProjects.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredProjects.length / itemsPerPage)}
              >
                <span className="material-symbols-outlined" style={{fontSize:18}}>chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
