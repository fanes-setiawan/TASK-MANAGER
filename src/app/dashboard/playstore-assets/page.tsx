"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import styles from "./playstore-assets.module.css";

interface PlayStoreLink {
  id: string;
  userId: string;
  clientName: string;
  appNameTarget?: string;
  notes?: string;
  ownerPhone?: string;
  createdAt: string;
  submissionCount: number;
  status?: "active" | "inactive";
}

interface SubmissionRecord {
  id: string;
  clientName: string;
  appName: string;
  packageName: string;
  privacyPolicyUrl: string;
  email: string;
  phoneNumber: string;
  websiteUrl?: string;
  shortDescription: string;
  fullDescription: string;
  clientNotes?: string;
  demoAccount?: {
    hasAuth: boolean;
    username?: string;
    password?: string;
    otpPin?: string;
    instructions?: string;
  };
  uploadedAssets?: {
    aab?: any;
    logo?: any;
    featureGraphic?: any;
    screenshots?: any[];
    hasTabletView?: boolean;
    tabletScreenshots?: any[];
  };
  driveFolderUrl?: string;
  submittedAt: string;
  status?: "submitted" | "in_review" | "rejected" | "published";
}

export default function PlayStoreAssetsDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"submissions" | "links">("submissions");

  // Google Drive Connection State
  const [gdriveStatus, setGdriveStatus] = useState<any>({ isConnected: false });
  const [loadingGdrive, setLoadingGdrive] = useState(true);

  // Data states
  const [links, setLinks] = useState<PlayStoreLink[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modal Create Link
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientNameInput, setClientNameInput] = useState("");
  const [appNameInput, setAppNameInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [ownerPhoneInput, setOwnerPhoneInput] = useState("088225409824");
  const [creatingLink, setCreatingLink] = useState(false);

  // Submission Detail Drawer
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRecord | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgressText, setZipProgressText] = useState("");

  // Copy notification
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Status updating state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchGoogleDriveStatus(user.uid);
        fetchData(user.uid);
      }
    });
    return () => unsub();
  }, []);

  const fetchGoogleDriveStatus = async (uid: string) => {
    try {
      const res = await fetch(`/api/auth/google/status?userId=${uid}`);
      const data = await res.json();
      setGdriveStatus(data);
    } catch (e) {
      console.error("Failed to load Google Drive status", e);
    } finally {
      setLoadingGdrive(false);
    }
  };

  const fetchData = async (uid: string) => {
    setLoadingData(true);
    try {
      const [linksRes, subsRes] = await Promise.all([
        fetch(`/api/playstore/links?userId=${uid}`),
        fetch(`/api/playstore/submit?userId=${uid}`),
      ]);
      const linksData = await linksRes.json();
      const subsData = await subsRes.json();

      if (linksData.links) setLinks(linksData.links);
      if (subsData.submissions) setSubmissions(subsData.submissions);
    } catch (err) {
      console.error("Error fetching data", err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleConnectDrive = () => {
    if (!currentUser?.uid) return;
    window.location.href = `/api/auth/google?userId=${currentUser.uid}`;
  };

  const handleDisconnectDrive = async () => {
    if (!currentUser?.uid || !confirm("Yakin ingin memutuskan koneksi Google Drive?")) return;
    try {
      await fetch(`/api/auth/google/status?userId=${currentUser.uid}`, { method: "DELETE" });
      setGdriveStatus({ isConnected: false });
    } catch (err) {
      alert("Gagal memutuskan koneksi Google Drive");
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientNameInput.trim()) return;

    setCreatingLink(true);
    try {
      const res = await fetch("/api/playstore/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.uid,
          clientName: clientNameInput,
          appNameTarget: appNameInput,
          notes: notesInput,
          ownerPhone: ownerPhoneInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.link) {
        setLinks([data.link, ...links]);
        setIsModalOpen(false);
        setClientNameInput("");
        setAppNameInput("");
        setNotesInput("");
        setOwnerPhoneInput("");
        setActiveTab("links");
      } else {
        alert(data.error || "Gagal membuat link");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan saat membuat link");
    } finally {
      setCreatingLink(false);
    }
  };

  const copyShareLink = (linkId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/share/playstore/${linkId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(linkId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAllMetadata = (sub: SubmissionRecord) => {
    const fullMeta = `=== PLAY STORE LISTING METADATA ===
App Name           : ${sub.appName}
Package Name       : ${sub.packageName}
Short Description  : ${sub.shortDescription}

Full Description   :
${sub.fullDescription}

=== CONTACT & POLICIES ===
Email              : ${sub.email}
Phone              : ${sub.phoneNumber}
Website            : ${sub.websiteUrl || "-"}
Privacy Policy     : ${sub.privacyPolicyUrl}

=== DEMO ACCOUNT REVIEW ===
Requires Login     : ${sub.demoAccount?.hasAuth ? "Yes" : "No"}
Username           : ${sub.demoAccount?.username || "-"}
Password           : ${sub.demoAccount?.password || "-"}
OTP/PIN            : ${sub.demoAccount?.otpPin || "-"}
Instructions       : ${sub.demoAccount?.instructions || "-"}
`;
    navigator.clipboard.writeText(fullMeta);
    setCopiedField("all_meta");
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Status Change (Idea 2)
  const handleUpdateStatus = async (subId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch("/api/playstore/submit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subId, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((s) => (s.id === subId ? { ...s, status: newStatus as any } : s))
        );
        if (selectedSubmission && selectedSubmission.id === subId) {
          setSelectedSubmission((prev) => prev ? { ...prev, status: newStatus as any } : null);
        }
      } else {
        alert(data.error || "Gagal memperbarui status");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan saat memperbarui status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete Submission (Idea 5)
  const handleDeleteSubmission = async (subId: string, appName: string) => {
    if (!confirm(`Yakin ingin menghapus data submisi untuk "${appName}"? Berkas di Google Drive tidak akan terhapus otomatis.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/playstore/submit?id=${subId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== subId));
        if (selectedSubmission?.id === subId) {
          setSelectedSubmission(null);
        }
      } else {
        alert(data.error || "Gagal menghapus submisi");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus");
    }
  };

  // Toggle Link Active / Inactive (Idea 5)
  const handleToggleLinkStatus = async (link: PlayStoreLink) => {
    const nextStatus = (link.status || "active") === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/playstore/links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: link.id, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setLinks((prev) =>
          prev.map((l) => (l.id === link.id ? { ...l, status: nextStatus } : l))
        );
      } else {
        alert(data.error || "Gagal mengubah status link");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengubah status link");
    }
  };

  // Delete Link (Idea 5)
  const handleDeleteLink = async (linkId: string, clientName: string) => {
    if (!confirm(`Yakin ingin menghapus link klien "${clientName}"? Link ini tidak akan dapat diakses lagi.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/playstore/links?id=${linkId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId));
      } else {
        alert(data.error || "Gagal menghapus link");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus link");
    }
  };

  // Helper WhatsApp Client link (Idea 3)
  const getWhatsAppClientUrl = (phone: string, clientName: string, appName: string, type: "received" | "published") => {
    let clean = (phone || "").replace(/\D/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.substring(1);
    else if (!clean.startsWith("62")) clean = "62" + clean;

    let text = "";
    if (type === "received") {
      text = `Halo ${clientName}, berkas dan informasi rilis untuk aplikasi *${appName}* sudah kami terima dengan lengkap. Kami akan segera memulai proses setup di Google Play Console.`;
    } else {
      text = `Kabar gembira! Aplikasi *${appName}* saat ini sudah berhasil rilis dan live di Google Play Store 🎉 Terima kasih atas kerjasamanya!`;
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "in_review":
        return <span className={styles.badgeInReview}>Review Google</span>;
      case "rejected":
        return <span className={styles.badgeRejected}>Perlu Revisi</span>;
      case "published":
        return <span className={styles.badgePublished}>Live / Terbit</span>;
      case "submitted":
      default:
        return <span className={styles.badgePending}>Menunggu Cek</span>;
    }
  };

  // Download All Assets as a ZIP archive
  const handleDownloadAllZip = async (sub: SubmissionRecord) => {
    setIsZipping(true);
    setZipProgressText("Menyiapkan arsip ZIP...");

    try {
      const zip = new JSZip();

      // 1. Text Summary File
      const textInfo = `DATA & INFORMASI APLIKASI
=========================================
Nama Aplikasi      : ${sub.appName}
Klien              : ${sub.clientName}
Package Name       : ${sub.packageName}
Kebijakan Privasi  : ${sub.privacyPolicyUrl}
Email Kontak       : ${sub.email}
Nomor Telepon      : ${sub.phoneNumber}
Website Resmi      : ${sub.websiteUrl || "-"}

DESKRIPSI SINGKAT:
${sub.shortDescription}

DESKRIPSI LENGKAP:
${sub.fullDescription}

INFORMASI AKUN DEMO REVIEW:
${
  sub.demoAccount?.hasAuth
    ? `Username : ${sub.demoAccount.username}\nPassword : ${sub.demoAccount.password}\nOTP/PIN  : ${
        sub.demoAccount.otpPin || "-"
      }\nInstruksi: ${sub.demoAccount.instructions || "-"}`
    : "Aplikasi tidak memerlukan login."
}

CATATAN / PESAN KLIEN:
${(sub as any).clientNotes || "-"}

Disubmit pada: ${new Date(sub.submittedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
`;
      zip.file(`info_aplikasi_${sub.appName.replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`, textInfo);

      const assets = sub.uploadedAssets;
      const downloadFileBuffer = async (fileId: string): Promise<ArrayBuffer | null> => {
        try {
          const res = await fetch(`/api/playstore/download?submissionId=${sub.id}&fileId=${fileId}`);
          if (!res.ok) return null;
          return await res.arrayBuffer();
        } catch (e) {
          console.warn("Failed to download fileId:", fileId, e);
          return null;
        }
      };

      // 2. Download .aab file if exists
      if (assets?.aab?.id) {
        setZipProgressText("Mengunduh berkas .aab...");
        const buf = await downloadFileBuffer(assets.aab.id);
        if (buf) {
          zip.file(`00_Bundle/${assets.aab.name || "release.aab"}`, buf);
        }
      }

      // 3. Download Logo
      if (assets?.logo?.id) {
        setZipProgressText("Mengunduh Logo (512x512)...");
        const buf = await downloadFileBuffer(assets.logo.id);
        if (buf) {
          const ext = assets.logo.name?.split(".").pop() || "png";
          zip.file(`01_Store_Art/logo_512x512.${ext}`, buf);
        }
      }

      // 4. Download Feature Graphic
      if (assets?.featureGraphic?.id) {
        setZipProgressText("Mengunduh Feature Graphic (1024x500)...");
        const buf = await downloadFileBuffer(assets.featureGraphic.id);
        if (buf) {
          const ext = assets.featureGraphic.name?.split(".").pop() || "png";
          zip.file(`01_Store_Art/feature_graphic_1024x500.${ext}`, buf);
        }
      }

      // 5. Download Screenshots (Phone)
      if (assets?.screenshots && assets.screenshots.length > 0) {
        let idx = 1;
        for (const ss of assets.screenshots) {
          if (ss.id) {
            setZipProgressText(`Mengunduh screenshot ponsel ${idx} dari ${assets.screenshots.length}...`);
            const buf = await downloadFileBuffer(ss.id);
            if (buf) {
              const ext = ss.name?.split(".").pop() || "png";
              zip.file(`02_Screenshots_Phone/screenshot_${String(idx).padStart(2, "0")}.${ext}`, buf);
            }
          }
          idx++;
        }
      }

      // 6. Download Screenshots (Tablet) if exists
      if (assets?.tabletScreenshots && assets.tabletScreenshots.length > 0) {
        let tidx = 1;
        for (const tss of assets.tabletScreenshots) {
          if (tss.id) {
            setZipProgressText(`Mengunduh screenshot tablet ${tidx} dari ${assets.tabletScreenshots.length}...`);
            const buf = await downloadFileBuffer(tss.id);
            if (buf) {
              const ext = tss.name?.split(".").pop() || "png";
              zip.file(`03_Screenshots_Tablet/tablet_screenshot_${String(tidx).padStart(2, "0")}.${ext}`, buf);
            }
          }
          tidx++;
        }
      }

      setZipProgressText("Mengompresi seluruh berkas ke .ZIP...");
      const zipContent = await zip.generateAsync({ type: "blob" });
      const safeName = sub.appName.replace(/[^a-zA-Z0-9_-]/g, "_");
      saveAs(zipContent, `PlayStore_Assets_${safeName}.zip`);
    } catch (err: any) {
      console.error("Gagal mendownload ZIP:", err);
      alert("Terjadi kesalahan saat mengompresi asset ke ZIP: " + (err.message || ""));
    } finally {
      setIsZipping(false);
      setZipProgressText("");
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Play Store Release Assets</h1>
          <p className={styles.subtitle}>
            Kelola link formulir untuk klien & pantau berkas rilis aplikasi yang otomatis masuk ke Google Drive Anda.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
            <span className="material-symbols-outlined">add_link</span>
            Buat Link Baru untuk Klien
          </button>
        </div>
      </div>

      {/* Google Drive Status Banner */}
      <div className={styles.driveCard}>
        <div className={styles.driveInfo}>
          <div className={styles.driveIcon}>
            <span className="material-symbols-outlined">cloud</span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span className={styles.driveTitle}>Penyimpanan Google Drive</span>
              {gdriveStatus.isConnected ? (
                <span className={styles.driveBadgeConnected}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span>
                  Terhubung: {gdriveStatus.email}
                </span>
              ) : (
                <span className={styles.driveBadgeDisconnected}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>warning</span>
                  Belum Terhubung
                </span>
              )}
            </div>
            <p className={styles.driveSub}>
              {gdriveStatus.isConnected
                ? "Seluruh berkas foto & deskripsi yang disubmit klien akan otomatis terorganisir di Google Drive akun ini."
                : "Hubungkan Google Drive Anda agar upload aset dari klien langsung tersimpan ke folder Google Drive rapi milik Anda."}
            </p>
          </div>
        </div>

        <div>
          {gdriveStatus.isConnected ? (
            <button className={styles.btnSecondary} onClick={handleDisconnectDrive}>
              Putuskan Koneksi Drive
            </button>
          ) : (
            <button className={styles.btnPrimary} onClick={handleConnectDrive}>
              <span className="material-symbols-outlined">link</span>
              Hubungkan Google Drive Sekarang
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <div
          className={`${styles.tabItem} ${activeTab === "submissions" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("submissions")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>inbox</span>
          Submisi dari Klien ({submissions.length})
        </div>
        <div
          className={`${styles.tabItem} ${activeTab === "links" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("links")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>link</span>
          Daftar Link Klien ({links.length})
        </div>
      </div>

      {/* TAB 1: SUBMISSIONS LIST */}
      {activeTab === "submissions" && (
        <div className={styles.tableCard}>
          {submissions.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1" }}>
                folder_open
              </span>
              <p style={{ marginTop: "1rem", fontWeight: 600 }}>Belum ada klien yang mengirimkan asset rilis</p>
              <p style={{ fontSize: "0.875rem" }}>Buat link dan bagikan ke klien Anda untuk mulai mengumpulkan asset.</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Aplikasi / Klien</th>
                  <th className={styles.th}>Status Rilis</th>
                  <th className={styles.th}>Package Name</th>
                  <th className={styles.th}>Kontak & Email</th>
                  <th className={styles.th}>Tanggal Submit</th>
                  <th className={styles.th}>Google Drive</th>
                  <th className={styles.th}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} className={styles.tr}>
                    <td className={styles.td}>
                      <strong>{sub.appName}</strong>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Klien: {sub.clientName}</div>
                    </td>
                    <td className={styles.td}>
                      {renderStatusBadge(sub.status)}
                    </td>
                    <td className={styles.td}>
                      <code>{sub.packageName}</code>
                    </td>
                    <td className={styles.td}>
                      <div>{sub.email}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{sub.phoneNumber}</div>
                    </td>
                    <td className={styles.td}>
                      {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "-"}
                    </td>
                    <td className={styles.td}>
                      {sub.driveFolderUrl ? (
                        <a
                          href={sub.driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.badgeSuccess}
                          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>folder</span>
                          Buka di GDrive
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Tidak tersedia</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => setSelectedSubmission(sub)}
                        >
                          Detail
                        </button>
                        <button
                          className={styles.btnDangerOutline}
                          title="Hapus Submisi"
                          onClick={() => handleDeleteSubmission(sub.id, sub.appName)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE LINKS */}
      {activeTab === "links" && (
        <div className={styles.tableCard}>
          {links.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1" }}>
                add_link
              </span>
              <p style={{ marginTop: "1rem", fontWeight: 600 }}>Belum ada link klien yang dibuat</p>
              <button
                className={styles.btnPrimary}
                style={{ marginTop: "0.75rem" }}
                onClick={() => setIsModalOpen(true)}
              >
                Buat Link Sekarang
              </button>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Nama Klien</th>
                  <th className={styles.th}>Target Aplikasi</th>
                  <th className={styles.th}>Status Link</th>
                  <th className={styles.th}>Submisi Diterima</th>
                  <th className={styles.th}>Tanggal Dibuat</th>
                  <th className={styles.th}>Aksi Link</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const isActive = (link.status || "active") === "active";
                  return (
                    <tr key={link.id} className={styles.tr}>
                      <td className={styles.td}>
                        <strong>{link.clientName}</strong>
                        {link.notes && (
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{link.notes}</div>
                        )}
                      </td>
                      <td className={styles.td}>{link.appNameTarget || "-"}</td>
                      <td className={styles.td}>
                        {isActive ? (
                          <span className={styles.badgePublished}>● Aktif</span>
                        ) : (
                          <span className={styles.badgeInactive}>○ Nonaktif</span>
                        )}
                      </td>
                      <td className={styles.td}>
                        <span className={styles.badgeSuccess}>
                          {link.submissionCount || 0} Kali Terisi
                        </span>
                      </td>
                      <td className={styles.td}>
                        {link.createdAt ? new Date(link.createdAt).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td className={styles.td}>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => copyShareLink(link.id)}
                            title="Salin Link Publik"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle" }}>
                              {copiedId === link.id ? "done" : "content_copy"}
                            </span>{" "}
                            {copiedId === link.id ? "Tersalin!" : "Salin"}
                          </button>
                          <a
                            href={`/share/playstore/${link.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.btnSecondary}
                            title="Buka Halaman Form"
                            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                          </a>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => handleToggleLinkStatus(link)}
                            title={isActive ? "Nonaktifkan Tautan" : "Aktifkan Tautan"}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isActive ? "#dc2626" : "#16a34a" }}>
                              {isActive ? "pause_circle" : "play_circle"}
                            </span>
                            {isActive ? "Tutup" : "Buka"}
                          </button>
                          <button
                            className={styles.btnDangerOutline}
                            onClick={() => handleDeleteLink(link.id, link.clientName)}
                            title="Hapus Link"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE LINK MODAL */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Buat Link Pengumpulan Asset Klien</h3>
            <form onSubmit={handleCreateLink}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nama Klien / Perusahaan *</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  placeholder="Contoh: PT Sumber Makmur"
                  value={clientNameInput}
                  onChange={(e) => setClientNameInput(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Nama Target Aplikasi (Opsional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Contoh: Sumber Makmur Mobile"
                  value={appNameInput}
                  onChange={(e) => setAppNameInput(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Nomor WhatsApp Konfirmasi (Opsional)</label>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={ownerPhoneInput}
                  onChange={(e) => setOwnerPhoneInput(e.target.value)}
                />
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                  Setelah klien submit, akan muncul tombol untuk langsung konfirmasi via WA ke nomor ini.
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Catatan Khusus untuk Klien (Opsional)</label>
                <textarea
                  rows={3}
                  className={styles.textarea}
                  placeholder="Contoh: Mohon gunakan logo versi transparent background..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={creatingLink}>
                  {creatingLink ? "Membuat..." : "Buat & Dapatkan Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {selectedSubmission && (
        <div className={styles.modalOverlay} onClick={() => !isZipping && setSelectedSubmission(null)}>
          <div className={styles.detailDrawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <div>
                <h3 className={styles.detailHeaderTitle}>
                  {selectedSubmission.appName}
                </h3>
                <div className={styles.detailHeaderSub}>
                  Disubmit oleh: <strong>{selectedSubmission.clientName}</strong> • {new Date(selectedSubmission.submittedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <button
                className={styles.btnSecondary}
                onClick={() => setSelectedSubmission(null)}
                disabled={isZipping}
              >
                ✕ Tutup
              </button>
            </div>

            <div className={styles.detailGrid}>
              {/* STATUS PIPELINE (Idea 2) */}
              <div className={styles.detailItem} style={{ background: "#f8fafc", border: "1px solid #cbd5e1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>
                    <div className={styles.detailLabel} style={{ marginBottom: "0.25rem" }}>Status Pipeline Rilis</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {renderStatusBadge(selectedSubmission.status)}
                      {updatingStatus && <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Memperbarui...</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Ubah Status:</label>
                    <select
                      className={styles.selectStatus}
                      value={selectedSubmission.status || "submitted"}
                      disabled={updatingStatus}
                      onChange={(e) => handleUpdateStatus(selectedSubmission.id, e.target.value)}
                    >
                      <option value="submitted">🟡 Menunggu Cek</option>
                      <option value="in_review">🔵 Review Google</option>
                      <option value="rejected">🔴 Perlu Revisi</option>
                      <option value="published">🟢 Live / Terbit</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS & COPY ALL METADATA (Idea 1 & 3 & 5) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <button
                  className={styles.btnSuccess}
                  onClick={() => handleDownloadAllZip(selectedSubmission)}
                  disabled={isZipping}
                  style={{ justifyContent: "center" }}
                >
                  <span className="material-symbols-outlined">folder_zip</span>
                  {isZipping ? zipProgressText : "Download ZIP Asset"}
                </button>

                {selectedSubmission.driveFolderUrl ? (
                  <a
                    href={selectedSubmission.driveFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnPrimary}
                    style={{ justifyContent: "center" }}
                  >
                    <span className="material-symbols-outlined">open_in_new</span>
                    Buka Google Drive
                  </a>
                ) : (
                  <button className={styles.btnSecondary} disabled style={{ justifyContent: "center" }}>
                    GDrive Belum Tersedia
                  </button>
                )}
              </div>

              {/* Action Bar: Salin Semua Metadata & Hubungi WA Klien */}
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", background: "#f1f5f9", padding: "0.75rem 1rem", borderRadius: "0.75rem" }}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => copyAllMetadata(selectedSubmission)}
                  style={{ background: "#ffffff", fontWeight: 700 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {copiedField === "all_meta" ? "done" : "content_copy"}
                  </span>
                  {copiedField === "all_meta" ? "Metadata Tersalin!" : "Salin Semua Metadata Play Console"}
                </button>

                {selectedSubmission.phoneNumber && (
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <a
                      href={getWhatsAppClientUrl(selectedSubmission.phoneNumber, selectedSubmission.clientName, selectedSubmission.appName, "received")}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.btnWa}
                      title="Konfirmasi Berkas Diterima ke Klien"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chat</span>
                      WA Klien: Diterima
                    </a>
                    <a
                      href={getWhatsAppClientUrl(selectedSubmission.phoneNumber, selectedSubmission.clientName, selectedSubmission.appName, "published")}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.btnWa}
                      style={{ background: "#059669" }}
                      title="Kabari Klien Aplikasi Sudah Live"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
                      WA Klien: Live!
                    </a>
                  </div>
                )}
              </div>

              {/* Package & Privacy (Idea 1 with copy) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>
                    <span>Package Name</span>
                    <button
                      className={`${styles.copyBtn} ${copiedField === "pkg" ? styles.copyBtnCopied : ""}`}
                      onClick={() => copyToClipboard(selectedSubmission.packageName, "pkg")}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                        {copiedField === "pkg" ? "check" : "content_copy"}
                      </span>
                      {copiedField === "pkg" ? "Salin" : "Salin"}
                    </button>
                  </div>
                  <div className={styles.detailValue}>
                    <code style={{ background: "#e2e8f0", padding: "0.2rem 0.4rem", borderRadius: "0.3rem" }}>
                      {selectedSubmission.packageName}
                    </code>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>
                    <span>Kebijakan Privasi</span>
                    <button
                      className={`${styles.copyBtn} ${copiedField === "privacy" ? styles.copyBtnCopied : ""}`}
                      onClick={() => copyToClipboard(selectedSubmission.privacyPolicyUrl, "privacy")}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                        {copiedField === "privacy" ? "check" : "content_copy"}
                      </span>
                      {copiedField === "privacy" ? "Salin" : "Salin"}
                    </button>
                  </div>
                  <div className={styles.detailValue}>
                    <a
                      href={selectedSubmission.privacyPolicyUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#2563eb", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, wordBreak: "break-all" }}
                    >
                      Buka Privacy Policy <span className="material-symbols-outlined" style={{ fontSize: 14 }}>launch</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>
                  <span>Informasi Kontak & Support</span>
                  <button
                    className={`${styles.copyBtn} ${copiedField === "email" ? styles.copyBtnCopied : ""}`}
                    onClick={() => copyToClipboard(selectedSubmission.email, "email")}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      {copiedField === "email" ? "check" : "content_copy"}
                    </span>
                    {copiedField === "email" ? "Email Tersalin" : "Salin Email"}
                  </button>
                </div>
                <div className={styles.detailValue} style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
                  <div>📧 <strong>Email:</strong> {selectedSubmission.email}</div>
                  <div>📞 <strong>Telepon:</strong> {selectedSubmission.phoneNumber}</div>
                  {selectedSubmission.websiteUrl && (
                    <div>🌐 <strong>Web:</strong> <a href={selectedSubmission.websiteUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>{selectedSubmission.websiteUrl}</a></div>
                  )}
                </div>
              </div>

              {/* Short Description */}
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>
                  <span>Deskripsi Singkat (Play Store) • {selectedSubmission.shortDescription.length}/80 char</span>
                  <button
                    className={`${styles.copyBtn} ${copiedField === "short_desc" ? styles.copyBtnCopied : ""}`}
                    onClick={() => copyToClipboard(selectedSubmission.shortDescription, "short_desc")}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      {copiedField === "short_desc" ? "check" : "content_copy"}
                    </span>
                    {copiedField === "short_desc" ? "Tersalin!" : "Salin"}
                  </button>
                </div>
                <div className={styles.detailValue} style={{ fontWeight: 600 }}>
                  {selectedSubmission.shortDescription}
                </div>
              </div>

              {/* Full Description */}
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>
                  <span>Deskripsi Lengkap • {selectedSubmission.fullDescription.length}/4000 char</span>
                  <button
                    className={`${styles.copyBtn} ${copiedField === "full_desc" ? styles.copyBtnCopied : ""}`}
                    onClick={() => copyToClipboard(selectedSubmission.fullDescription, "full_desc")}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      {copiedField === "full_desc" ? "check" : "content_copy"}
                    </span>
                    {copiedField === "full_desc" ? "Tersalin!" : "Salin"}
                  </button>
                </div>
                <div className={styles.detailValue} style={{ whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto", background: "#ffffff", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                  {selectedSubmission.fullDescription}
                </div>
              </div>

              {/* Demo Account Info */}
              {selectedSubmission.demoAccount?.hasAuth && (
                <div className={styles.detailItem} style={{ borderLeft: "4px solid #f59e0b" }}>
                  <div className={styles.detailLabel} style={{ color: "#b45309" }}>
                    <span>🔑 Akun Demo Play Store Review</span>
                    <button
                      className={`${styles.copyBtn} ${copiedField === "demo_acc" ? styles.copyBtnCopied : ""}`}
                      onClick={() =>
                        copyToClipboard(
                          `Username: ${selectedSubmission.demoAccount?.username || ""}\nPassword: ${
                            selectedSubmission.demoAccount?.password || ""
                          }\nOTP/PIN: ${selectedSubmission.demoAccount?.otpPin || "-"}\nInstruksi: ${
                            selectedSubmission.demoAccount?.instructions || "-"
                          }`,
                          "demo_acc"
                        )
                      }
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                        {copiedField === "demo_acc" ? "check" : "content_copy"}
                      </span>
                      {copiedField === "demo_acc" ? "Tersalin!" : "Salin Akun Demo"}
                    </button>
                  </div>
                  <div className={styles.detailValue} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <div><strong>Username:</strong> {selectedSubmission.demoAccount.username}</div>
                    <div><strong>Password:</strong> {selectedSubmission.demoAccount.password}</div>
                    {selectedSubmission.demoAccount.otpPin && (
                      <div><strong>OTP/PIN:</strong> {selectedSubmission.demoAccount.otpPin}</div>
                    )}
                    {selectedSubmission.demoAccount.instructions && (
                      <div style={{ gridColumn: "span 2" }}><strong>Instruksi:</strong> {selectedSubmission.demoAccount.instructions}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Client Notes */}
              {(selectedSubmission as any).clientNotes && (
                <div className={styles.detailItem} style={{ borderLeft: "4px solid #2563eb" }}>
                  <div className={styles.detailLabel} style={{ color: "#1d4ed8" }}>💬 Catatan / Pesan dari Klien</div>
                  <div className={styles.detailValue} style={{ whiteSpace: "pre-wrap" }}>
                    {(selectedSubmission as any).clientNotes}
                  </div>
                </div>
              )}

              {/* Uploaded Assets Listing */}
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>📦 Berkas & Asset Terunggah</div>
                <div className={styles.detailValue}>
                  {selectedSubmission.uploadedAssets?.aab && (
                    <div style={{ padding: "0.6rem 0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "0.5rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>🤖 Android App Bundle (.aab)</strong>
                        <div style={{ fontSize: "0.8rem", color: "#15803d" }}>
                          {selectedSubmission.uploadedAssets.aab.name || "release.aab"} • {(selectedSubmission.uploadedAssets.aab.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                      {selectedSubmission.uploadedAssets.aab.id && (
                        <a
                          href={`/api/playstore/download?submissionId=${selectedSubmission.id}&fileId=${selectedSubmission.uploadedAssets.aab.id}`}
                          className={styles.assetThumbAction}
                          download
                        >
                          Download
                        </a>
                      )}
                    </div>
                  )}

                  <div className={styles.assetGrid}>
                    {/* Logo */}
                    {selectedSubmission.uploadedAssets?.logo && (
                      <div className={styles.assetThumb}>
                        <span style={{ fontSize: "1.75rem" }}>🖼️</span>
                        <div className={styles.assetThumbName}>Logo (512x512)</div>
                        {selectedSubmission.uploadedAssets.logo.id ? (
                          <a
                            href={`/api/playstore/download?submissionId=${selectedSubmission.id}&fileId=${selectedSubmission.uploadedAssets.logo.id}`}
                            className={styles.assetThumbAction}
                            download
                          >
                            Unduh
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Tersimpan</span>
                        )}
                      </div>
                    )}

                    {/* Feature Graphic */}
                    {selectedSubmission.uploadedAssets?.featureGraphic && (
                      <div className={styles.assetThumb}>
                        <span style={{ fontSize: "1.75rem" }}>🎨</span>
                        <div className={styles.assetThumbName}>Feature Graphic</div>
                        {selectedSubmission.uploadedAssets.featureGraphic.id ? (
                          <a
                            href={`/api/playstore/download?submissionId=${selectedSubmission.id}&fileId=${selectedSubmission.uploadedAssets.featureGraphic.id}`}
                            className={styles.assetThumbAction}
                            download
                          >
                            Unduh
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Tersimpan</span>
                        )}
                      </div>
                    )}

                    {/* Screenshots Phone */}
                    {selectedSubmission.uploadedAssets?.screenshots?.map((ss: any, sIdx: number) => (
                      <div key={sIdx} className={styles.assetThumb}>
                        <span style={{ fontSize: "1.75rem" }}>📱</span>
                        <div className={styles.assetThumbName}>Ponsel {sIdx + 1}</div>
                        {ss.id ? (
                          <a
                            href={`/api/playstore/download?submissionId=${selectedSubmission.id}&fileId=${ss.id}`}
                            className={styles.assetThumbAction}
                            download
                          >
                            Unduh
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Tersimpan</span>
                        )}
                      </div>
                    ))}

                    {/* Screenshots Tablet if present */}
                    {selectedSubmission.uploadedAssets?.tabletScreenshots?.map((tss: any, tIdx: number) => (
                      <div key={`tab-${tIdx}`} className={styles.assetThumb}>
                        <span style={{ fontSize: "1.75rem" }}>📟</span>
                        <div className={styles.assetThumbName}>Tablet {tIdx + 1}</div>
                        {tss.id ? (
                          <a
                            href={`/api/playstore/download?submissionId=${selectedSubmission.id}&fileId=${tss.id}`}
                            className={styles.assetThumbAction}
                            download
                          >
                            Unduh
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Tersimpan</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

