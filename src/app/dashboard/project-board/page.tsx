"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import BoardSetup from "./BoardSetup";

const QuillEditor = dynamic(() => import("./QuillEditor"), { ssr: false });
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
  updateProjectTaskFull,
  updateProjectShareSettings,
  updateProjectColumns
} from "@/lib/firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Legacy fallback columns for old projects that don't have boardColumns
const LEGACY_COLUMNS = [
  { name: "Not started", color: "#fca5a5" },
  { name: "In Process Administration", color: "#93c5fd" },
  { name: "In progress Dev", color: "#fde047" },
  { name: "In Review", color: "#f9a8d4" },
  { name: "In Process Maintenance...", color: "#d8b4fe" },
  { name: "Done", color: "#86efac" }
];

const PRESET_COLORS = [
  "#fca5a5", "#93c5fd", "#fde047", "#f9a8d4", "#d8b4fe", "#86efac", "#cbd5e1", "#2563eb", "#059669"
];



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
  const [showShareModal, setShowShareModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPublicShare, setIsPublicShare] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("User");
  const [currentUserAvatar, setCurrentUserAvatar] = useState("");
  const [drawerWidth, setDrawerWidth] = useState(400);
  const isResizing = useRef(false);

  // Column Header Management State
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [columnNameInput, setColumnNameInput] = useState("");
  const [columnColorInput, setColumnColorInput] = useState("#2563eb");
  const [savingColumn, setSavingColumn] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 300 && newWidth < window.innerWidth - 50) {
      setDrawerWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  }, [handleMouseMove]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [handleMouseMove, handleMouseUp]);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("Not started");
  const [formData, setFormData] = useState({ title: "", description: "" });
  
  const [previewApiReq, setPreviewApiReq] = useState<any>(null);

  const [apiTesterCollections, setApiTesterCollections] = useState<any[]>([]);

  const loadApiCollections = () => {
    try {
      const saved = localStorage.getItem("api_tester_collections");
      if (saved) {
        setApiTesterCollections(JSON.parse(saved));
      }
    } catch (e) {}
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && projectId) {
        setUserId(user.uid);
        setCurrentUserName(user.displayName || "User");
        setCurrentUserAvatar(user.photoURL || "");
        
        // Optionally fetch from users collection if display name is missing
        if (!user.displayName) {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.displayName) setCurrentUserName(data.displayName);
            if (data.avatarUrl) setCurrentUserAvatar(data.avatarUrl);
          }
        }
        
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
        setIsPublicShare(proj.shareSettings?.isPublic || false);
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
    loadApiCollections();
    setShowModal(true);
  };

  const openEditTaskModal = (task: ProjectTask) => {
    setEditingTask(task);
    setNewTaskStatus(task.status);
    setFormData({ title: task.title, description: task.description });
    loadApiCollections();
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
        const updatePayload: any = {
          title: formData.title,
          description: formData.description
        };
        await updateProjectTaskFull(projectId, editingTask.id, updatePayload);
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

  const handleSetupComplete = (newColumns: {name: string, color: string}[]) => {
    if (project) {
      setProject({ ...project, boardColumns: newColumns });
    }
  };

  const handleToggleShare = async () => {
    if (!projectId) return;
    const newVal = !isPublicShare;
    setIsPublicShare(newVal);
    
    // optimistically update local project
    if (project) {
      setProject({
        ...project,
        shareSettings: {
          isPublic: newVal,
          permission: "view"
        }
      });
    }
    
    try {
      await updateProjectShareSettings(projectId, newVal, "view");
    } catch (err) {
      console.error("Failed to update share settings", err);
      // Revert on error
      setIsPublicShare(!newVal);
      if (project) {
        setProject({
          ...project,
          shareSettings: {
            isPublic: !newVal,
            permission: "view"
          }
        });
      }
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/share/board/${projectId}`;
      navigator.clipboard.writeText(link);
      alert("Share link copied to clipboard!");
    }
  };

  // Column Header Handlers
  const openAddColumnModal = () => {
    setEditingColumnIndex(null);
    setColumnNameInput("");
    setColumnColorInput("#2563eb");
    setShowColumnModal(true);
  };

  const openEditColumnModal = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const col = activeColumns[index];
    if (!col) return;
    setEditingColumnIndex(index);
    setColumnNameInput(col.name);
    setColumnColorInput(col.color || "#2563eb");
    setShowColumnModal(true);
  };

  const handleSaveColumnHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnNameInput.trim() || !projectId) return;

    setSavingColumn(true);
    try {
      let updatedColumns = [...activeColumns];
      if (editingColumnIndex !== null) {
        updatedColumns[editingColumnIndex] = {
          name: columnNameInput.trim(),
          color: columnColorInput
        };
      } else {
        updatedColumns.push({
          name: columnNameInput.trim(),
          color: columnColorInput
        });
      }

      await updateProjectColumns(projectId, updatedColumns);
      if (project) {
        setProject({ ...project, boardColumns: updatedColumns });
      }
      setShowColumnModal(false);
    } catch (err) {
      console.error("Failed to save column header:", err);
      alert("Failed to save column header.");
    } finally {
      setSavingColumn(false);
    }
  };

  const handleDeleteColumnHeader = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!projectId || activeColumns.length <= 1) {
      alert("A board must have at least one column.");
      return;
    }

    const colToDelete = activeColumns[index];
    const tasksInCol = tasks.filter(t => t.status === colToDelete.name);
    if (tasksInCol.length > 0) {
      if (!confirm(`Header "${colToDelete.name}" has ${tasksInCol.length} task(s). Deleting it will remove the column header. Proceed?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete header "${colToDelete.name}"?`)) return;
    }

    try {
      const updatedColumns = activeColumns.filter((_, idx) => idx !== index);
      await updateProjectColumns(projectId, updatedColumns);
      if (project) {
        setProject({ ...project, boardColumns: updatedColumns });
      }
    } catch (err) {
      console.error("Failed to delete column:", err);
      alert("Failed to delete column header.");
    }
  };

  const isOwner = project?.createdBy === userId;

  if (loading) {
    return (
      <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p>Loading project board...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.btnBack} onClick={() => router.push("/dashboard/projects")}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back
          </button>
        </div>
        <p>Project not found.</p>
      </div>
    );
  }

  // Determine active columns
  const activeColumns = project.boardColumns && project.boardColumns.length > 0 
    ? project.boardColumns 
    : LEGACY_COLUMNS;

  const needsSetup = (!project.boardColumns || project.boardColumns.length === 0) && tasks.length === 0;

  if (needsSetup) {
    return (
      <div className={styles.container} style={{ padding: 0, overflow: 'auto', display: 'block' }}>
        <div style={{ padding: '24px 32px' }}>
          <button className={styles.btnBack} onClick={() => router.push("/dashboard/projects")}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back
          </button>
        </div>
        <BoardSetup projectId={projectId as string} onSetupComplete={handleSetupComplete} />
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
        
        <div className={styles.headerActions}>
          {isOwner && (
            <>
              <button className={styles.btnShare} onClick={openAddColumnModal} style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>add_box</span>
                Add Column Header
              </button>
              <button className={styles.btnShare} onClick={() => setShowShareModal(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
                Share
              </button>
            </>
          )}
          <button className={styles.btnBack} onClick={() => router.push('/dashboard')}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Dashboard
          </button>
        </div>
      </header>

      {!isOwner && (
        <div className={styles.readOnlyBanner}>
          <span className="material-symbols-outlined">visibility</span>
          You are viewing this board in read-only mode.
        </div>
      )}

      <div className={styles.boardScroll}>
        <div className={styles.board}>
          {activeColumns.map((col, colIdx) => {
            const status = col.name;
            const columnTasks = tasks.filter(t => t.status === status);
            return (
              <div 
                key={status} 
                className={`${styles.column} ${dragOverStatus === status ? styles.dragOver : ''}`}
                onDragOver={isOwner ? (e) => handleDragOver(e, status) : undefined}
                onDragLeave={isOwner ? handleDragLeave : undefined}
                onDrop={isOwner ? (e) => handleDrop(e, status) : undefined}
              >
                <div className={styles.columnHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: col.color || "#cbd5e1" }}></div>
                    {status}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={styles.taskCount}>{columnTasks.length}</span>
                    {isOwner && (
                      <div className={styles.columnHeaderActions}>
                        <button 
                          className={styles.btnColumnHeaderAction} 
                          onClick={(e) => openEditColumnModal(colIdx, e)}
                          title="Edit Header Name / Color"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                        </button>
                        <button 
                          className={`${styles.btnColumnHeaderAction} ${styles.delete}`} 
                          onClick={(e) => handleDeleteColumnHeader(colIdx, e)}
                          title="Delete Header"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={styles.columnBody}>
                  {columnTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`${styles.card} ${draggedTaskId === task.id ? styles.dragging : ''}`}
                      draggable={isOwner}
                      onDragStart={isOwner ? (e) => handleDragStart(e, task.id!) : undefined}
                      onClick={() => openEditTaskModal(task)}
                      style={{ cursor: isOwner ? 'grab' : 'pointer' }}
                    >
                      {isOwner && (
                        <button className={styles.btnDelete} onClick={(e) => handleDeleteTask(e, task.id!)} title="Delete Note">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                        </button>
                      )}
                      <h4 className={styles.cardTitle}>{task.title}</h4>
                      {task.description && (
                        <p className={styles.cardDesc}>
                          {task.description.replace(/<[^>]+>/g, '').replace(/@\S+/g, '🔗 API Tag')}
                        </p>
                      )}
                      <div className={styles.cardFooter}>
                        <span>{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ""}</span>
                        {isOwner && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>drag_indicator</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {isOwner && (
                  <button className={styles.btnAddCard} onClick={() => openNewTaskModal(status)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    Add Note
                  </button>
                )}
              </div>
            );
          })}

          {isOwner && (
            <div className={styles.addColumnCard} onClick={openAddColumnModal}>
              <span className="material-symbols-outlined">add_circle</span>
              <span>Add Column Header</span>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => !saving && setShowModal(false)}>
          <div 
            className={styles.modal} 
            onClick={e => e.stopPropagation()}
            style={{ width: drawerWidth, maxWidth: '100%' }}
          >
            <div className={styles.resizer} onMouseDown={startResizing} />
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
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--color-outline)', borderRadius: 8, overflow: 'hidden' }}>
                  <QuillEditor 
                    value={formData.description} 
                    onChange={(content) => setFormData({...formData, description: content})} 
                    readOnly={saving}
                    placeholder="Details, progress, or any notes... Type '@' to mention APIs"
                    apiTesterCollections={apiTesterCollections}
                    onMentionClick={(id, text) => {
                      // Find the API request
                      if (apiTesterCollections) {
                        for (const folder of apiTesterCollections) {
                          if (folder.requests) {
                            const req = folder.requests.find((r: any) => String(r.id) === id);
                            if (req) {
                              setPreviewApiReq(req);
                              return;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className={styles.modalActions} style={{ marginTop: 'auto' }}>
                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)} disabled={saving}>
                  {isOwner ? 'Cancel' : 'Close'}
                </button>
                {isOwner && (
                  <button type="submit" className={styles.btnSubmit} disabled={saving || !formData.title.trim()}>
                    {saving ? 'Saving...' : 'Save Note'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showColumnModal && (
        <div className={styles.modalOverlay} onClick={() => !savingColumn && setShowColumnModal(false)}>
          <div className={styles.modal} style={{ width: 450, maxWidth: '90%', height: 'auto', alignSelf: 'center', borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 8 }}>{editingColumnIndex !== null ? "Edit Column Header" : "Add Column Header"}</h2>
            <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', marginBottom: 20 }}>
              Customize your Kanban board columns and statuses.
            </p>
            <form onSubmit={handleSaveColumnHeader}>
              <div className={styles.formGroup} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Header Name</label>
                <input 
                  autoFocus
                  required
                  placeholder="e.g. Backlog, Testing, Released..."
                  value={columnNameInput}
                  onChange={e => setColumnNameInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-outline-variant)' }}
                />
              </div>

              <div className={styles.formGroup} style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>Header Color Indicator</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {PRESET_COLORS.map(c => (
                    <div 
                      key={c}
                      onClick={() => setColumnColorInput(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: columnColorInput === c ? '2px solid #0f172a' : '2px solid transparent',
                        boxShadow: columnColorInput === c ? '0 0 0 2px white inset' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button 
                  type="button" 
                  className={styles.btnCancel} 
                  onClick={() => setShowColumnModal(false)}
                  disabled={savingColumn}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.btnSubmit} 
                  disabled={savingColumn || !columnNameInput.trim()}
                >
                  {savingColumn ? "Saving..." : (editingColumnIndex !== null ? "Update Header" : "Add Header")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && isOwner && (
        <div className={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div className={styles.shareModal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Share Board</h2>
              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className={styles.shareToggleRow}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-on-surface)' }}>Public Share Link</div>
                <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)', marginTop: 4 }}>
                  Allow anyone with the link to view this board
                </div>
              </div>
              <label className={styles.toggleSwitch}>
                <input 
                  type="checkbox" 
                  checked={isPublicShare} 
                  onChange={handleToggleShare} 
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            {isPublicShare && (
              <div className={styles.shareLinkBox}>
                <input 
                  readOnly 
                  value={typeof window !== "undefined" ? `${window.location.origin}/share/board/${projectId}` : ""} 
                />
                <button className={styles.btnCopy} onClick={copyShareLink}>
                  Copy Link
                </button>
              </div>
            )}
            
            <div style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', backgroundColor: 'var(--color-surface-container-low)', padding: 12, borderRadius: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }}>info</span>
              People with the link will only have <strong>view access</strong>. They cannot edit or delete notes.
            </div>
          </div>
        </div>
      )}

      {previewApiReq && (
        <div className={styles.modalOverlay} onClick={() => setPreviewApiReq(null)} style={{zIndex: 9999}}>
          <div className={styles.modal} onClick={e => e.stopPropagation()} style={{ width: 600, maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{margin:0}}>API Preview: {previewApiReq.name}</h2>
              <button onClick={() => setPreviewApiReq(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ fontWeight: 700, padding: '4px 8px', borderRadius: 6, color: 'white', backgroundColor: previewApiReq.method === 'GET' ? '#0ea5e9' : previewApiReq.method === 'POST' ? '#16a34a' : '#d97706', fontSize: 12 }}>
                {previewApiReq.method}
              </span>
              <span style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: 6, fontSize: 13, flex: 1, fontFamily: 'monospace' }}>
                {previewApiReq.url}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {previewApiReq.headers && previewApiReq.headers.some((h: any) => h.active) && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Headers</label>
                  <div style={{ background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 8, fontSize: 12, fontFamily: 'monospace' }}>
                    {previewApiReq.headers.filter((h: any) => h.active).map((h: any) => (
                      <div key={h.id}>
                        <span style={{ color: '#93c5fd' }}>"{h.key}"</span>: <span style={{ color: '#86efac' }}>"{h.value}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {previewApiReq.body && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Body</label>
                  <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 8, fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', margin: 0 }}>
                    {previewApiReq.body}
                  </pre>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className={styles.btnSubmit}
                onClick={() => {
                  window.open('/dashboard/api-tester', '_blank');
                }}
              >
                Open in API Tester
              </button>
            </div>
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
