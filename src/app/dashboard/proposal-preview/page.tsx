"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import styles from "./proposal-preview.module.css";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { getProjectById, ProjectData, saveUserLogo, getSavedLogos, deleteSavedLogo, SavedLogo, saveUserWatermark, getSavedWatermarks, deleteSavedWatermark, SavedWatermark, updateProjectShareSettings, updateProjectDocumentSettings, updateProject, getDocumentViews, DocumentView } from "@/lib/firebase/firestore";
import { auth } from "@/lib/firebase/client";

function ProposalPreviewContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [documentViews, setDocumentViews] = useState<DocumentView[]>([]);
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [loading, setLoading] = useState(!!projectId);
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
  const [estimatedDuration, setEstimatedDuration] = useState("4 - 6 Weeks");
  const [projectDescription, setProjectDescription] = useState("");
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);
  const [savedWatermarks, setSavedWatermarks] = useState<SavedWatermark[]>([]);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);

  // Share Modal States
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [sharePermission, setSharePermission] = useState<"view" | "edit">("view");
  const [isSavingShare, setIsSavingShare] = useState(false);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSON Editor States
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonEditorValue, setJsonEditorValue] = useState("");
  const [isSavingJson, setIsSavingJson] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        const newZoom = Math.floor(((window.innerWidth - 32) / 794) * 100);
        setZoomLevel(Math.min(newZoom, 100));
      } else {
        setZoomLevel(100);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCopyJsonScope = () => {
    if (projectData?.configJson) {
      navigator.clipboard.writeText(projectData.configJson);
      alert("JSON Scope copied to clipboard!");
    } else {
      alert("No JSON scope available to copy.");
    }
  };

  const handleOpenJsonEditor = () => {
    if (projectData?.configJson) {
      try {
        const parsed = JSON.parse(projectData.configJson);
        setJsonEditorValue(JSON.stringify(parsed, null, 2));
      } catch (e) {
        setJsonEditorValue(projectData.configJson);
      }
    } else {
      setJsonEditorValue("[\n  \n]");
    }
    setShowJsonEditor(true);
  };

  const handleSaveJson = async () => {
    if (!projectId) return;
    setIsSavingJson(true);
    try {
      const parsed = JSON.parse(jsonEditorValue);
      const compactedJson = JSON.stringify(parsed);

      await updateProject(projectId, { configJson: compactedJson });
      setProjectData(prev => prev ? { ...prev, configJson: compactedJson } : prev);
      setShowJsonEditor(false);
      alert("JSON Scope updated successfully!");
    } catch (e: any) {
      alert("Invalid JSON format. Please check your syntax.\n\nError: " + e.message);
    } finally {
      setIsSavingJson(false);
    }
  };

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

  const handleSaveShareSettings = async () => {
    if (!projectId) return;
    setIsSavingShare(true);
    try {
      await updateProjectShareSettings(projectId, isPublic, sharePermission);
      // Update local state
      if (projectData) {
        setProjectData({
          ...projectData,
          shareSettings: { isPublic, permission: sharePermission }
        });
      }
      alert("Share settings updated!");
    } catch (err: any) {
      alert("Failed to update share settings: " + err.message);
    } finally {
      setIsSavingShare(false);
    }
  };

  const getShareLink = () => {
    if (typeof window !== "undefined" && projectId) {
      return `${window.location.origin}/share/${projectId}`;
    }
    return "";
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getShareLink());
    alert("Link copied to clipboard!");
  };

  const handleSaveDocumentSettings = async () => {
    if (!projectId) return;
    setIsSavingDocument(true);
    try {
      await updateProjectDocumentSettings(projectId, {
        logoUrl,
        themeColor,
        customProjectName,
        customClientName,
        notes,
        isDraft,
        showPageNumbers,
        showToc,
        watermarkType,
        watermarkText,
        watermarkImageUrl,
        watermarkSize,
        watermarkOpacity,
        estimatedDuration,
        projectDescription
      });
      await updateProject(projectId, {
        projectName: customProjectName,
        clientName: customClientName
      });
      setProjectData(prev => prev ? {
        ...prev,
        projectName: customProjectName,
        clientName: customClientName,
        documentSettings: {
          ...prev.documentSettings,
          logoUrl,
          themeColor,
          customProjectName,
          customClientName,
          notes,
          isDraft,
          showPageNumbers,
          showToc,
          watermarkType,
          watermarkText,
          watermarkImageUrl,
          watermarkSize,
          watermarkOpacity,
          estimatedDuration,
          projectDescription
        }
      } : prev);
      alert("Document settings saved!");
    } catch (err: any) {
      alert("Failed to save document settings: " + err.message);
    } finally {
      setIsSavingDocument(false);
    }
  };

  useEffect(() => {
    let viewsInterval: NodeJS.Timeout | null = null;
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
        setProjectData(finalData);
        if (finalData?.shareSettings) {
          setIsPublic(finalData.shareSettings.isPublic);
          setSharePermission(finalData.shareSettings.permission);
        }
        if (finalData?.documentSettings) {
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
          if (ds.estimatedDuration !== undefined) setEstimatedDuration(ds.estimatedDuration);
          if (ds.projectDescription !== undefined) setProjectDescription(ds.projectDescription);
        } else {
          setCustomProjectName(finalData?.projectName || "");
          setCustomClientName(finalData?.clientName || finalData?.company || "");
        }
        
        // Fetch views initially and setup polling
        const fetchViews = () => {
          getDocumentViews(projectId).then(setDocumentViews).catch(console.error);
        };
        fetchViews();
        viewsInterval = setInterval(fetchViews, 5000); // 5 seconds polling
        
        setLoading(false);
      });
    }

    const fetchAssets = async (user: any) => {
      if (user) {
        const logos = await getSavedLogos(user.uid);
        setSavedLogos(logos);
        const watermarks = await getSavedWatermarks(user.uid);
        setSavedWatermarks(watermarks);
      }
    };
    const unsubscribe = auth.onAuthStateChanged(fetchAssets);
    return () => {
      unsubscribe();
      if (viewsInterval) clearInterval(viewsInterval);
    };
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

  const handleCopyJson = () => {
    if (projectData && projectData.configJson) {
      try {
        const parsed = JSON.parse(projectData.configJson);
        const formatted = JSON.stringify(parsed, null, 2);
        navigator.clipboard.writeText(formatted);
        alert("Konfigurasi JSON berhasil disalin ke clipboard!");
      } catch (e) {
        navigator.clipboard.writeText(projectData.configJson);
        alert("Konfigurasi JSON berhasil disalin ke clipboard!");
      }
    } else {
      alert("Tidak ada data JSON untuk disalin.");
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
        const modFixed = mod.price ?? mod.cost ?? mod.fixedPrice ?? mod.fixed_price;
        if (modFixed !== undefined && modFixed !== null && modFixed !== "") {
          calculatedFixedCost += Number(modFixed) || 0;
        } else if (mod.subtasks && Array.isArray(mod.subtasks)) {
          mod.subtasks.forEach((sub: any) => {
            const fixed = sub.price ?? sub.cost ?? sub.fixedPrice ?? sub.fixed_price;
            if (fixed !== undefined && fixed !== null && fixed !== "") {
              calculatedFixedCost += Number(fixed) || 0;
            } else {
              calculatedPoints += (sub.points || 0);
            }
          });
        } else {
          calculatedPoints += (mod.points || 0);
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
    const modFixed = mod.price ?? mod.cost ?? mod.fixedPrice ?? mod.fixed_price;

    if (modFixed !== undefined && modFixed !== null && modFixed !== "") {
      modCost = Number(modFixed) || 0;
    } else if (mod.subtasks && Array.isArray(mod.subtasks)) {
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
  const HEADER_HEIGHT = 380;
  const FOOTER_HEIGHT = 220;
  const PAGE_HEIGHT_LIMIT = 1020; // Increased to use full page
  const NEW_PAGE_HEADER_HEIGHT = 80;

  const pages: any[] = [];
  let currentPage: any = { items: [], hasHeader: true, heightUsed: HEADER_HEIGHT, isLast: false };
  pages.push(currentPage);

  flatRows.forEach((row) => {
    let rowHeight = 36;
    if (row.type === 'module') {
      rowHeight = (row.data.name && row.data.name.length > 40) ? 56 : 40;
    } else {
      const nameLen = row.data.name ? row.data.name.length : 0;
      const descLen = (row.data.description || row.data.desc || row.data.deskripsi || "").length;
      
      // More aggressive row height estimation
      if (descLen > 150) rowHeight = 100;
      else if (descLen > 100) rowHeight = 80;
      else if (nameLen > 40 || descLen > 60) rowHeight = 64;
      else if (nameLen > 20 || descLen > 30) rowHeight = 48;
      else rowHeight = 40;
    }

    if (currentPage.heightUsed + rowHeight > PAGE_HEIGHT_LIMIT) {
      currentPage = { items: [], hasHeader: false, heightUsed: NEW_PAGE_HEADER_HEIGHT, isLast: false };
      pages.push(currentPage);
    }
    currentPage.items.push(row);
    currentPage.heightUsed += rowHeight;
  });

  // Check if footer fits on the last page
  if (currentPage.heightUsed + FOOTER_HEIGHT > PAGE_HEIGHT_LIMIT) {
    pages.push({ items: [], hasHeader: false, heightUsed: FOOTER_HEIGHT, isLast: true });
  } else {
    currentPage.isLast = true;
  }

  // Compute grouped views based on email
  const groupedViews = React.useMemo(() => {
    const groups: Record<string, DocumentView[]> = {};
    documentViews.forEach(view => {
      if (!groups[view.email]) groups[view.email] = [];
      groups[view.email].push(view);
    });
    // Sort by latest view first
    return Object.values(groups).sort((a, b) => {
      const dateA = a[0].viewedAt?.toDate ? a[0].viewedAt.toDate() : new Date(0);
      const dateB = b[0].viewedAt?.toDate ? b[0].viewedAt.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [documentViews]);

  // State to manage expanded accordions in the views modal
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});

  const toggleEmailExpansion = (email: string) => {
    setExpandedEmails(prev => ({ ...prev, [email]: !prev[email] }));
  };

  return (
    <div className={styles.container}>
      {/* Top Toolbar */}
      <header className={styles.topToolbar}>
        <div className={styles.toolbarLeft}>
          <button className={styles.mobileSidebarToggle} onClick={() => setShowMobileSidebar(!showMobileSidebar)}>
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className={`material-symbols-outlined ${styles.docIcon}`}>description</span>
          <div className={styles.docTitleBox}>
            <span className={styles.docTitle}>{projectData ? `${projectData.projectName.replace(/\s+/g, '_')}.pdf` : 'Loading...'}</span>
            <span className={styles.docSubtitle}>{projectData ? '' : 'Draft'}</span>          </div>
        </div>

        <div className={styles.toolbarCenter}>
          {documentViews.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', marginRight: 24, position: 'relative' }}>
              <span style={{ fontSize: 12, color: 'var(--color-outline)', marginRight: 8, fontWeight: 500 }}>Viewers:</span>
              <div style={{ display: 'flex' }} onClick={() => setShowViewsModal(!showViewsModal)}>
                {groupedViews.slice(0, 5).map((group, i) => {
                  const view = group[0];
                  return (
                    <div 
                      key={view.email} 
                      style={{ 
                        width: 28, height: 28, borderRadius: '50%', backgroundColor: `hsl(${(view.email.length * 40) % 360}, 70%, 85%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        marginLeft: i === 0 ? 0 : -8, border: '2px solid white',
                        color: `hsl(${(view.email.length * 40) % 360}, 70%, 30%)`, fontWeight: 700, fontSize: 12,
                        cursor: 'pointer', position: 'relative', zIndex: 10 - i
                      }}
                      title={`${view.email}\nViewed at: ${view.viewedAt?.toDate ? view.viewedAt.toDate().toLocaleString() : 'N/A'}\nDuration: ${view.durationSeconds >= 60 ? Math.floor(view.durationSeconds / 60) + 'm ' + (view.durationSeconds % 60) + 's' : view.durationSeconds + 's'}`}
                    >
                      {view.email.substring(0, 1).toUpperCase()}
                    </div>
                  );
                })}
                {groupedViews.length > 5 && (
                  <div 
                    style={{ 
                      width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--color-surface-container-high)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      marginLeft: -8, border: '2px solid white',
                      color: 'var(--color-on-surface-variant)', fontWeight: 700, fontSize: 10,
                      cursor: 'pointer', zIndex: 0
                    }}
                  >
                    +{groupedViews.length - 5}
                  </div>
                )}
              </div>
              
              {showViewsModal && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, backgroundColor: 'white', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: 320, padding: 12, zIndex: 100, border: '1px solid var(--color-outline-variant)', maxHeight: 400, overflowY: 'auto' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--color-on-surface)', borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: 8 }}>Histori Pengunjung</h4>
                  {groupedViews.map(group => {
                    const email = group[0].email;
                    const isExpanded = expandedEmails[email];
                    const latestView = group[0];
                    const totalViews = group.length;
                    return (
                      <div key={email} style={{ marginBottom: 12, borderBottom: '1px solid var(--color-surface-container-high)', paddingBottom: 12 }}>
                        {/* Group Header */}
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                          onClick={() => toggleEmailExpansion(email)}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: `hsl(${(email.length * 40) % 360}, 70%, 85%)`, color: `hsl(${(email.length * 40) % 360}, 70%, 30%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                            {email.substring(0, 1).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface)', wordBreak: 'break-all' }}>{email}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-outline)', marginTop: 2 }}>Melihat {totalViews} kali</div>
                          </div>
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-outline)', fontSize: 18 }}>
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                        
                        {/* Group Details (Expanded) */}
                        {isExpanded && (
                          <div style={{ marginTop: 12, marginLeft: 44, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {group.map((view, idx) => (
                              <div key={view.id || idx} style={{ padding: 8, backgroundColor: 'var(--color-surface-container-lowest)', borderRadius: 6, border: '1px solid var(--color-surface-container-low)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
                                  {view.viewedAt?.toDate ? view.viewedAt.toDate().toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--color-primary)', marginTop: 2, fontWeight: 500 }}>
                                  Durasi: {view.durationSeconds >= 60 ? Math.floor(view.durationSeconds / 60) + 'm ' + (view.durationSeconds % 60) + 's' : view.durationSeconds + 's'}
                                </div>
                                {view.device && (
                                  <div style={{ fontSize: 10, color: 'var(--color-outline)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>devices</span>
                                    {view.device}
                                  </div>
                                )}
                                {view.location && (
                                  <div style={{ fontSize: 10, color: 'var(--color-outline)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>location_on</span>
                                    {view.location}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          <button className={styles.zoomBtn} onClick={handleZoomOut} title="Zoom Out">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>remove_circle</span>
          </button>
          <span className={styles.zoomText}>{zoomLevel}%</span>
          <button className={styles.zoomBtn} onClick={handleZoomIn} title="Zoom In">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
          </button>
        </div>

        <div className={styles.toolbarRight}>
          <button className={styles.btnIconOnly} title="Copy JSON Scope" onClick={handleCopyJson}>
            <span className="material-symbols-outlined">content_copy</span>
          </button>

          <button className={styles.btnIconOnly} title="Share Link" onClick={() => setShareModalOpen(true)}>
            <span className="material-symbols-outlined">share</span>
          </button>

          <div className={styles.toolbarDivider}></div>

          <div style={{ position: 'relative' }}>
            <button className={styles.btnIconOnly} title="More Options" onClick={() => setMenuOpen(!menuOpen)}>
              <span className="material-symbols-outlined">more_vert</span>
            </button>

            {menuOpen && (
              <div
                style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, backgroundColor: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 220, padding: '8px 0', zIndex: 100, border: '1px solid var(--color-outline-variant)', display: 'flex', flexDirection: 'column' }}
                onClick={() => setMenuOpen(false)}
              >
                <button style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'var(--color-on-surface)', fontSize: 14, fontFamily: 'var(--font-body-md)' }} onClick={handleCopyJson} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-surface-variant)' }}>content_copy</span>
                  Copy JSON Scope
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'var(--color-on-surface)', fontSize: 14, fontFamily: 'var(--font-body-md)' }} onClick={() => alert("Regenerating proposal...")} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-surface-variant)' }}>refresh</span>
                  Generate Again
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: uploadingLogo ? 'wait' : 'pointer', color: 'var(--color-on-surface)', fontSize: 14, fontFamily: 'var(--font-body-md)' }} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); setMenuOpen(false); }} disabled={uploadingLogo} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-on-surface-variant)' }}>{uploadingLogo ? 'hourglass_empty' : 'upload'}</span>
                  {uploadingLogo ? 'Uploading...' : 'Upload Cover Logo'}
                </button>
              </div>
            )}
          </div>

          <button className={styles.btnDownload} onClick={() => window.print()} style={{ marginLeft: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>download</span>
            Download PDF
          </button>
        </div>
      </header>

      <main className={styles.mainWorkspace}>
        {/* Left Sidebar: Thumbnails */}
        <aside className={`${styles.sidebarLeft} ${showMobileSidebar ? styles.sidebarLeftMobileVisible : ''}`}>
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
                <div key={pageIdx} style={{ width: 794 * (zoomLevel / 100), height: 1123 * (zoomLevel / 100), position: 'relative' }}>
                  <div
                    className={styles.pdfPage}
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top left',
                      width: 794,
                      minHeight: 1123,
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
                              {projectDescription || `Pembuatan ${customProjectName.toLowerCase()} responsif dengan fitur manajemen konten dan optimasi.`}
                            </p>
                            <div className={styles.pdfDuration} style={{ marginTop: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: themeColor }}>schedule</span>
                              <span>Estimated Duration: <strong>
                                {(() => {
                                  if (estimatedDuration.includes(" - ")) {
                                    const parts = estimatedDuration.split(" - ");
                                    if (parts.length === 2 && parts[0].match(/^\d{4}-\d{2}-\d{2}$/) && parts[1].match(/^\d{4}-\d{2}-\d{2}$/)) {
                                      return `${new Date(parts[0]).toLocaleDateString("id-ID", {day: 'numeric', month: 'short', year:'numeric'})} - ${new Date(parts[1]).toLocaleDateString("id-ID", {day: 'numeric', month: 'short', year:'numeric'})}`;
                                    }
                                  }
                                  return estimatedDuration;
                                })()}
                              </strong></span>
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
                                        <div className={`${styles.treeLine} ${row.isLastSubtask ? styles.treeLineLast : ''} ${i === 0 ? styles.treeLineFirstOnPage : ''}`}></div>
                                        <div className={styles.subIndex}>{row.globalModIdx + 1}.{row.subIdx + 1}</div>
                                        <span className={styles.subName}>{sub.name}</span>
                                      </div>
                                    </td>
                                    <td className={styles.subDesc}>{sub.description || sub.desc || sub.deskripsi || '-'}</td>
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
                  </div>

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
          <input type="file" hidden ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" />

          <div className={styles.propertiesList}>

            <div className={styles.propGroup}>
              <label className={styles.propLabel}>Project Data</label>
              <button
                onClick={handleCopyJsonScope}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 14px",
                  backgroundColor: "var(--color-surface-container)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-outline-variant)",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_copy</span>
                Copy JSON Scope
              </button>
              <button
                onClick={handleOpenJsonEditor}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 14px",
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  marginTop: 8
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>data_object</span>
                Edit JSON Scope
              </button>
            </div>

            <div className={styles.propGroup}>
              <label className={styles.propLabel}>Cover Logo</label>
              <div className={styles.brandingBox} onClick={() => !uploadingLogo && fileInputRef.current?.click()} style={{ cursor: uploadingLogo ? 'wait' : 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--color-outline)" }}>
                  {uploadingLogo ? 'hourglass_empty' : 'add_photo_alternate'}
                </span>
                <span style={{ fontSize: 12, marginTop: 8, color: "var(--color-outline)" }}>
                  {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </span>
                <img
                  alt="Agency Logo"
                  className={styles.proposalLogo}
                  src={logoUrl}
                />
              </div>

              {savedLogos.length > 0 && (
                <div className={styles.galleryList}>
                  {savedLogos.map((logo) => (
                    <div
                      key={logo.id}
                      className={`${styles.galleryItem} ${logoUrl === logo.url ? styles.galleryItemActive : ""}`}
                      onClick={() => setLogoUrl(logo.url)}
                    >
                      <img src={logo.url} alt="Saved Logo" className={styles.galleryImage} />
                      <button className={styles.btnDeleteLogo} onClick={(e) => handleDeleteLogo(e, logo)} title="Delete Logo">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                <label className={styles.propLabel}>Project Description</label>
                <textarea className={styles.inputField} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} style={{ minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Pembuatan aplikasi responsif..." />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Client Name</label>
                <input className={styles.inputField} type="text" value={customClientName} onChange={(e) => setCustomClientName(e.target.value)} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Estimated Duration</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input 
                    className={styles.inputField} 
                    type="date" 
                    value={estimatedDuration.split(" - ")[0]?.match(/^\d{4}-\d{2}-\d{2}$/) ? estimatedDuration.split(" - ")[0] : ""} 
                    onChange={(e) => {
                      const d2 = estimatedDuration.split(" - ")[1]?.match(/^\d{4}-\d{2}-\d{2}$/) ? estimatedDuration.split(" - ")[1] : "";
                      setEstimatedDuration(`${e.target.value} - ${d2}`);
                    }} 
                  />
                  <span>-</span>
                  <input 
                    className={styles.inputField} 
                    type="date" 
                    value={estimatedDuration.split(" - ")[1]?.match(/^\d{4}-\d{2}-\d{2}$/) ? estimatedDuration.split(" - ")[1] : ""} 
                    onChange={(e) => {
                      const d1 = estimatedDuration.split(" - ")[0]?.match(/^\d{4}-\d{2}-\d{2}$/) ? estimatedDuration.split(" - ")[0] : "";
                      setEstimatedDuration(`${d1} - ${e.target.value}`);
                    }} 
                  />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                <label className={styles.propLabel}>Additional Notes</label>
                <textarea className={styles.inputField} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Syarat & ketentuan, info pembayaran, dll..." />
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
                <span className={styles.toggleLabel}>Show Watermark</span>
                <div className={`${styles.toggleSwitch} ${isDraft ? styles.on : styles.off}`} onClick={() => setIsDraft(!isDraft)}>
                  <div className={styles.toggleKnob}></div>
                </div>
              </div>
              {isDraft && (
                <>
                  <div className={styles.propGroup}>
                    <label className={styles.propLabel}>Watermark Type</label>
                    <select className={styles.inputField} style={{ appearance: "none" }} value={watermarkType} onChange={(e) => setWatermarkType(e.target.value as any)}>
                      <option value="text">Text</option>
                      <option value="image">Image</option>
                    </select>
                  </div>
                  {watermarkType === "text" ? (
                    <div className={styles.propGroup}>
                      <label className={styles.propLabel}>Watermark Text</label>
                      <input className={styles.inputField} type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="e.g. DRAFT" />
                    </div>
                  ) : (
                    <div className={styles.propGroup}>
                      <label className={styles.propLabel}>Watermark Image</label>
                      <div className={styles.brandingBox} onClick={() => !uploadingWatermark && watermarkInputRef.current?.click()} style={{ cursor: uploadingWatermark ? 'wait' : 'pointer', padding: '12px', minHeight: '60px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--color-outline)" }}>
                          {uploadingWatermark ? 'hourglass_empty' : 'add_photo_alternate'}
                        </span>
                        <span style={{ fontSize: 12, marginTop: 4, color: "var(--color-outline)" }}>
                          {uploadingWatermark ? 'Uploading...' : (watermarkImageUrl ? 'Change Image' : 'Upload Image')}
                        </span>
                        {watermarkImageUrl && <img src={watermarkImageUrl} style={{ maxHeight: 60, marginTop: 12, opacity: 0.5 }} alt="Watermark Preview" />}
                      </div>
                      <input type="file" hidden ref={watermarkInputRef} onChange={handleWatermarkUpload} accept="image/*" />

                      {savedWatermarks.length > 0 && (
                        <div className={styles.galleryList} style={{ marginTop: 12 }}>
                          {savedWatermarks.map((wm) => (
                            <div
                              key={wm.id}
                              className={`${styles.galleryItem} ${watermarkImageUrl === wm.url ? styles.galleryItemActive : ""}`}
                              onClick={() => setWatermarkImageUrl(wm.url)}
                            >
                              <img src={wm.url} alt="Saved Watermark" className={styles.galleryImage} style={{ objectFit: 'contain' }} />
                              <button className={styles.btnDeleteLogo} onClick={(e) => handleDeleteWatermark(e, wm)} title="Delete Watermark">
                                <span className="material-symbols-outlined">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={styles.propGroup}>
                    <label className={styles.propLabel}>Watermark Size {watermarkType === 'text' ? '(px)' : '(width px)'}</label>
                    <input className={styles.inputField} type="number" value={watermarkSize} onChange={(e) => setWatermarkSize(Number(e.target.value))} min={10} max={1000} />
                  </div>
                  <div className={styles.propGroup}>
                    <label className={styles.propLabel}>Watermark Opacity (%)</label>
                    <input className={styles.inputField} type="number" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(Number(e.target.value))} min={1} max={100} />
                  </div>
                </>
              )}
            </div>

          </div>

          <div className={styles.sidebarFooter}>
            <button className={styles.btnSave} onClick={handleSaveDocumentSettings} disabled={isSavingDocument} style={{ cursor: isSavingDocument ? 'wait' : 'pointer' }}>
              {isSavingDocument ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </aside>

      </main>

      {/* Share Modal */}
      {shareModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "var(--color-surface)", padding: 24, borderRadius: 16, width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Share Proposal</h2>
              <button onClick={() => setShareModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-on-surface-variant)" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Link Sharing</div>
                  <div style={{ fontSize: 12, color: "var(--color-on-surface-variant)" }}>Anyone with the link can access</div>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: 40, height: 24 }}>
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isPublic ? "var(--color-primary)" : "#ccc", transition: ".4s", borderRadius: 34 }}>
                    <span style={{ position: "absolute", content: '""', height: 16, width: 16, left: 4, bottom: 4, backgroundColor: "white", transition: ".4s", borderRadius: "50%", transform: isPublic ? "translateX(16px)" : "none" }}></span>
                  </span>
                </label>
              </div>

              {isPublic && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Access Level</label>
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value as "view" | "edit")}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-outline-variant)", backgroundColor: "var(--color-surface)", fontSize: 14 }}
                  >
                    <option value="view">Viewer (Read-only)</option>
                    <option value="edit">Editor (Can change logo, colors, regenerate)</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={copyShareLink} style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "1px solid var(--color-outline)", backgroundColor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_copy</span>
                Copy Link
              </button>
              <button
                onClick={handleSaveShareSettings}
                disabled={isSavingShare}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)", cursor: isSavingShare ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {isSavingShare ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Editor Modal */}
      {showJsonEditor && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Edit JSON Scope</h2>
              <button onClick={() => setShowJsonEditor(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <textarea
              className={styles.jsonTextarea}
              value={jsonEditorValue}
              onChange={(e) => setJsonEditorValue(e.target.value)}
              spellCheck="false"
            />
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setShowJsonEditor(false)}>
                Cancel
              </button>
              <button
                className={styles.btnSave}
                onClick={handleSaveJson}
                disabled={isSavingJson}
                style={{ opacity: isSavingJson ? 0.7 : 1, cursor: isSavingJson ? "wait" : "pointer" }}
              >
                {isSavingJson ? "Saving..." : "Save JSON"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

export default function ProposalPreviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
      <ProposalPreviewContent />
    </Suspense>
  );
}
