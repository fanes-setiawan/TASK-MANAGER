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
  createdAt: string;
  submissionCount: number;
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
                      <button
                        className={styles.btnSecondary}
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        Detail Lengkap
                      </button>
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
                  <th className={styles.th}>Submisi Diterima</th>
                  <th className={styles.th}>Tanggal Dibuat</th>
                  <th className={styles.th}>Aksi Link</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className={styles.tr}>
                    <td className={styles.td}>
                      <strong>{link.clientName}</strong>
                      {link.notes && (
                        <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{link.notes}</div>
                      )}
                    </td>
                    <td className={styles.td}>{link.appNameTarget || "-"}</td>
                    <td className={styles.td}>
                      <span className={styles.badgeSuccess}>
                        {link.submissionCount || 0} Kali Terisi
                      </span>
                    </td>
                    <td className={styles.td}>
                      {link.createdAt ? new Date(link.createdAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className={styles.td}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className={styles.btnSecondary}
                          onClick={() => copyShareLink(link.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle" }}>
                            {copiedId === link.id ? "done" : "content_copy"}
                          </span>{" "}
                          {copiedId === link.id ? "Tersalin!" : "Salin Link"}
                        </button>
                        <a
                          href={`/share/playstore/${link.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.btnSecondary}
                          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
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
              {/* Quick Actions: Download All ZIP & Google Drive */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <button
                  className={styles.btnSuccess}
                  onClick={() => handleDownloadAllZip(selectedSubmission)}
                  disabled={isZipping}
                  style={{ justifyContent: "center" }}
                >
                  <span className="material-symbols-outlined">folder_zip</span>
                  {isZipping ? zipProgressText : "Download Semua Asset (.ZIP)"}
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
                    Buka di Google Drive
                  </a>
                ) : (
                  <button className={styles.btnSecondary} disabled style={{ justifyContent: "center" }}>
                    GDrive Belum Tersedia
                  </button>
                )}
              </div>

              {/* Package & Privacy */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Package Name</div>
                  <div className={styles.detailValue}>
                    <code style={{ background: "#e2e8f0", padding: "0.2rem 0.4rem", borderRadius: "0.3rem" }}>
                      {selectedSubmission.packageName}
                    </code>
                  </div>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Kebijakan Privasi</div>
                  <div className={styles.detailValue}>
                    <a
                      href={selectedSubmission.privacyPolicyUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#2563eb", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      Buka Privacy Policy <span className="material-symbols-outlined" style={{ fontSize: 14 }}>launch</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>Informasi Kontak & Support</div>
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
                  <span>Deskripsi Singkat (Play Store)</span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{selectedSubmission.shortDescription.length}/80 char</span>
                </div>
                <div className={styles.detailValue} style={{ fontWeight: 600 }}>
                  {selectedSubmission.shortDescription}
                </div>
              </div>

              {/* Full Description */}
              <div className={styles.detailItem}>
                <div className={styles.detailLabel}>
                  <span>Deskripsi Lengkap</span>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{selectedSubmission.fullDescription.length}/4000 char</span>
                </div>
                <div className={styles.detailValue} style={{ whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto", background: "#ffffff", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                  {selectedSubmission.fullDescription}
                </div>
              </div>

              {/* Demo Account Info */}
              {selectedSubmission.demoAccount?.hasAuth && (
                <div className={styles.detailItem} style={{ borderLeft: "4px solid #f59e0b" }}>
                  <div className={styles.detailLabel} style={{ color: "#b45309" }}>🔑 Akun Demo Play Store Review</div>
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

