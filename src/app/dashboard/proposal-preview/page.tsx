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
  const [zoomLevel, setZoomLevel] = useState(100);
  const [logoUrl, setLogoUrl] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuCAYxl62mvvaeKBMqiPv_xjWNJzn8AdapjWlfPMNMhCGQVzO059qxdGliakroZemwD6hYRC0dttMr5lZdIfj7k9a-qTbXWgM8KdeAi_HPZjuM0-eQIhd2LCgclnTHZqCjTLOQdKvuyx62Vhww9CZIBD1QxAY3QgquvRm-hx0wECm-OkzeQRKOFalfoO51bFxutpK-aZ6gGhvtmSgAF3cbb4GTeT7UHvko4nkpV_EqYaFg56Zajg8GWSHBTExXH8hmcpRiwZLX1YqVI");
  const [themeColor, setThemeColor] = useState("#000000");
  const [activeThumb, setActiveThumb] = useState(0);
  const [isDraft, setIsDraft] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [showToc, setShowToc] = useState(false);
  
  const [customProjectName, setCustomProjectName] = useState("");
  const [customClientName, setCustomClientName] = useState("");

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));

  useEffect(() => {
    if (projectId) {
      getProjectById(projectId).then((data) => {
        setProjectData(data);
        setCustomProjectName(data?.projectName || "");
        setCustomClientName(data?.clientName || data?.company || "");
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
      let calculatedPoints = 0;
      modules.forEach((mod: any) => {
        if (mod.subtasks && Array.isArray(mod.subtasks)) {
          mod.subtasks.forEach((sub: any) => {
            calculatedPoints += (sub.points || 0);
          });
        } else {
          calculatedPoints += (mod.points || 0);
        }
      });
      totalPoints = calculatedPoints;
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

  // Chunking logic for Pagination
  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT = 350;
  const FOOTER_HEIGHT = 200;
  const PAGE_HEIGHT_LIMIT = 1000;

  const pages: any[] = [];
  let currentPage: any = { items: [], hasHeader: true, heightUsed: HEADER_HEIGHT, isLast: false };
  pages.push(currentPage);

  let globalModIdx = 0;
  
  modules.forEach((mod: any) => {
    const subCount = mod.subtasks && Array.isArray(mod.subtasks) ? mod.subtasks.length : 0;
    const modHeight = ROW_HEIGHT + (subCount * ROW_HEIGHT);

    // If it doesn't fit on the current page, start a new one
    if (currentPage.heightUsed + modHeight > PAGE_HEIGHT_LIMIT) {
      // If a single module is incredibly huge, it will just stretch the page, but let's keep it simple
      currentPage = { items: [], hasHeader: false, heightUsed: 0, isLast: false };
      pages.push(currentPage);
    }
    
    // Calculate cost
    let modCost = 0;
    if (mod.subtasks && Array.isArray(mod.subtasks)) {
      modCost = mod.subtasks.reduce((acc: number, sub: any) => acc + ((sub.points || 0) * (projectData?.ratePerPoint || 0)), 0);
    } else {
      modCost = (mod.points || 0) * (projectData?.ratePerPoint || 0);
    }

    currentPage.items.push({ ...mod, globalModIdx, modCost });
    currentPage.heightUsed += modHeight;
    globalModIdx++;
  });

  // Check if footer fits on the last page
  if (pages[pages.length - 1].heightUsed + FOOTER_HEIGHT > PAGE_HEIGHT_LIMIT) {
    pages.push({ items: [], hasHeader: false, heightUsed: FOOTER_HEIGHT, isLast: true });
  } else {
    pages[pages.length - 1].isLast = true;
  }

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
            {pages.map((_, index) => (
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
                  {index > 0 && (
                    <div style={{ position: "absolute", inset: 0, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ height: 8, width: "100%", backgroundColor: "rgba(188, 202, 194, 0.2)", borderRadius: 2 }}></div>
                      <div style={{ height: 4, width: "100%", backgroundColor: "rgba(188, 202, 194, 0.1)", borderRadius: 2 }}></div>
                      <div style={{ height: 4, width: "100%", backgroundColor: "rgba(188, 202, 194, 0.1)", borderRadius: 2 }}></div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64, alignItems: 'center' }}>
              {pages.map((page, pageIdx) => (
                <div 
                  key={pageIdx} 
                  className={styles.pdfPage} 
                  style={{ 
                    zoom: zoomLevel / 100,
                  }}
                >
                  {isDraft && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                      <div style={{ transform: 'rotate(-45deg)', fontSize: 120, fontWeight: 900, color: 'rgba(0,0,0,0.05)', letterSpacing: 20 }}>DRAFT</div>
                    </div>
                  )}
                  
                  <div className={styles.pdfAccent} style={{ backgroundColor: themeColor }}></div>
                  <div className={styles.pdfContent}>
                    
                    {page.hasHeader && (
                      <>
                        {/* Header Row */}
                        <div className={styles.pdfHeaderRow}>
                          <div className={styles.pdfLogoBox}>
                            <img src={logoUrl} alt="Logo" style={{ maxHeight: 40, maxWidth: 180, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                          </div>
                          <div className={styles.pdfMetaBox}>
                            <div className={styles.pdfMetaItem}>
                              <span className="material-symbols-outlined">calendar_today</span>
                              <div>
                                <div className={styles.pdfMetaLabel}>Proposal Date</div>
                                <div className={styles.pdfMetaValue}>{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={styles.pdfTitleArea}>
                          <h1>Project Proposal</h1>
                          <p>Task List & Cost Estimation</p>
                        </div>
                        
                        <div className={styles.pdfDivider} style={{ backgroundColor: themeColor }}></div>

                        {/* Info Grid */}
                        <div className={styles.pdfInfoGrid}>
                          <div className={styles.pdfInfoCol}>
                            <h4 style={{ color: themeColor }}><span className="material-symbols-outlined">person</span> Client Information</h4>
                            <h5>{customClientName}</h5>
                            {projectData?.company && <div className={styles.pdfInfoRow}><span className="material-symbols-outlined">badge</span> {customClientName}</div>}
                            {projectData?.email && <div className={styles.pdfInfoRow}><span className="material-symbols-outlined">mail</span> {projectData.email}</div>}
                            {projectData?.phone && <div className={styles.pdfInfoRow}><span className="material-symbols-outlined">call</span> {projectData.phone}</div>}
                            <div className={styles.pdfInfoRow}><span className="material-symbols-outlined">location_on</span> Jakarta, Indonesia</div>
                          </div>
                          <div className={styles.pdfInfoCol}>
                            <h4 style={{ color: themeColor }}><span className="material-symbols-outlined">work</span> Project Information</h4>
                            <h5>{customProjectName}</h5>
                            <p style={{ marginTop: 8, color: 'var(--color-on-surface-variant)', fontSize: 13, lineHeight: 1.5 }}>
                              Pembuatan {customProjectName.toLowerCase()} responsif dengan fitur manajemen konten dan optimasi.
                            </p>
                            <div className={styles.pdfDuration} style={{ marginTop: 16, fontSize: 13 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: themeColor }}>schedule</span>
                              Estimated Duration: <strong>4 - 6 Weeks</strong>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Table Area */}
                    {page.items.length > 0 && (
                      <div className={styles.pdfTableArea} style={{ marginTop: page.hasHeader ? 0 : 24 }}>
                        <table className={styles.pdfTable}>
                          <thead style={{ backgroundColor: themeColor }}>
                            <tr>
                              <th style={{ width: '8%' }}>No.</th>
                              <th style={{ width: '25%' }}>Task</th>
                              <th style={{ width: '45%' }}>Deskripsi</th>
                              <th style={{ width: '22%', textAlign: 'right' }}>Harga</th>
                            </tr>
                          </thead>
                          <tbody>
                            {page.items.map((mod: any, i: number) => (
                              <React.Fragment key={mod.globalModIdx}>
                                {/* Module Group Row */}
                                <tr className={styles.modRow}>
                                  <td>
                                    <div className={styles.modIndex}>{mod.globalModIdx + 1}</div>
                                  </td>
                                  <td colSpan={2} className={styles.modTitle}>{mod.name}</td>
                                  <td className={styles.modTotal} style={{ color: themeColor }}>
                                    {formatCurrency(mod.modCost, projectData?.currency)}
                                  </td>
                                </tr>
                                
                                {/* Subtasks Rows */}
                                {mod.subtasks && Array.isArray(mod.subtasks) && mod.subtasks.map((sub: any, subIdx: number) => {
                                  const subCost = (sub.points || 0) * (projectData?.ratePerPoint || 0);
                                  const isLast = subIdx === mod.subtasks.length - 1;
                                  return (
                                    <tr key={subIdx} className={styles.subRow}>
                                      <td></td>
                                      <td>
                                        <div className={styles.subTaskWrapper}>
                                          <div className={`${styles.treeLine} ${isLast ? styles.treeLineLast : ''}`}></div>
                                          <div className={styles.subIndex}>{mod.globalModIdx + 1}.{subIdx + 1}</div>
                                          <span className={styles.subName}>{sub.name}</span>
                                        </div>
                                      </td>
                                      <td className={styles.subDesc}>{sub.desc || sub.description || '-'}</td>
                                      <td className={styles.subPrice}>{formatCurrency(subCost, projectData?.currency)}</td>
                                    </tr>
                                  )
                                })}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {page.isLast && (
                      <div style={{ marginTop: 'auto' }}>
                        {/* Summary Section */}
                        <div className={styles.pdfSummaryArea}>
                          <div className={styles.pdfSummaryIcon}>
                            <span className="material-symbols-outlined" style={{ color: themeColor, fontSize: 32 }}>calculate</span>
                            <span style={{ color: themeColor, fontWeight: 600 }}>Ringkasan Biaya</span>
                          </div>
                          <div className={styles.pdfSummaryTotals}>
                            <div className={styles.pdfSummaryRow}>
                              <span>Subtotal</span>
                              <span>{formatCurrency(totalCost, projectData?.currency)}</span>
                            </div>
                            <div className={styles.pdfSummaryRowTotal}>
                              <span style={{ color: themeColor }}>Total Proposal</span>
                              <span className={styles.pdfGrandTotal} style={{ color: themeColor }}>{formatCurrency(totalCost, projectData?.currency)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Banner */}
                        <div className={styles.pdfBanner} style={{ backgroundColor: themeColor }}>
                          <div className={styles.pdfBannerCenter}>
                            <div><span className="material-symbols-outlined">language</span> taskmanager.app</div>
                            <div><span className="material-symbols-outlined">mail</span> support@taskmanager.app</div>
                            <div><span className="material-symbols-outlined">call</span> 021-1234-5678</div>
                          </div>
                          <div className={styles.pdfBannerRight}>
                            <span className="material-symbols-outlined" style={{ fontSize: 64, opacity: 0.8 }}>assignment_turned_in</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {showPageNumbers && (
                      <div style={{ position: 'absolute', bottom: 16, right: 24, fontSize: 11, color: '#999' }}>
                        {pageIdx + 1} / {pages.length}
                      </div>
                    )}

                  </div>
                </div>
              ))}
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
              <div className={styles.brandingBox} onClick={() => {
                const url = prompt("Enter Logo URL:", logoUrl);
                if (url) setLogoUrl(url);
              }} style={{ cursor: 'pointer' }}>
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
                <div className={`${styles.colorSwatch} ${themeColor === "#009D7B" ? styles.colorActive : ""}`} style={{ backgroundColor: "#009D7B" }} onClick={() => setThemeColor("#009D7B")}></div>
                <div className={`${styles.colorSwatch} ${themeColor === "#1A365D" ? styles.colorActive : ""}`} style={{ backgroundColor: "#1A365D" }} onClick={() => setThemeColor("#1A365D")}></div>
                <div className={`${styles.colorSwatch} ${themeColor === "#D4AF37" ? styles.colorActive : ""}`} style={{ backgroundColor: "#D4AF37" }} onClick={() => setThemeColor("#D4AF37")}></div>
                <div className={`${styles.colorSwatch} ${themeColor === "#7C3AED" ? styles.colorActive : ""}`} style={{ backgroundColor: "#7C3AED" }} onClick={() => setThemeColor("#7C3AED")}></div>
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
                <input className={styles.inputField} type="text" value={customProjectName} onChange={(e) => setCustomProjectName(e.target.value)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Client Name</label>
                <input className={styles.inputField} type="text" value={customClientName} onChange={(e) => setCustomClientName(e.target.value)} />
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
                <div className={`${styles.toggleSwitch} ${showPageNumbers ? styles.on : styles.off}`} onClick={() => setShowPageNumbers(!showPageNumbers)}>
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Include Table of Contents</span>
                <div className={`${styles.toggleSwitch} ${showToc ? styles.on : styles.off}`} onClick={() => setShowToc(!showToc)}>
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Watermark Draft</span>
                <div className={`${styles.toggleSwitch} ${isDraft ? styles.on : styles.off}`} onClick={() => setIsDraft(!isDraft)}>
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
