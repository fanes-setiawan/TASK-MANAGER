"use client";
// Trigger recompile

import React, { useState, useRef, useMemo, useEffect } from "react";
import styles from "./new-project.module.css";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/client";
import { 
  saveProject, 
  addNotification, 
  getFixedPricePresets, 
  saveFixedPricePreset, 
  updateFixedPricePreset, 
  deleteFixedPricePreset, 
  FixedPricePreset 
} from "@/lib/firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";

const defaultJson = `{
  "project_id": "TM-2024-0524-001",
  "modules": [
    {
      "name": "Auth",
      "subtasks": [
        { "name": "Handle Token", "desc": "Mengelola token autentikasi user", "points": 3 },
        { "name": "Login", "desc": "Fitur login untuk user", "points": 2.5 },
        { "name": "Register", "desc": "Fitur register user baru", "points": 3.5 },
        { "name": "Release Aplikasi", "desc": "Build & deploy ke App Store / Play Store", "price": 100000 }
      ]
    },
    {
      "name": "Home",
      "subtasks": [
        { "name": "Dashboard", "desc": "Halaman dashboard utama", "points": 4 },
        { "name": "Summary Card", "desc": "Menampilkan ringkasan data penting", "points": 2.5 },
        { "name": "Recent Activity", "desc": "Menampilkan aktivitas terbaru", "points": 2.5 }
      ]
    }
  ]
}`;

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectName: "",
    clientName: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    currency: "IDR (Rp)",
    ratePerPoint: 3000,
    clientLogoUrl: "",
    clientLogoPublicId: "",
  });

  const [configJson, setConfigJson] = useState(defaultJson);
  const [jsonError, setJsonError] = useState(false);
  const [savedClients, setSavedClients] = useState<any[]>([]);

  // Fixed Price Presets state
  const [fixedPresets, setFixedPresets] = useState<FixedPricePreset[]>([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<FixedPricePreset | null>(null);
  const [presetForm, setPresetForm] = useState({ name: "", description: "", price: 100000 });
  const [presetSuccessToast, setPresetSuccessToast] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(collection(db, "clients"), where("createdBy", "==", user.uid));
          const snapshot = await getDocs(q);
          const data: any[] = [];
          snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
          });
          setSavedClients(data);

          // Fetch fixed price presets from Firebase
          const userPresets = await getFixedPricePresets(user.uid);
          setFixedPresets(userPresets);
        } catch (error) {
          console.error("Failed to load clients or presets", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleInsertPresetToJson = (preset: FixedPricePreset) => {
    try {
      let data = JSON.parse(configJson);
      if (!data.modules || !Array.isArray(data.modules) || data.modules.length === 0) {
        data.modules = [{ name: "General", subtasks: [] }];
      }
      
      const newSubtask = {
        name: preset.name,
        desc: preset.description || "",
        price: preset.price
      };
      
      const targetMod = data.modules[0];
      if (!targetMod.subtasks || !Array.isArray(targetMod.subtasks)) {
        targetMod.subtasks = [];
      }
      targetMod.subtasks.push(newSubtask);

      const updated = JSON.stringify(data, null, 2);
      setConfigJson(updated);
      setPresetSuccessToast(`Disisipkan "${preset.name}" (Rp ${preset.price.toLocaleString("id-ID")}) ke JSON!`);
      setTimeout(() => setPresetSuccessToast(""), 3500);
    } catch (e) {
      alert("JSON tidak valid. Harap perbaiki sintaks JSON sebelum menyisipkan preset.");
    }
  };

  const handleOpenNewPresetModal = () => {
    setEditingPreset(null);
    setPresetForm({ name: "", description: "", price: 100000 });
    setShowPresetModal(true);
  };

  const handleOpenEditPresetModal = (preset: FixedPricePreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPreset(preset);
    setPresetForm({ name: preset.name, description: preset.description || "", price: preset.price });
    setShowPresetModal(true);
  };

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus preset task ini?")) return;
    const user = auth.currentUser;
    if (user) {
      await deleteFixedPricePreset(user.uid, presetId);
      const updated = await getFixedPricePresets(user.uid);
      setFixedPresets(updated);
    }
  };

  const handleSavePreset = async () => {
    if (!presetForm.name.trim()) {
      alert("Nama preset wajib diisi");
      return;
    }
    const user = auth.currentUser;
    if (user) {
      try {
        if (editingPreset) {
          await updateFixedPricePreset(user.uid, {
            ...editingPreset,
            name: presetForm.name.trim(),
            description: presetForm.description.trim(),
            price: Number(presetForm.price) || 0
          });
        } else {
          await saveFixedPricePreset(user.uid, {
            name: presetForm.name.trim(),
            description: presetForm.description.trim(),
            price: Number(presetForm.price) || 0
          });
        }
        const updated = await getFixedPricePresets(user.uid);
        setFixedPresets(updated);
        setShowPresetModal(false);
      } catch (err: any) {
        alert("Gagal menyimpan preset: " + err.message);
      }
    }
  };

  // Parse JSON and compute stats
  const parsedData = useMemo(() => {
    try {
      const data = JSON.parse(configJson);
      setJsonError(false);
      
      const modules = Array.isArray(data.modules) ? data.modules : [];
      
      let totalPoints = 0;
      let totalFixedCost = 0;
      modules.forEach((mod: any) => {
        if (mod.subtasks && Array.isArray(mod.subtasks)) {
          mod.subtasks.forEach((sub: any) => {
            const fixed = sub.price ?? sub.cost ?? sub.fixedPrice ?? sub.fixed_price;
            if (fixed !== undefined && fixed !== null && fixed !== "") {
              totalFixedCost += Number(fixed) || 0;
            } else {
              totalPoints += (sub.points || 0);
            }
          });
        } else {
          const fixed = mod.price ?? mod.cost ?? mod.fixedPrice ?? mod.fixed_price;
          if (fixed !== undefined && fixed !== null && fixed !== "") {
            totalFixedCost += Number(fixed) || 0;
          } else {
            totalPoints += (mod.points || 0);
          }
        }
      });
      
      const totalCost = (totalPoints * formData.ratePerPoint) + totalFixedCost;
      
      return {
        modules,
        totalPoints,
        totalCost,
      };
    } catch (e) {
      setJsonError(true);
      return { modules: [], totalPoints: 0, totalCost: 0 };
    }
  }, [configJson, formData.ratePerPoint]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setConfigJson(ev.target.result as string);
      }
    };
    reader.readAsText(file);
  };



  const handleGenerate = async () => {
    if (jsonError) {
      alert("Please fix JSON errors before saving.");
      return;
    }
    
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("User not logged in");

      const projectId = await saveProject({
        ...formData,
        configJson
      }, user.uid);
      
      await addNotification(
        user.uid,
        "Proposal Generated",
        `Your proposal for ${formData.projectName || "a new project"} is ready.`,
        `/dashboard/proposal-preview?projectId=${projectId}`
      );
      
      router.push(`/dashboard/proposal-preview?projectId=${projectId}`);
    } catch (error) {
      console.error(error);
      alert("Error saving project");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Column */}
      <div className={styles.leftCol}>
        
        {/* Project Info Form */}
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ justifyContent: "space-between" }}>
            <h3 className={styles.cardTitle}>Project Information</h3>
            {savedClients.length > 0 && (
              <select 
                className={styles.input} 
                style={{ width: "auto", fontSize: 13, padding: "6px 12px" }}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  if (!selectedId) return;
                  const client = savedClients.find(c => c.id === selectedId);
                  if (client) {
                    setFormData(prev => ({
                      ...prev,
                      clientName: client.name || "",
                      company: client.company || "",
                      email: client.email || "",
                      phone: client.phone || "",
                      address: client.address || "",
                      clientLogoUrl: client.logoUrl || "",
                      clientLogoPublicId: client.logoPublicId || ""
                    }));
                  }
                }}
              >
                <option value="">-- Auto-fill from Client --</option>
                {savedClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company ? `${client.company} (${client.name})` : client.name}
                  </option>
                ))}
              </select>
            )}
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
            <div className={styles.inputGroup}>
              <label className={styles.label}>Address</label>
              <textarea className={styles.input} placeholder="Client Full Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ minHeight: "60px", resize: "vertical" }} />
            </div>
            
            <div className={styles.twoCols}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Currency</label>
                <select className={styles.input} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                  <option>IDR (Rp)</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Rate/Point</label>
                <input 
                  className={styles.input} 
                  type="text" 
                  value={formData.ratePerPoint ? formData.ratePerPoint.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""} 
                  onChange={e => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    setFormData({...formData, ratePerPoint: Number(rawValue)});
                  }} 
                />
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
              {jsonError && <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 8 }}>Invalid JSON</span>}
            </div>
            <div className={styles.editorActions}>
              <input 
                type="file" 
                accept=".json" 
                style={{ display: "none" }} 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <button className={styles.btnUpload} onClick={() => fileInputRef.current?.click()}>
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
            <textarea 
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className={styles.codeArea}
              style={{
                width: "100%",
                height: "250px",
                background: "transparent",
                color: "#e2e8f0",
                fontFamily: "monospace",
                border: "none",
                outline: "none",
                resize: "vertical",
                padding: "16px",
                lineHeight: "1.5"
              }}
              spellCheck="false"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className={styles.actionRow}>
          <button className={styles.btnSecondary} onClick={() => router.push('/dashboard/proposal-preview')}>
            <span className="material-symbols-outlined">visibility</span>
            Preview
          </button>
          <button className={styles.btnPrimary} onClick={handleGenerate} disabled={loading || jsonError}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            {loading ? "Saving..." : "Generate Proposal"}
          </button>
        </div>

      </div>

      {/* Right Column: Live Summary & Fixed Price Presets Catalog */}
      <div className={styles.rightCol}>
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryHeader}>
            Live Summary
            <span className={styles.pulseDot}></span>
          </h3>

          <div className={styles.costBox}>
            <p className={styles.statsLabel}>Estimated Cost</p>
            <div className={styles.costValueRow}>
              <span className={styles.costValue}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currency.slice(0, 3) || 'USD' }).format(parsedData.totalCost)}
              </span>
            </div>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.miniStatBox}>
              <p className={styles.statsLabel}>Story Points</p>
              <p className={styles.miniStatValue}>{parsedData.totalPoints} pts</p>
            </div>
            <div className={styles.miniStatBox}>
              <p className={styles.statsLabel}>Modules</p>
              <p className={styles.miniStatValue}>{parsedData.modules.length}</p>
            </div>
          </div>

          <div className={styles.modulesList} style={{ marginTop: 24 }}>
            <p className={styles.moduleTitle}>Detected Modules ({parsedData.modules.length})</p>
            
            {parsedData.modules.map((mod: any, index: number) => (
              <div className={styles.moduleItem} key={index}>
                <div className={styles.moduleInfo}>
                  <div className={styles.moduleIconWrapper}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {mod.complexity === "high" ? "bolt" : mod.complexity === "medium" ? "layers" : "check_circle"}
                    </span>
                  </div>
                  <span className={styles.moduleName}>{mod.name || "Unnamed Module"}</span>
                </div>
                <span className={styles.modulePts}>{mod.points || 0} pts</span>
              </div>
            ))}
            
            {parsedData.modules.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--color-outline)", fontStyle: "italic", textAlign: "center", marginTop: 16 }}>
                No modules detected in JSON
              </p>
            )}
          </div>
        </div>

        {/* Katalog Task Harga Tetap (Right Sidebar) */}
        <div className={styles.presetCard}>
          <div className={styles.presetHeader}>
            <div className={styles.presetTitleArea}>
              <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 20 }}>
                sell
              </span>
              <h4 className={styles.presetTitle}>Katalog Task Harga Tetap</h4>
            </div>
            <button className={styles.btnAddPreset} onClick={handleOpenNewPresetModal}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Tambah
            </button>
          </div>

          <div className={styles.presetGrid}>
            {fixedPresets.map((preset) => (
              <div 
                key={preset.id} 
                className={styles.presetItem}
                onClick={() => handleInsertPresetToJson(preset)}
                title={preset.description ? `${preset.description} - Klik untuk menyisipkan ke JSON` : "Klik untuk menyisipkan ke JSON"}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--color-primary)" }}>add_circle</span>
                <span className={styles.presetItemName}>{preset.name}</span>
                <span className={styles.priceTag}>Rp {preset.price.toLocaleString("id-ID")}</span>
                
                <div className={styles.presetActions}>
                  <button className={styles.presetActionBtn} onClick={(e) => handleOpenEditPresetModal(preset, e)} title="Edit preset">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                  </button>
                  <button className={styles.presetActionBtn} onClick={(e) => handleDeletePreset(preset.id, e)} title="Hapus preset">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#ef4444" }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {presetSuccessToast && (
            <div className={styles.toastNotification}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              {presetSuccessToast}
            </div>
          )}
        </div>

      </div>

      {/* Preset Create / Edit Modal */}
      {showPresetModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPresetModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingPreset ? "Edit Preset Task" : "Tambah Preset Task Harga Tetap"}</h3>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-outline)" }} onClick={() => setShowPresetModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Nama Task / Fitur</label>
              <input 
                className={styles.input}
                type="text" 
                placeholder="Contoh: Release Aplikasi" 
                value={presetForm.name} 
                onChange={(e) => setPresetForm({ ...presetForm, name: e.target.value })} 
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Deskripsi (Opsional)</label>
              <input 
                className={styles.input}
                type="text" 
                placeholder="Contoh: Build & deploy ke App Store / Play Store" 
                value={presetForm.description} 
                onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })} 
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Harga Tetap (IDR Rp)</label>
              <input 
                className={styles.input}
                type="text" 
                placeholder="100.000" 
                value={presetForm.price ? presetForm.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""} 
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setPresetForm({ ...presetForm, price: Number(raw) });
                }} 
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
              <button className={styles.btnSecondary} onClick={() => setShowPresetModal(false)}>
                Batal
              </button>
              <button className={styles.btnPrimary} onClick={handleSavePreset}>
                Simpan Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
