"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import styles from "./share-board.module.css";
import { 
  ProjectTask, 
  TaskStatus,
  getProjectTasks, 
  saveProjectTask,
  updateProjectTaskFull,
  updateProjectTaskStatus,
  deleteProjectTask,
  getProjectById, 
  ProjectData
} from "@/lib/firebase/firestore";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const LEGACY_COLUMNS = [
  { name: "Not started", color: "#fca5a5" },
  { name: "In Process Administration", color: "#93c5fd" },
  { name: "In progress Dev", color: "#fde047" },
  { name: "In Review", color: "#f9a8d4" },
  { name: "In Process Maintenance...", color: "#d8b4fe" },
  { name: "Done", color: "#86efac" }
];

const quillModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['table', 'insertRowBelow', 'deleteRow', 'insertColRight', 'deleteCol'],
      ['clean'],
    ],
    handlers: {
      table: function () {
        // @ts-ignore
        this.quill.getModule('table').insertTable(2, 2);
      },
      insertRowBelow: function () {
        // @ts-ignore
        this.quill.getModule('table').insertRowBelow();
      },
      deleteRow: function () {
        // @ts-ignore
        this.quill.getModule('table').deleteRow();
      },
      insertColRight: function () {
        // @ts-ignore
        this.quill.getModule('table').insertColumnRight();
      },
      deleteCol: function () {
        // @ts-ignore
        this.quill.getModule('table').deleteColumn();
      },
    }
  },
  table: true
};

