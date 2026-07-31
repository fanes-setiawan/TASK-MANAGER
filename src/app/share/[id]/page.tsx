"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import styles from "./share.module.css";
import Image from "next/image";
import { useParams } from "next/navigation";
import { deleteSavedLogo, deleteSavedWatermark, getProjectById, ProjectData, SavedWatermark, saveUserWatermark, SavedLogo, saveUserLogo, getSavedLogos, getSavedWatermarks } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";

function SharePreviewContent() {
  const params = useParams();
  const projectId = params.id as string;
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [logoUrl, setLogoUrl] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuCAYxl62mvvaeKBMqiPv_xjWNJzn8AdapjWlfPMNMhCGQVzO059qxdGliakroZemwD6hYRC0dttMr5lZdIfj7k9a-qTbXWgM8KdeAi_HPZjuM0-eQIhd2LCgclnTHZqCjTLOQdKvuyx62Vhww9CZIBD1QxAY3QgquvRm-hx0wECm-OkzeQRKOFalfoO51bFxutpK-aZ6gGhvtmSgAF3cbb4GTeT7UHvko4nkpV_EqYaFg56Zajg8GWSHBTExXH8hmcpRiwZLX1YqVI");
  const [themeColor, setThemeColor] = useState("#000000");
  const [activeThumb, setActiveThumb] = useState(0);
  const [isDraft, setIsDraft] = useState(false);
  const [notes, setNotes] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");
  const [watermarkText, setWatermarkText] = useState("DRAFT");
  const [watermarkImageUrl, setWatermarkImageUrl] = useState("");
  const [watermarkSize, setWatermarkSize] = useState(120);
  const [watermarkOpacity, setWatermarkOpacity] = useState(8);
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);
  const [savedWatermarks, setSavedWatermarks] = useState<SavedWatermark[]>([]);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);

  // Share Modal States
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [isSavingShare, setIsSavingShare] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        let oldPublicId = undefined;
        if (logoUrl && logoUrl.includes("res.cloudinary.com") && logoUrl.includes("task_manager_logos")) {
          const parts = logoUrl.split("/");
          const filename = parts[parts.length - 1];
          const folder = parts[parts.length - 2];
          oldPublicId = `${folder}/${filename.split(".")[0]}`;
        }

        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, oldPublicId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");

        setLogoUrl(data.url);
        const user = auth.currentUser;
        if (user) {
          const newLogoId = await saveUserLogo(user.uid, data.url, data.publicId);
          setSavedLogos(prev => [{ id: newLogoId, url: data.url, publicId: data.publicId }, ...prev]);
        }
      } catch (err: any) {
        alert(err.message || "Failed to upload logo");
      } finally {
        setUploadingLogo(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingWatermark(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        let oldPublicId = undefined;
        if (watermarkImageUrl && watermarkImageUrl.includes("res.cloudinary.com") && watermarkImageUrl.includes("task_manager_logos")) {
          const parts = watermarkImageUrl.split("/");
          const filename = parts[parts.length - 1];
          const folder = parts[parts.length - 2];
          oldPublicId = `${folder}/${filename.split(".")[0]}`;
        }

        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data, oldPublicId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");

        setWatermarkImageUrl(data.url);
        const user = auth.currentUser;
        if (user) {
          const newWatermarkId = await saveUserWatermark(user.uid, data.url, data.publicId);
          setSavedWatermarks(prev => [{ id: newWatermarkId, url: data.url, publicId: data.publicId }, ...prev]);
        }
      } catch (err: any) {
        alert(err.message || "Failed to upload watermark");
      } finally {
        setUploadingWatermark(false);
        if (watermarkInputRef.current) watermarkInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const [customProjectName, setCustomProjectName] = useState("");
  const [customClientName, setCustomClientName] = useState("");

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));


  useEffect(() => {
    if (projectId) {
      getProjectById(projectId).then(async (data) => {
        let finalData = data;
        if (data && !data.clientLogoUrl && data.clientName) {
          try {
            const { collection, query, where, getDocs, limit } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase/client");
            const q = query(collection(db, "clients"), where("name", "==", data.clientName), limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const clientData = snapshot.docs[0].data();
              if (clientData.logoUrl) {
                finalData = { ...data, clientLogoUrl: clientData.logoUrl };
              }
            }
          } catch (e) {
            console.error("Failed to fetch fallback client logo", e);
          }
        }
        if (finalData?.shareSettings?.isPublic) {
          setProjectData(finalData);
          setPermission(finalData.shareSettings.permission || "view");
          if (finalData.documentSettings) {
            const ds = finalData.documentSettings;
            if (ds.logoUrl !== undefined) setLogoUrl(ds.logoUrl);
            if (ds.themeColor !== undefined) setThemeColor(ds.themeColor);
            if (ds.customProjectName !== undefined) setCustomProjectName(ds.customProjectName);
            else setCustomProjectName(finalData?.projectName || "");
            if (ds.customClientName !== undefined) setCustomClientName(ds.customClientName);
            else setCustomClientName(finalData?.clientName || finalData?.company || "");
            if (ds.notes !== undefined) setNotes(ds.notes);
            if (ds.isDraft !== undefined) setIsDraft(ds.isDraft);
            if (ds.showPageNumbers !== undefined) setShowPageNumbers(ds.showPageNumbers);
            if (ds.showToc !== undefined) setShowToc(ds.showToc);
            if (ds.watermarkType !== undefined) setWatermarkType(ds.watermarkType);
            if (ds.watermarkText !== undefined) setWatermarkText(ds.watermarkText);
            if (ds.watermarkImageUrl !== undefined) setWatermarkImageUrl(ds.watermarkImageUrl);
            if (ds.watermarkSize !== undefined) setWatermarkSize(ds.watermarkSize);
            if (ds.watermarkOpacity !== undefined) setWatermarkOpacity(ds.watermarkOpacity);
          } else {
            setCustomProjectName(finalData.projectName || "");
            setCustomClientName(finalData.clientName || finalData.company || "");
          }
        } else {
          setAccessDenied(true);
        }
        setLoading(false);
      }).catch((err) => {
        console.error("Error fetching project:", err);
        setAccessDenied(true);
        setLoading(false);
      });
    } else {
      setAccessDenied(true);
      setLoading(false);
    }
  }, [projectId]);

  const handleDeleteLogo = async (e: React.MouseEvent, logo: SavedLogo) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this logo?")) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      if (logo.publicId) {
        await fetch("/api/delete-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: logo.publicId })
        });
      }

      if (logo.id) {
        await deleteSavedLogo(user.uid, logo);
        setSavedLogos(prev => prev.filter(l => l.id !== logo.id));
      }
    } catch (err: any) {
      alert("Failed to delete logo: " + err.message);
    }
  };

  const handleDeleteWatermark = async (e: React.MouseEvent, watermark: SavedWatermark) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this watermark?")) return;

    try {
      const user = auth.currentUser;
      if (!user) return;

      if (watermark.publicId) {
        await fetch("/api/delete-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: watermark.publicId })
        });
      }

      if (watermark.id) {
        await deleteSavedWatermark(user.uid, watermark);
        setSavedWatermarks(prev => prev.filter(w => w.id !== watermark.id));
      }
    } catch (err: any) {
      alert("Failed to delete watermark: " + err.message);
    }
  };

  const getItemCost = (item: any, rate: number) => {
    const fixed = item?.price ?? item?.cost ?? item?.fixedPrice ?? item?.fixed_price;
    if (fixed !== undefined && fixed !== null && fixed !== "") {
      return Number(fixed) || 0;
    }
    return (item?.points || 0) * rate;
  };

  // Derived calculations
  let modules: any[] = [];
  let totalPoints = 0;
  let totalCost = 0;
  if (projectData && projectData.configJson) {
    try {
      const parsed = JSON.parse(projectData.configJson);
      modules = Array.isArray(parsed.modules) ? parsed.modules : [];
      let calculatedPoints = 0;
      let calculatedFixedCost = 0;
      const rate = projectData.ratePerPoint || 0;

      modules.forEach((mod: any) => {
        if (mod.subtasks && Array.isArray(mod.subtasks)) {
          mod.subtasks.forEach((sub: any) => {
            const fixed = sub.price ?? sub.cost ?? sub.fixedPrice ?? sub.fixed_price;
            if (fixed !== undefined && fixed !== null && fixed !== "") {
              calculatedFixedCost += Number(fixed) || 0;
            } else {
              calculatedPoints += (sub.points || 0);
            }
          });
        } else {
          const fixed = mod.price ?? mod.cost ?? mod.fixedPrice ?? mod.fixed_price;
          if (fixed !== undefined && fixed !== null && fixed !== "") {
            calculatedFixedCost += Number(fixed) || 0;
          } else {
            calculatedPoints += (mod.points || 0);
          }
        }
      });
      totalPoints = calculatedPoints;
      totalCost = (totalPoints * rate) + calculatedFixedCost;
    } catch (e) {
      console.error("Failed to parse configJson");
    }
  }

  const formatCurrency = (val: number, currency = "IDR (Rp)") => {
    return currency.includes("Rp") || currency.includes("IDR")
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val)
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Flatten modules and subtasks into rows
  const flatRows: any[] = [];
  let globalModIdx = 0;

  modules.forEach((mod: any) => {
    let modCost = 0;
    const rate = projectData?.ratePerPoint || 0;
    if (mod.subtasks && Array.isArray(mod.subtasks)) {
      modCost = mod.subtasks.reduce((acc: number, sub: any) => acc + getItemCost(sub, rate), 0);
    } else {
      modCost = getItemCost(mod, rate);
    }

    flatRows.push({
      type: 'module',
      data: mod,
      globalModIdx,
      modCost
    });

    if (mod.subtasks && Array.isArray(mod.subtasks)) {
      mod.subtasks.forEach((sub: any, subIdx: number) => {
        flatRows.push({
          type: 'subtask',
          data: sub,
          globalModIdx,
          subIdx,
          isLastSubtask: subIdx === mod.subtasks.length - 1
        });
      });
    }

    globalModIdx++;
  });

  // Chunking logic for Pagination
  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT = 350;
  const FOOTER_HEIGHT = 200;
  const PAGE_HEIGHT_LIMIT = 1000;

  const pages: any[] = [];
  let currentPage: any = { items: [], hasHeader: true, heightUsed: HEADER_HEIGHT, isLast: false };
  pages.push(currentPage);

  flatRows.forEach((row) => {
    if (currentPage.heightUsed + ROW_HEIGHT > PAGE_HEIGHT_LIMIT) {
      currentPage = { items: [], hasHeader: false, heightUsed: 0, isLast: false };
      pages.push(currentPage);
    }
    currentPage.items.push(row);
    currentPage.heightUsed += ROW_HEIGHT;
  });

  // Check if footer fits on the last page
  if (currentPage.heightUsed + FOOTER_HEIGHT > PAGE_HEIGHT_LIMIT) {
    pages.push({ items: [], hasHeader: false, heightUsed: FOOTER_HEIGHT, isLast: true });
  } else {
    currentPage.isLast = true;
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading proposal...</div>;
  }

  if (accessDenied) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-error)' }}>lock</span>
        <h2>Access Denied</h2>
        <p>This proposal is not public.</p>
      </div>
    );
  }

  const generatePDF = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <header className={styles.topToolbar}>
        <div className={styles.toolbarLeft}>
          <span className={`material-symbols-outlined ${styles.docIcon}`}>description</span>
          <div className={styles.docTitleBox}>
            <span className={styles.docTitle}>{projectData ? `${projectData.projectName.replace(/\s+/g, '_')}.pdf` : 'Loading...'}</span>
            <span className={styles.docSubtitle}>{projectData ? '' : 'Draft'}</span>
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
          <button className={styles.btnPrimary} onClick={generatePDF}>
            <span className="material-symbols-outlined">download</span> Download PDF
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
                  {isDraft && (watermarkType === 'text' && watermarkText ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 50, overflow: 'hidden' }}>
                      <div style={{ transform: 'rotate(-45deg)', fontSize: watermarkSize, fontWeight: 900, color: `rgba(0,0,0,${watermarkOpacity / 100})`, letterSpacing: 20, whiteSpace: 'nowrap' }}>{watermarkText}</div>
                    </div>
                  ) : watermarkType === 'image' && watermarkImageUrl ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 50, overflow: 'hidden' }}>
                      <img src={watermarkImageUrl} style={{ width: watermarkSize, opacity: watermarkOpacity / 100, objectFit: 'contain' }} alt="Watermark" />
                    </div>
                  ) : null)}

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
                              <div className={styles.pdfMetaValue}>
                                {new Date().toLocaleString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
                              </div>
                            </div>
                          </div>
                        </div>


                        {/* Info Grid */}
                        <div className={styles.pdfInfoGrid}>
                          <div className={styles.pdfInfoCol}>
                            <h4 style={{ color: themeColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {projectData?.clientLogoUrl ? (
                                <img src={projectData.clientLogoUrl} alt="Company Logo" style={{ maxHeight: 24, maxWidth: 80, objectFit: 'contain' }} />
                              ) : (
                                <span className="material-symbols-outlined">person</span>
                              )}
                              {projectData?.company || "Company"}
                            </h4>
                            {customClientName && <div className={styles.pdfInfoRow}><span className="material-symbols-outlined">badge</span> {customClientName}</div>}
                            {projectData?.email && <div className={styles.pdfInfoRow}><span className="material-symbols-outlined">mail</span> {projectData.email}</div>}
                            {projectData?.phone && <div className={styles.pdfInfoRow}><span className="material-symbols-outlined">call</span> {projectData.phone}</div>}
                            {projectData?.address && (
                              <div className={styles.pdfInfoRow} style={{ alignItems: 'flex-start' }}>
                                <span className="material-symbols-outlined" style={{ marginTop: '2px' }}>location_on</span>
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{projectData.address}</div>
                              </div>
                            )}
                          </div>
                          <div className={styles.pdfInfoCol}>
                            <h4 style={{ color: themeColor }}><span className="material-symbols-outlined">work</span> Project Information</h4>
                            <h5>{customProjectName}</h5>
                            <p style={{ marginTop: 8, color: 'var(--color-on-surface-variant)', fontSize: 13, lineHeight: 1.5 }}>
                              Pembuatan {customProjectName.toLowerCase()} responsif dengan fitur manajemen konten dan optimasi.
                            </p>
                            <div className={styles.pdfDuration} style={{ marginTop: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: themeColor }}>schedule</span>
                              <span>Estimated Duration: <strong>4 - 6 Weeks</strong></span>
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
                            {page.items.map((row: any, i: number) => {
                              if (row.type === 'module') {
                                const mod = row.data;
                                return (
                                  <tr key={`mod-${row.globalModIdx}-${i}`} className={styles.modRow}>
                                    <td>
                                      <div className={styles.modIndex}>{row.globalModIdx + 1}</div>
                                    </td>
                                    <td colSpan={2} className={styles.modTitle}>{mod.name}</td>
                                    <td className={styles.modTotal} style={{ color: themeColor }}>
                                      {formatCurrency(row.modCost, projectData?.currency)}
                                    </td>
                                  </tr>
                                );
                              } else {
                                const sub = row.data;
                                const subCost = getItemCost(sub, projectData?.ratePerPoint || 0);
                                return (
                                  <tr key={`sub-${row.globalModIdx}-${row.subIdx}-${i}`} className={styles.subRow}>
                                    <td></td>
                                    <td>
                                      <div className={styles.subTaskWrapper}>
                                        <div className={`${styles.treeLine} ${row.isLastSubtask ? styles.treeLineLast : ''}`}></div>
                                        <div className={styles.subIndex}>{row.globalModIdx + 1}.{row.subIdx + 1}</div>
                                        <span className={styles.subName}>{sub.name}</span>
                                      </div>
                                    </td>
                                    <td className={styles.subDesc}>{sub.description || '-'}</td>
                                    <td className={styles.subPrice}>{formatCurrency(subCost, projectData?.currency)}</td>
                                  </tr>
                                );
                              }
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {page.isLast && (
                      <div style={{ marginTop: 'auto', paddingTop: 32, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        {/* Notes Section */}
                        {notes && (
                          <div style={{ marginBottom: 24, padding: '16px', backgroundColor: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569', border: '1px solid #e2e8f0' }}>
                            <h5 style={{ color: themeColor, marginBottom: 8, fontSize: 14 }}>Catatan</h5>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{notes}</div>
                          </div>
                        )}

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
                              <span style={{ color: themeColor }}>Total Biaya</span>
                              <span className={styles.pdfGrandTotal} style={{ color: themeColor }}>{formatCurrency(totalCost, projectData?.currency)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Banner */}
                        <div className={styles.pdfBanner} style={{ backgroundColor: themeColor }}>
                          <div className={styles.pdfBannerCenter}>
                            <div><span className="material-symbols-outlined">language</span> task-manager.fanes.online</div>
                            <div><span className="material-symbols-outlined">mail</span> fanessetiawan.1401@gmail.com</div>
                            <div><span className="material-symbols-outlined">call</span> +62 882 2540 9824</div>
                          </div>
                          <div className={styles.pdfBannerRight}>
                            {logoUrl ? (
                              <img src={logoUrl} style={{ maxHeight: 64, maxWidth: 120, objectFit: 'contain', opacity: 0.9, filter: 'brightness(0) invert(1)' }} alt="Footer Logo" />
                            ) : (
                              <span className="material-symbols-outlined" style={{ fontSize: 64, opacity: 0.8 }}>assignment_turned_in</span>
                            )}
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

        {permission === "edit" && (
          <aside className={styles.sidebarRight}>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarTitle}>DOCUMENT SETTINGS</span>
            </div>

            <div className={styles.propertiesList}>
              <div className={styles.propGroup}>
                <label className={styles.propLabel}>Theme Color</label>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  {["#2563EB", "#059669", "#1B2A4A", "#7F41E8"].map(c => (
                    <div
                      key={c}
                      onClick={() => setThemeColor(c)}
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, cursor: "pointer", border: themeColor === c ? "2px solid var(--color-on-surface)" : "none" }}
                    ></div>
                  ))}
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 16, border: "1px dashed var(--color-outline)", cursor: "pointer" }}>
                    <input type="color" hidden value={themeColor} onChange={e => setThemeColor(e.target.value)} />
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  </label>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

export default function SharePreviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading proposal...</div>}>
      <SharePreviewContent />
    </Suspense>
  );
}
