"use client";

import React, { useEffect, useState, useMemo } from "react";
import styles from "./projects.module.css";
import Link from "next/link";
import { getProjects, deleteProject, updateProjectStatus, updateProject, ProjectData } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectData | null>(null);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectData | null>(null);
  const [editName, setEditName] = useState("");
  const [editClient, setEditClient] = useState("");

  const fetchProjects = async (uid: string) => {
    try {
      const data = await getProjects(uid);
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchProjects(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter & Group Logic
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = 
        (p.projectName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.clientName || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const pStatus = p.status || "Active";
      const matchesStatus = filterStatus === "All" || pStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, filterStatus]);

  const groupedProjects = useMemo(() => {
    const groups: Record<string, ProjectData[]> = {};
    filteredProjects.forEach(p => {
      const client = p.clientName || "Unknown Client";
      if (!groups[client]) groups[client] = [];
      groups[client].push(p);
    });
    return groups;
  }, [filteredProjects]);

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    try {
      await updateProjectStatus(projectId, newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
      if (auth.currentUser) fetchProjects(auth.currentUser.uid);
    }
  };

  const confirmDelete = (project: ProjectData) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!projectToDelete?.id) return;
    try {
      await deleteProject(projectToDelete.id);
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (projectToDelete.id) next.delete(projectToDelete.id);
        return next;
      });
      setDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete project.");
    }
  };

  const executeBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirm = window.confirm(`Are you sure you want to delete ${selectedIds.size} projects?`);
    if (!confirm) return;

    try {
      for (const id of Array.from(selectedIds)) {
        await deleteProject(id);
      }
      setProjects(projects.filter(p => p.id && !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error in bulk delete:", error);
      alert("Failed to delete some projects.");
    }
  };

  const openEditModal = (project: ProjectData) => {
    setProjectToEdit(project);
    setEditName(project.projectName);
    setEditClient(project.clientName);
    setEditModalOpen(true);
  };

  const executeEdit = async () => {
    if (!projectToEdit?.id) return;
    try {
      await updateProject(projectToEdit.id, {
        projectName: editName,
        clientName: editClient
      });
      setProjects(projects.map(p => 
        p.id === projectToEdit.id 
          ? { ...p, projectName: editName, clientName: editClient } 
          : p
      ));
      setEditModalOpen(false);
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusClass = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'completed': return styles.completed;
      case 'paid': return styles.paid;
      case 'cancelled': return styles.cancelled;
      case 'pending payment': return styles.pending;
      case 'active':
      default: return styles.active;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>My Projects</h2>
          <p className={styles.subtitle}>Manage your ongoing and past projects, track statuses, and update details.</p>
        </div>
        <div className={styles.actionRow}>
          <Link href="/dashboard/new-project">
            <button className={styles.btnPrimary}>
              <span className="material-symbols-outlined">add</span>
              New Project
            </button>
          </Link>
        </div>
      </div>

      {!loading && projects.length > 0 && (
        <div className={styles.controlsRow}>
          <div className={styles.filtersGroup}>
            <input 
              type="text" 
              className={styles.searchInput} 
              placeholder="Search projects or clients..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <select 
              className={styles.filterSelect}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Pending Payment">Pending Payment</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          
          {selectedIds.size > 0 && (
            <div className={styles.bulkActionRow}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)' }}>
                {selectedIds.size} Selected
              </span>
              <button className={styles.btnBulkDelete} onClick={executeBulkDelete}>
                <span className="material-symbols-outlined">delete</span>
                Delete Selected
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div className={styles.emptyState}>
          <svg className={styles.svgIllustration} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="#0a8760" />
              </linearGradient>
              <linearGradient id="secondaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d1fae5" />
                <stop offset="100%" stopColor="#a7f3d0" />
              </linearGradient>
            </defs>
            
            <circle cx="100" cy="100" r="80" fill="url(#secondaryGradient)" className={styles.svgElement} opacity="0.3" />
            
            <g className={styles.svgAnimation}>
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

            {/* Sparkles */}
            <circle cx="150" cy="50" r="4" fill="#f59e0b" className={styles.svgElement} />
            <circle cx="40" cy="140" r="3" fill="#f59e0b" className={styles.svgElement} style={{animationDelay: "1s"}} />
            <circle cx="170" cy="120" r="2" fill="#f59e0b" className={styles.svgElement} style={{animationDelay: "0.5s"}} />
          </svg>
          <h3>No Projects Yet</h3>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '24px' }}>
            Get started by creating your first project proposal.
          </p>
          <Link href="/dashboard/new-project">
            <button className={styles.btnPrimary}>Create Project</button>
          </Link>
        </div>
      ) : Object.keys(groupedProjects).length === 0 ? (
        <div className={styles.emptyState}>
          <svg className={styles.svgIllustration} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="70" fill="none" stroke="var(--color-outline-variant)" strokeWidth="8" strokeDasharray="10 10" className={styles.svgRotate} />
            <g className={styles.svgAnimation}>
              <circle cx="90" cy="90" r="40" fill="none" stroke="var(--color-primary)" strokeWidth="12" />
              <line x1="120" y1="120" x2="160" y2="160" stroke="var(--color-primary)" strokeWidth="16" strokeLinecap="round" />
              <circle cx="90" cy="90" r="20" fill="var(--color-secondary-container)" />
            </g>
          </svg>
          <h3>No Match Found</h3>
          <p style={{ color: 'var(--color-on-surface-variant)' }}>
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        Object.entries(groupedProjects).map(([clientName, clientProjects]) => (
          <div key={clientName} className={styles.clientGroup}>
            <div className={styles.groupHeader}>
              <span className="material-symbols-outlined">business</span>
              {clientName}
              <span className={styles.groupCount}>{clientProjects.length}</span>
            </div>
            <div className={styles.grid}>
              {clientProjects.map((project, index) => {
                const isSelected = selectedIds.has(project.id!);
                return (
                  <div 
                    className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`} 
                    key={project.id}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={styles.checkboxWrapper}>
                      <input 
                        type="checkbox" 
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() => toggleSelect(project.id!)}
                      />
                    </div>
                    
                    <div className={`${styles.cardHeader} ${styles.cardHeaderWithCheck}`}>
                      <div className={styles.projectInfo}>
                        <h3 className={styles.projectName}>{project.projectName || "Unnamed Project"}</h3>
                        <div className={styles.clientName}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
                          {project.clientName || "Unknown Client"}
                        </div>
                      </div>
                      <div className={styles.actionButtons}>
                        <button className={styles.iconBtn} onClick={() => openEditModal(project)} title="Edit">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button className={`${styles.iconBtn} ${styles.delete}`} onClick={() => confirmDelete(project)} title="Delete">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Date Created</span>
                        <span className={styles.infoValue}>
                          {project.createdAt?.seconds 
                            ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() 
                            : "Unknown"}
                        </span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Rate</span>
                        <span className={styles.infoValue}>
                          {project.currency.includes("IDR") ? "Rp " : "$"}{project.ratePerPoint.toLocaleString()} / pt
                        </span>
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <div className={styles.statusWrapper}>
                        <select 
                          className={`${styles.statusSelect} ${getStatusClass(project.status)}`}
                          value={project.status || "Active"}
                          onChange={(e) => handleStatusChange(project.id!, e.target.value)}
                        >
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                          <option value="Pending Payment">Pending Payment</option>
                          <option value="Paid">Paid</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <span className={`material-symbols-outlined ${styles.statusIcon}`}>expand_more</span>
                      </div>
                      
                      <Link href={`/dashboard/proposal-preview?projectId=${project.id}`}>
                        <button className={styles.iconBtn} title="View Proposal" style={{ color: 'var(--color-primary)' }}>
                          <span className="material-symbols-outlined">description</span>
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Delete Project</h3>
              <p>Are you sure you want to delete <strong>{projectToDelete?.projectName}</strong>? This action cannot be undone.</p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setDeleteModalOpen(false)}>Cancel</button>
              <button className={styles.btnDanger} onClick={executeDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Edit Project Details</h3>
              <p>Update basic information for this project.</p>
            </div>
            <div className={styles.inputGroup}>
              <label>Project Name</label>
              <input 
                className={styles.input}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Website Redesign"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Client Name</label>
              <input 
                className={styles.input}
                value={editClient}
                onChange={(e) => setEditClient(e.target.value)}
                placeholder="e.g. ACME Corp"
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button className={styles.btnPrimary} onClick={executeEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
