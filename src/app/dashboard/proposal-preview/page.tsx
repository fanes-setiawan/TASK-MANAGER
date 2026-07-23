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
  const [zoomLevel, setZoomLevel] = useState(50);
  const [logoUrl, setLogoUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#009D7B");
  const [docTitle, setDocTitle] = useState("Loading...");
  const [clientName, setClientName] = useState("Loading...");
  const [activeThumb, setActiveThumb] = useState(0);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [watermark, setWatermark] = useState(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));

  useEffect(() => {
    if (projectData) {
      setDocTitle(projectData.projectName || "Website Company Profile");
      setClientName(projectData.clientName || "PT. Solusi Digital Indonesia");
    }
  }, [projectData]);

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
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
  };

  // Flatten modules into rows for pagination
  const rows: any[] = [];
  modules.forEach((mod, mIndex) => {
    rows.push({ type: 'module', mod, mIndex });
    const children = (mod.subtasks && mod.subtasks.length > 0) ? mod.subtasks : (mod.children && mod.children.length > 0) ? mod.children : [
      { name: "Main Task", description: "Implementasi fitur " + mod.name, points: mod.points }
    ];
    children.forEach((child: any, cIndex: number) => {
      rows.push({ type: 'child', child, mIndex, cIndex });
    });
  });

  if (rows.length === 0) {
    // Add mock data
    ['Auth', 'Home', 'Product', 'Search', 'Cart', 'Checkout', 'Order'].forEach((modName, mIndex) => {
      rows.push({ type: 'module', mod: { name: modName, points: 3 }, mIndex });
      rows.push({ type: 'child', child: { name: "Main Task", description: "Implementasi fitur " + modName, points: 3 }, mIndex, cIndex: 0 });
    });
  }

  // Chunking logic
  const pages: any[][] = [];
  let currentRowIdx = 0;
  while (currentRowIdx < rows.length) {
    const isFirstPage = pages.length === 0;
    const capacity = isFirstPage ? 14 : 24; // adjusted for A4 height
    const chunk = rows.slice(currentRowIdx, currentRowIdx + capacity);
    pages.push(chunk);
    currentRowIdx += capacity;
  }
  if (pages.length === 0) pages.push([]);
  
  // Check if last page has room for the summary/footer (needs ~8 rows space)
  const lastPageCapacity = pages.length === 1 ? 14 : 24;
  if (pages[pages.length - 1].length > lastPageCapacity - 8) {
    pages.push([]); // Add blank page just for footer
  }

  return (
    <div className={styles.container}>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          header, aside, footer, nav, .${styles.sidebarLeft}, .${styles.sidebarRight}, .${styles.topToolbar} { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .${styles.container} { overflow: visible !important; height: auto !important; margin: 0 !important; }
          .${styles.centerCanvas} { padding: 0 !important; overflow: visible !important; display: block !important; }
          
          .print-page-wrapper {
            width: 210mm !important;
            height: 297mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .print-page {
            transform: scale(1) !important;
            width: 100% !important;
            height: 100% !important;
            box-shadow: none !important;
            position: relative !important;
          }
        }
      `}</style>
      {/* Top Toolbar */}
      <header className={styles.topToolbar}>
        <div className={styles.toolbarLeft}>
          <span className={`material-symbols-outlined ${styles.docIcon}`}>description</span>
          <div className={styles.docTitleBox}>
            <span className={styles.docTitle}>{docTitle.replace(/\s+/g, '_')}_Proposal.pdf</span>
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
          <button className={styles.btnToolbar} onClick={() => {
            const url = prompt("Enter Logo URL:", logoUrl);
            if (url) setLogoUrl(url);
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload</span>
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
                onClick={() => {
                  setActiveThumb(index);
                  const pageEl = document.getElementById(`pdf-page-${index}`);
                  if (pageEl) {
                    pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                <div className={styles.a4Container}>
                  {index === 0 ? (
                    <div style={{ position: "absolute", inset: 0, padding: 8, display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
                      <div style={{ height: 24, width: "100%", backgroundColor: themeColor, opacity: 0.15, borderRadius: 4, marginBottom: 4 }}></div>
                      <div style={{ flex: 1, backgroundColor: "var(--color-surface-container-high)", borderRadius: 2 }}></div>
                    </div>
                  ) : index === pages.length - 1 ? (
                    <div style={{ position: "absolute", inset: 0, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ flex: 1, backgroundColor: "var(--color-surface-container-high)", borderRadius: 2, opacity: 0.5 }}></div>
                      <div style={{ height: 16, width: "100%", backgroundColor: themeColor, opacity: 0.25, borderRadius: 2 }}></div>
                    </div>
                  ) : (
                    <div style={{ position: "absolute", inset: 0, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ flex: 1, backgroundColor: "var(--color-surface-container-high)", borderRadius: 2, opacity: 0.5 }}></div>
                    </div>
                  )}
                </div>
                <p className={styles.thumbLabel}>Page {index + 1}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Canvas: PDF Preview */}
        <div className={styles.centerCanvas} style={{ flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
              <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: 32 }}>refresh</span>
            </div>
          ) : !projectData ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', color: 'var(--color-on-surface-variant)' }}>
              Project not found.
            </div>
          ) : (
            pages.map((pageRows, pageIndex) => {
              const isFirstPage = pageIndex === 0;
              const isLastPage = pageIndex === pages.length - 1;
              const rate = projectData.ratePerPoint || 300000;

              return (
                <div id={`pdf-page-${pageIndex}`} key={pageIndex} className="print-page-wrapper" style={{ width: 800 * (zoomLevel / 100), height: 1131.2 * (zoomLevel / 100), position: 'relative', flexShrink: 0, borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                  <div className={`${styles.pdfPage} print-page font-sans text-sm pb-0 rounded-2xl overflow-hidden`} style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, width: '800px', margin: 0, boxShadow: 'none' }}>
                    <div className="flex flex-col h-full bg-white relative text-gray-800 w-full rounded-2xl overflow-hidden">
                      
                      {/* PDF Content Wrapper */}
                      <div className="p-8 pb-4 flex flex-col flex-1 relative z-10">
                        
                        {isFirstPage && (
                          <>
                            {/* Top Header Grid */}
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-2">
                                {logoUrl ? (
                                  <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" />
                                ) : (
                                  <div className="w-10 h-10 rounded flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: themeColor }}>
                                    <span className="material-symbols-outlined text-2xl">assignment_turned_in</span>
                                  </div>
                                )}
                                <span className="font-bold text-xl text-gray-900">Task<span className="font-medium text-gray-600">Manager</span></span>
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                <div className="bg-gray-50/80 border border-gray-100 p-2.5 rounded-lg flex items-center gap-3 w-52">
                                  <span className="material-symbols-outlined text-xl" style={{ color: themeColor }}>calendar_month</span>
                                  <div className="flex-1">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Proposal Date</p>
                                    <p className="text-xs font-bold text-gray-800">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
  
                            {/* Title */}
                            <div className="mb-6 border-b-[3px] pb-4" style={{ borderColor: themeColor }}>
                              <h1 className="text-[32px] font-black text-gray-900 mb-1 leading-none tracking-tight">Project Proposal</h1>
                              <h2 className="text-lg text-gray-500 font-medium">Task List & Cost Estimation</h2>
                            </div>
  
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-8 mb-6">
                              <div>
                                <div className="flex items-center gap-2 mb-2.5 font-bold text-sm" style={{ color: themeColor }}>
                                  <span className="material-symbols-outlined text-lg">person</span>
                                  Client Information
                                </div>
                                <h3 className="font-black text-base mb-2 text-gray-900 tracking-tight">{clientName}</h3>
                                <div className="text-[13px] text-gray-700 flex flex-col gap-2">
                                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-[15px] text-gray-400">badge</span> {projectData.company || 'Budi Santoso'}</div>
                                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-[15px] text-gray-400">mail</span> budi@solusidigital.id</div>
                                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-[15px] text-gray-400">call</span> 0812-3456-7890</div>
                                  <div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-[15px] text-gray-400">location_on</span> Jakarta, Indonesia</div>
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-2.5 font-bold text-sm" style={{ color: themeColor }}>
                                  <span className="material-symbols-outlined text-lg">business_center</span>
                                  Project Information
                                </div>
                                <h3 className="font-black text-base mb-2 text-gray-900 tracking-tight">{docTitle}</h3>
                                <p className="text-[13px] text-gray-600 mb-4 leading-relaxed pr-4">
                                  Pembuatan website company profile responsif dengan fitur manajemen konten dan optimasi SEO.
                                </p>
                                <p className="text-[13px] text-gray-600">Estimated Duration: <span className="font-bold" style={{ color: themeColor }}>{(totalPoints / 2).toFixed(0) || 20} Hari Kerja</span></p>
                              </div>
                            </div>
                          </>
                        )}

                      {/* Table Header (Only if page has rows) */}
                      {pageRows.length > 0 && (
                        <div className="text-white font-bold rounded-t-lg grid grid-cols-[40px_1.5fr_2fr_100px] px-4 py-2.5 text-[13px] mt-2" style={{ backgroundColor: themeColor }}>
                          <div className="text-center">No.</div>
                          <div>Task</div>
                          <div>Deskripsi</div>
                          <div className="text-right">Harga</div>
                        </div>
                      )}

                      {/* Table Body */}
                      {pageRows.length > 0 && (
                        <div className="border-x border-b border-gray-200 rounded-b-lg flex-1 text-[13px]">
                          {pageRows.map((row, rIndex) => {
                             if (row.type === 'module') {
                               const modPrice = (row.mod.points || 0) * rate;
                               return (
                                 <div key={`m-${rIndex}`} className="grid grid-cols-[40px_1fr_100px] px-4 py-3 items-center border-b border-gray-100 last:border-b-0 bg-gray-50/30">
                                   <div className="w-[26px] h-[26px] mx-auto font-bold text-[13px] rounded flex items-center justify-center" style={{ backgroundColor: `${themeColor}1A`, color: themeColor }}>
                                     {row.mIndex + 1}
                                   </div>
                                   <div className="font-bold text-gray-900 pl-3">{row.mod.name || 'Untitled'}</div>
                                   <div className="text-right font-bold" style={{ color: themeColor }}>{formatCurrency(modPrice)}</div>
                                 </div>
                               );
                             } else {
                               const childPrice = (row.child.points || 0) * rate;
                               return (
                                 <div key={`c-${rIndex}`} className="grid grid-cols-[40px_1.5fr_2fr_100px] px-4 py-2 border-b border-gray-100 last:border-b-0 items-start relative">
                                   {/* Connective Line Design */}
                                   <div className="absolute left-[33px] top-0 bottom-0 w-[1px] bg-gray-200"></div>
                                   <div className="absolute left-[33px] top-[14px] w-[16px] h-[1px] bg-gray-200"></div>

                                   <div className="text-center text-gray-500 font-medium pl-6 bg-white relative z-10 w-fit text-[11px] h-fit mt-[1px]">
                                     {row.mIndex + 1}.{row.cIndex + 1}
                                   </div>
                                   <div className="font-semibold text-gray-800 pl-6 leading-snug">{row.child.name}</div>
                                   <div className="text-gray-500 text-[12px] pr-2 pt-0.5 leading-snug">{row.child.description || '-'}</div>
                                   <div className="text-right font-semibold text-gray-700">{formatCurrency(childPrice)}</div>
                                 </div>
                               );
                             }
                          })}
                        </div>
                      )}

                      {/* Spacer to push footer to bottom if page is relatively empty */}
                      <div className="flex-1 min-h-[40px]"></div>

                      {/* Summary / Total Section (Only on Last Page) */}
                      {isLastPage && (
                        <div className="border rounded-xl p-5 flex justify-between items-center shrink-0 mt-6" style={{ backgroundColor: `${themeColor}0A`, borderColor: `${themeColor}33` }}>
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl" style={{ color: themeColor }}>calculate</span>
                            <span className="font-bold text-base" style={{ color: themeColor }}>Ringkasan Biaya</span>
                          </div>
                          <div className="w-1/2">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b" style={{ borderColor: `${themeColor}1A` }}>
                              <span className="text-gray-600 font-medium text-[13px]">Subtotal</span>
                              <span className="font-bold text-gray-800 text-sm">{formatCurrency(totalCost || 3600000)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="font-bold text-base" style={{ color: themeColor }}>Total Proposal</span>
                              <span className="font-black text-[22px] tracking-tight" style={{ color: themeColor }}>{formatCurrency(totalCost || 3600000)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Footer */}
                      <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center text-[10px] text-gray-400 font-medium">
                        <div>TM-{new Date().getFullYear()}-001 • Strictly Confidential</div>
                        {showPageNumbers ? <div>Page {pageIndex + 1} of {pages.length}</div> : <div></div>}
                      </div>

                      {watermark && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 50, opacity: 0.03, fontSize: '150px', fontWeight: 900, transform: 'rotate(-45deg)', color: 'black', whiteSpace: 'nowrap' }}>
                          DRAFT
                        </div>
                      )}
                    </div>
                    
                    {/* Footer Solid Box (Only on Last Page) */}
                    {isLastPage ? (
                      <div className="text-white px-8 py-6 flex justify-center items-center relative overflow-hidden shrink-0 mt-2" style={{ backgroundColor: themeColor }}>
                        <div className="flex items-center gap-8 text-[12.5px] relative z-10 font-medium tracking-wider">
                          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[15px]">language</span> taskmanager.app</div>
                          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[15px]">mail</span> support@taskmanager.app</div>
                          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[15px]">call</span> 021-1234-5678</div>
                        </div>
                        
                        {/* Decorative Icon Background */}
                        <span className="material-symbols-outlined absolute right-6 -bottom-6 text-[100px] text-white opacity-[0.07] rotate-[-15deg] pointer-events-none">assignment</span>
                        <div className="absolute -right-4 -top-8 w-32 h-32 bg-white opacity-[0.03] rounded-full blur-xl pointer-events-none"></div>
                      </div>
                    ) : (
                      <div className="h-[20px] bg-gray-50 w-full shrink-0 border-t border-gray-100 flex items-center justify-center">
                        {showPageNumbers ? <span className="text-[10px] text-gray-400">Page {pageIndex + 1} of {pages.length}</span> : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
            })
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
              <div className={styles.uploadArea} onClick={() => {
                const url = prompt("Enter Logo URL:", logoUrl);
                if (url !== null) setLogoUrl(url);
              }} style={{ cursor: 'pointer', border: '1px dashed var(--color-outline-variant)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, position: 'relative' }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: 60, objectFit: 'contain' }} />
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--color-outline)", marginBottom: 8 }}>post_add</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Upload Logo</span>
                  </>
                )}
              </div>
            </div>

            <div className={styles.propGroup}>
              <label className={styles.propLabel}>Theme Color</label>
              <div className={styles.colorsRow}>
                {["#009D7B", "#1A365D", "#D4AF37", "#7C3AED"].map((color) => (
                  <div 
                    key={color}
                    className={`${styles.colorSwatch} ${themeColor === color ? styles.colorActive : ''}`} 
                    style={{ backgroundColor: color }}
                    onClick={() => setThemeColor(color)}
                  ></div>
                ))}
                <label className={styles.colorCircle} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--color-outline-variant)', cursor: 'pointer' }}>
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
                <input 
                  className={styles.inputField} 
                  type="text" 
                  value={docTitle} 
                  onChange={(e) => setDocTitle(e.target.value)} 
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Client Name</label>
                <input 
                  className={styles.inputField} 
                  type="text" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                />
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
                <div 
                  className={`${styles.toggleSwitch} ${showPageNumbers ? styles.on : ''}`}
                  onClick={() => setShowPageNumbers(!showPageNumbers)}
                >
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Watermark Draft</span>
                <div 
                  className={`${styles.toggleSwitch} ${watermark ? styles.on : ''}`}
                  onClick={() => setWatermark(!watermark)}
                >
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
