"use client";

import React, { useState, useEffect, Suspense } from "react";
import styles from "./proposal-preview.module.css";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { getProjectById, ProjectData } from "@/lib/firebase/firestore";

function ProposalPreviewContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(!!projectId);
  const [zoomLevel, setZoomLevel] = useState(125);
  const [logoUrl, setLogoUrl] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuCAYxl62mvvaeKBMqiPv_xjWNJzn8AdapjWlfPMNMhCGQVzO059qxdGliakroZemwD6hYRC0dttMr5lZdIfj7k9a-qTbXWgM8KdeAi_HPZjuM0-eQIhd2LCgclnTHZqCjTLOQdKvuyx62Vhww9CZIBD1QxAY3QgquvRm-hx0wECm-OkzeQRKOFalfoO51bFxutpK-aZ6gGhvtmSgAF3cbb4GTeT7UHvko4nkpV_EqYaFg56Zajg8GWSHBTExXH8hmcpRiwZLX1YqVI");
  const [themeColor, setThemeColor] = useState("#000000");
  const [activeThumb, setActiveThumb] = useState(0);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));

  useEffect(() => {
    if (projectId) {
      getProjectById(projectId).then((data) => {
        setProjectData(data);
        setLoading(false);
      });
    }
  }, [projectId]);

  // Derived calculations
  let modules: any[] = [];
  let totalPoints = 0;
  let totalCost = 0;
  if (projectData && projectData.configJson) {
    try {
      const parsed = JSON.parse(projectData.configJson);
      modules = Array.isArray(parsed.modules) ? parsed.modules : [];
      totalPoints = modules.reduce((sum, mod) => sum + (mod.points || 0), 0);
      totalCost = totalPoints * (projectData.ratePerPoint || 0);
    } catch (e) {
      console.error("Failed to parse configJson");
    }
  }

  const formatCurrency = (val: number, currency = "IDR (Rp)") => {
    return currency.includes("Rp") || currency.includes("IDR")
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <header className={styles.topToolbar}>
        <div className={styles.toolbarLeft}>
          <span className={`material-symbols-outlined ${styles.docIcon}`}>description</span>
          <div className={styles.docTitleBox}>
            <span className={styles.docTitle}>{projectData ? `${projectData.projectName.replace(/\s+/g, '_')}_Proposal.pdf` : 'Loading...'}</span>
            <span className={styles.docSubtitle}>{projectData ? 'Auto-generated' : 'Draft'}</span>
          </div>
        </div>

        <div className={styles.toolbarCenter}>
          <button className={styles.zoomBtn} onClick={handleZoomOut} title="Zoom Out">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>remove_circle</span>
          </button>
          <span className={styles.zoomText}>{zoomLevel}%</span>
          <button className={styles.zoomBtn} onClick={handleZoomIn} title="Zoom In">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
          </button>
        </div>

        <div className={styles.toolbarRight}>
          <button className={styles.btnToolbar} onClick={() => alert("Regenerating proposal...")}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>refresh</span>
            Generate Again
          </button>
          <div className={styles.toolbarDivider}></div>
          <button className={styles.btnIconOnly} title="Share" onClick={() => alert("Share link copied!")}>
            <span className="material-symbols-outlined">share</span>
          </button>
          <button className={styles.btnSettingUpload} onClick={() => {
            const url = prompt("Enter Logo URL:", logoUrl);
            if (url) setLogoUrl(url);
          }}>
            <span className="material-symbols-outlined">upload</span>
            Upload Logo
          </button>
          <button className={styles.btnDownload} onClick={() => window.print()}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>download</span>
            Download PDF
          </button>
        </div>
      </header>

      <main className={styles.mainWorkspace}>
        {/* Left Sidebar: Thumbnails */}
        <aside className={styles.sidebarLeft}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Thumbnails</span>
            <span className="material-symbols-outlined" style={{ color: "var(--color-outline)", fontSize: 18 }}>grid_view</span>
          </div>
          
          <div className={styles.thumbnailList}>
            {[0, 1, 2, 3].map((index) => (
              <div 
                key={index} 
                className={`${styles.thumbnailItem} ${activeThumb === index ? styles.thumbActive : styles.thumbInactive}`}
                onClick={() => setActiveThumb(index)}
              >
                <div className={styles.a4Container}>
                  {/* Mock thumbnail content based on index */}
                  {index === 0 && (
                    <div style={{ position: "absolute", inset: 0, padding: 8, display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
                      <div style={{ height: 24, width: "100%", backgroundColor: "rgba(0, 105, 81, 0.1)", borderRadius: 4, marginBottom: 4 }}></div>
                      <div style={{ flex: 1, backgroundColor: "var(--color-surface-container-high)", borderRadius: 2 }}></div>
                    </div>
                  )}
                  {index === 1 && (
                    <div style={{ position: "absolute", inset: 0, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ height: 8, width: "50%", backgroundColor: "rgba(188, 202, 194, 0.2)", borderRadius: 2 }}></div>
                      <div style={{ height: 4, width: "100%", backgroundColor: "rgba(188, 202, 194, 0.1)", borderRadius: 2 }}></div>
                      <div style={{ height: 4, width: "100%", backgroundColor: "rgba(188, 202, 194, 0.1)", borderRadius: 2 }}></div>
                      <div style={{ height: 4, width: "75%", backgroundColor: "rgba(188, 202, 194, 0.1)", borderRadius: 2 }}></div>
                    </div>
                  )}
                  {index === 2 && (
                    <div style={{ position: "absolute", inset: 0, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ height: 12, width: "33%", backgroundColor: "rgba(0, 105, 81, 0.05)", borderRadius: 2 }}></div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, flex: 1 }}>
                        <div style={{ backgroundColor: "rgba(188, 202, 194, 0.05)", borderRadius: 2 }}></div>
                        <div style={{ backgroundColor: "rgba(188, 202, 194, 0.05)", borderRadius: 2 }}></div>
                      </div>
                    </div>
                  )}
                  {index === 3 && (
                    <div style={{ position: "absolute", inset: 0, padding: 8 }}>
                      <div style={{ width: "100%", height: "100%", border: "1px dashed rgba(188, 202, 194, 0.3)", borderRadius: 2 }}></div>
                    </div>
                  )}
                </div>
                <p className={styles.thumbLabel}>Page {index + 1}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas: PDF Preview */}
        <div className={styles.centerCanvas}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: 32 }}>refresh</span>
            </div>
          ) : !projectData ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-on-surface-variant)' }}>
              Project not found.
            </div>
          ) : (
            <div className={styles.pdfPage} style={{ transform: `scale(${zoomLevel / 100})` }}>
              <div className={styles.pdfAccent} style={{ backgroundColor: themeColor }}></div>
              <div className={styles.pdfContent}>
                
                <div className={styles.pdfHeader}>
                  <div className={styles.pdfLogo}>
                    <img src={logoUrl} alt="Logo" style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div className={styles.pdfHeaderRight}>
                    <h3>Confidential Proposal</h3>
                    <p>Ref: {projectData.id?.toUpperCase().slice(0, 8) || 'N/A'}</p>
                  </div>
                </div>

                <div className={styles.pdfTitleArea}>
                  <h1 style={{ color: themeColor }}>Project Cost Estimation</h1>
                  <p>{projectData.projectName}</p>
                  <div className={styles.pdfDivider} style={{ backgroundColor: themeColor }}></div>
                </div>

                <div className={styles.pdfImage}>
                  {/* Fallback to a solid color if image is missing, or use a realistic placeholder */}
                  <div style={{ width: "100%", height: "100%", backgroundColor: `${themeColor}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                     <span className="material-symbols-outlined" style={{ fontSize: 64, color: themeColor }}>domain</span>
                  </div>
                  <div className={styles.pdfImageOverlay} style={{ background: `linear-gradient(to right, ${themeColor} 0%, transparent 100%)` }}></div>
                </div>

                <div className={styles.pdfFooter}>
                  <div className={styles.pdfFooterCol}>
                    <h4 style={{ color: themeColor }}>Prepared For</h4>
                    <h5>{projectData.clientName}</h5>
                    <p>{projectData.company}</p>
                  </div>
                  <div className={styles.pdfFooterCol} style={{ textAlign: "right" }}>
                    <h4 style={{ color: themeColor }}>Estimated Date</h4>
                    <h5>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</h5>
                    <p>Validity: 30 Days</p>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Properties */}
        <aside className={styles.sidebarRight}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>DOCUMENT SETTINGS</span>
          </div>
          
          <div className={styles.propertiesList}>
            
            <div className={styles.propGroup}>
              <label className={styles.propLabel}>Cover Logo</label>
              <div className={styles.brandingBox}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--color-outline)" }}>add_photo_alternate</span>
                <span style={{ fontSize: 12, marginTop: 8, color: "var(--color-outline)" }}>Upload Logo</span>
                <img
                  alt="Agency Logo"
                  className={styles.proposalLogo}
                  src={logoUrl}
                />
              </div>
            </div>

            <div className={styles.propGroup}>
              <label className={styles.propLabel}>Theme Color</label>
              <div className={styles.colorsRow}>
                <div className={`${styles.colorSwatch} ${styles.colorActive}`} style={{ backgroundColor: "#009D7B" }}></div>
                <div className={styles.colorSwatch} style={{ backgroundColor: "#1A365D" }}></div>
                <div className={styles.colorSwatch} style={{ backgroundColor: "#D4AF37" }}></div>
                <div className={styles.colorSwatch} style={{ backgroundColor: "#7C3AED" }}></div>
                <label className={styles.colorCircle} style={{ position: 'relative', overflow: 'hidden' }}>
                  <span className="material-symbols-outlined" style={{ color: "var(--color-outline)" }}>add</span>
                  <input 
                    type="color" 
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className={styles.propGroup} style={{ marginTop: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Project Title</label>
                <input className={styles.inputField} type="text" value={projectData?.projectName || ""} readOnly />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Client Name</label>
                <input className={styles.inputField} type="text" value={projectData?.clientName || ""} readOnly />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className={styles.propLabel}>Proposal Template</label>
                <select className={styles.inputField} style={{ appearance: "none" }}>
                  <option>Corporate Premium</option>
                  <option>Modern Minimalist</option>
                  <option>Tech Brutalist</option>
                  <option>Classic Financial</option>
                </select>
              </div>
            </div>

            <div className={styles.propGroup} style={{ marginTop: 16, gap: 16 }}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Show Page Numbers</span>
                <div className={`${styles.toggleSwitch} ${styles.on}`}>
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Include Table of Contents</span>
                <div className={`${styles.toggleSwitch} ${styles.on}`}>
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
              <div className={styles.toggleRow} style={{ opacity: 0.5 }}>
                <span className={styles.toggleLabel}>Watermark Draft</span>
                <div className={`${styles.toggleSwitch} ${styles.off}`}>
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
            </div>

          </div>

          <div className={styles.sidebarFooter}>
            <button className={styles.btnSave} onClick={() => alert("Document settings saved!")}>
              Save All Changes
            </button>
          </div>
        </aside>

      </main>
    </div>
  );
}

export default function ProposalPreviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading proposal...</div>}>
      <ProposalPreviewContent />
    </Suspense>
  );
}
