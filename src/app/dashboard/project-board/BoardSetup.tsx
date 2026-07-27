"use client";

import React, { useState } from "react";
import styles from "./BoardSetup.module.css";
import { updateProjectColumns } from "@/lib/firebase/firestore";

interface ColumnDef {
  name: string;
  color: string;
}

const DEFAULT_COLORS = [
  "#fca5a5", // red
  "#93c5fd", // blue
  "#fde047", // yellow
  "#f9a8d4", // pink
  "#d8b4fe", // purple
  "#86efac", // green
  "#cbd5e1", // slate
];

const TEMPLATES = [
  {
    id: "basic",
    title: "Basic Board",
    desc: "Simple workflow for any type of project.",
    columns: [
      { name: "To Do", color: "#fca5a5" },
      { name: "In Progress", color: "#fde047" },
      { name: "Done", color: "#86efac" }
    ]
  },
  {
    id: "dev",
    title: "Software Development",
    desc: "Standard workflow for dev teams.",
    columns: [
      { name: "Backlog", color: "#cbd5e1" },
      { name: "In Progress", color: "#93c5fd" },
      { name: "In Review", color: "#f9a8d4" },
      { name: "Done", color: "#86efac" }
    ]
  }
];

export default function BoardSetup({ 
  projectId, 
  onSetupComplete 
}: { 
  projectId: string, 
  onSetupComplete: (columns: ColumnDef[]) => void 
}) {
  const [mode, setMode] = useState<"select" | "custom">("select");
  const [customColumns, setCustomColumns] = useState<ColumnDef[]>([
    { name: "Not started", color: DEFAULT_COLORS[0] },
    { name: "In progress", color: DEFAULT_COLORS[1] },
    { name: "Done", color: DEFAULT_COLORS[2] }
  ]);
  const [saving, setSaving] = useState(false);

  const handleSelectTemplate = async (columns: ColumnDef[]) => {
    setSaving(true);
    try {
      await updateProjectColumns(projectId, columns);
      onSetupComplete(columns);
    } catch (e) {
      console.error(e);
      alert("Failed to save columns");
      setSaving(false);
    }
  };

  const handleSaveCustom = async () => {
    if (customColumns.length === 0 || customColumns.some(c => !c.name.trim())) {
      alert("Please provide a name for all columns.");
      return;
    }
    setSaving(true);
    try {
      await updateProjectColumns(projectId, customColumns);
      onSetupComplete(customColumns);
    } catch (e) {
      console.error(e);
      alert("Failed to save custom columns");
      setSaving(false);
    }
  };

  const addColumn = () => {
    const nextColor = DEFAULT_COLORS[customColumns.length % DEFAULT_COLORS.length];
    setCustomColumns([...customColumns, { name: "", color: nextColor }]);
  };

  const removeColumn = (index: number) => {
    const newCols = [...customColumns];
    newCols.splice(index, 1);
    setCustomColumns(newCols);
  };

  const updateColumnName = (index: number, name: string) => {
    const newCols = [...customColumns];
    newCols[index].name = name;
    setCustomColumns(newCols);
  };

  return (
    <div className={styles.container}>
      <div className={styles.illustration}>
        <div className={`${styles.column} ${styles.col1}`}>
          <div className={styles.card}></div>
          <div className={styles.card}></div>
        </div>
        <div className={`${styles.column} ${styles.col2}`}>
          <div className={styles.card}></div>
          <div className={styles.card}></div>
          <div className={styles.card}></div>
        </div>
        <div className={`${styles.column} ${styles.col3}`}>
          <div className={styles.card}></div>
        </div>
      </div>

      <h2 className={styles.title}>Let's set up your board</h2>
      <p className={styles.subtitle}>
        Every project is unique. Choose a template or create your own custom columns to track work your way.
      </p>

      {mode === "select" ? (
        <div className={styles.optionsGrid}>
          {TEMPLATES.map(t => (
            <button key={t.id} className={styles.optionCard} onClick={() => handleSelectTemplate(t.columns)} disabled={saving}>
              <div className={styles.optionTitle}>{t.title}</div>
              <div className={styles.optionDesc}>{t.desc}</div>
              <div className={styles.preview}>
                {t.columns.map(c => (
                  <span key={c.name} className={styles.previewBadge} style={{ backgroundColor: c.color + '40', color: '#333' }}>
                    {c.name}
                  </span>
                ))}
              </div>
              <div className={styles.btnStart}>Use this Template</div>
            </button>
          ))}
          
          <button className={styles.optionCard} onClick={() => setMode("custom")} disabled={saving}>
            <div className={styles.optionTitle}>Custom Board</div>
            <div className={styles.optionDesc}>Create your own columns from scratch.</div>
            <div className={styles.preview}>
              <span className={styles.previewBadge} style={{ backgroundColor: '#e2e8f0' }}>Column 1</span>
              <span className={styles.previewBadge} style={{ backgroundColor: '#e2e8f0' }}>Column 2</span>
              <span className={styles.previewBadge} style={{ backgroundColor: '#e2e8f0' }}>...</span>
            </div>
            <div className={styles.btnStart}>Customize</div>
          </button>
        </div>
      ) : (
        <div className={styles.customizer}>
          <div className={styles.customHeader}>
            <h3 style={{ margin: 0 }}>Custom Columns</h3>
            <button className={styles.btnSecondary} onClick={() => setMode("select")}>Back</button>
          </div>
          
          {customColumns.map((col, idx) => (
            <div key={idx} className={styles.customColRow}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: col.color }} />
              <input 
                value={col.name} 
                onChange={(e) => updateColumnName(idx, e.target.value)} 
                placeholder="e.g., Backlog"
                autoFocus={idx === customColumns.length - 1}
              />
              <button className={styles.btnIcon} onClick={() => removeColumn(idx)} disabled={customColumns.length <= 1}>
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}

          <button className={styles.btnAdd} onClick={addColumn}>
            <span className="material-symbols-outlined">add</span>
            Add Column
          </button>

          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={handleSaveCustom} disabled={saving}>
              {saving ? "Saving..." : "Create Board"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
