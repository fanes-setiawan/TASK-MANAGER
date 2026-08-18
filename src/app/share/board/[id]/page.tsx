"use client";

import React, { useState, useEffect, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const QuillEditor = dynamic(() => import("@/app/dashboard/project-board/QuillEditor"), { ssr: false });
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

const formatCardDescription = (htmlString: string) => {
  if (!htmlString) return '';
  let text = htmlString.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'")
             .replace(/\s+/g, ' ')
             .trim();
  text = text.replace(/@\S+/g, '🔗 API Tag');
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let linkCount = 0;
  text = text.replace(urlRegex, (match) => {
    linkCount++;
    if (linkCount <= 2) {
      return `🔗 Link`;
    }
    return ''; 
  });

  return text;
};

export default function PublicBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  // Modal State for Task Viewing
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<ProjectTask | null>(null);

  const [drawerWidth, setDrawerWidth] = useState(400);
  const isResizing = useRef(false);

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
        
        // Check if taskId is in URL to auto-open
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const taskIdParam = searchParams.get('taskId');
          if (taskIdParam) {
            const taskToOpen = t.find(task => task.id === taskIdParam);
            if (taskToOpen) {
              setViewingTask(taskToOpen);
              setTaskModalOpen(true);
            }
          }
        }
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

  const handleOpenViewModal = (task: ProjectTask) => {
    setViewingTask(task);
    setTaskModalOpen(true);
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
                          {formatCardDescription(task.description)}
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
          <div 
            className={styles.modal} 
            onClick={e => e.stopPropagation()}
            style={{ 
              width: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fullscreen') === 'true' ? '100vw' : drawerWidth, 
              height: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fullscreen') === 'true' ? '100vh' : 'auto',
              maxWidth: '100vw',
              maxHeight: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fullscreen') === 'true' ? '100vh' : '90vh',
              borderRadius: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fullscreen') === 'true' ? 0 : 16,
              margin: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fullscreen') === 'true' ? 0 : 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fullscreen') !== 'true' && (
              <div className={styles.resizer} onMouseDown={startResizing} />
            )}
            <h2>{viewingTask.title}</h2>
            <div className={styles.formGroup}>
              <label>Status</label>
              <div style={{ padding: '8px 12px', background: 'var(--color-surface-container-low)', borderRadius: 8, fontSize: 14 }}>
                {viewingTask.status}
              </div>
            </div>

            <div className={styles.formGroup} style={{ flex: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fullscreen') === 'true' ? 1 : 'none', display: 'flex', flexDirection: 'column' }}>
              <label>Description / Notes</label>
              <div style={{ background: 'white', borderRadius: 8, padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                <QuillEditor 
                  value={viewingTask.description || ""}
                  onChange={() => {}}
                  readOnly={true}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalActionsRight} style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className={styles.btnCancel} 
                  onClick={() => {
                    const url = `${window.location.origin}/share/board/${project?.id}?taskId=${viewingTask.id}`;
                    navigator.clipboard.writeText(url);
                    alert("Share link copied to clipboard!");
                  }} 
                  style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>link</span>
                  Share
                </button>
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