export default function PublicBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  
  // Drag State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  // Modal State for Task CRUD
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<string>("Not started");
  const [formData, setFormData] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ProjectTask | null>(null);

  // API Docs State
  const [showApiDocs, setShowApiDocs] = useState(false);
  const [apiFormData, setApiFormData] = useState<{
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url: string;
    headers: string;
    body: string;
    response: string;
  }>({
    method: "GET",
    url: "",
    headers: "{\n  \n}",
    body: "{\n  \n}",
    response: "{\n  \n}"
  });

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
    setShowApiDocs(false);
    setApiFormData({ method: "GET", url: "", headers: "{\n  \n}", body: "{\n  \n}", response: "{\n  \n}" });
    setTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: ProjectTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setNewTaskStatus(task.status);
    setFormData({ title: task.title, description: task.description || "" });
    if (task.apiDocs) {
      setShowApiDocs(true);
      setApiFormData({
        method: task.apiDocs.method,
        url: task.apiDocs.url,
        headers: task.apiDocs.headers || "{\n  \n}",
        body: task.apiDocs.body || "{\n  \n}",
        response: task.apiDocs.response || "{\n  \n}"
      });
    } else {
      setShowApiDocs(false);
      setApiFormData({ method: "GET", url: "", headers: "{\n  \n}", body: "{\n  \n}", response: "{\n  \n}" });
    }
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !projectId) return;
    setSaving(true);
    try {
      const apiDocsPayload = showApiDocs ? {
        method: apiFormData.method,
        url: apiFormData.url,
        headers: apiFormData.headers,
        body: apiFormData.body,
        response: apiFormData.response
      } : null;

      if (editingTask && editingTask.id) {
        const updatePayload: any = {
          title: formData.title.trim(),
          description: formData.description,
          status: newTaskStatus as TaskStatus
        };
        if (apiDocsPayload) {
          updatePayload.apiDocs = apiDocsPayload;
        } else {
          updatePayload.apiDocs = null;
        }
        await updateProjectTaskFull(projectId, editingTask.id, updatePayload);
        setTasks(prev => prev.map(t => t.id === editingTask.id ? {
          ...t,
          ...updatePayload
        } : t));
      } else {
        const newTask: ProjectTask = {
          projectId,
          title: formData.title.trim(),
          description: formData.description,
          status: newTaskStatus as TaskStatus,
          createdAt: new Date().toISOString()
        };
        if (apiDocsPayload) {
          newTask.apiDocs = apiDocsPayload;
        }
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
        <button className={styles.btnPrimary} onClick={() => handleOpenAddModal()}>
          <span className="material-symbols-outlined">add</span>
          New Task
        </button>
      </header>

      <div className={styles.boardScroll} style={{ marginTop: 16 }}>
        <div className={styles.board}>
          {activeColumns.map(col => {
            const status = col.name;
            const columnTasks = tasks.filter(t => t.status === status);
            const isDragOver = dragOverStatus === status;

            return (
              <div 
                key={status} 
                className={`${styles.column} ${isDragOver ? styles.columnDragOver : ''}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
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
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id!)}
                      onClick={() => handleOpenEditModal(task)}
                    >
                      <div className={styles.cardHeader}>
                        <h4 className={styles.cardTitle}>{task.title}</h4>
                        <div className={styles.cardActions}>
                          <button 
                            className={styles.cardActionBtn} 
                            onClick={(e) => handleOpenEditModal(task, e)}
                            title="Edit Task"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                          </button>
                          <button 
                            className={`${styles.cardActionBtn} ${styles.delete}`} 
                            onClick={(e) => confirmDeleteTask(task, e)}
                            title="Delete Task"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        </div>
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

                  <button 
                    className={styles.addCardBtn}
                    onClick={() => handleOpenAddModal(status)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    Add Task
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Add / Edit Modal */}
      {taskModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setTaskModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{editingTask ? "Edit Task" : "Create New Task"}</h2>
            <form onSubmit={handleSaveTask}>
              <div className={styles.formGroup}>
                <label>Task Title</label>
                <input 
                  type="text" 
                  className={styles.input}
                  placeholder="Enter task title..."
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.formGroup}>
                <label>Status / Column</label>
                <select 
                  className={styles.select}
                  value={newTaskStatus}
                  onChange={e => setNewTaskStatus(e.target.value)}
                >
                  {activeColumns.map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
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

              <div className={styles.apiToggleRow}>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={showApiDocs} 
                    onChange={e => setShowApiDocs(e.target.checked)} 
                    disabled={saving}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-on-surface)' }}>Include API Documentation</span>
              </div>

              {showApiDocs && (
                <div className={styles.apiDocsSection}>
                  <div className={styles.apiEndpointRow}>
                    <select 
                      className={`${styles.apiMethodSelect} ${styles[apiFormData.method.toLowerCase()]}`}
                      value={apiFormData.method}
                      onChange={e => setApiFormData({...apiFormData, method: e.target.value as any})}
                      disabled={saving}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <input 
                      className={styles.apiUrlInput}
                      placeholder="/api/v1/resource"
                      value={apiFormData.url}
                      onChange={e => setApiFormData({...apiFormData, url: e.target.value})}
                      disabled={saving}
                    />
                  </div>

                  <div className={styles.apiJsonSection}>
                    <div className={styles.apiJsonCol}>
                      <label>Headers (JSON)</label>
                      <textarea 
                        className={styles.apiJsonTextarea} 
                        value={apiFormData.headers}
                        onChange={e => setApiFormData({...apiFormData, headers: e.target.value})}
                        disabled={saving}
                        spellCheck={false}
                      />
                    </div>
                    <div className={styles.apiJsonCol}>
                      <label>Request Body (JSON)</label>
                      <textarea 
                        className={styles.apiJsonTextarea} 
                        value={apiFormData.body}
                        onChange={e => setApiFormData({...apiFormData, body: e.target.value})}
                        disabled={saving}
                        spellCheck={false}
                      />
                    </div>
                    <div className={styles.apiJsonCol} style={{ gridColumn: "1 / -1" }}>
                      <label>Response (JSON)</label>
                      <textarea 
                        className={styles.apiJsonTextarea} 
                        value={apiFormData.response}
                        onChange={e => setApiFormData({...apiFormData, response: e.target.value})}
                        disabled={saving}
                        spellCheck={false}
                        style={{ minHeight: 120 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.modalFooter}>
                {editingTask ? (
                  <button 
                    type="button" 
                    className={styles.btnDanger}
                    onClick={() => confirmDeleteTask(editingTask)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    Delete
                  </button>
                ) : <div />}

                <div className={styles.modalActionsRight}>
                  <button 
                    type="button" 
                    className={styles.btnCancel} 
                    onClick={() => setTaskModalOpen(false)}
                    style={{ marginTop: 0 }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.btnSave} disabled={saving}>
                    {saving ? "Saving..." : (editingTask ? "Update Task" : "Create Task")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setDeleteModalOpen(false)}>
          <div className={styles.modal} style={{ maxWidth: 450, height: 'auto', alignSelf: 'center', borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 12 }}>Delete Task</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 24, fontSize: 14 }}>
              Are you sure you want to delete <strong>{taskToDelete?.title}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                className={styles.btnCancel} 
                onClick={() => setDeleteModalOpen(false)}
                style={{ marginTop: 0 }}
              >
                Cancel
              </button>
              <button 
                className={styles.btnDanger}
                onClick={handleDeleteTask}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
