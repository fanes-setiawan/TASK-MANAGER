"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import styles from "./playstore.module.css";

interface ImagePreview {
  file: File;
  url: string;
  width?: number;
  height?: number;
}

export default function PlayStoreSubmissionPage() {
  const params = useParams();
  const linkId = params?.id as string;

  const [linkData, setLinkData] = useState<any>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [linkError, setLinkError] = useState("");

  // Form Fields
  const [appName, setAppName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  // Demo Account
  const [demoHasAuth, setDemoHasAuth] = useState(false);
  const [demoUsername, setDemoUsername] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [demoOtpPin, setDemoOtpPin] = useState("");
  const [demoInstructions, setDemoInstructions] = useState("");

  // File states
  const [aabFile, setAabFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<ImagePreview | null>(null);
  const [featurePreview, setFeaturePreview] = useState<ImagePreview | null>(null);
  const [screenshots, setScreenshots] = useState<ImagePreview[]>([]);

  // Tablet Screenshots
  const [hasTabletView, setHasTabletView] = useState<"no" | "yes">("no");
  const [tabletScreenshots, setTabletScreenshots] = useState<ImagePreview[]>([]);

  // Validation & Submission States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitError, setSubmitError] = useState("");

  // Error Pop-up Modal State
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [errorModalDetails, setErrorModalDetails] = useState<string[]>([]);

  // Success Pop-up Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedDataInfo, setSubmittedDataInfo] = useState<{
    appName: string;
    clientName: string;
    driveFolderUrl: string;
    ownerPhone: string;
  } | null>(null);

  const aabInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const featureInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const tabletScreenshotInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchLink() {
      if (!linkId) return;
      try {
        const res = await fetch(`/api/playstore/links?id=${linkId}`);
        const data = await res.json();
        if (res.ok && data.link) {
          if (data.link.status === "inactive") {
            setLinkError("Tautan ini telah dinonaktifkan oleh pemilik dan tidak lagi menerima pengumpulan berkas.");
            return;
          }
          setLinkData(data.link);
          if (data.link.appNameTarget) {
            setAppName(data.link.appNameTarget);
          }
        } else {
          setLinkError(data.error || "Link tidak valid");
        }
      } catch (err: any) {
        setLinkError("Gagal memuat link release asset.");
      } finally {
        setLoadingLink(false);
      }
    }
    fetchLink();
  }, [linkId]);

  // Handle .aab file upload
  const handleAabChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".aab")) {
      setErrors((prev) => ({ ...prev, aab: "File harus berformat .aab (Android App Bundle)" }));
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, aab: `Ukuran file .aab (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 500 MB` }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.aab;
      return next;
    });
    setAabFile(file);
  };

  // Handle Logo Upload with image size verification
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo: "Ukuran Logo maksimal 100 MB" }));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width !== 512 || img.height !== 512) {
        setErrors((prev) => ({
          ...prev,
          logo: `Dimensi Logo harus tepat 512 x 512 px (terdeteksi ${img.width}x${img.height} px)`,
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.logo;
          return next;
        });
      }
      setLogoPreview({ file, url, width: img.width, height: img.height });
    };
    img.src = url;
  };

  // Handle Feature Graphic Upload with image size verification
  const handleFeatureGraphicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, featureGraphic: "Ukuran Feature Graphic maksimal 100 MB" }));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width !== 1024 || img.height !== 500) {
        setErrors((prev) => ({
          ...prev,
          featureGraphic: `Dimensi Feature Graphic harus tepat 1024 x 500 px (terdeteksi ${img.width}x${img.height} px)`,
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.featureGraphic;
          return next;
        });
      }
      setFeaturePreview({ file, url, width: img.width, height: img.height });
    };
    img.src = url;
  };

  // Handle Screenshots Upload
  const handleScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (screenshots.length + files.length > 8) {
      setErrors((prev) => ({ ...prev, screenshots: "Maksimal 8 screenshot aplikasi" }));
      return;
    }

    const newItems: ImagePreview[] = [];
    let hasSizeError = false;

    files.forEach((file) => {
      if (file.size > 100 * 1024 * 1024) {
        hasSizeError = true;
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const minDim = Math.min(img.width, img.height);
        const maxDim = Math.max(img.width, img.height);
        if (minDim < 320 || maxDim > 3840) {
          setErrors((prev) => ({
            ...prev,
            screenshots: `Sisi screenshot harus di antara 320px dan 3840px (terdeteksi ${img.width}x${img.height})`,
          }));
        }
      };
      img.src = url;
      newItems.push({ file, url });
    });

    if (hasSizeError) {
      setErrors((prev) => ({ ...prev, screenshots: "Setiap screenshot maksimal berukuran 100 MB" }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.screenshots;
        return next;
      });
    }

    setScreenshots((prev) => [...prev, ...newItems]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Tablet Screenshots Upload
  const handleTabletScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (tabletScreenshots.length + files.length > 8) {
      setErrors((prev) => ({ ...prev, tabletScreenshots: "Maksimal 8 screenshot tablet" }));
      return;
    }

    const newItems: ImagePreview[] = [];
    let hasSizeError = false;

    files.forEach((file) => {
      if (file.size > 100 * 1024 * 1024) {
        hasSizeError = true;
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const minDim = Math.min(img.width, img.height);
        const maxDim = Math.max(img.width, img.height);
        if (minDim < 320 || maxDim > 3840) {
          setErrors((prev) => ({
            ...prev,
            tabletScreenshots: `Sisi screenshot tablet harus di antara 320px dan 3840px (terdeteksi ${img.width}x${img.height})`,
          }));
        }
      };
      img.src = url;
      newItems.push({ file, url });
    });

    if (hasSizeError) {
      setErrors((prev) => ({ ...prev, tabletScreenshots: "Setiap screenshot tablet maksimal berukuran 100 MB" }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.tabletScreenshots;
        return next;
      });
    }

    setTabletScreenshots((prev) => [...prev, ...newItems]);
  };

  const removeTabletScreenshot = (index: number) => {
    setTabletScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper to upload a single file directly to Google Drive via resumable upload session
  const uploadFileToGoogleDriveDirect = async (
    file: File,
    fileCategory: 'aab' | 'logo' | 'featureGraphic' | 'screenshot' | 'tabletScreenshot',
    onProgress?: (loaded: number, total: number) => void
  ): Promise<{ name: string; size: number; id: string; webViewLink?: string; appFolderId?: string; driveFolderUrl?: string }> => {
    // 1. Get resumable session URL from our API
    const sessionRes = await fetch('/api/playstore/upload-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkId,
        appName,
        packageName,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        fileCategory,
      }),
    });

    const sessionData = await sessionRes.json();
    if (!sessionRes.ok || !sessionData.uploadUrl) {
      throw new Error(sessionData.error || `Gagal menyiapkan upload untuk ${file.name}`);
    }

    // 2. Upload file binary directly to Google Drive uploadUrl via PUT
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', sessionData.uploadUrl);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const driveFile = JSON.parse(xhr.responseText);
            resolve({
              name: file.name,
              size: file.size,
              id: driveFile.id,
              webViewLink: driveFile.webViewLink,
              appFolderId: sessionData.appFolderId,
              driveFolderUrl: sessionData.driveFolderUrl,
            });
          } catch {
            resolve({
              name: file.name,
              size: file.size,
              id: 'uploaded',
              appFolderId: sessionData.appFolderId,
              driveFolderUrl: sessionData.driveFolderUrl,
            });
          }
        } else {
          reject(new Error(`Gagal mengunggah ${file.name} ke Google Drive (Status ${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error(`Koneksi terputus saat mengunggah ${file.name}`));
      };

      xhr.send(file);
    });
  };

  // Submit Handler using direct Resumable Upload to Google Drive (Supports AAB up to 500MB & other files up to 100MB)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const newErrors: Record<string, string> = {};

    if (!appName.trim()) newErrors.appName = "Nama Aplikasi wajib diisi";
    if (!packageName.trim()) {
      newErrors.packageName = "Package Name wajib diisi";
    } else if (!/^([a-zA-Z_][a-zA-Z0-9_]*)+(\.[a-zA-Z_][a-zA-Z0-9_]*)+$/.test(packageName.trim())) {
      newErrors.packageName = "Format salah. Contoh: com.perusahaan.namaaplikasi";
    }
    if (!privacyPolicyUrl.trim()) newErrors.privacyPolicyUrl = "Link Kebijakan Privasi wajib diisi";
    if (!email.trim()) newErrors.email = "Email kontak wajib diisi";
    if (!phoneNumber.trim()) newErrors.phoneNumber = "Nomor Telepon wajib diisi";
    if (!shortDescription.trim()) {
      newErrors.shortDescription = "Deskripsi Singkat wajib diisi";
    } else if (shortDescription.length > 80) {
      newErrors.shortDescription = "Maksimal 80 karakter";
    }
    if (!fullDescription.trim()) {
      newErrors.fullDescription = "Deskripsi Lengkap wajib diisi";
    } else if (fullDescription.length > 4000) {
      newErrors.fullDescription = "Maksimal 4.000 karakter";
    }

    // Size limits: AAB max 500MB, Others max 100MB
    if (aabFile && aabFile.size > 500 * 1024 * 1024) {
      newErrors.aab = `Ukuran file .aab (${(aabFile.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 500 MB`;
    }

    if (!logoPreview) {
      newErrors.logo = "Logo Aplikasi (512x512) wajib diunggah";
    } else if (logoPreview.file.size > 100 * 1024 * 1024) {
      newErrors.logo = "Ukuran Logo melebihi batas maksimal 100 MB";
    }

    if (!featurePreview) {
      newErrors.featureGraphic = "Feature Graphic (1024x500) wajib diunggah";
    } else if (featurePreview.file.size > 100 * 1024 * 1024) {
      newErrors.featureGraphic = "Ukuran Feature Graphic melebihi batas maksimal 100 MB";
    }

    if (screenshots.length < 2) {
      newErrors.screenshots = "Minimal 2 screenshot ponsel (maksimal 8)";
    }
    for (const ss of screenshots) {
      if (ss.file.size > 100 * 1024 * 1024) {
        newErrors.screenshots = `Screenshot "${ss.file.name}" melebihi batas maksimal 100 MB`;
        break;
      }
    }

    if (hasTabletView === "yes") {
      if (tabletScreenshots.length < 2) {
        newErrors.tabletScreenshots = "Minimal 2 screenshot tablet (maksimal 8) jika memilih menyertakan view tablet";
      }
      for (const tss of tabletScreenshots) {
        if (tss.file.size > 100 * 1024 * 1024) {
          newErrors.tabletScreenshots = `Screenshot tablet "${tss.file.name}" melebihi batas maksimal 100 MB`;
          break;
        }
      }
    }

    if (demoHasAuth && (!demoUsername || !demoPassword)) {
      newErrors.demoAuth = "Username dan Password demo wajib diisi jika aplikasi memerlukan login";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setErrorModalMessage("Mohon lengkapi atau perbaiki isian data berikut:");
      setErrorModalDetails(Object.values(newErrors));
      setShowErrorModal(true);
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      // Calculate total files to upload
      const totalFiles = (aabFile ? 1 : 0) + 1 + 1 + screenshots.length + (hasTabletView === "yes" ? tabletScreenshots.length : 0);
      let completedFiles = 0;

      const updateOverallProgress = (filePercent: number) => {
        const overall = Math.round(((completedFiles + filePercent / 100) / totalFiles) * 100);
        setUploadProgress(Math.min(99, overall));
      };

      let uploadedAab: any = null;
      let targetAppFolderId = '';
      let targetDriveFolderUrl = '';

      // 1. Upload .AAB if exists (up to 500MB)
      if (aabFile) {
        uploadedAab = await uploadFileToGoogleDriveDirect(aabFile, 'aab', (loaded, total) => {
          updateOverallProgress(Math.round((loaded / total) * 100));
        });
        completedFiles++;
        targetAppFolderId = uploadedAab.appFolderId || '';
        targetDriveFolderUrl = uploadedAab.driveFolderUrl || '';
      }

      // 2. Upload Logo (512x512)
      const uploadedLogo = await uploadFileToGoogleDriveDirect(logoPreview!.file, 'logo', (loaded, total) => {
        updateOverallProgress(Math.round((loaded / total) * 100));
      });
      completedFiles++;
      if (!targetAppFolderId) {
        targetAppFolderId = uploadedLogo.appFolderId || '';
        targetDriveFolderUrl = uploadedLogo.driveFolderUrl || '';
      }

      // 3. Upload Feature Graphic (1024x500)
      const uploadedFg = await uploadFileToGoogleDriveDirect(featurePreview!.file, 'featureGraphic', (loaded, total) => {
        updateOverallProgress(Math.round((loaded / total) * 100));
      });
      completedFiles++;

      // 4. Upload Phone Screenshots
      const uploadedScreenshots: any[] = [];
      for (const ss of screenshots) {
        const ssRes = await uploadFileToGoogleDriveDirect(ss.file, 'screenshot', (loaded, total) => {
          updateOverallProgress(Math.round((loaded / total) * 100));
        });
        uploadedScreenshots.push({
          name: ss.file.name,
          size: ss.file.size,
          id: ssRes.id,
          webViewLink: ssRes.webViewLink,
        });
        completedFiles++;
      }

      // 5. Upload Tablet Screenshots if enabled
      const uploadedTabletScreenshots: any[] = [];
      if (hasTabletView === "yes") {
        for (const tss of tabletScreenshots) {
          const tssRes = await uploadFileToGoogleDriveDirect(tss.file, 'tabletScreenshot', (loaded, total) => {
            updateOverallProgress(Math.round((loaded / total) * 100));
          });
          uploadedTabletScreenshots.push({
            name: tss.file.name,
            size: tss.file.size,
            id: tssRes.id,
            webViewLink: tssRes.webViewLink,
          });
          completedFiles++;
        }
      }

      setUploadProgress(100);

      // 6. Send metadata to server to finalize submission & save README text
      const finalRes = await fetch('/api/playstore/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          appName,
          packageName,
          privacyPolicyUrl,
          email,
          phoneNumber,
          websiteUrl,
          shortDescription,
          fullDescription,
          clientNotes,
          demoHasAuth,
          demoUsername,
          demoPassword,
          demoOtpPin,
          demoInstructions,
          hasTabletView: hasTabletView === 'yes',
          appFolderId: targetAppFolderId,
          driveFolderUrl: targetDriveFolderUrl,
          uploadedAssets: {
            aab: uploadedAab ? {
              name: aabFile!.name,
              size: aabFile!.size,
              id: uploadedAab.id,
              webViewLink: uploadedAab.webViewLink,
            } : null,
            logo: {
              name: logoPreview!.file.name,
              size: logoPreview!.file.size,
              id: uploadedLogo.id,
              webViewLink: uploadedLogo.webViewLink,
            },
            featureGraphic: {
              name: featurePreview!.file.name,
              size: featurePreview!.file.size,
              id: uploadedFg.id,
              webViewLink: uploadedFg.webViewLink,
            },
            screenshots: uploadedScreenshots,
            tabletScreenshots: uploadedTabletScreenshots,
          },
        }),
      });

      const finalData = await finalRes.json();

      if (finalRes.ok && finalData.success) {
        setSubmittedDataInfo({
          appName: finalData.appName || appName,
          clientName: finalData.clientName || linkData?.clientName || "Klien",
          driveFolderUrl: finalData.driveFolderUrl || targetDriveFolderUrl || "",
          ownerPhone: finalData.ownerPhone || linkData?.ownerPhone || "",
        });
        setShowSuccessModal(true);
      } else {
        const errMsg = finalData.error || "Gagal menyimpan data rilis ke database.";
        setSubmitError(errMsg);
        setErrorModalMessage(errMsg);
        setErrorModalDetails([]);
        setShowErrorModal(true);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Terjadi kesalahan saat mengunggah berkas ke Google Drive.";
      setSubmitError(errMsg);
      setErrorModalMessage(errMsg);
      setErrorModalDetails([]);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const getWhatsAppShareUrl = () => {
    if (!submittedDataInfo) return "#";
    // Gunakan nomor telepon owner yang diset (fallback ke nomor default: 6288225409824)
    let rawPhone = (submittedDataInfo.ownerPhone || "088225409824").replace(/\D/g, "");
    if (rawPhone.startsWith("0")) {
      rawPhone = "62" + rawPhone.slice(1);
    }
    const text = encodeURIComponent(
      `Mas,\n\nSaya telah selesai melengkapi seluruh data dan berkas asset rilis Play Store untuk aplikasi *${submittedDataInfo.appName}*.\n\nMohon untuk diperiksa dan diproses lebih lanjut. Terima kasih!`
    );
    return `https://wa.me/${rawPhone}?text=${text}`;
  };

  if (loadingLink) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingCard}>
          <div className={styles.spinnerWrapper}>
            <div className={styles.spinnerRing}></div>
            <span className={styles.spinnerCenterIcon}>🚀</span>
          </div>
          <h2 className={styles.loadingTitle}>Memuat Formulir</h2>
          <p className={styles.loadingSub}>
            Menyiapkan form pengumpulan asset & informasi rilis Play Store...
          </p>
          <div className={styles.loadingDots}>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
          </div>
        </div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.headerCard}>
            <h1 className={styles.title}>Tautan Tidak Valid</h1>
            <p className={styles.subtitle}>{linkError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header Banner */}
        <div className={styles.headerCard}>
          <div className={styles.badge}>
            <span>🚀</span> Google Play Store Release Assets
          </div>
          <h1 className={styles.title}>Asset & Informasi Rilis Aplikasi</h1>
          <p className={styles.subtitle}>
            Silakan lengkapi data, berkas build aplikasi, dan asset visual di bawah ini untuk proses publikasi aplikasi Anda ke Google Play Store.
          </p>
          {linkData?.clientName && (
            <div className={styles.clientTargetBox}>
              Ditujukan untuk: <strong>{linkData.clientName}</strong>
              {linkData.notes && <div>Catatan Developer: {linkData.notes}</div>}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.formCard}>
          {submitError && <div className={styles.alertBox}>{submitError}</div>}

          {/* SECTION 1: BERKAS BUILD APLIKASI (.AAB) */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>1</div>
              <h3 className={styles.sectionTitle}>Berkas Build Aplikasi (.AAB)</h3>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Upload File Android App Bundle (.aab)</span>
                <span className={styles.hint}>Format resmi rilis Google Play Store</span>
              </label>
              <input
                type="file"
                ref={aabInputRef}
                accept=".aab"
                style={{ display: "none" }}
                onChange={handleAabChange}
              />
              <div className={styles.uploadBox} onClick={() => aabInputRef.current?.click()}>
                <span className={styles.uploadIcon}>📦</span>
                <div>
                  <strong>{aabFile ? aabFile.name : "Klik untuk memilih file .aab rilis Anda"}</strong>
                </div>
                <div className={styles.uploadSpecs}>
                  {aabFile
                    ? `Ukuran file: ${(aabFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : "File .aab signed dengan Keystore • Maksimal 500 MB"}
                </div>
              </div>
              {errors.aab && <div className={styles.errorMessage}>{errors.aab}</div>}
              {aabFile && (
                <div className={styles.fileSuccessBadge}>
                  <span>✓</span> File .aab siap diupload: {aabFile.name} ({(aabFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: DATA & INFORMASI APLIKASI */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>2</div>
              <h3 className={styles.sectionTitle}>Data & Informasi Aplikasi</h3>
            </div>

            <div className={styles.formGrid}>
              {/* 01: Nama Aplikasi */}
              <div className={styles.formGroup}>
                <label className={styles.label}>01. Nama Aplikasi *</label>
                <input
                  type="text"
                  className={`${styles.input} ${errors.appName ? styles.inputError : ""}`}
                  placeholder="Contoh: MyFinances App"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
                {errors.appName && <div className={styles.errorMessage}>{errors.appName}</div>}
                <div className={styles.hint}>Nama yang akan ditampilkan di Google Play Store</div>
              </div>

              {/* 02: Package Name */}
              <div className={styles.formGroup}>
                <label className={styles.label}>02. Package Name / Application ID *</label>
                <input
                  type="text"
                  className={`${styles.input} ${errors.packageName ? styles.inputError : ""}`}
                  placeholder="Contoh: com.example.namaaplikasi"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                />
                {errors.packageName && <div className={styles.errorMessage}>{errors.packageName}</div>}
                <div className={styles.hint}>Application ID format domain terbalik (huruf kecil)</div>
              </div>

              {/* 03: Link Kebijakan Privasi */}
              <div className={styles.formGroup}>
                <label className={styles.label}>03. Link Kebijakan Privasi *</label>
                <input
                  type="url"
                  className={`${styles.input} ${errors.privacyPolicyUrl ? styles.inputError : ""}`}
                  placeholder="https://domain.com/privacy-policy"
                  value={privacyPolicyUrl}
                  onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                />
                {errors.privacyPolicyUrl && <div className={styles.errorMessage}>{errors.privacyPolicyUrl}</div>}
                <div className={styles.hint}>URL halaman Privacy Policy yang aktif</div>
              </div>

              {/* 04: Email Kontak */}
              <div className={styles.formGroup}>
                <label className={styles.label}>04. Alamat Email Kontak *</label>
                <input
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                  placeholder="support@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <div className={styles.errorMessage}>{errors.email}</div>}
                <div className={styles.hint}>Email resmi untuk bantuan & informasi kontak Play Store</div>
              </div>

              {/* 05: Nomor Telepon */}
              <div className={styles.formGroup}>
                <label className={styles.label}>05. Nomor Telepon Kontak *</label>
                <input
                  type="tel"
                  className={`${styles.input} ${errors.phoneNumber ? styles.inputError : ""}`}
                  placeholder="+62 812 3456 7890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                {errors.phoneNumber && <div className={styles.errorMessage}>{errors.phoneNumber}</div>}
                <div className={styles.hint}>Nomor telepon kontak/support publik</div>
              </div>

              {/* 06: Link Website */}
              <div className={styles.formGroup}>
                <label className={styles.label}>06. Link Website Aplikasi (Opsional)</label>
                <input
                  type="url"
                  className={styles.input}
                  placeholder="https://domain.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
                <div className={styles.hint}>Website resmi perusahaan atau aplikasi</div>
              </div>

              {/* 07: Deskripsi Singkat */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>
                  <span>07. Deskripsi Singkat *</span>
                  <span className={`${styles.charCount} ${shortDescription.length > 80 ? styles.charCountWarn : ""}`}>
                    {shortDescription.length}/80 karakter
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={80}
                  className={`${styles.input} ${errors.shortDescription ? styles.inputError : ""}`}
                  placeholder="Ringkasan fitur utama aplikasi Anda (maksimal 80 karakter)"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                />
                {errors.shortDescription && <div className={styles.errorMessage}>{errors.shortDescription}</div>}
              </div>

              {/* 08: Deskripsi Lengkap */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>
                  <span>08. Deskripsi Lengkap *</span>
                  <span className={`${styles.charCount} ${fullDescription.length > 4000 ? styles.charCountWarn : ""}`}>
                    {fullDescription.length}/4.000 karakter
                  </span>
                </label>
                <textarea
                  rows={6}
                  maxLength={4000}
                  className={`${styles.textarea} ${errors.fullDescription ? styles.inputError : ""}`}
                  placeholder="Jelaskan fitur lengkap, keunggulan, dan cara penggunaan aplikasi Anda..."
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                ></textarea>
                {errors.fullDescription && <div className={styles.errorMessage}>{errors.fullDescription}</div>}
              </div>
            </div>
          </div>

          {/* SECTION 3: ASSET & STORE LISTING */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>3</div>
              <h3 className={styles.sectionTitle}>Asset & Store Listing</h3>
            </div>

            <div className={styles.formGrid}>
              {/* 09: Logo Aplikasi */}
              <div className={styles.formGroup}>
                <label className={styles.label}>09. Logo Aplikasi *</label>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/png, image/jpeg"
                  style={{ display: "none" }}
                  onChange={handleLogoChange}
                />
                <div className={styles.uploadBox} onClick={() => logoInputRef.current?.click()}>
                  <span className={styles.uploadIcon}>🖼️</span>
                  <div><strong>Klik untuk unggah Logo</strong></div>
                  <div className={styles.uploadSpecs}>PNG/JPEG • Maks 100 MB • <strong>512 × 512 px</strong></div>
                </div>
                {errors.logo && <div className={styles.errorMessage}>{errors.logo}</div>}
                {logoPreview && (
                  <div className={styles.previewContainer}>
                    <img
                      src={logoPreview.url}
                      alt="Preview Logo"
                      className={styles.previewImg}
                      style={{ width: 120, height: 120 }}
                    />
                    <div className={styles.hint} style={{ marginTop: 4 }}>
                      Ukuran: {logoPreview.width}x{logoPreview.height}px ({(logoPreview.file.size / 1024).toFixed(0)} KB)
                    </div>
                  </div>
                )}
              </div>

              {/* 10: Feature Graphic */}
              <div className={styles.formGroup}>
                <label className={styles.label}>10. Feature Graphic / Gambar Fitur *</label>
                <input
                  type="file"
                  ref={featureInputRef}
                  accept="image/png, image/jpeg"
                  style={{ display: "none" }}
                  onChange={handleFeatureGraphicChange}
                />
                <div className={styles.uploadBox} onClick={() => featureInputRef.current?.click()}>
                  <span className={styles.uploadIcon}>🎨</span>
                  <div><strong>Klik untuk unggah Feature Graphic</strong></div>
                  <div className={styles.uploadSpecs}>PNG/JPEG • Maks 100 MB • <strong>1024 × 500 px</strong></div>
                </div>
                {errors.featureGraphic && <div className={styles.errorMessage}>{errors.featureGraphic}</div>}
                {featurePreview && (
                  <div className={styles.previewContainer}>
                    <img
                      src={featurePreview.url}
                      alt="Preview Feature Graphic"
                      className={styles.previewImg}
                      style={{ maxHeight: 110 }}
                    />
                    <div className={styles.hint} style={{ marginTop: 4 }}>
                      Ukuran: {featurePreview.width}x{featurePreview.height}px ({(featurePreview.file.size / 1024).toFixed(0)} KB)
                    </div>
                  </div>
                )}
              </div>

              {/* 11: Screenshot Aplikasi Ponsel */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label className={styles.label}>
                  <span>11. Screenshot Aplikasi Ponsel * (2 - 8 foto)</span>
                  <span className={styles.hint}>Telah dipilih: {screenshots.length} dari 8</span>
                </label>
                <input
                  type="file"
                  ref={screenshotInputRef}
                  accept="image/png, image/jpeg"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleScreenshotsChange}
                />
                <div className={styles.uploadBox} onClick={() => screenshotInputRef.current?.click()}>
                  <span className={styles.uploadIcon}>📱</span>
                  <div><strong>Klik untuk memilih Screenshot Aplikasi (Ponsel)</strong></div>
                  <div className={styles.uploadSpecs}>
                    PNG/JPEG • Maks 100 MB/gambar • Rasio 16:9 atau 9:16 • Rentang sisi 320–3840 px
                  </div>
                </div>
                {errors.screenshots && <div className={styles.errorMessage}>{errors.screenshots}</div>}

                {screenshots.length > 0 && (
                  <div className={styles.previewList}>
                    {screenshots.map((ss, idx) => (
                      <div key={idx} className={styles.previewItem}>
                        <img src={ss.url} alt={`Screenshot ${idx + 1}`} />
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => removeScreenshot(idx)}
                          title="Hapus screenshot"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RADIO: Mau ditambahkan View Tablet? */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`} style={{ marginTop: "0.75rem", padding: "1.25rem", background: "#f8fafc", borderRadius: "0.85rem", border: "1px solid #e2e8f0" }}>
                <label className={styles.label}>
                  <span>Apakah ingin menambahkan Screenshot View Tablet?</span>
                </label>
                <div className={styles.hint} style={{ marginBottom: "0.5rem" }}>
                  Tampilan khusus untuk layar Tablet 7 inci & 10 inci di Google Play Store
                </div>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="tabletViewChoice"
                      value="no"
                      checked={hasTabletView === "no"}
                      onChange={() => setHasTabletView("no")}
                    />
                    <span>Tidak Perlu</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="tabletViewChoice"
                      value="yes"
                      checked={hasTabletView === "yes"}
                      onChange={() => setHasTabletView("yes")}
                    />
                    <span>Ya, Tambahkan View Tablet</span>
                  </label>
                </div>

                {/* FORM UPLOAD TABLET SCREENSHOT JIKA YES */}
                {hasTabletView === "yes" && (
                  <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px dashed #cbd5e1" }}>
                    <label className={styles.label}>
                      <span>Screenshot View Tablet * (2 - 8 foto)</span>
                      <span className={styles.hint}>Telah dipilih: {tabletScreenshots.length} dari 8</span>
                    </label>
                    <input
                      type="file"
                      ref={tabletScreenshotInputRef}
                      accept="image/png, image/jpeg"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleTabletScreenshotsChange}
                    />
                    <div className={styles.uploadBox} onClick={() => tabletScreenshotInputRef.current?.click()}>
                      <span className={styles.uploadIcon}>📟</span>
                      <div><strong>Klik untuk memilih Screenshot Tablet</strong></div>
                      <div className={styles.uploadSpecs}>
                        PNG/JPEG • Maks 100 MB/gambar • Rasio 16:9 atau 9:16 • Rentang sisi 320–3840 px (Landscape/Portrait Tablet)
                      </div>
                    </div>
                    {errors.tabletScreenshots && (
                      <div className={styles.errorMessage}>{errors.tabletScreenshots}</div>
                    )}

                    {tabletScreenshots.length > 0 && (
                      <div className={styles.previewList}>
                        {tabletScreenshots.map((tss, idx) => (
                          <div key={idx} className={styles.previewItem} style={{ aspectRatio: "4/3" }}>
                            <img src={tss.url} alt={`Tablet Screenshot ${idx + 1}`} />
                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() => removeTabletScreenshot(idx)}
                              title="Hapus screenshot tablet"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: AKUN DEMO / LOGIN REVIEW */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>4</div>
              <h3 className={styles.sectionTitle}>Akun Demo Aplikasi (Google Play Review)</h3>
            </div>

            <div className={styles.switchBox}>
              <input
                type="checkbox"
                id="demoAuthCheck"
                checked={demoHasAuth}
                onChange={(e) => setDemoHasAuth(e.target.checked)}
              />
              <label htmlFor="demoAuthCheck" style={{ cursor: "pointer", fontSize: "0.95rem" }}>
                Aplikasi ini <strong>memerlukan login/akun</strong> untuk mengakses fitur di dalamnya
              </label>
            </div>

            {demoHasAuth && (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Username / Email Demo *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="reviewer@domain.com"
                    value={demoUsername}
                    onChange={(e) => setDemoUsername(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Password Demo *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="ReviewPass123!"
                    value={demoPassword}
                    onChange={(e) => setDemoPassword(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>OTP / PIN Statis (Jika ada)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Contoh: 123456"
                    value={demoOtpPin}
                    onChange={(e) => setDemoOtpPin(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Instruksi Login Khusus</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Misal: Pilih server staging / lewati step KYC"
                    value={demoInstructions}
                    onChange={(e) => setDemoInstructions(e.target.value)}
                  />
                </div>
                {errors.demoAuth && (
                  <div className={`${styles.errorMessage} ${styles.fullWidth}`}>{errors.demoAuth}</div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 5: CATATAN / PESAN TAMBAHAN */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionNumber}>5</div>
              <h3 className={styles.sectionTitle}>Catatan atau Pesan Tambahan</h3>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Pesan dari Anda (Opsional)</label>
              <textarea
                rows={4}
                className={styles.textarea}
                placeholder="Tuliskan catatan khusus, preferensi waktu rilis, atau detail lain yang ingin Anda sampaikan ke tim developer..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Progress Indicator when uploading */}
          {submitting && (
            <div className={styles.progressContainer}>
              <div className={styles.progressHeader}>
                <span>Upload Assets</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? `Sedang Mengunggah (${uploadProgress}%)...` : "Kirimkan Semua Asset Rilis 🚀"}
          </button>
        </form>

        {/* MODAL SUCCESS WITH WHATSAPP CONFIRMATION BUTTON */}
        {showSuccessModal && submittedDataInfo && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.modalTitle}>Asset Berhasil Dikirim!</h2>
              <p className={styles.modalDesc}>
                Terima kasih! Seluruh informasi rilis dan berkas asset aplikasi <strong>{submittedDataInfo.appName}</strong> telah berhasil kami terima dan otomatis tersimpan rapi di Google Drive.
              </p>

              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noreferrer"
                className={styles.waBtn}
              >
                <span style={{ fontSize: "1.3rem" }}>💬</span>
                Konfirmasi ke WhatsApp Sekarang
              </a>
            </div>
          </div>
        )}

        {/* MODAL ERROR POPUP (No need to scroll) */}
        {showErrorModal && (
          <div className={styles.modalOverlay} onClick={() => setShowErrorModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.errorIcon}>!</div>
              <h2 className={styles.modalTitle} style={{ color: "#dc2626" }}>Pemberitahuan</h2>
              <p className={styles.modalDesc} style={{ marginBottom: errorModalDetails.length > 0 ? "1rem" : "1.5rem" }}>
                {errorModalMessage}
              </p>

              {errorModalDetails.length > 0 && (
                <div className={styles.errorList}>
                  {errorModalDetails.map((detail, idx) => (
                    <div key={idx} className={styles.errorListItem}>
                      • {detail}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setShowErrorModal(false)}
              >
                Mengerti & Periksa Kembali
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
