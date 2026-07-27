"use client";

import React, { useState, useEffect } from "react";
import styles from "./clients.module.css";
import { auth, db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";

interface ClientData {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  status: "active" | "inactive";
  createdAt: any;
  logoUrl?: string;
  logoPublicId?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const router = useRouter();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    status: "active" as "active" | "inactive",
    logoUrl: "",
    logoPublicId: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        await fetchClients(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchClients = async (uid: string) => {
    try {
      const q = query(
        collection(db, "clients"),
        where("createdBy", "==", uid)
      );
      const snapshot = await getDocs(q);
      const data: ClientData[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as ClientData);
      });
      // Sort manually to avoid Firebase Index requirement
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setClients(data);
    } catch (error: any) {
      console.error("Fetch clients error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      let finalLogoUrl = formData.logoUrl;
      let finalLogoPublicId = formData.logoPublicId;

      if (logoFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(logoFile);
        });
        
        const base64Image = await base64Promise;
        
        const res = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64Image,
            oldPublicId: formData.logoPublicId 
          }),
        });

        if (!res.ok) throw new Error("Failed to upload logo");
        const data = await res.json();
        
        finalLogoUrl = data.url;
        finalLogoPublicId = data.publicId;
      }

      const clientDataToSave = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        status: formData.status,
        ...(finalLogoUrl ? { logoUrl: finalLogoUrl, logoPublicId: finalLogoPublicId } : { logoUrl: "", logoPublicId: "" })
      };

      if (editingClientId) {
        await updateDoc(doc(db, "clients", editingClientId), clientDataToSave);
      } else {
        await addDoc(collection(db, "clients"), {
          ...clientDataToSave,
          createdBy: userId,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
      setEditingClientId(null);
      setFormData({ name: "", company: "", email: "", phone: "", address: "", status: "active", logoUrl: "", logoPublicId: "" });
      setLogoFile(null);
      setLogoPreview(null);
      await fetchClients(userId);
    } catch (error) {
      console.error("Error saving client:", error);
      alert("Failed to save client.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (client: ClientData) => {
    setEditingClientId(client.id);
    setFormData({
      name: client.name,
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      status: client.status,
      logoUrl: client.logoUrl || "",
      logoPublicId: client.logoPublicId || ""
    });
    setLogoFile(null);
    setLogoPreview(client.logoUrl || null);
    setShowModal(true);
  };

  const handleDeleteClient = async (id: string, logoPublicId?: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      if (logoPublicId) {
        await fetch('/api/delete-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: logoPublicId }),
        }).catch(e => console.error("Failed to delete logo:", e));
      }
      await deleteDoc(doc(db, "clients", id));
      if (userId) await fetchClients(userId);
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Clients Directory</h2>
          <p className={styles.subtitle}>Manage your client contacts and information.</p>
        </div>
        <div className={styles.actionRow}>
          <button className={styles.btnPrimary} onClick={() => {
            setEditingClientId(null);
            setFormData({ name: "", company: "", email: "", phone: "", address: "", status: "active", logoUrl: "", logoPublicId: "" });
            setLogoFile(null);
            setLogoPreview(null);
            setShowModal(true);
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
            Add Client
          </button>
        </div>
      </div>

      <div className={styles.glassCard}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tr}>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Company</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Phone</th>
                <th className={styles.th}>Address</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px" }}>Loading clients...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "64px 24px" }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', animation: 'slideUpFade 0.6s ease-out' }}>
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        background: 'var(--color-surface-container-high)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'var(--color-primary)'
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>group_add</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>No clients yet</h3>
                      <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', maxWidth: '300px' }}>
                        Start by adding your first client to manage their information and generate proposals.
                      </p>
                      <button 
                        className={styles.btnPrimary} 
                        onClick={() => setShowModal(true)}
                        style={{ marginTop: '8px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                        Add First Client
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr 
                    className={styles.tr} 
                    key={client.id}
                    onClick={() => router.push(`/dashboard/projects`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className={`${styles.td} ${styles.tdBold}`}>{client.name}</td>
                    <td className={styles.td}>{client.company || "-"}</td>
                    <td className={styles.td}>{client.email || "-"}</td>
                    <td className={styles.td}>{client.phone || "-"}</td>
                    <td className={styles.td}>{client.address || "-"}</td>
                    <td className={styles.td}>
                      <span className={styles.badgeActive} style={{ 
                        backgroundColor: client.status === 'active' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: client.status === 'active' ? '#059669' : '#dc2626'
                      }}>
                        {client.status.toUpperCase()}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <button 
                        className={styles.btnIcon} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(client);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                      </button>
                      <button 
                        className={`${styles.btnIcon} ${styles.btnDelete}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClient(client.id, client.logoPublicId);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.title} style={{ fontSize: "1.25rem" }}>
                {editingClientId ? "Edit Client" : "Add New Client"}
              </h3>
              <button className={styles.btnIcon} onClick={() => setShowModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveClient}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Company Logo (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {logoPreview ? (
                    <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-outline-variant)' }}>
                      <img src={logoPreview} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'white' }} />
                      <button 
                        type="button" 
                        onClick={() => { setLogoPreview(null); setLogoFile(null); setFormData({...formData, logoUrl: '', logoPublicId: ''}); }}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 2, display: 'flex' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed var(--color-outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-outline)' }}>
                      <span className="material-symbols-outlined">image</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        setLogoPreview(URL.createObjectURL(file));
                      }
                    }}
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Client Name *</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Company</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={formData.company} 
                  onChange={e => setFormData({...formData, company: e.target.value})} 
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Email Address</label>
                <input 
                  type="email" 
                  className={styles.input} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="john@example.com"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Phone Number</label>
                <input 
                  type="tel" 
                  className={styles.input} 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Address</label>
                <textarea 
                  className={styles.input} 
                  value={formData.address} 
                  onChange={e => setFormData({...formData, address: e.target.value})} 
                  placeholder="Client full address"
                  style={{ minHeight: "80px", resize: "vertical" }}
                />
              </div>
              
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? "Saving..." : "Save Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
