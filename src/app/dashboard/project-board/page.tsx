"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import styles from "./project-board.module.css";
import { 
  ProjectTask, 
  TaskStatus, 
  getProjectTasks, 
  saveProjectTask, 
  updateProjectTaskStatus, 
  deleteProjectTask, 
  getProjectById, 
  ProjectData,
  updateProjectTaskFull
} from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";

const STATUSES: TaskStatus[] = [
  "Not started", 
  "In Process Administration", 
  "In progress Dev", 
  "In Review", 
  "In Process Maintenance...", 
  "Done"
];

const COLORS: Record<string, string> = {
  "Not started": "#fca5a5", // red-300
  "In Process Administration": "#93c5fd", // blue-300
  "In progress Dev": "#fde047", // yellow-300
  "In Review": "#f9a8d4", // pink-300
  "In Process Maintenance...": "#d8b4fe", // purple-300
  "Done": "#86efac" // green-300
};

function BoardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Drag State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("Not started");
  const [formData, setFormData] = useState({ title: "", description: "" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && projectId) {
        setUserId(user.uid);
        await loadData(projectId);
      } else if (!user) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
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

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    // For firefox
    e.dataTransfer.setData("text/plain", taskId); 
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move";
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    
    if (draggedTaskId) {
      const task = tasks.find(t => t.id === draggedTaskId);
      if (task && task.status !== targetStatus) {
        // Optimistic UI update
        setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, status: targetStatus } : t));
        
        try {
          if (projectId) {
            await updateProjectTaskStatus(projectId, draggedTaskId, targetStatus);
          }
        } catch (err) {
          console.error("Failed to update status", err);
          // Revert on failure
          if (projectId) await loadData(projectId);
        }
      }
    }
    setDraggedTaskId(null);
  };

  // CRUD Handlers
  const openNewTaskModal = (status: TaskStatus) => {
    setNewTaskStatus(status);
    setEditingTask(null);
    setFormData({ title: "", description: "" });
    setShowModal(true);
  };

  const openEditTaskModal = (task: ProjectTask) => {
    setEditingTask(task);
    setNewTaskStatus(task.status);
    setFormData({ title: task.title, description: task.description });
    setShowModal(true);
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // prevent opening edit modal
    if (confirm("Are you sure you want to delete this task?") && projectId) {
      try {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        await deleteProjectTask(projectId, taskId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !formData.title.trim()) return;

    setSaving(true);
    try {
      if (editingTask && editingTask.id) {
        await updateProjectTaskFull(projectId, editingTask.id, {
          title: formData.title,
          description: formData.description
        });
      } else {
        const newTask: ProjectTask = {
          projectId,
          title: formData.title,
          description: formData.description,
          status: newTaskStatus
        };
        await saveProjectTask(newTask, userId || "");
      }
      await loadData(projectId);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: 40, color: 'var(--color-primary)' }}>refresh</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h2>Project not found</h2>
        <button className={styles.btnBack} onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
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
        <button className={styles.btnBack} onClick={() => router.push('/dashboard')}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Dashboard
        </button>
      </header>

      <div className={styles.boardScroll}>
        <div className={styles.board}>
          {STATUSES.map(status => {
            const columnTasks = tasks.filter(t => t.status === status);
            return (
              <div 
                key={status} 
                className={`${styles.column} ${dragOverStatus === status ? styles.dragOver : ''}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className={styles.columnHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[status] }}></div>
                    {status}
                  </div>
                  <span className={styles.taskCount}>{columnTasks.length}</span>
                </div>
                
                <div className={styles.columnBody}>
                  {columnTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`${styles.card} ${draggedTaskId === task.id ? styles.dragging : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id!)}
                      onClick={() => openEditTaskModal(task)}
                    >
                      <button className={styles.btnDelete} onClick={(e) => handleDeleteTask(e, task.id!)} title="Delete Note">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                      </button>
                      <h4 className={styles.cardTitle}>{task.title}</h4>
                      {task.description && (
                        <p className={styles.cardDesc}>
                          {task.description.replace(/<[^>]+>/g, '')}
                        </p>
                      )}
                      <div className={styles.cardFooter}>
                        <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ""}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>drag_indicator</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button className={styles.btnAddCard} onClick={() => openNewTaskModal(status)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                  Add Note
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => !saving && setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editingTask ? 'Edit Note' : 'Add New Note'}</h2>
            <form onSubmit={handleSaveTask} className={styles.formContainer}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input 
                  autoFocus
                  required
                  placeholder="Task or note title"
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  disabled={saving}
                />
              </div>
              <div className={styles.formGroupEditor}>
                <label>Description / Notes</label>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <ReactQuill 
                    theme="snow" 
                    value={formData.description} 
                    onChange={(content) => setFormData({...formData, description: content})} 
                    readOnly={saving}
                    placeholder="Details, progress, or any notes..."
                    style={{ flex: 1, backgroundColor: 'var(--color-surface)' }}
                  />
                </div>
              </div>
              <div className={styles.modalActions} style={{ marginTop: 'auto' }}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnSubmit} disabled={saving || !formData.title.trim()}>
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectBoardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading board...</div>}>
      <BoardContent />
    </Suspense>
  );
}
