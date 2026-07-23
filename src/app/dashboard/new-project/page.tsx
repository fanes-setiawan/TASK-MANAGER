"use client";

import React, { useState, useRef, useMemo } from "react";
import styles from "./new-project.module.css";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { saveProject } from "@/lib/firebase/firestore";

const defaultJson = `{
  "project_id": "CE-2024-001",
  "modules": [
    { "name": "Authentication System", "points": 12, "complexity": "medium" },
    { "name": "Payment Gateway Integration", "points": 8, "complexity": "high" },
    { "name": "User Dashboard", "points": 24, "complexity": "low" }
  ]
}`;

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: "",
    clientName: "",
    company: "",
    email: "",
    phone: "",
    currency: "USD ($)",
    ratePerPoint: 1200,
  });

  const [configJson, setConfigJson] = useState(defaultJson);
  const [jsonError, setJsonError] = useState(false);

  // Parse JSON and compute stats
  const parsedData = useMemo(() => {
    try {
      const data = JSON.parse(configJson);
      setJsonError(false);
      
      const modules = Array.isArray(data.modules) ? data.modules : [];
      const totalPoints = modules.reduce((sum: number, mod: any) => sum + (mod.points || 0), 0);
      const totalCost = totalPoints * formData.ratePerPoint;
      
      return {
        modules,
        totalPoints,
        totalCost,
      };
    } catch (e) {
      setJsonError(true);
      return { modules: [], totalPoints: 0, totalCost: 0 };
    }
  }, [configJson, formData.ratePerPoint]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setConfigJson(ev.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (jsonError) {
      alert("Please fix JSON errors before saving.");
      return;
    }
    
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      await saveProject({
        ...formData,
        configJson
      }, user.uid);
      
      router.push("/dashboard/proposal-preview");
    } catch (error) {
      console.error(error);
      alert("Error saving project");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Column: Form & Editor */}
      <div className={styles.leftCol}>
        
        {/* Project Information Form */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontVariationSettings: "'FILL' 1" }}>
              info
            </span>
            <h3 className={styles.cardTitle}>Project Information</h3>
          </div>
          
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Project Name</label>
              <input className={styles.input} type="text" placeholder="e.g. Fintech Mobile App v3" value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})} />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Client Name</label>
              <input className={styles.input} type="text" placeholder="e.g. Acme Corp" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Company</label>
              <input className={styles.input} type="text" placeholder="Entity name" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <input className={styles.input} type="email" placeholder="contact@client.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Phone Number</label>
              <input className={styles.input} type="tel" placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            
            <div className={styles.twoCols}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Currency</label>
                <select className={styles.input} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                  <option>IDR (Rp)</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Rate/Point</label>
                <input className={styles.input} type="number" value={formData.ratePerPoint} onChange={e => setFormData({...formData, ratePerPoint: Number(e.target.value)})} />
              </div>
            </div>
          </div>
        </div>

        {/* JSON Editor */}
        <div className={styles.editorCard}>
          <div className={styles.editorHeader}>
            <div className={styles.editorTitle}>
              <span className="material-symbols-outlined" style={{ color: "#34d399" }}>
                data_object
              </span>
              <span className={styles.editorFileName}>scope_configuration.json</span>
              {jsonError && <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 8 }}>Invalid JSON</span>}
            </div>
            <div className={styles.editorActions}>
              <input 
                type="file" 
                accept=".json" 
                style={{ display: "none" }} 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <button className={styles.btnUpload} onClick={() => fileInputRef.current?.click()}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
                Upload JSON
              </button>
              <button className={styles.btnIcon} onClick={() => {
                navigator.clipboard.writeText(configJson);
                alert("JSON copied to clipboard!");
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_copy</span>
              </button>
            </div>
          </div>
          
          <div className={styles.editorBody}>
            <textarea 
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className={styles.codeArea}
              style={{
                width: "100%",
                height: "250px",
                background: "transparent",
                color: "#e2e8f0",
                fontFamily: "monospace",
                border: "none",
                outline: "none",
                resize: "vertical",
                padding: "16px",
                lineHeight: "1.5"
              }}
              spellCheck="false"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className={styles.actionRow}>
          <button className={styles.btnSecondary} onClick={() => router.push('/dashboard/proposal-preview')}>
            <span className="material-symbols-outlined">visibility</span>
            Preview
          </button>
          <button className={styles.btnPrimary} onClick={handleGenerate} disabled={loading || jsonError}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            {loading ? "Saving..." : "Generate Proposal"}
          </button>
        </div>

      </div>

      {/* Right Column: Live Summary */}
      <div className={styles.rightCol}>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryHeader}>
            Live Summary
            <span className={styles.pulseDot}></span>
          </h3>

          <div className={styles.costBox}>
            <p className={styles.statsLabel}>Estimated Cost</p>
            <div className={styles.costValueRow}>
              <span className={styles.costValue}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency.slice(0, 3) || 'USD' }).format(parsedData.totalCost)}
              </span>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.miniStatBox}>
              <p className={styles.statsLabel}>Story Points</p>
              <p className={styles.miniStatValue}>{parsedData.totalPoints} pts</p>
            </div>
            <div className={styles.miniStatBox}>
              <p className={styles.statsLabel}>Modules</p>
              <p className={styles.miniStatValue}>{parsedData.modules.length}</p>
            </div>
          </div>

          <div className={styles.modulesList} style={{ marginTop: 24 }}>
            <p className={styles.moduleTitle}>Detected Modules ({parsedData.modules.length})</p>
            
            {parsedData.modules.map((mod: any, index: number) => (
              <div className={styles.moduleItem} key={index}>
                <div className={styles.moduleInfo}>
                  <div className={styles.moduleIconWrapper}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {mod.complexity === "high" ? "bolt" : mod.complexity === "medium" ? "layers" : "check_circle"}
                    </span>
                  </div>
                  <span className={styles.moduleName}>{mod.name || "Unnamed Module"}</span>
                </div>
                <span className={styles.modulePts}>{mod.points || 0} pts</span>
              </div>
            ))}
            
            {parsedData.modules.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--color-outline)", fontStyle: "italic", textAlign: "center", marginTop: 16 }}>
                No modules detected in JSON
              </p>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
