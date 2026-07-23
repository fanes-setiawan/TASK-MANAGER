"use client";

import React, { useState } from "react";
import styles from "./proposal-preview.module.css";
import Image from "next/image";

export default function ProposalPreviewPage() {
  const [zoomLevel, setZoomLevel] = useState(125);
  const [activeThumb, setActiveThumb] = useState(0);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <header className={styles.topToolbar}>
        <div className={styles.toolbarLeft}>
          <span className={`material-symbols-outlined ${styles.docIcon}`}>description</span>
          <div className={styles.docTitleBox}>
            <span className={styles.docTitle}>Project_Alpha_Proposal_v2.pdf</span>
            <span className={styles.docSubtitle}>Draft • Last saved 2m ago</span>
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
          <button className={styles.btnToolbar}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>refresh</span>
            Generate Again
          </button>
          <div className={styles.toolbarDivider}></div>
          <button className={styles.btnIconOnly} title="Share">
            <span className="material-symbols-outlined">share</span>
          </button>
          <button className={styles.btnIconOnly} title="Print">
            <span className="material-symbols-outlined">print</span>
          </button>
          <button className={styles.btnDownload}>
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
          <div className={styles.pdfPage} style={{ transform: `scale(${zoomLevel / 100})` }}>
            <div className={styles.pdfAccent}></div>
            <div className={styles.pdfContent}>
              
              <div className={styles.pdfHeader}>
                <div className={styles.pdfLogo}>
                  {/* Using a placeholder for the logo since we don't have the exact image */}
                  <span className="material-symbols-outlined" style={{ color: "white", fontSize: 32 }}>business</span>
                </div>
                <div className={styles.pdfHeaderRight}>
                  <h3>Confidential Proposal</h3>
                  <p>Ref: CE-2024-0892</p>
                </div>
              </div>

              <div className={styles.pdfTitleArea}>
                <h1>Project Cost Estimation</h1>
                <p>Enterprise Modernization Initiative</p>
                <div className={styles.pdfDivider}></div>
              </div>

              <div className={styles.pdfImage}>
                {/* Fallback to a solid color if image is missing, or use a realistic placeholder */}
                <div style={{ width: "100%", height: "100%", backgroundColor: "var(--color-surface-container-high)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <span className="material-symbols-outlined" style={{ fontSize: 64, color: "var(--color-outline-variant)" }}>domain</span>
                </div>
                <div className={styles.pdfImageOverlay}></div>
              </div>

              <div className={styles.pdfFooter}>
                <div className={styles.pdfFooterCol}>
                  <h4>Prepared For</h4>
                  <h5>Global Dynamics Corp</h5>
                  <p>Attn: Sarah Jenkins, COO</p>
                </div>
                <div className={styles.pdfFooterCol} style={{ textAlign: "right" }}>
                  <h4>Estimated Date</h4>
                  <h5>October 24, 2024</h5>
                  <p>Validity: 30 Days</p>
                </div>
              </div>

            </div>
          </div>
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
              </div>
            </div>

            <div className={styles.propGroup}>
              <label className={styles.propLabel}>Theme Color</label>
              <div className={styles.colorsRow}>
                <div className={`${styles.colorSwatch} ${styles.colorActive}`} style={{ backgroundColor: "#009D7B" }}></div>
                <div className={styles.colorSwatch} style={{ backgroundColor: "#1A365D" }}></div>
                <div className={styles.colorSwatch} style={{ backgroundColor: "#D4AF37" }}></div>
                <div className={styles.colorSwatch} style={{ backgroundColor: "#7C3AED" }}></div>
                <button className={styles.btnAddColor}>
                  <span className="material-symbols-outlined" style={{ color: "var(--color-outline)", fontSize: 20 }}>add</span>
                </button>
              </div>
            </div>

            <div className={styles.propGroup} style={{ marginTop: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Project Title</label>
                <input className={styles.inputField} type="text" defaultValue="Enterprise Modernization Initiative" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Client Name</label>
                <input className={styles.inputField} type="text" defaultValue="Global Dynamics Corp" />
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
            <button className={styles.btnSave}>
              Save All Changes
            </button>
          </div>
        </aside>

      </main>
    </div>
  );
}
