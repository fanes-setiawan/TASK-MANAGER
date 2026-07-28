"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import styles from "./share-board.module.css";
import { 
  ProjectTask, 
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
  
  // Modal State for viewing task details
  const [viewingTask, setViewingTask] = useState<ProjectTask | null>(null);

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

  // Check if it's public
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

  const activeColumns = project.boardColumns && project.boardColumns.length > 0 
    ? project.boardColumns 
    : LEGACY_COLUMNS;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleBox}>
          <h1>{project.projectName}</h1>
          <p>Kanban Board & Progress Notes</p>
        </div>
      </header>
      
      <div className={styles.readOnlyBanner}>
        <span className="material-symbols-outlined">visibility</span>
        You are viewing a shared board in read-only mode.
      </div>

      <div className={styles.boardScroll} style={{ marginTop: 24 }}>
        <div className={styles.board}>
          {activeColumns.map(col => {
            const status = col.name;
            const columnTasks = tasks.filter(t => t.status === status);
            return (
              <div key={status} className={styles.column}>
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
                      onClick={() => setViewingTask(task)}
                    >
                      <h4 className={styles.cardTitle}>{task.title}</h4>
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

      {viewingTask && (
        <div className={styles.modalOverlay} onClick={() => setViewingTask(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{viewingTask.title}</h2>
            <div style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', marginBottom: 16 }}>
              Status: <strong>{viewingTask.status}</strong>
            </div>
            {viewingTask.description ? (
              <div 
                style={{ lineHeight: 1.6, color: 'var(--color-on-surface)', marginTop: 8 }}
                dangerouslySetInnerHTML={{ __html: viewingTask.description }}
              />
            ) : (
              <p style={{ color: 'var(--color-outline)' }}>No description provided.</p>
            )}
            <button className={styles.btnCancel} onClick={() => setViewingTask(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
