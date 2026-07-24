"use client";

import React, { useEffect, useState } from "react";
import styles from "./projects.module.css";
import Link from "next/link";
import { getProjects, deleteProject, updateProjectStatus, updateProject, ProjectData } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    // Optimistic UI update
    setProjects(projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    try {
      await updateProjectStatus(projectId, newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
      // Revert on error
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
      setDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete project.");
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : projects.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIllustration}>
            <div className={styles.box1}></div>
            <div className={styles.box2}></div>
            <div className={styles.box3}></div>
          </div>
          <h3>No Projects Yet</h3>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '24px' }}>
            Get started by creating your first project proposal.
          </p>
          <Link href="/dashboard/new-project">
            <button className={styles.btnPrimary}>Create Project</button>
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {projects.map((project, index) => (
            <div 
              className={styles.card} 
              key={project.id}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={styles.cardHeader}>
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
          ))}
        </div>
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
