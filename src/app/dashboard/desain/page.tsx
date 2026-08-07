"use client";

import React, { useState } from "react";
import styles from "./desain.module.css";

export type ElementType = 'text' | 'mockup' | 'badge' | 'logo' | 'background' | 'image_card';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string | number;
  icon?: string;
  hidden?: boolean;
  imageUrl?: string;
}

export default function DesainMockupPage() {
  const [elements, setElements] = useState<CanvasElement[]>([
    { id: "Header Label", type: "badge", text: "Sekolahkita.net", icon: "school", x: 120, y: 60, w: 240, color: "black" },
    { id: "Judul", type: "text", text: "Platform Manajemen Sekolah Terlengkap", fontSize: 28, color: "#FFFFFF", x: 40, y: 140, w: 400, fontWeight: "bold" },
    { id: "Subtitle", type: "text", text: "Aman • Cepat • Terintegrasi", fontSize: 18, color: "#FFFFFF", x: 40, y: 250, w: 400, fontWeight: 500 },
    { id: "Mockup", type: "mockup", x: 50, y: 310 },
    { id: "Badge Aman", type: "badge", text: "Lebih Aman", icon: "check", x: -10, y: 380, hidden: true },
    { id: "Badge Cepat", type: "badge", text: "Lebih Cepat", icon: "check", x: 330, y: 480, hidden: true },
    { id: "Badge Efisien", type: "badge", text: "Lebih Efisien", icon: "check", x: -10, y: 580, hidden: true },
    { id: "Badge Hemat", type: "badge", text: "Hemat Kertas", icon: "check", x: 330, y: 680, hidden: true },
  ]);

  const [activeLayer, setActiveLayer] = useState("Mockup");
  const [zoom, setZoom] = useState(82);
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [textAlign, setTextAlign] = useState("center");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  
  const [canvasSize, setCanvasSize] = useState("1080x1920");
  const [is3D, setIs3D] = useState(true);
  const [canvasBackground, setCanvasBackground] = useState('linear-gradient(135deg, #1d4ed8 0%, #10b981 100%)');

  const activeData = elements.find(el => el.id === activeLayer) || { type: 'background' } as any;

  const handlePropChange = (field: string, value: string | number) => {
    setElements(prev => prev.map(el => {
      if (el.id === activeLayer) {
        return { ...el, [field]: value };
      }
      return el;
    }));
  };

  const applyTemplate = (templateId: string) => {
    if (templateId === 'klasik') {
      setElements([
        { id: "Judul", type: "text", text: "Exam Sekolahkita", fontSize: 36, color: "#FFFFFF", x: 120, y: 150, w: 240, fontWeight: "bold" },
        { id: "Subtitle", type: "text", text: "Exambro Ujian Online Lebih Aman, Cepat & Efisien", fontSize: 16, color: "#a7f3d0", x: 120, y: 220, w: 240, fontWeight: "normal" },
        { id: "Mockup", type: "mockup", x: 50, y: 300 },
        { id: "Badge Aman", type: "badge", text: "Lebih Aman", icon: "check", x: -10, y: 380, hidden: false },
        { id: "Badge Cepat", type: "badge", text: "Lebih Cepat", icon: "check", x: 330, y: 480, hidden: false },
        { id: "Badge Efisien", type: "badge", text: "Lebih Efisien", icon: "check", x: -10, y: 580, hidden: false },
        { id: "Badge Hemat", type: "badge", text: "Hemat Kertas", icon: "check", x: 330, y: 680, hidden: false },
      ]);
      setCanvasBackground('linear-gradient(180deg, #1e40af 0%, #047857 100%)');
      setIs3D(false);
    } else {
      setElements([
        { id: "Header Label", type: "badge", text: "Sekolahkita.net", icon: "school", x: 120, y: 60, w: 240, color: "black" },
        { id: "Judul", type: "text", text: "Platform Manajemen Sekolah Terlengkap", fontSize: 28, color: "#FFFFFF", x: 40, y: 140, w: 400, fontWeight: "bold" },
        { id: "Subtitle", type: "text", text: "Aman • Cepat • Terintegrasi", fontSize: 18, color: "#FFFFFF", x: 40, y: 250, w: 400, fontWeight: 500 },
        { id: "Mockup", type: "mockup", x: 50, y: 310 },
        { id: "Badge Aman", type: "badge", text: "Lebih Aman", icon: "check", x: -10, y: 380, hidden: true },
        { id: "Badge Cepat", type: "badge", text: "Lebih Cepat", icon: "check", x: 330, y: 480, hidden: true },
        { id: "Badge Efisien", type: "badge", text: "Lebih Efisien", icon: "check", x: -10, y: 580, hidden: true },
        { id: "Badge Hemat", type: "badge", text: "Hemat Kertas", icon: "check", x: 330, y: 680, hidden: true },
      ]);
      setCanvasBackground('linear-gradient(135deg, #1d4ed8 0%, #10b981 100%)');
      setIs3D(true);
    }
  };

  const [draggingLayer, setDraggingLayer] = useState<string | null>(null);

  React.useEffect(() => {
    if (!draggingLayer) return;

    const handleMouseMove = (e: MouseEvent) => {
      setElements(prev => prev.map(el => {
        if (el.id === draggingLayer) {
           return {
             ...el,
             x: el.x + e.movementX / (zoom / 100),
             y: el.y + e.movementY / (zoom / 100)
           }
        }
        return el;
      }));
    };

    const handleMouseUp = () => {
      setDraggingLayer(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingLayer, zoom]);

  const toggleVisibility = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setElements(prev => prev.map(el => {
      if (el.id === layerId) {
        return { ...el, hidden: !el.hidden };
      }
      return el;
    }));
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 10));

  const handleSimpan = () => alert("Desain berhasil disimpan ke draft!");
  const handleExport = () => alert("Mengekspor gambar... (Fitur ini membutuhkan proses render kanvas)");
  
  return (
    <div className={styles.editorContainer}>
      
      {/* TOP TOOLBAR */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.topBarTitle}>
            <span className={`material-symbols-outlined ${styles.iconApp}`}>auto_awesome_mosaic</span>
            Mockup Release
          </div>
          <div className={styles.projectDropdown}>
            <span className={styles.projectLabel}>Proyek</span>
            <div className={styles.projectSelect}>
              Exam Sekolahkita v1
              <span className="material-symbols-outlined" style={{fontSize: 16}}>expand_more</span>
            </div>
          </div>
        </div>

        <div className={styles.topBarCenter}>
          <div className={styles.iconBtnGroup}>
            <button className={styles.iconBtn}><span className="material-symbols-outlined">undo</span></button>
            <button className={styles.iconBtn}><span className="material-symbols-outlined">redo</span></button>
          </div>
          
          <div className={styles.zoomControl}>
            <button className={styles.iconBtn} onClick={handleZoomOut}><span className="material-symbols-outlined" style={{fontSize:18}}>remove</span></button>
            <span className={styles.zoomValue}>{zoom}%</span>
            <button className={styles.iconBtn} onClick={handleZoomIn}><span className="material-symbols-outlined" style={{fontSize:18}}>add</span></button>
          </div>
        </div>

        <div className={styles.topBarRight}>
          <button className={styles.iconBtn} onClick={() => alert("Bantuan: Pilih elemen di kiri untuk mengedit propertinya di panel kanan.")}><span className="material-symbols-outlined">help_outline</span></button>
          <button className={styles.btnSecondary} onClick={handleSimpan}>Simpan</button>
          <button className={styles.btnPrimary} onClick={handleExport}>
            Export
            <span className="material-symbols-outlined" style={{fontSize:18}}>expand_more</span>
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className={styles.workspace}>
        
        {/* LEFT SIDEBAR */}
        <div className={styles.leftSidebar}>
          <div className={styles.sidebarSection} style={{paddingBottom: 8, display: 'flex', gap: 8, padding: '16px 16px 8px 16px'}}>
            <button className={styles.btnAddElement} style={{flex: 1, padding: '8px 4px', fontSize: 12}} onClick={() => {
              const newId = `Teks ${elements.length + 1}`;
              setElements([...elements, { id: newId, type: 'text', text: "Teks Baru", x: 100, y: 100, fontSize: 24, color: "#ffffff" }]);
              setActiveLayer(newId);
            }}>
              <span className="material-symbols-outlined" style={{fontSize: 16}}>title</span>
              + Teks
            </button>
            <button className={styles.btnAddElement} style={{flex: 1, padding: '8px 4px', fontSize: 12, backgroundColor: '#8b5cf6'}} onClick={() => {
              const newId = `Popup ${elements.length + 1}`;
              setElements([...elements, { id: newId, type: 'image_card', x: 80, y: 300, w: 320 }]);
              setActiveLayer(newId);
            }}>
              <span className="material-symbols-outlined" style={{fontSize: 16}}>layers</span>
              + Popup
            </button>
          </div>
          <h3 className={styles.layersHeader}>Layers</h3>
          
          <div className={styles.layerList} style={{padding: '0 16px 16px 16px'}}>
            <div 
              className={`${styles.layerItem} ${activeLayer === "Background" ? styles.active : ''}`}
              onClick={() => setActiveLayer("Background")}
            >
              <div className={styles.layerLeft}>
                <span className={`material-symbols-outlined ${styles.layerIcon}`}>image</span>
                Background
              </div>
            </div>

            {elements.map(layer => (
              <div 
                key={layer.id} 
                className={`${styles.layerItem} ${activeLayer === layer.id ? styles.active : ''}`}
                onClick={() => setActiveLayer(layer.id)}
              >
                <div className={styles.layerLeft}>
                  <span className={`material-symbols-outlined ${styles.layerIcon}`}>{layer.type === 'text' ? 'title' : layer.type === 'mockup' ? 'smartphone' : layer.type === 'image_card' ? 'layers' : 'verified'}</span>
                  {layer.id}
                </div>
                <span 
                  className="material-symbols-outlined" 
                  style={{fontSize: 16, cursor: 'pointer', color: layer.hidden ? 'var(--color-outline)' : 'inherit'}}
                  onClick={(e) => toggleVisibility(layer.id, e)}
                >
                  {layer.hidden ? "visibility_off" : "visibility"}
                </span>
              </div>
            ))}
          </div>
          
          <div className={styles.bottomSection} style={{ borderTop: '1px solid var(--color-outline-variant)', paddingTop: 16 }}>
            <h3 style={{fontSize: 11, color: 'var(--color-outline)', padding: '0 16px', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700}}>Pilih Template</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px', paddingBottom: 16}}>
               <div onClick={() => applyTemplate('klasik')} style={{
                 padding: 12, borderRadius: 8, cursor: 'pointer', border: !is3D ? '2px solid #2563eb' : '1px solid var(--color-outline-variant)', background: !is3D ? '#eff6ff' : 'white', transition: 'all 0.2s'
               }}>
                  <div style={{fontSize: 13, fontWeight: 600, color: !is3D ? '#1e40af' : 'var(--color-textColor)', marginBottom: 2}}>Klasik (Datar)</div>
                  <div style={{fontSize: 11, color: 'var(--color-outline)', lineHeight: 1.4}}>Desain bersih dengan badge fitur melayang.</div>
               </div>
               <div onClick={() => applyTemplate('modern')} style={{
                 padding: 12, borderRadius: 8, cursor: 'pointer', border: is3D ? '2px solid #2563eb' : '1px solid var(--color-outline-variant)', background: is3D ? '#eff6ff' : 'white', transition: 'all 0.2s'
               }}>
                  <div style={{fontSize: 13, fontWeight: 600, color: is3D ? '#1e40af' : 'var(--color-textColor)', marginBottom: 2}}>Modern (3D)</div>
                  <div style={{fontSize: 11, color: 'var(--color-outline)', lineHeight: 1.4}}>Gaya terkini dengan efek memutar 3D.</div>
               </div>
            </div>
          </div>
        </div>

        {/* CENTER CANVAS */}
        <div className={styles.canvasArea}>
          <div className={styles.canvasToolbar}>
            <span className={styles.canvasSizeLabel}>Ukuran Kanvas</span>
            <select 
              className={styles.canvasSizeSelect} 
              value={canvasSize} 
              onChange={(e) => setCanvasSize(e.target.value)}
              style={{border: '1px solid var(--color-outline-variant)', outline: 'none', background: 'white'}}
            >
              <option value="1080x1920">Play Store Portrait (1080 x 1920)</option>
              <option value="1920x1080">Play Store Landscape (1920 x 1080)</option>
              <option value="1242x2688">App Store 6.5" (1242 x 2688)</option>
              <option value="1242x2208">App Store 5.5" (1242 x 2208)</option>
              <option value="1080x1080">Square / Instagram (1080 x 1080)</option>
              <option value="800x1200">Custom (800 x 1200)</option>
            </select>
            <button className={styles.btnResize}>Ubah Ukuran</button>
          </div>

          <div className={styles.canvasContainer} onClick={() => setActiveLayer("Background")}>
            <div className={styles.mockupPoster} style={{ 
              transform: `scale(${zoom / 100})`, 
              boxShadow: shadowEnabled ? '0 20px 40px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.1)',
              background: canvasBackground,
              width: canvasSize.split('x')[0] && parseInt(canvasSize.split('x')[0]) > parseInt(canvasSize.split('x')[1]) ? 800 : 480,
              height: (canvasSize.split('x')[0] && parseInt(canvasSize.split('x')[0]) > parseInt(canvasSize.split('x')[1]) ? 800 : 480) * (parseInt(canvasSize.split('x')[1]) / parseInt(canvasSize.split('x')[0])),
              position: 'relative',
              outline: activeLayer === "Background" ? '4px solid #2563eb' : 'none'
            }}>
              
              {/* RENDER ELEMENTS */}
              {elements.map(el => {
                if (el.hidden) return null;

                if (el.type === 'text') {
                  return (
                    <div 
                      key={el.id}
                      style={{
                        position: 'absolute',
                        left: el.x, top: el.y,
                        width: el.w ? `${el.w}px` : 'auto',
                        height: el.h ? `${el.h}px` : 'auto',
                        fontSize: `${el.fontSize}px`,
                        color: el.color,
                        fontWeight: el.fontWeight,
                        textAlign: textAlign as any,
                        cursor: 'move',
                        outline: activeLayer === el.id ? '2px dashed #2563eb' : 'none',
                        lineHeight: 1.3
                      }}
                      onMouseDown={(e) => { e.stopPropagation(); setActiveLayer(el.id); setDraggingLayer(el.id); }}
                    >
                      {el.text}
                    </div>
                  );
                }

                if (el.type === 'badge') {
                  return (
                    <div 
                      key={el.id}
                      className={`${styles.featureBadge} ${activeLayer === el.id ? styles.activeElement : ''}`} 
                      style={{
                        position: 'absolute',
                        top: el.y, left: el.x,
                        width: el.w ? `${el.w}px` : 'auto',
                        cursor: 'move',
                        outline: activeLayer === el.id ? '2px dashed #2563eb' : 'none',
                        color: el.color === 'black' ? '#1e293b' : 'white',
                        backgroundColor: el.color === 'black' ? 'white' : '#8b5cf6',
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20
                      }}
                      onMouseDown={(e) => { e.stopPropagation(); setActiveLayer(el.id); setDraggingLayer(el.id); }}
                    >
                       {el.icon && (
                         <div className={styles.badgeIcon} style={{ background: el.color === 'black' ? 'transparent' : 'white' }}>
                           <span className="material-symbols-outlined" style={{fontSize: 16, color: el.color === 'black' ? '#f59e0b' : '#8b5cf6'}}>{el.icon}</span>
                         </div>
                       )}
                       <span style={{fontWeight: 'bold'}}>{el.text}</span>
                    </div>
                  );
                }

                if (el.type === 'image_card') {
                  return (
                    <div 
                      key={el.id}
                      style={{
                        position: 'absolute',
                        top: el.y, left: el.x,
                        width: el.w ? `${el.w}px` : 'auto',
                        height: el.h ? `${el.h}px` : 'auto',
                        backgroundColor: 'white',
                        borderRadius: 16,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        cursor: 'move',
                        outline: activeLayer === el.id ? '4px dashed #2563eb' : 'none',
                      }}
                      onMouseDown={(e) => { e.stopPropagation(); setActiveLayer(el.id); setDraggingLayer(el.id); }}
                    >
                      {el.imageUrl ? (
                        <img src={el.imageUrl} style={{width: '100%', height: '100%', objectFit: el.h ? 'cover' : 'contain', display: 'block'}} />
                      ) : (
                        <div style={{color: '#94a3b8', textAlign: 'center', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                           <span className="material-symbols-outlined" style={{fontSize: 32}}>image</span>
                           <p style={{margin: '8px 0 0 0', fontSize: 12}}>Pilih dari Properti</p>
                        </div>
                      )}
                    </div>
                  );
                }

                if (el.type === 'mockup') {
                  return (
                    <div 
                      key={el.id}
                      className={styles.phoneMockup} 
                      style={{
                        position: 'absolute',
                        top: el.y, left: el.x,
                        transform: is3D ? 'rotateZ(-15deg) rotateX(10deg) rotateY(-15deg) scale(0.95)' : 'none',
                        boxShadow: is3D ? '-30px 40px 50px rgba(0,0,0,0.4)' : 'none',
                        transition: 'transform 0.3s',
                        cursor: 'move',
                        outline: activeLayer === el.id ? '4px dashed #2563eb' : 'none'
                      }}
                      onMouseDown={(e) => { e.stopPropagation(); setActiveLayer(el.id); setDraggingLayer(el.id); }}
                    >
                      <div className={styles.phoneNotch}></div>
                      <div className={styles.phoneScreen} style={{ position: 'relative', overflow: 'hidden' }}>
                        {screenshotUrl ? (
                          <div style={{width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 10}}>
                            <img src={screenshotUrl} alt="Screenshot Mockup" style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
                          </div>
                        ) : (
                          <>
                            <div style={{height: 120, background: '#1e40af', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: '24px 16px', color: 'white'}}>
                              <h3 style={{margin:0, fontSize: 16}}>Selamat Datang di</h3>
                              <p style={{margin:0, fontSize: 12, opacity:0.8}}>Aplikasi CBT Sekolahkita.net</p>
                            </div>
                            <div style={{padding: 16}}>
                                <div style={{width:'100%', height: 120, background: '#e2e8f0', borderRadius: 8, marginBottom: 16}}></div>
                                <div style={{display:'flex', gap: 12, marginBottom: 12}}>
                                  <div style={{flex:1, height: 80, background: '#e2e8f0', borderRadius: 8}}></div>
                                  <div style={{flex:1, height: 80, background: '#e2e8f0', borderRadius: 8}}></div>
                                </div>
                                <div style={{display:'flex', gap: 12}}>
                                  <div style={{flex:1, height: 80, background: '#e2e8f0', borderRadius: 8}}></div>
                                  <div style={{flex:1, height: 80, background: '#e2e8f0', borderRadius: 8}}></div>
                                </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                return null;
              })}

            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - PROPERTIES */}
        <div className={styles.rightSidebar}>
          
          <div className={styles.panelSection}>
            <h4 className={styles.panelTitle}>Properti: {activeLayer}</h4>
          </div>

          {activeLayer === "Background" ? (
            <div className={styles.panelSection}>
              <h4 className={styles.panelTitle}>Latar Belakang (Background)</h4>
              <span className={styles.controlLabel} style={{display:'block', marginBottom:8}}>Warna / Gradasi</span>
              <input 
                type="text" 
                className={styles.inputField} 
                value={canvasBackground} 
                onChange={(e) => setCanvasBackground(e.target.value)} 
                style={{marginBottom: 12}}
              />
              <div style={{display:'flex', gap: 8, flexWrap: 'wrap'}}>
                {['#ffffff', '#1e293b', 'linear-gradient(135deg, #1d4ed8 0%, #10b981 100%)', 'linear-gradient(180deg, #1e40af 0%, #047857 100%)', 'linear-gradient(45deg, #f43f5e 0%, #fb923c 100%)', 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'].map((bg, i) => (
                  <div 
                    key={i} 
                    onClick={() => setCanvasBackground(bg)}
                    style={{width: 32, height: 32, borderRadius: 16, background: bg, cursor: 'pointer', border: '1px solid #cbd5e1'}}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className={styles.panelSection}>
                <h4 className={styles.panelTitle}>Posisi & Ukuran</h4>
                
                {/* Tampilkan input teks jika layer mendukung teks */}
                {(activeData.type === 'text' || activeData.type === 'badge') && (
                  <div style={{marginBottom: 16}}>
                    <span className={styles.inputLabel} style={{display:'block', marginBottom:4}}>Teks Konten</span>
                    <input 
                      type="text" 
                      className={styles.inputField} 
                      value={activeData.text || ""} 
                      onChange={(e) => handlePropChange('text', e.target.value)} 
                    />
                  </div>
                )}

                {/* Input untuk mengunggah gambar saat layer Screenshot atau Popup dipilih */}
                {(activeData.type === 'mockup' || activeData.type === 'image_card') && (
                  <div style={{marginBottom: 16}}>
                    <span className={styles.inputLabel} style={{display:'block', marginBottom:8}}>{activeData.type === 'mockup' ? 'Upload Gambar Mockup' : 'Upload Gambar Popup'}</span>
                    <div style={{
                      border: '2px dashed var(--color-outline)', 
                      borderRadius: 8, 
                      padding: 24, 
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <span className="material-symbols-outlined" style={{fontSize: 32, color: 'var(--color-outline)'}}>cloud_upload</span>
                      <p style={{margin: '8px 0 0 0', fontSize: 13, color: 'var(--color-on-surface-variant)', fontWeight: 500}}>Klik untuk Upload Gambar</p>
                      <p style={{margin: '4px 0 0 0', fontSize: 11, color: 'var(--color-outline)'}}>Format PNG/JPG</p>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            if (activeData.type === 'mockup') {
                               setScreenshotUrl(url);
                            } else {
                               handlePropChange('imageUrl', url);
                            }
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          opacity: 0,
                          cursor: 'pointer',
                          width: '100%', height: '100%'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className={styles.grid2Col}>
                  <div className={styles.inputGroup}>
                    <span className={styles.inputLabel}>X</span>
                    <input type="number" className={styles.inputField} value={Math.round(activeData.x || 0)} onChange={(e) => handlePropChange('x', Number(e.target.value))} />
                  </div>
                  <div className={styles.inputGroup}>
                    <span className={styles.inputLabel}>Y</span>
                    <input type="number" className={styles.inputField} value={Math.round(activeData.y || 0)} onChange={(e) => handlePropChange('y', Number(e.target.value))} />
                  </div>
                </div>
                <div className={styles.grid2Col}>
                  <div className={styles.inputGroup}>
                    <span className={styles.inputLabel}>W</span>
                    <input type="number" className={styles.inputField} value={activeData.w || 0} onChange={(e) => handlePropChange('w', Number(e.target.value))} />
                  </div>
                  <div className={styles.inputGroup}>
                    <span className={styles.inputLabel}>H</span>
                    <input type="number" className={styles.inputField} value={activeData.h || 0} onChange={(e) => handlePropChange('h', Number(e.target.value))} />
                  </div>
                </div>
              </div>

              {activeData.type === 'text' && (
                <div className={`${styles.panelSection} ${styles.last}`}>
                  <h4 className={styles.panelTitle}>Gaya Teks</h4>
                  
                  <span className={styles.controlLabel} style={{display:'block', marginBottom:4}}>Font Weight</span>
                  <select className={styles.selectField} value={activeData.fontWeight || 'normal'} onChange={(e) => handlePropChange('fontWeight', e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="500">Medium</option>
                    <option value="bold">Bold</option>
                    <option value="900">Black</option>
                  </select>

                  <span className={styles.controlLabel} style={{display:'block', marginBottom:4}}>Size & Color</span>
                  <div className={styles.colorInputRow}>
                    <input type="number" className={styles.inputField} style={{width: 60, flex: 'none'}} value={activeData.fontSize || 42} onChange={(e) => handlePropChange('fontSize', Number(e.target.value))} />
                    <div className={styles.colorPreview} style={{backgroundColor: activeData.color || '#FFFFFF'}}></div>
                    <input type="text" className={styles.inputField} value={activeData.color || '#FFFFFF'} onChange={(e) => handlePropChange('color', e.target.value)} />
                  </div>

                  <div className={styles.textAlignGroup}>
                    <button className={styles.alignBtn} style={{backgroundColor: textAlign === 'left' ? '#f1f5f9' : 'white'}} onClick={() => setTextAlign('left')}><span className="material-symbols-outlined" style={{fontSize:18}}>format_align_left</span></button>
                    <button className={styles.alignBtn} style={{backgroundColor: textAlign === 'center' ? '#f1f5f9' : 'white'}} onClick={() => setTextAlign('center')}><span className="material-symbols-outlined" style={{fontSize:18}}>format_align_center</span></button>
                    <button className={styles.alignBtn} style={{backgroundColor: textAlign === 'right' ? '#f1f5f9' : 'white'}} onClick={() => setTextAlign('right')}><span className="material-symbols-outlined" style={{fontSize:18}}>format_align_right</span></button>
                    <button className={styles.alignBtn} style={{backgroundColor: textAlign === 'justify' ? '#f1f5f9' : 'white'}} onClick={() => setTextAlign('justify')}><span className="material-symbols-outlined" style={{fontSize:18}}>format_align_justify</span></button>
                  </div>
                </div>
              )}
            </>
          )}
          
        </div>
      </div>
    </div>
  );
}
