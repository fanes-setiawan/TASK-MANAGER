"use client";

import React, { useEffect, useState, useMemo } from "react";
import styles from "./payment.module.css";
import { getProjects, ProjectData, deleteProject, updateProject, updateProjectRowSettings } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

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

export default function PaymentPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCompany, setShareCompany] = useState("All");
  const [authUid, setAuthUid] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectData | null>(null);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editCompany, setEditCompany] = useState("");

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUid(user.uid);
        try {
          const data = await getProjects(user.uid);
          setProjects(data);
        } catch (error) {
          console.error("Failed to fetch projects for payments", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const chartData = useMemo(() => {
    const statusCounts = { paid: 0, pending: 0, unpaid: 0, active: 0 };
    const revenueByGroup: Record<string, number> = {};

    projects.forEach(p => {
      const s = (p.status || "Active").toLowerCase();
      if (s === "paid") statusCounts.paid++;
      else if (s.includes("pending") || s.includes("unpaid")) statusCounts.pending++;
      else if (s === "cancelled" || s === "failed") statusCounts.unpaid++;
      else statusCounts.active++;

      if (s === "paid") {
         const price = calculateTotalPrice(p);
         if (selectedCompany !== "All") {
            let dateVal = 0;
            if ((p as any).paymentPaidDate) dateVal = Date.parse((p as any).paymentPaidDate);
            else if (p.createdAt?.toMillis) dateVal = p.createdAt.toMillis();
            else if ((p as any).createdAtSecs) dateVal = (p as any).createdAtSecs * 1000;
            
            const d = dateVal ? new Date(dateVal) : new Date();
            const month = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            revenueByGroup[month] = (revenueByGroup[month] || 0) + price;
         } else {
            const company = p.clientName || p.company || "Unknown";
            revenueByGroup[company] = (revenueByGroup[company] || 0) + price;
         }
      }
    });

    const pieData = [
      { name: 'Paid', value: statusCounts.paid, color: '#22c55e' },
      { name: 'Pending', value: statusCounts.pending, color: '#eab308' },
      { name: 'Action Required', value: statusCounts.unpaid, color: '#ef4444' },
      { name: 'In Progress', value: statusCounts.active, color: '#3b82f6' }
    ].filter(d => d.value > 0);

    const barData = Object.keys(revenueByGroup).map(key => ({
       name: key.length > 15 && selectedCompany === "All" ? key.substring(0, 15) + '...' : key,
       revenue: revenueByGroup[key],
       fullName: key
    }));

    if (selectedCompany === "All") {
       barData.sort((a, b) => b.revenue - a.revenue);
    }

    return { pieData, barData };
  }, [projects, selectedCompany]);

  const handleStatusChange = async (projectId: string | undefined, newStatus: string) => {
    if (!projectId) return;
    try {
      const { updateProject } = await import("@/lib/firebase/firestore");
      await updateProject(projectId, { status: newStatus } as any);
      setProjects(projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleDelete = (id: string | undefined) => {
    if (!id) return;
    alert(`Delete functionality for project ID: ${id} will be implemented soon.`);
    setOpenDropdownId(null);
  };

  const handleToggleHide = async (id?: string, isHidden?: boolean) => {
    if (!id) return;
    try {
      await updateProject(id, { paymentHidden: !isHidden } as any);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, paymentHidden: !isHidden } as any : p));
      setOpenDropdownId(null);
    } catch (err) {
      alert("Failed to update visibility");
    }
  };

  const handleTogglePin = async (id?: string, isPinned?: boolean) => {
    if (!id) return;
    try {
      await updateProjectRowSettings(id, { isPinned: !isPinned });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, isPinned: !isPinned } : p));
      setOpenDropdownId(null);
    } catch (err) {
      alert("Failed to update pin status");
    }
  };

  const handleChangeRowColor = async (id?: string, color?: string) => {
    if (!id) return;
    try {
      await updateProjectRowSettings(id, { rowColor: color });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, rowColor: color } : p));
      setOpenDropdownId(null);
    } catch (err) {
      alert("Failed to update row color");
    }
  };

  const handleUpdateCategory = async (projectId: string | undefined, newCategory: string) => {
    if (!projectId) return;
    try {
      const { updateProject } = await import("@/lib/firebase/firestore");
      await updateProject(projectId, { paymentCategory: newCategory } as any);
      setProjects(projects.map(p => p.id === projectId ? { ...p, paymentCategory: newCategory } as any : p));
    } catch (error) {
      console.error("Failed to update category", error);
    }
  };

  const handleUpdateBank = async (projectId: string | undefined, newBank: string) => {
    if (!projectId) return;
    try {
      const { updateProject } = await import("@/lib/firebase/firestore");
      await updateProject(projectId, { paymentBank: newBank } as any);
      setProjects(projects.map(p => p.id === projectId ? { ...p, paymentBank: newBank } as any : p));
    } catch (error) {
      console.error("Failed to update bank", error);
    }
  };

  const handleUpdateDueDate = async (projectId: string | undefined, newDate: string) => {
    if (!projectId) return;
    try {
      const { updateProject } = await import("@/lib/firebase/firestore");
      await updateProject(projectId, { paymentDueDate: newDate } as any);
      setProjects(projects.map(p => p.id === projectId ? { ...p, paymentDueDate: newDate } as any : p));
    } catch (error) {
      console.error("Failed to update due date", error);
    }
  };

  const handleUpdatePaidDate = async (projectId: string | undefined, newDate: string) => {
    if (!projectId) return;
    try {
      const { updateProject } = await import("@/lib/firebase/firestore");
      await updateProject(projectId, { paymentPaidDate: newDate } as any);
      setProjects(projects.map(p => p.id === projectId ? { ...p, paymentPaidDate: newDate } as any : p));
    } catch (error) {
      console.error("Failed to update paid date", error);
    }
  };

  const openEditModal = (project: ProjectData) => {
    setProjectToEdit(project);
    setEditName(project.projectName || "");
    setEditClient(project.clientName || "");
    setEditCompany(project.company || "");
    setEditModalOpen(true);
  };

  const executeEdit = async () => {
    if (!projectToEdit?.id) return;
    try {
      const { updateProject } = await import("@/lib/firebase/firestore");
      await updateProject(projectToEdit.id, {
        projectName: editName,
        clientName: editClient,
        company: editCompany
      } as any);
      
      setProjects(projects.map(p => 
        p.id === projectToEdit.id 
          ? { ...p, projectName: editName, clientName: editClient, company: editCompany } 
          : p
      ));
      
      setEditModalOpen(false);
      setProjectToEdit(null);
    } catch (error) {
      console.error("Failed to edit project", error);
      alert("Failed to save changes. Check console for details.");
    }
  };

  const handleExportCSV = () => {
    if (filteredProjects.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = ["Project Name", "Client", "Company", "Category", "Total Price", "Currency", "Status", "Progress", "Due Date"];
    
    const csvRows = [headers.join(",")];
    
    filteredProjects.forEach(project => {
      const mock = generateMockData(project.id!, project.createdAt?.seconds);
      const totalPrice = calculateTotalPrice(project);
      
      const row = [
        `"${project.projectName || 'Unnamed Project'}"`,
        `"${project.clientName || 'Unknown'}"`,
        `"${project.company || 'Unknown'}"`,
        `"${(project as any).paymentCategory || 'Mobile App'}"`,
        totalPrice,
        `"${project.currency || 'IDR'}"`,
        `"${project.status || 'Active'}"`,
        `"${mock.progress}%"`,
        `"${mock.due.toLocaleDateString()}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <h2>Payments</h2>
          <p>Track your project payments, invoices, and billing statuses.</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.searchContainer}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input 
              className={styles.searchInput}
              type="text" 
              placeholder="Search projects, clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className={styles.shortcutKey}>⌘K</span>
          </div>
          <button className={styles.btnShare} onClick={() => setShowShareModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
            Share
          </button>
          <button className={styles.btnNewPayment} onClick={() => alert("New Payment Flow coming soon!")}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            New Payment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIconWrapper} ${styles.green}`}>
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className={styles.statTitle}>Total Income</span>
          </div>
          <div className={styles.statValue}>Rp {summary.totalIncome.toLocaleString('id-ID')}</div>
          <div className={styles.statTrend}>
            <span className={`material-symbols-outlined ${styles.trendUp}`}>arrow_upward</span>
            <span className={styles.trendUp}>12.5%</span> from last month
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIconWrapper} ${styles.yellow}`}>
              <span className="material-symbols-outlined">schedule</span>
            </div>
            <span className={styles.statTitle}>Outstanding</span>
          </div>
          <div className={styles.statValue}>Rp {summary.outstanding.toLocaleString('id-ID')}</div>
          <div className={styles.statTrend}>
            <span className={`material-symbols-outlined ${styles.trendUp}`}>arrow_upward</span>
            <span className={styles.trendUp}>8.3%</span> from last month
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIconWrapper} ${styles.blue}`}>
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <span className={styles.statTitle}>Paid Invoices</span>
          </div>
          <div className={styles.statValue}>{summary.paidCount}</div>
          <div className={styles.statTrend}>
            <span className={`material-symbols-outlined ${styles.trendUp}`}>arrow_upward</span>
            <span className={styles.trendUp}>20%</span> from last month
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIconWrapper} ${styles.red}`}>
              <span className="material-symbols-outlined">error</span>
            </div>
            <span className={styles.statTitle}>Overdue Invoices</span>
          </div>
          <div className={styles.statValue}>{summary.overdueCount}</div>
          <div className={styles.statTrend}>
            <span className={`material-symbols-outlined ${styles.trendDown}`}>arrow_downward</span>
            <span className={styles.trendDown}>2</span> from last month
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Status Distribution */}
        {chartData.pieData.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Status Distribution</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1000}
                  >
                    {chartData.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [Number(value) + ' Projects', 'Count']} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.chartLegend}>
              {chartData.pieData.map((entry, index) => (
                <div key={index} className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: entry.color }}></div>
                  <span className={styles.legendText}>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue Chart */}
        {chartData.barData.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>{selectedCompany === "All" ? "Top Revenue by Client" : "Revenue by Month"}</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={chartData.barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '3 3' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                    formatter={(value: any) => [`Rp ${Number(value).toLocaleString('id-ID')}`, 'Revenue']}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} animationBegin={200} animationDuration={1000} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          <div className={styles.filterSelectWrapper}>
            <span className={`material-symbols-outlined ${styles.filterSelectIcon}`}>domain</span>
            <select className={styles.filterSelect} value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
              <option value="All">All Companies</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className={`material-symbols-outlined ${styles.filterSelectArrow}`}>expand_more</span>
          </div>
          
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
        
        <button className={styles.btnExport} onClick={handleExportCSV}>
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((project, index) => {
              const mock = generateMockData(project.id || "", project.createdAt?.seconds);
              const paidDate = (project as any).paymentPaidDate ? new Date((project as any).paymentPaidDate) : new Date();
              const statusInfo = getStatusInfo(project.status);
              
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
                    <select 
                      className={`${styles.categorySelect} ${getCategoryClass((project as any).paymentCategory)}`}
                      value={(project as any).paymentCategory || "Mobile App"}
                      onChange={(e) => handleUpdateCategory(project.id, e.target.value)}
                    >
                      <option value="Mobile App">Mobile App</option>
                      <option value="Website">Website</option>
                      <option value="Dashboard">Dashboard</option>
                      <option value="Deploy">Deploy</option>
                      <option value="Add Feature">Add Feature</option>
                      <option value="Fixbug">Fixbug</option>
                    </select>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', position: 'relative' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <span style={{ whiteSpace: 'nowrap' }}>Paid on {paidDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'})}</span>
                              <input 
                                type="date"
                                style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
                                value={paidDate.toISOString().split('T')[0]}
                                onChange={(e) => handleUpdatePaidDate(project.id, e.target.value)}
                                onClick={(e) => {
                                  try { (e.target as any).showPicker?.(); } catch (err) {}
                                }}
                                title="Change Paid Date"
                              />
                            </div>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                              <img 
                                src={(project as any).paymentBank === 'Mandiri' ? "https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg" : 
                                     (project as any).paymentBank === 'BNI' ? "https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg" : 
                                     (project as any).paymentBank === 'BRI' ? "https://upload.wikimedia.org/wikipedia/commons/2/2e/BRI_2020.svg" : 
                                     "https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg"} 
                                alt={(project as any).paymentBank || "BCA"} 
                                style={{ height: '14px', objectFit: 'contain' }} 
                              />
                              <select 
                                style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                                value={(project as any).paymentBank || 'BCA'}
                                onChange={(e) => handleUpdateBank(project.id, e.target.value)}
                                title="Change Bank Logo"
                              >
                                <option value="BCA">BCA</option>
                                <option value="Mandiri">Mandiri</option>
                                <option value="BNI">BNI</option>
                                <option value="BRI">BRI</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          statusInfo.sub
                        )}
                      </div>
                      {/* Transparent select for inline edit */}
                      <select 
                        className={styles.statusSelect}
                        value={project.status || "Active"}
                        onChange={(e) => handleStatusChange(project.id, e.target.value)}
                        title="Change Status"
                      >
                        <option value="Active">Active</option>
                        <option value="Paid">Paid</option>
                        <option value="Unpaid / Pending Payment">Unpaid / Pending Payment</option>
                        <option value="Pending">Pending</option>
                        <option value="Refunded">Refunded</option>
                        <option value="Failed">Failed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
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
                      onClick={() => router.push(`/dashboard/proposal-preview?projectId=${project.id}`)}
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
                  
                  <td>
                    <div className={styles.actionMenuContainer}>
                      <button 
                        className={styles.btnAction} 
                        title="Actions"
                        onClick={() => setOpenDropdownId(openDropdownId === project.id ? null : project.id!)}
                      >
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                      
                      {openDropdownId === project.id && (
                        <div className={`${styles.actionDropdown} ${index >= filteredProjects.length - 2 && filteredProjects.length > 2 ? styles.actionDropdownUp : ""}`}>
                          <button 
                            className={styles.actionMenuItem}
                            onClick={() => {
                              router.push(`/dashboard/project-board?id=${project.id}`);
                              setOpenDropdownId(null);
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                            Open Board
                          </button>
                          <button 
                            className={styles.actionMenuItem}
                            onClick={() => {
                              openEditModal(project);
                              setOpenDropdownId(null);
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                            Edit
                          </button>
                          <button 
                            className={styles.actionMenuItem}
                            onClick={() => handleToggleHide(project.id, isHidden)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                              {isHidden ? "visibility" : "visibility_off"}
                            </span>
                            {isHidden ? "Show" : "Hide"}
                          </button>
                          <button 
                            className={styles.actionMenuItem}
                            onClick={() => handleTogglePin(project.id, project.isPinned)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                              {project.isPinned ? "keep_off" : "keep"}
                            </span>
                            {project.isPinned ? "Unpin" : "Pin"}
                          </button>
                          
                          {/* Color Palette Menu Item */}
                          <div className={styles.actionMenuItem} style={{ position: 'relative' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>palette</span>
                            <span>Row Color</span>
                            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                              <button onClick={(e) => { e.stopPropagation(); handleChangeRowColor(project.id, ""); }} style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0' }} title="Default" />
                              <button onClick={(e) => { e.stopPropagation(); handleChangeRowColor(project.id, "#fef3c7"); }} style={{ width: 16, height: 16, borderRadius: '50%', background: '#fef3c7', border: '1px solid #fde68a' }} title="Yellow" />
                              <button onClick={(e) => { e.stopPropagation(); handleChangeRowColor(project.id, "#d1fae5"); }} style={{ width: 16, height: 16, borderRadius: '50%', background: '#d1fae5', border: '1px solid #a7f3d0' }} title="Green" />
                              <button onClick={(e) => { e.stopPropagation(); handleChangeRowColor(project.id, "#fee2e2"); }} style={{ width: 16, height: 16, borderRadius: '50%', background: '#fee2e2', border: '1px solid #fecaca' }} title="Red" />
                              <button onClick={(e) => { e.stopPropagation(); handleChangeRowColor(project.id, "#dbeafe"); }} style={{ width: 16, height: 16, borderRadius: '50%', background: '#dbeafe', border: '1px solid #bfdbfe' }} title="Blue" />
                            </div>
                          </div>

                          <button 
                            className={`${styles.actionMenuItem} ${styles.delete}`}
                            onClick={() => handleDelete(project.id)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
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
        
        {showShareModal && (
          <div className={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Share Payments</h3>
                <button className={styles.btnClose} onClick={() => setShowShareModal(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>Select which company's data to share. You can share all companies or filter to a specific one.</p>
                <label>Select Company</label>
                <select 
                  className={styles.modalSelect} 
                  value={shareCompany} 
                  onChange={e => setShareCompany(e.target.value)}
                >
                  <option value="All">All Companies</option>
                  {companies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                
                <div className={styles.linkBox}>
                  <input 
                    type="text" 
                    readOnly 
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/payment?u=${authUid}&c=${encodeURIComponent(shareCompany)}`} 
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button onClick={() => {
                    navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/share/payment?u=${authUid}&c=${encodeURIComponent(shareCompany)}`);
                    alert("Link copied!");
                  }}>Copy Link</button>
                </div>
              </div>
            </div>
          </div>
        )}

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
      {/* Edit Project Modal */}
      {editModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setEditModalOpen(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Edit Project Details</h3>
              <button className={styles.btnClose} onClick={() => setEditModalOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>Update basic information for this project.</p>
              <div className={styles.inputGroup}>
                <label>Project Name</label>
                <input 
                  className={styles.modalInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Website Redesign"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Client Name</label>
                <input 
                  className={styles.modalInput}
                  value={editClient}
                  onChange={(e) => setEditClient(e.target.value)}
                  placeholder="e.g. Erik Santosa"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Company / Organization</label>
                <input 
                  className={styles.modalInput}
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="e.g. ACME Corp"
                />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btnCancel} onClick={() => setEditModalOpen(false)}>Cancel</button>
                <button className={styles.btnPrimary} onClick={executeEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
