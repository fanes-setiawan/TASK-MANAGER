"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const QuillEditor = dynamic(() => import("@/components/QuillEditor"), { ssr: false });
import styles from "./share-board.module.css";
import {
  ProjectTask,
  TaskStatus,
  getProjectTasks,
  getProjectById,
  ProjectData
} from "@/lib/firebase/firestore";

const LEGACY_COLUMNS = [
  { name: "Not started", color: "#fca5a5" },
  { name: "In Process Administration", color: "#93c5fd" },
  { name: "In progress Dev", color: "#fde047" },
  { name: "In Review", color: "#f9a8d4" },
  { name: "In Process Maintenance...", color: "#d8b4fe" },
  { name: "Done", color: "#86efac" }
];

export default function PublicBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  // Modal State for Task Viewing
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<string>("Not started");
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ProjectTask | null>(null);

  useEffect(() => {
    if (projectId) {
      loadData(projectId);
    }
  }, [projectId]);

  const loadData = async (pid: string) => {
    setLoading(true);
    try {
      const proj = await getProjectById(pid);
      if (proj) {
        setProject(proj);
        const t = await getProjectTasks(pid);
        setTasks(t);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeColumns = project?.boardColumns && project.boardColumns.length > 0
    ? project.boardColumns
    : LEGACY_COLUMNS;

  const handleOpenAddModal = (status?: string) => {
    setEditingTask(null);
    setNewTaskStatus(status || activeColumns[0]?.name || "Not started");
    setFormData({ title: "", description: "" });
    setTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: ProjectTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setNewTaskStatus(task.status);
    setFormData({ title: task.title, description: task.description || "" });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !projectId) return;
    setSaving(true);
    try {
      if (editingTask && editingTask.id) {
        await updateProjectTaskFull(projectId, editingTask.id, {
          title: formData.title.trim(),
          description: formData.description,
          status: newTaskStatus as TaskStatus
        });
        setTasks(prev => prev.map(t => t.id === editingTask.id ? {
          ...t,
          title: formData.title.trim(),
          description: formData.description,
          status: newTaskStatus as TaskStatus
        } : t));
      } else {
        const newTask: ProjectTask = {
          projectId,
          title: formData.title.trim(),
          description: formData.description,
          status: newTaskStatus as TaskStatus,
          createdAt: new Date().toISOString()
        };
        const savedId = await saveProjectTask(newTask, "public_guest");
        setTasks(prev => [...prev, { ...newTask, id: savedId || undefined }]);
      }
      setTaskModalOpen(false);
    } catch (err) {
      console.error("Failed to save task:", err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteTask = (task: ProjectTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || !taskToDelete.id) return;
    try {
      await deleteProjectTask(projectId, taskToDelete.id);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      setDeleteModalOpen(false);
      setTaskToDelete(null);
      if (editingTask && editingTask.id === taskToDelete.id) {
        setTaskModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);
    if (!draggedTaskId) return;

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status: targetStatus as TaskStatus } : t));

    try {
      await updateProjectTaskStatus(projectId, draggedTaskId, targetStatus as TaskStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
      if (projectId) loadData(projectId);
    } finally {
      setDraggedTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p>Loading project board...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.errorState}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-error)', marginBottom: 16 }}>error</span>
        <h2>Board Not Found</h2>
        <p>The project board you are looking for does not exist or has been deleted.</p>
        <button onClick={() => router.push('/')}>Go Home</button>
      </div>
    );
  }

  if (!project.shareSettings?.isPublic) {
    return (
      <div className={styles.errorState}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-error)', marginBottom: 16 }}>lock</span>
        <h2>Private Board</h2>
        <p>This project board is not shared publicly.</p>
        <button onClick={() => router.push('/login')}>Log In</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <h1>{project.projectName}</h1>
          <p>Kanban Board & Progress Notes</p>
        </div>
      </header>

      <div className={styles.boardScroll} style={{ marginTop: 16 }}>
        <div className={styles.board}>
          {activeColumns.map(col => {
            const status = col.name;
            const columnTasks = tasks.filter(t => t.status === status);
            return (
              <div
                key={status}
                className={styles.column}
              >
                <div className={styles.columnHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: col.color || "#cbd5e1" }}></div>
                    {status}
                  </div>
                  <span className={styles.taskCount}>{columnTasks.length}</span>
                </div>

                <div className={styles.columnBody}>
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      className={styles.card}
                      onClick={() => handleOpenViewModal(task)}
                    >
                      <div className={styles.cardHeader}>
                        <h4 className={styles.cardTitle}>{task.title}</h4>
                      </div>

                      {task.apiDocs && (
                        <div className={styles.apiBadge}>
                          <span className={`${styles.apiMethod} ${styles[task.apiDocs.method.toLowerCase()]}`}>
                            {task.apiDocs.method}
                          </span>
                          <span className={styles.apiUrl}>{task.apiDocs.url || "/"}</span>
                        </div>
                      )}

                      {task.description && (
                        <p className={styles.cardDesc}>
                          {task.description.replace(/<[^>]+>/g, '')}
                        </p>
                      )}
                      <div className={styles.cardFooter}>
                        <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task View Modal */}
      {taskModalOpen && viewingTask && (
        <div className={styles.modalOverlay} onClick={() => setTaskModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{viewingTask.title}</h2>
            <div className={styles.formGroup}>
              <label>Status</label>
              <div style={{ padding: '8px 12px', background: 'var(--color-surface-container-low)', borderRadius: 8, fontSize: 14 }}>
                {viewingTask.status}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Description / Notes</label>
              <div style={{ background: 'white', borderRadius: 8 }}>
                <ReactQuill
                  theme="snow"
                  value={formData.description}
                  onChange={(content) => setFormData(prev => ({ ...prev, description: content }))}
                  modules={quillModules}
                  placeholder="Add detailed task notes or description..."
                  style={{ height: 180, marginBottom: 40 }}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalActionsRight} style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setTaskModalOpen(false)}
                  style={{ marginTop: 0 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
