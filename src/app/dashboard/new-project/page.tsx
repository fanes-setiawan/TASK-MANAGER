"use client";

import React, { useState } from "react";
import styles from "./new-project.module.css";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { saveProject } from "@/lib/firebase/firestore";

export default function NewProjectPage() {
  const router = useRouter();
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

  const configJson = `{
  "project_id": "CE-2024-001",
  "modules": [
    { "name": "Authentication System", "points": 12, "complexity": "medium" }
  ]
}`;

  const handleGenerate = async () => {
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
            </div>
            <div className={styles.editorActions}>
              <button className={styles.btnUpload} onClick={() => alert("JSON upload feature coming soon!")}>
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
            <div className={styles.lineNumbers}>
              1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7<br/>8<br/>9<br/>10<br/>11<br/>12<br/>13<br/>14<br/>15<br/>16
            </div>
            <div className={styles.codeArea}>
              <pre>
                <code>
<span className={styles.codePunctuation}>{"{"}</span>
{"\n  "}<span className={styles.codeKey}>"project_id"</span>: <span className={styles.codeString}>"CE-2024-001"</span>,
{"\n  "}<span className={styles.codeKey}>"modules"</span>: [
{"\n    "}{"{"}
{"\n      "}<span className={styles.codeKey}>"name"</span>: <span className={styles.codeString}>"Authentication System"</span>,
{"\n      "}<span className={styles.codeKey}>"points"</span>: <span className={styles.codeNumber}>12</span>,
{"\n      "}<span className={styles.codeKey}>"complexity"</span>: <span className={styles.codeString}>"medium"</span>
{"\n    "}{"}"},
{"\n    "}{"{"}
{"\n      "}<span className={styles.codeKey}>"name"</span>: <span className={styles.codeString}>"Payment Gateway Integration"</span>,
{"\n      "}<span className={styles.codeKey}>"points"</span>: <span className={styles.codeNumber}>8</span>,
{"\n      "}<span className={styles.codeKey}>"complexity"</span>: <span className={styles.codeString}>"high"</span>
{"\n    "}{"}"},
{"\n    "}{"{"}
{"\n      "}<span className={styles.codeKey}>"name"</span>: <span className={styles.codeString}>"User Dashboard"</span>,
{"\n      "}<span className={styles.codeKey}>"points"</span>: <span className={styles.codeNumber}>24</span>,
{"\n      "}<span className={styles.codeKey}>"complexity"</span>: <span className={styles.codeString}>"low"</span>
{"\n    "}{"}"}
{"\n  "}]
{"\n"}<span className={styles.codePunctuation}>{"}"}</span>
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className={styles.actionRow}>
          <button className={styles.btnSecondary} onClick={() => router.push('/dashboard/proposal-preview')}>
            <span className="material-symbols-outlined">visibility</span>
            Preview
          </button>
          <button className={styles.btnPrimary} onClick={handleGenerate} disabled={loading}>
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
              <span className={styles.costValue}>$52,800</span>
              <span className={styles.costTrend}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>
                12%
              </span>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.miniStatBox}>
              <p className={styles.statsLabel}>Story Points</p>
              <p className={styles.miniStatValue}>44 pts</p>
            </div>
            <div className={styles.miniStatBox}>
              <p className={styles.statsLabel}>Timeline</p>
              <p className={styles.miniStatValue}>6.5 wks</p>
            </div>
          </div>

          <div className={styles.complexityWrapper}>
            <div className={styles.complexityCircle}>
              <svg className={styles.complexitySvg} viewBox="0 0 128 128">
                <circle className={styles.circleBg} cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" />
                <circle className={styles.circleProgress} cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray="364.4" strokeDashoffset="100" />
              </svg>
              <div className={styles.complexityText}>
                <p className={styles.complexityPercentage}>72%</p>
                <p className={styles.statsLabel} style={{ textTransform: "none", letterSpacing: "normal" }}>Complexity</p>
              </div>
            </div>
          </div>

          <div className={styles.modulesList}>
            <p className={styles.moduleTitle}>Detected Modules (3)</p>
            
            <div className={styles.moduleItem}>
              <div className={styles.moduleInfo}>
                <div className={styles.moduleIconWrapper}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                </div>
                <span className={styles.moduleName}>Authentication</span>
              </div>
              <span className={styles.modulePts}>12 pts</span>
            </div>
            
            <div className={styles.moduleItem}>
              <div className={styles.moduleInfo}>
                <div className={styles.moduleIconWrapper}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
                </div>
                <span className={styles.moduleName}>Payments</span>
              </div>
              <span className={styles.modulePts}>8 pts</span>
            </div>
            
            <div className={styles.moduleItem}>
              <div className={styles.moduleInfo}>
                <div className={styles.moduleIconWrapper}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grid_view</span>
                </div>
                <span className={styles.moduleName}>User Dashboard</span>
              </div>
              <span className={styles.modulePts}>24 pts</span>
            </div>
          </div>

          <div className={styles.exportBanner}>
            <div className={styles.exportBannerContent}>
              <p className={styles.exportTitle}>Export as PDF/PPTX</p>
              <p className={styles.exportDesc}>Ready for executive presentation with high-fidelity charts.</p>
              <button className={styles.btnUpgrade} onClick={() => alert("Pro features coming soon!")}>Upgrade to Pro</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
