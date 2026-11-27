"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./desain.module.css";
import { DraggableDialog } from "@/components/DraggableDialog";
import * as htmlToImage from "html-to-image";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";
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

export interface PageData {
  id: string;
  elements: CanvasElement[];
  canvasSize: string;
  canvasBackground: string;
  canvasBgImage: string | null;
  canvasBgOpacity: number;
  canvasBgMode: 'cover' | 'pattern';
  canvasBgScale: number;
  canvasBgPattern?: string;
  mockupFrame: 'iphone15' | 'iphone13' | 'android';
  is3D?: boolean;
}

export interface Project {
  id: string;
  name: string;
  updatedAt: number;
  pages: PageData[];
}


const initialElements: CanvasElement[] = [
  { id: "Header Label", type: "badge", text: "Sekolahkita.net", icon: "school", x: 120, y: 60, color: "black" },
  { id: "Judul", type: "text", text: "Platform Manajemen Sekolah Terlengkap", fontSize: 28, color: "#FFFFFF", x: 40, y: 140, w: 400, fontWeight: "bold" },
  { id: "Subtitle", type: "text", text: "Aman • Cepat • Terintegrasi", fontSize: 18, color: "#FFFFFF", x: 40, y: 250, w: 400, fontWeight: 500 },
  { id: "Mockup", type: "mockup", x: 50, y: 310 },
  { id: "Badge Aman", type: "badge", text: "Lebih Aman", icon: "check", x: -10, y: 380, hidden: true },
  { id: "Badge Cepat", type: "badge", text: "Lebih Cepat", icon: "check", x: 330, y: 480, hidden: true },
  { id: "Badge Efisien", type: "badge", text: "Lebih Efisien", icon: "check", x: -10, y: 580, hidden: true },
  { id: "Badge Hemat", type: "badge", text: "Hemat Kertas", icon: "check", x: 330, y: 680, hidden: true },
];

export default function DesainMockupPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pages, setPages] = useState<PageData[]>([
    { 
      id: "Page 1", 
      elements: initialElements, 
      canvasSize: '1080x2400', 
      canvasBackground: 'linear-gradient(135deg, #1e40af 0%, #047857 100%)',
      canvasBgImage: null,
      canvasBgOpacity: 1,
      canvasBgMode: 'cover',
      canvasBgScale: 100,
      canvasBgPattern: 'none',
      mockupFrame: 'android',
      is3D: true
    }
  ]);
  const [activePageId, setActivePageId] = useState<string>('Page 1');
  const [showLayers, setShowLayers] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [zIndices, setZIndices] = useState({ layers: 100, templates: 101, properties: 102 });

  const bringToFront = (key: 'layers' | 'templates' | 'properties') => {
    const maxZ = Math.max(zIndices.layers, zIndices.templates, zIndices.properties);
    if (zIndices[key] !== maxZ) {
      setZIndices(prev => ({ ...prev, [key]: maxZ + 1 }));
    }
  };

  // NEW STATES
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("Proyek Baru");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportPages, setSelectedExportPages] = useState<string[]>([]);
  const [isExportingMultiple, setIsExportingMultiple] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Multi-Device Export Targets: user designs once, exports to chosen device formats
  interface DeviceTarget {
    id: string;
    label: string;
    platform: 'android' | 'ios' | 'tablet';
    width: number;
    height: number;
    mockupFrame: 'android' | 'iphone15' | 'iphone13';
    description: string;
  }

  const availableDeviceTargets: DeviceTarget[] = [
    { id: 'android_phone', label: 'Android Phone (Play Store)', platform: 'android', width: 1080, height: 2400, mockupFrame: 'android', description: 'Standar rilis Google Play Store (9:20)' },
    { id: 'iphone_pro_max', label: 'iPhone 16 Pro Max (6.9" / 6.7")', platform: 'ios', width: 1290, height: 2796, mockupFrame: 'iphone15', description: 'Standar wajib App Store iOS terbaru' },
    { id: 'iphone_standard', label: 'iPhone 6.5" / 6.1" (iOS)', platform: 'ios', width: 1242, height: 2688, mockupFrame: 'iphone13', description: 'Kompatibilitas luas generasi iPhone' },
    { id: 'ipad_pro', label: 'iPad Pro / Tablet 10" (Landscape/Portrait)', platform: 'tablet', width: 2048, height: 2732, mockupFrame: 'android', description: 'Ukuran tablet Google Play & Apple iPad' },
  ];

  const [selectedDevices, setSelectedDevices] = useState<string[]>(['android_phone', 'iphone_pro_max']);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const res = await fetch(`/api/mockups?userId=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            setProjects(data.projects || []);
            
            const savedActiveProject = localStorage.getItem('activeProjectId');
            if (savedActiveProject) {
              const project = data.projects?.find((p: Project) => p.id === savedActiveProject);
              if (project) {
                setActiveProjectId(project.id);
                setProjectName(project.name);
                setPages(project.pages);
                if (project.pages.length > 0) setActivePageId(project.pages[0].id);
              }
            }
          }
        } catch (error) {
          console.error("Failed to load projects via API", error);
        }
      } else {
        setProjects([]);
      }
    });
    return () => unsubscribe();
  }, []);

// Variables relocated slightly below where activePageData is initially defined.

const getPatternStyle = (pattern: string) => {
  switch(pattern) {
    case 'grid':
      return {
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      };
    case 'dots':
      return {
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 2px, transparent 2px)',
        backgroundSize: '20px 20px'
      };
    case 'isometric':
      return {
        backgroundImage: `linear-gradient(30deg, rgba(255,255,255,0.15) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.15) 87.5%, rgba(255,255,255,0.15)),
                          linear-gradient(150deg, rgba(255,255,255,0.15) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.15) 87.5%, rgba(255,255,255,0.15)),
                          linear-gradient(30deg, rgba(255,255,255,0.15) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.15) 87.5%, rgba(255,255,255,0.15)),
                          linear-gradient(150deg, rgba(255,255,255,0.15) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.15) 87.5%, rgba(255,255,255,0.15)),
                          linear-gradient(60deg, rgba(255,255,255,0.2) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.2) 75%, rgba(255,255,255,0.2)),
                          linear-gradient(60deg, rgba(255,255,255,0.2) 25%, transparent 25.5%, transparent 75%, rgba(255,255,255,0.2) 75%, rgba(255,255,255,0.2))`,
        backgroundSize: '40px 70px',
        backgroundPosition: '0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px'
      };
    case 'waves':
      return {
        backgroundImage: `radial-gradient(circle at 100% 50%, transparent 20%, rgba(255,255,255,0.15) 21%, rgba(255,255,255,0.15) 34%, transparent 35%, transparent),
                          radial-gradient(circle at 0% 50%, transparent 20%, rgba(255,255,255,0.15) 21%, rgba(255,255,255,0.15) 34%, transparent 35%, transparent)`,
        backgroundSize: '40px 40px',
        backgroundPosition: '0 0, 20px 20px'
      };
    case 'polygons':
      return {
        backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.15) 25%, transparent 25%),
                          linear-gradient(225deg, rgba(255,255,255,0.15) 25%, transparent 25%),
                          linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%),
                          linear-gradient(315deg, rgba(255,255,255,0.15) 25%, transparent 25%)`,
        backgroundSize: '40px 40px',
        backgroundPosition: '20px 0, 20px 0, 0 0, 0 0'
      }
    default:
      return {};
  }
};

  const updatePageProperty = (updates: Partial<PageData>) => {
    setPages(prev => prev.map(p => {
      if (p.id === activePageId) return { ...p, ...updates };
      return p;
    }));
  };

  const setElements = (updater: React.SetStateAction<CanvasElement[]>) => {
    setPages(prev => prev.map(p => {
      if (p.id === activePageId) {
        const nextElements = typeof updater === 'function' ? updater(p.elements) : updater;
        return { ...p, elements: nextElements };
      }
      return p;
    }));
  };

  const [activeLayer, setActiveLayer] = useState("Mockup");
  const [zoom, setZoom] = useState(45);
  const activeZoom = (isExporting || isExportingMultiple) ? 100 : zoom;
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [textAlign, setTextAlign] = useState("center");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  
  const [guides, setGuides] = useState<{x: number | null, y: number | null}>({x: null, y: null});

  const activePageData = pages.find(p => p.id === activePageId) || pages[0];
  const elements = activePageData.elements;
  const canvasSize = activePageData.canvasSize;
  const canvasBackground = activePageData.canvasBackground;
  const canvasBgImage = activePageData.canvasBgImage;
  const canvasBgOpacity = activePageData.canvasBgOpacity;
  const canvasBgMode = activePageData.canvasBgMode;
  const canvasBgScale = activePageData.canvasBgScale;
  const canvasBgPattern = activePageData.canvasBgPattern || 'none';
  const mockupFrame = activePageData.mockupFrame || 'iphone13';
  const is3D = activePageData.is3D ?? false;

  // Dimensi Kanvas Responsif & Akurat
  const { width: currentCanvasWidth, height: currentCanvasHeight } = React.useMemo(() => {
    const parts = (canvasSize || '1080x1920').split('x');
    const rawW = parseInt(parts[0], 10) || 1080;
    const rawH = parseInt(parts[1], 10) || 1920;
    const isLandscape = rawW > rawH;

    if (canvasSize === '1024x500') {
      return { width: 800, height: 390 };
    }
    if (canvasSize === '512x512' || canvasSize === '1024x1024' || canvasSize === '1080x1080') {
      return { width: 520, height: 520 };
    }
    if (isLandscape) {
      const width = 800;
      const height = Math.round(width * (rawH / rawW));
      return { width, height };
    }
    const width = 450;
    const height = Math.round(width * (rawH / rawW));
    return { width, height };
  }, [canvasSize]);

  // Import dari Play Store Submissions State
  const [showImportModal, setShowImportModal] = useState(false);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const fetchSubmissionsForImport = async () => {
    if (!currentUser?.uid) return;
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/playstore/submit?userId=${currentUser.uid}`);
      const data = await res.json();
      if (data.submissions) {
        setSubmissionsList(data.submissions);
      }
    } catch (err) {
      console.error("Failed to load submissions for import", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleImportSubmissionAssets = (sub: any) => {
    // 1. Update Project Name
    setProjectName(`Mockup - ${sub.appName}`);

    // 2. Kumpulkan screenshots yang ada
    const phoneScreens = sub.uploadedAssets?.screenshots || [];
    const appLogo = sub.uploadedAssets?.logo;

    if (phoneScreens.length > 0) {
      const newPages: PageData[] = phoneScreens.map((ss: any, idx: number) => {
        const downloadUrl = `/api/playstore/download?submissionId=${sub.id}&fileId=${ss.id}`;
        return {
          id: `Page ${idx + 1}`,
          canvasSize: '1080x2400',
          canvasBackground: 'linear-gradient(135deg, #1e40af 0%, #047857 100%)',
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'android',
          is3D: idx === 0, // Page 1 3D hero, halaman lainnya flat
          elements: [
            {
              id: 'Header Label',
              type: 'badge',
              text: sub.appName,
              imageUrl: appLogo?.id ? `/api/playstore/download?submissionId=${sub.id}&fileId=${appLogo.id}` : undefined,
              icon: 'verified',
              x: 120,
              y: 50,
              color: 'black',
            },
            {
              id: 'Judul',
              type: 'text',
              text: idx === 0 ? sub.appName : `Fitur Unggulan #${idx + 1}`,
              fontSize: 32,
              color: '#FFFFFF',
              x: 25,
              y: 120,
              w: 400,
              fontWeight: 'bold',
            },
            {
              id: 'Subtitle',
              type: 'text',
              text: idx === 0 ? (sub.shortDescription || 'Aplikasi Android Resmi') : 'Mudah, Cepat, dan Terpercaya',
              fontSize: 16,
              color: '#a7f3d0',
              x: 25,
              y: 200,
              w: 400,
              fontWeight: 500,
            },
            {
              id: 'Mockup',
              type: 'mockup',
              x: 95,
              y: 280,
            },
          ],
        };
      });

      setPages(newPages);
      setActivePageId(newPages[0].id);
      if (phoneScreens[0]?.id) {
        setScreenshotUrl(`/api/playstore/download?submissionId=${sub.id}&fileId=${phoneScreens[0].id}`);
      }
    } else {
      // Jika hanya teks dan logo
      setElements(prev => prev.map(el => {
        if (el.id === 'Judul') return { ...el, text: sub.appName };
        if (el.id === 'Subtitle') return { ...el, text: sub.shortDescription || el.text };
        if (el.id === 'Header Label') return { ...el, text: sub.appName };
        return el;
      }));
    }

    setShowImportModal(false);
  };

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
      updatePageProperty({ is3D: false });
    } else if (templateId === 'modern') {
      updatePageProperty({ is3D: true });
    } else if (templateId === 'streaming') {
      updatePageProperty({ 
        is3D: false,
        canvasBackground: 'radial-gradient(circle at 50% 10%, #dc2626 0%, #7f1d1d 60%, #450a0a 100%)', 
        canvasBgPattern: 'none', 
        canvasBgImage: null
      });
      setElements(prev => prev.map(el => {
        if (el.id === 'Judul') return { ...el, text: "TEMUKAN FAVORITMU DENGAN MUDAH DI MANA PUN", fontSize: 32, y: 80, x: 20, w: 460, color: '#ffffff', fontWeight: 800 };
        if (el.id === 'Subtitle') return { ...el, text: "CERITA, PODCAST, DAN GAME SEMUANYA DI SINI", fontSize: 16, y: 170, x: 20, w: 460, color: '#fca5a5', fontWeight: 600 };
        if (el.id === 'Mockup') return { ...el, x: 120, y: 240, w: 260, h: 540 };
        if (el.type === 'badge' || el.id === 'Header Label') return { ...el, hidden: true };
        return el;
      }));
    }
  };

  const applyBundle = (bundleType: string) => {
    // 1. Template: Health & Food Tracker (Fresh Mint / Teal)
    if (bundleType === 'food_health_bundle') {
      const baseBg = 'linear-gradient(180deg, #0d9488 0%, #115e59 100%)';
      const bundlePages: PageData[] = [
        {
          id: "Page 1",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Header Label", type: "badge", text: "Healthy Food App", icon: "restaurant", x: 120, y: 50, color: "white" },
            { id: "Judul", type: "text", text: "Track Calories,\nLose Weight", fontSize: 38, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Target harian & nutrisi seimbang", fontSize: 16, color: "#ccfbf1", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 },
            { id: "Rating Badge", type: "badge", text: "4.8 ★ Rating Aplikasi", icon: "star", x: 130, y: 840, color: "white" }
          ]
        },
        {
          id: "Page 2",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: true,
          elements: [
            { id: "Judul", type: "text", text: "Smart Choices,\nTasty Results", fontSize: 36, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "bold" },
            { id: "Subtitle", type: "text", text: "Rekomendasi menu lezat setiap hari", fontSize: 16, color: "#ccfbf1", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 100, y: 310, w: 260, h: 520 },
            { id: "Calories Badge", type: "badge", text: "Kalori Terukur", icon: "local_fire_department", x: 140, y: 840, color: "white" }
          ]
        },
        {
          id: "Page 3",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Eat Well,\nFeel Great", fontSize: 38, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Lacak asupan makronutrisi lengkap", fontSize: 16, color: "#ccfbf1", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 4",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Fuel Up,\nTrim Down", fontSize: 38, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Capai target berat badan idealmu", fontSize: 16, color: "#ccfbf1", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        }
      ];
      setPages(bundlePages);
      setActivePageId("Page 1");
      return;
    }

    // 2. Template: Travel & Booking (Royal Cobalt Blue)
    if (bundleType === 'travel_booking_bundle') {
      const baseBg = 'linear-gradient(180deg, #1d4ed8 0%, #172554 100%)';
      const bundlePages: PageData[] = [
        {
          id: "Page 1",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'dots',
          mockupFrame: 'iphone15',
          is3D: true,
          elements: [
            { id: "Header Label", type: "badge", text: "Travel & Hotels", icon: "flight", x: 125, y: 50, color: "white" },
            { id: "Judul", type: "text", text: "Find Your\nDream Stay", fontSize: 40, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Hotels • Flights • Trains • Rentals", fontSize: 15, color: "#bfdbfe", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 2",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'dots',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Curated Plans\nWith AI", fontSize: 38, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Smart Assistant Experience", fontSize: 16, color: "#bfdbfe", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 3",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'dots',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "View Location\nPhotos", fontSize: 38, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Foto nyata 360° dari para tamu", fontSize: 16, color: "#bfdbfe", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 4",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'dots',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Never Get Lost,\nAlways Online", fontSize: 36, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Peta offline & navigasi akurat", fontSize: 16, color: "#bfdbfe", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        }
      ];
      setPages(bundlePages);
      setActivePageId("Page 1");
      return;
    }

    // 3. Template: Food Delivery & Restaurant (Warm Cream & Forest Green)
    if (bundleType === 'food_delivery_bundle') {
      const baseBg = '#f4f1ea';
      const bundlePages: PageData[] = [
        {
          id: "Page 1",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Header Label", type: "badge", text: "★ ★ ★ ★ ★ Best Delivery App", icon: "star", x: 90, y: 50, color: "black" },
            { id: "Judul", type: "text", text: "Build\nYour Bowl", fontSize: 44, color: "#064e3b", x: 30, y: 130, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Kombinasi bahan segar pilihan Anda", fontSize: 16, color: "#047857", x: 30, y: 250, w: 400, fontWeight: 600 },
            { id: "Mockup", type: "mockup", x: 95, y: 310, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 2",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Order Near You", fontSize: 40, color: "#064e3b", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Fast delivery or easy pickup", fontSize: 16, color: "#047857", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 3",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Choose a\nLocation", fontSize: 40, color: "#064e3b", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Find your closest delivery hub", fontSize: 16, color: "#047857", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 310, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 4",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: '"Easy to use,\nfood tastes amazing."', fontSize: 34, color: "#064e3b", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Ribuan ulasan bintang 5 pelanggan", fontSize: 16, color: "#047857", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 310, w: 260, h: 520 }
          ]
        }
      ];
      setPages(bundlePages);
      setActivePageId("Page 1");
      return;
    }

    // 4. Template: Water & Hydration Tracker (Vibrant Cyan / Splash Blue)
    if (bundleType === 'water_tracker_bundle') {
      const baseBg = 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)';
      const bundlePages: PageData[] = [
        {
          id: "Page 1",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'waves',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Header Label", type: "badge", text: "Hydration Coach", icon: "water_drop", x: 125, y: 50, color: "white" },
            { id: "Judul", type: "text", text: "Drink Your\nWater Daily", fontSize: 40, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Stay fit, glowing, and energetic", fontSize: 16, color: "#bae6fd", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 2",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'waves',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Reach Your Goal", fontSize: 38, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Pengingat minum otomatis tepat waktu", fontSize: 16, color: "#bae6fd", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 3",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'waves',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "See Full Stats", fontSize: 38, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Grafik mingguan & bulanan terperinci", fontSize: 16, color: "#bae6fd", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 4",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'waves',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Stay Motivated", fontSize: 38, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Dapatkan lencana penghargaan harian", fontSize: 16, color: "#bae6fd", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 300, w: 260, h: 520 }
          ]
        }
      ];
      setPages(bundlePages);
      setActivePageId("Page 1");
      return;
    }

    // 5. Template: Gradient Pop (Gradient Purple / Pink - Modern Social App)
    if (bundleType === 'social_gradient_bundle') {
      const gradientBg = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)';
      const bundlePages: PageData[] = [
        {
          id: "Page 1",
          canvasSize: '1080x2400',
          canvasBackground: gradientBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Useful. Social.\nExpressive.", fontSize: 40, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Ekspresikan dirimu tanpa batas", fontSize: 16, color: "#fbcfe8", x: 30, y: 230, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 310, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 2",
          canvasSize: '1080x2400',
          canvasBackground: gradientBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Bring your vibe\nto your chats", fontSize: 36, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Stiker & emoji animasi kustom", fontSize: 16, color: "#fbcfe8", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 310, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 3",
          canvasSize: '1080x2400',
          canvasBackground: gradientBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Hang out anytime,\nanywhere", fontSize: 36, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Voice & video room jernih HD", fontSize: 16, color: "#fbcfe8", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 310, w: 260, h: 520 }
          ]
        },
        {
          id: "Page 4",
          canvasSize: '1080x2400',
          canvasBackground: gradientBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: false,
          elements: [
            { id: "Judul", type: "text", text: "Get instant answers\nwith AI assistant", fontSize: 36, color: "#FFFFFF", x: 30, y: 120, w: 400, fontWeight: "900" },
            { id: "Subtitle", type: "text", text: "Asisten cerdas pendamping harianmu", fontSize: 16, color: "#fbcfe8", x: 30, y: 220, w: 400, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 95, y: 310, w: 260, h: 520 }
          ]
        }
      ];
      setPages(bundlePages);
      setActivePageId("Page 1");
      return;
    }

    if (bundleType === 'modern_bundle') {
      const baseBg = 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)';
      const bundlePages: PageData[] = [
        {
          id: "Page 1",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: true,
          elements: [
            { id: "Judul", type: "text", text: "APLIKASI TRANSFER FILE FANTASTIS", fontSize: 36, color: "#FFFFFF", x: 20, y: 80, w: 460, fontWeight: "bold" },
            { id: "Subtitle", type: "text", text: "Kecepatan transfer luar biasa 42MB/s", fontSize: 16, color: "#dbeafe", x: 20, y: 170, w: 460, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 60, y: 280, w: 320, h: 650 },
            { id: "Bintang", type: "badge", text: "Favorit Pilihan", icon: "thumb_up", x: -20, y: 650, color: "white" }
          ]
        },
        {
          id: "Page 2",
          canvasSize: '1080x2400',
          canvasBackground: baseBg,
          canvasBgImage: null,
          canvasBgOpacity: 1,
          canvasBgMode: 'cover',
          canvasBgScale: 100,
          canvasBgPattern: 'none',
          mockupFrame: 'iphone15',
          is3D: true,
          elements: [
            { id: "Judul", type: "text", text: "0 KONSUMSI DATA", fontSize: 40, color: "#FFFFFF", x: 20, y: 100, w: 460, fontWeight: "bold" },
            { id: "Subtitle", type: "text", text: "Tidak butuh koneksi internet", fontSize: 18, color: "#dbeafe", x: 20, y: 180, w: 460, fontWeight: 500 },
            { id: "Mockup", type: "mockup", x: 60, y: 300, w: 320, h: 650 },
            { id: "Label Data", type: "image_card", x: 180, y: 400, w: 220, h: 90 },
            { id: "Wifi Offline", type: "badge", text: "Offline", icon: "wifi_off", x: 300, y: 700, color: "white" }
          ]
        }
      ];
      setPages(bundlePages);
      setActivePageId("Page 1");
    }
  };

  const [draggingLayer, setDraggingLayer] = useState<string | null>(null);

  React.useEffect(() => {
    if (!draggingLayer) return;

    const canvasWidth = currentCanvasWidth;
    const canvasHeight = currentCanvasHeight;

    const handleMouseMove = (e: MouseEvent) => {
      setElements((prev: CanvasElement[]) => {
        let snappedX: number | null = null;
        let snappedY: number | null = null;

        const updated = prev.map(el => {
          if (el.id === draggingLayer) {
             let newX = el.x + e.movementX / (zoom / 100);
             let newY = el.y + e.movementY / (zoom / 100);
             
             const centerX = canvasWidth / 2;
             const centerY = canvasHeight / 2;
             
             let elW = el.w || (el.type === 'mockup' ? 260 : el.type === 'image_card' ? 320 : 150);
             let elH = el.h || (el.type === 'mockup' ? 520 : 100);
             
             const snapThreshold = 15;
             
             if (Math.abs((newX + elW / 2) - centerX) < snapThreshold) {
               newX = centerX - elW / 2;
               snappedX = centerX;
             }
             
             if (Math.abs((newY + elH / 2) - centerY) < snapThreshold) {
               newY = centerY - elH / 2;
               snappedY = centerY;
             }
             
             return {
               ...el,
               x: newX,
               y: newY
             }
          }
          return el;
        });

        setGuides({x: snappedX, y: snappedY});
        return updated;
      });
    };

    const handleMouseUp = () => {
      setDraggingLayer(null);
      setGuides({x: null, y: null});
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingLayer, zoom, canvasSize]);

  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "desain_preset");
            
            try {
              const res = await fetch("https://api.cloudinary.com/v1_1/gyewfsfw/image/upload", {
                method: "POST",
                body: formData,
              });
              const data = await res.json();
              if (data.secure_url) {
                const url = data.secure_url;
                if (activeLayer === "Background") {
                   updatePageProperty({ canvasBgImage: url });
                } else {
                   const activeEl = elements.find(el => el.id === activeLayer);
                   if (activeEl && (activeEl.type === 'mockup' || activeEl.type === 'image_card' || activeEl.type === 'badge')) {
                      if (activeEl.type === 'mockup') {
                        setScreenshotUrl(url);
                      } else {
                        handlePropChange('imageUrl', url);
                      }
                   } else {
                      const newId = `Gambar ${elements.length + 1}`;
                      setElements(prev => [...prev, { id: newId, type: 'image_card', x: 100, y: 100, w: 320, h: 320, imageUrl: url }]);
                      setActiveLayer(newId);
                   }
                }
              }
            } catch (err) {
              console.error("Gagal mengunggah gambar paste:", err);
              alert("Gagal mengunggah gambar. Silakan coba lagi.");
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeLayer, elements, setScreenshotUrl]);


  const toggleVisibility = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setElements((prev: CanvasElement[]) => prev.map(el => {
      if (el.id === layerId) {
        return { ...el, hidden: !el.hidden };
      }
      return el;
    }));
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 10));

  const handleSimpan = async () => {
    if (!currentUser) {
      alert("Anda harus login untuk menyimpan proyek.");
      return;
    }
    if (!activeProjectId) {
      setShowSaveModal(true);
      return;
    }

    const updatedProjects = projects.map(p => {
      if (p.id === activeProjectId) {
        return { ...p, pages, updatedAt: Date.now(), name: projectName };
      }
      return p;
    });

    setProjects(updatedProjects);
    
    try {
      const payload = {
        id: activeProjectId,
        userId: currentUser.uid,
        name: projectName,
        pages: pages,
        updatedAt: Date.now()
      };
      
      const res = await fetch('/api/mockups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Gagal menyimpan");
      alert("Desain berhasil disimpan ke Cloud!");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan ke Cloud via API.");
    }
  };

  const submitSaveNewProject = async () => {
    if (!currentUser) {
      alert("Anda harus login untuk membuat proyek.");
      return;
    }
    const tempId = `proj_${Date.now()}`;
    const newProject: Project = {
      id: tempId,
      name: projectName,
      updatedAt: Date.now(),
      pages: pages
    };
    
    // Optimistic UI update
    const newProjects = [...projects, newProject];
    setProjects(newProjects);
    setActiveProjectId(tempId);
    setShowSaveModal(false);
    localStorage.setItem('activeProjectId', tempId);

    try {
      const payload = {
        userId: currentUser.uid,
        name: projectName,
        pages: pages,
        updatedAt: Date.now()
      };
      
      const res = await fetch('/api/mockups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        // Replace tempId with actual DB ID
        const finalProjects = newProjects.map(p => p.id === tempId ? { ...p, id: data.id } : p);
        setProjects(finalProjects);
        setActiveProjectId(data.id);
        localStorage.setItem('activeProjectId', data.id);
        alert("Proyek baru berhasil disimpan ke Cloud!");
      } else {
        throw new Error("Gagal dari server");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal membuat proyek di Cloud.");
    }
  };

  const handleNewProject = () => {
    setActiveProjectId(null);
    setProjectName("Proyek Baru");
    setPages([{ 
      id: 'Page 1', 
      elements: initialElements,
      canvasSize: "500x1024",
      canvasBackground: 'linear-gradient(135deg, #1d4ed8 0%, #10b981 100%)',
      canvasBgImage: null,
      canvasBgOpacity: 0.15,
      canvasBgMode: 'pattern',
      canvasBgScale: 100,
      mockupFrame: 'iphone15'
    }]);
    setActivePageId('Page 1');
  };

  const handleOpenProject = (project: Project) => {
    setActiveProjectId(project.id);
    setProjectName(project.name);
    setPages(project.pages);
    if (project.pages.length > 0) setActivePageId(project.pages[0].id);
    setShowOpenModal(false);
    localStorage.setItem('activeProjectId', project.id);
  };
  const handleExport = async () => {
    if (!canvasRef.current) return;
    
    if (pages.length > 1) {
      setSelectedExportPages(pages.map(p => p.id));
      setShowExportModal(true);
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Fetch Google Fonts CSS to bypass html-to-image CORS cssRules crash
      const fontCSS = await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap').then(res => res.text()).catch(() => '');

      // Beri sedikit jeda agar React sempat merender state isExporting (misal untuk menghilangkan backdrop-filter)
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await htmlToImage.toPng(canvasRef.current, {
        quality: 1,
        backgroundColor: canvasBackground || undefined, // ensure background color is captured if any
        pixelRatio: 2, // Meningkatkan ketajaman hasil export
        fontEmbedCSS: fontCSS
      });

      const link = document.createElement('a');
      link.download = `Mockup-${activePageId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert(`Gagal mengekspor gambar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMultiple = async () => {
    if (!canvasRef.current || selectedExportPages.length === 0) return;
    if (selectedDevices.length === 0) {
      alert("Pilih minimal satu tipe perangkat untuk diekspor.");
      return;
    }

    try {
      setIsExportingMultiple(true);
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();
      
      // Fetch Google Fonts CSS to bypass html-to-image CORS cssRules crash
      const fontCSS = await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap').then(res => res.text()).catch(() => '');
      
      const originalPageId = activePageId;
      const targetDevices = availableDeviceTargets.filter(d => selectedDevices.includes(d.id));
      const totalOperations = selectedExportPages.length * targetDevices.length;
      let completedOps = 0;

      for (const dev of targetDevices) {
        const folder = zip.folder(dev.label.replace(/[^a-zA-Z0-9_-]/g, '_'));

        for (let i = 0; i < selectedExportPages.length; i++) {
          const pageId = selectedExportPages[i];
          completedOps++;
          setExportProgress(Math.round((completedOps / totalOperations) * 100));

          setActivePageId(pageId);
          // Set frame device sementara untuk export
          updatePageProperty({ mockupFrame: dev.mockupFrame, canvasSize: `${dev.width}x${dev.height}` });
          await new Promise(resolve => setTimeout(resolve, 500));

          const pageData = pages.find(p => p.id === pageId);
          
          const blob = await htmlToImage.toBlob(canvasRef.current, {
            quality: 1,
            backgroundColor: pageData?.canvasBackground || undefined,
            pixelRatio: 2, // High Quality Crisp Export
            fontEmbedCSS: fontCSS
          });
          
          if (blob && folder) {
            folder.file(`${pageId.replace(/\s+/g, '-')}_${dev.width}x${dev.height}.png`, blob);
          }
        }
      }
      
      setExportProgress(100);
      setActivePageId(originalPageId);
      
      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `${projectName.replace(/\s+/g, '_')}_Store_Screenshots.zip`);
      
      setShowExportModal(false);
    } catch (err) {
      console.error("Export multiple failed", err);
      alert(`Gagal mengekspor bundle: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExportingMultiple(false);
      setExportProgress(0);
    }
  };
  
  return (
    <div className={styles.editorContainer}>
      
      {/* TOP TOOLBAR */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.topBarTitle}>
            <span className={`material-symbols-outlined ${styles.iconApp}`}>auto_awesome_mosaic</span>
            Mockup Release
          </div>
          <div className={styles.projectDropdown} onClick={() => setShowOpenModal(true)} style={{cursor: 'pointer'}}>
            <span className={styles.projectLabel}>Proyek</span>
            <div className={styles.projectSelect}>
              {activeProjectId ? projectName : "Proyek Belum Disimpan"}
              <span className="material-symbols-outlined" style={{fontSize: 16}}>expand_more</span>
            </div>
          </div>
          <button className={styles.iconBtn} title="Proyek Baru" onClick={handleNewProject} style={{marginLeft: 8, padding: '4px 8px', display: 'flex', gap: 4, alignItems: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13}}>
             <span className="material-symbols-outlined" style={{fontSize: 16}}>add</span> Baru
          </button>
          <button className={styles.iconBtn} title="Buka Proyek" onClick={() => setShowOpenModal(true)} style={{marginLeft: 8, padding: '4px 8px', display: 'flex', gap: 4, alignItems: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13}}>
             <span className="material-symbols-outlined" style={{fontSize: 16}}>folder_open</span> Buka
          </button>
          <button 
            className={styles.iconBtn} 
            title="Tarik Aset Screenshot dari Klien Play Store" 
            onClick={() => {
              setShowImportModal(true);
              fetchSubmissionsForImport();
            }} 
            style={{marginLeft: 8, padding: '4px 10px', display: 'flex', gap: 4, alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 13, color: '#1d4ed8', fontWeight: 600}}
          >
             <span className="material-symbols-outlined" style={{fontSize: 16}}>cloud_download</span> Impor Aset Klien
          </button>
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
          <button className={styles.iconBtn} onClick={() => setShowLayers(true)} title="Layers">
            <span className="material-symbols-outlined">layers</span>
          </button>
          <button className={styles.iconBtn} onClick={() => setShowTemplates(true)} title="Templates & Mockup">
            <span className="material-symbols-outlined">style</span>
          </button>
          <button className={styles.iconBtn} onClick={() => setShowProperties(true)} title="Properties">
            <span className="material-symbols-outlined">tune</span>
          </button>
          <button className={styles.iconBtn} onClick={() => alert("Bantuan: Pilih elemen di kiri untuk mengedit propertinya di panel kanan.")}><span className="material-symbols-outlined">help_outline</span></button>
          <button className={styles.btnSecondary} onClick={handleSimpan}>Simpan</button>
          <button className={styles.btnPrimary} onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Mengekspor...' : 'Export'}
            <span className="material-symbols-outlined" style={{fontSize:18}}>expand_more</span>
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className={styles.workspace}>
        
        {/* DRAGGABLE DIALOGS */}
        <DraggableDialog 
          title="Layers" 
          isOpen={showLayers} 
          onClose={() => setShowLayers(false)}
          defaultPosition={{ x: 20, y: 80 }}
          zIndex={zIndices.layers}
          onFocus={() => bringToFront('layers')}
          width={280}
          maxHeight="50vh"
        >
          <div className={styles.sidebarSection} style={{paddingBottom: 8, display: 'flex', gap: 8, padding: '0 0 8px 0'}}>
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
          
          <div className={styles.layerList} style={{padding: '0'}}>
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
        </DraggableDialog>

        <DraggableDialog 
          title="Templates & Mockup" 
          isOpen={showTemplates} 
          onClose={() => setShowTemplates(false)}
          defaultPosition={{ x: 20, y: 400 }}
          zIndex={zIndices.templates}
          onFocus={() => bringToFront('templates')}
          width={320}
          maxHeight="50vh"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{fontSize: 11, color: 'var(--color-outline)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700}}>Pilih Template</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                 <div onClick={() => applyTemplate('klasik')} style={{
                   padding: 12, borderRadius: 8, cursor: 'pointer', border: !is3D ? '2px solid #2563eb' : '1px solid var(--color-outline-variant)', background: !is3D ? '#eff6ff' : 'white', transition: 'all 0.2s'
                 }}>
                    <div style={{fontSize: 13, fontWeight: 600, color: !is3D ? '#1e40af' : 'var(--color-textColor)', marginBottom: 2}}>Klasik (Datar)</div>
                    <div style={{fontSize: 11, color: 'var(--color-outline)', lineHeight: 1.4}}>Desain bersih dengan badge fitur melayang.</div>
                 </div>
                 <div onClick={() => applyTemplate('modern')} style={{
                   padding: 12, borderRadius: 8, cursor: 'pointer', border: is3D && canvasBackground !== 'radial-gradient(circle at 50% 10%, #dc2626 0%, #7f1d1d 60%, #450a0a 100%)' ? '2px solid #2563eb' : '1px solid var(--color-outline-variant)', background: is3D && canvasBackground !== 'radial-gradient(circle at 50% 10%, #dc2626 0%, #7f1d1d 60%, #450a0a 100%)' ? '#eff6ff' : 'white', transition: 'all 0.2s'
                 }}>
                    <div style={{fontSize: 13, fontWeight: 600, color: is3D && canvasBackground !== 'radial-gradient(circle at 50% 10%, #dc2626 0%, #7f1d1d 60%, #450a0a 100%)' ? '#1e40af' : 'var(--color-textColor)', marginBottom: 2}}>Modern (3D)</div>
                    <div style={{fontSize: 11, color: 'var(--color-outline)', lineHeight: 1.4}}>Gaya terkini dengan efek memutar 3D.</div>
                 </div>
                 <div onClick={() => applyTemplate('streaming')} style={{
                   padding: 12, borderRadius: 8, cursor: 'pointer', border: canvasBackground === 'radial-gradient(circle at 50% 10%, #dc2626 0%, #7f1d1d 60%, #450a0a 100%)' ? '2px solid #2563eb' : '1px solid var(--color-outline-variant)', background: canvasBackground === 'radial-gradient(circle at 50% 10%, #dc2626 0%, #7f1d1d 60%, #450a0a 100%)' ? '#eff6ff' : 'white', transition: 'all 0.2s'
                 }}>
                    <div style={{fontSize: 13, fontWeight: 600, color: canvasBackground === 'radial-gradient(circle at 50% 10%, #dc2626 0%, #7f1d1d 60%, #450a0a 100%)' ? '#1e40af' : 'var(--color-textColor)', marginBottom: 2}}>Streaming App</div>
                    <div style={{fontSize: 11, color: 'var(--color-outline)', lineHeight: 1.4}}>Background merah gelap dengan judul tegas di atas mockup.</div>
                 </div>
              </div>
            </div>

            <div>
              <h3 style={{fontSize: 11, color: 'var(--color-outline)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700}}>Pilih Bundle Mockup (1 Set)</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                 <div onClick={() => {
                   if(window.confirm('Terapkan bundle Health & Calories Tracker (4 Halaman)?')) {
                     applyBundle('food_health_bundle');
                   }
                 }} style={{
                   padding: 12, borderRadius: 8, cursor: 'pointer', border: '1px solid #14b8a6', background: '#f0fdfa', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                 }}>
                    <div style={{position: 'absolute', top: 0, right: 0, background: '#0d9488', color: 'white', fontSize: 9, padding: '2px 8px', borderBottomLeftRadius: 8, fontWeight: 'bold'}}>FOOD & HEALTH</div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#115e59', marginBottom: 2}}>Health & Calories Tracker</div>
                    <div style={{fontSize: 11, color: '#0f766e', lineHeight: 1.4}}>Tema segar hijau toska dengan tipografi tebal modern & badge rating.</div>
                 </div>

                 <div onClick={() => {
                   if(window.confirm('Terapkan bundle Travel & Booking (4 Halaman)?')) {
                     applyBundle('travel_booking_bundle');
                   }
                 }} style={{
                   padding: 12, borderRadius: 8, cursor: 'pointer', border: '1px solid #60a5fa', background: '#eff6ff', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                 }}>
                    <div style={{position: 'absolute', top: 0, right: 0, background: '#2563eb', color: 'white', fontSize: 9, padding: '2px 8px', borderBottomLeftRadius: 8, fontWeight: 'bold'}}>TRAVEL & STAY</div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 2}}>Travel & Hotel Booking</div>
                    <div style={{fontSize: 11, color: '#1d4ed8', lineHeight: 1.4}}>Tema biru royal elegan dengan pola titik & floating tags.</div>
                 </div>

                 <div onClick={() => {
                   if(window.confirm('Terapkan bundle Food Delivery & Restaurant (4 Halaman)?')) {
                     applyBundle('food_delivery_bundle');
                   }
                 }} style={{
                   padding: 12, borderRadius: 8, cursor: 'pointer', border: '1px solid #d1fae5', background: '#fcfbf7', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                 }}>
                    <div style={{position: 'absolute', top: 0, right: 0, background: '#064e3b', color: 'white', fontSize: 9, padding: '2px 8px', borderBottomLeftRadius: 8, fontWeight: 'bold'}}>FOOD DELIVERY</div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#064e3b', marginBottom: 2}}>Warm Cream & Green Delivery</div>
                    <div style={{fontSize: 11, color: '#047857', lineHeight: 1.4}}>Gaya minimalis organik warna cream hangat & hijau hutan.</div>
                 </div>

                 <div onClick={() => {
                   if(window.confirm('Terapkan bundle Water & Hydration Tracker (4 Halaman)?')) {
                     applyBundle('water_tracker_bundle');
                   }
                 }} style={{
                   padding: 12, borderRadius: 8, cursor: 'pointer', border: '1px solid #7dd3fc', background: '#f0f9ff', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                 }}>
                    <div style={{position: 'absolute', top: 0, right: 0, background: '#0284c7', color: 'white', fontSize: 9, padding: '2px 8px', borderBottomLeftRadius: 8, fontWeight: 'bold'}}>HYDRATION & HABIT</div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 2}}>Splash Water Tracker</div>
                    <div style={{fontSize: 11, color: '#0284c7', lineHeight: 1.4}}>Aura segar warna biru air dengan pola ombak cair.</div>
                 </div>

                 <div onClick={() => {
                   if(window.confirm('Terapkan bundle Gradient Pop Social App (4 Halaman)?')) {
                     applyBundle('social_gradient_bundle');
                   }
                 }} style={{
                   padding: 12, borderRadius: 8, cursor: 'pointer', border: '1px solid #f472b6', background: '#fdf2f8', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                 }}>
                    <div style={{position: 'absolute', top: 0, right: 0, background: '#db2777', color: 'white', fontSize: 9, padding: '2px 8px', borderBottomLeftRadius: 8, fontWeight: 'bold'}}>SOCIAL & CHAT</div>
                    <div style={{fontSize: 13, fontWeight: 700, color: '#831843', marginBottom: 2}}>Gradient Pop Vibrant</div>
                    <div style={{fontSize: 11, color: '#be185d', lineHeight: 1.4}}>Gradasi dinamis ungu-pink masa kini ala media sosial & AI.</div>
                 </div>
              </div>
            </div>

            <div>
              <h3 style={{fontSize: 11, color: 'var(--color-outline)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700}}>Pilih Mockup Frame</h3>
              <div style={{display: 'flex', gap: 8, overflowX: 'auto'}}>
                 <div onClick={() => updatePageProperty({ mockupFrame: 'iphone15' })} style={{
                   width: 70, flexShrink: 0, padding: 8, borderRadius: 8, cursor: 'pointer', border: mockupFrame === 'iphone15' ? '2px solid #2563eb' : '1px solid var(--color-outline-variant)', background: mockupFrame === 'iphone15' ? '#eff6ff' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center'
                 }}>
                    <div style={{width: 30, height: 60, border: '2px solid #94a3b8', borderRadius: 6, position: 'relative', marginBottom: 8}}>
                      <div style={{position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 12, height: 4, background: '#94a3b8', borderRadius: 4}}></div>
                    </div>
                    <div style={{fontSize: 10, textAlign: 'center', fontWeight: 600, color: mockupFrame === 'iphone15' ? '#1e40af' : 'var(--color-textColor)'}}>iPhone 15</div>
                 </div>

                 <div onClick={() => updatePageProperty({ mockupFrame: 'android' })} style={{
                   width: 70, flexShrink: 0, padding: 8, borderRadius: 8, cursor: 'pointer', border: mockupFrame === 'android' ? '2px solid #2563eb' : '1px solid var(--color-outline-variant)', background: mockupFrame === 'android' ? '#eff6ff' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center'
                 }}>
                    <div style={{width: 30, height: 60, border: '2px solid #94a3b8', borderRadius: 6, position: 'relative', marginBottom: 8}}>
                      <div style={{position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 3, height: 3, background: '#94a3b8', borderRadius: 2}}></div>
                    </div>
                    <div style={{fontSize: 10, textAlign: 'center', fontWeight: 600, color: mockupFrame === 'android' ? '#1e40af' : 'var(--color-textColor)'}}>Android</div>
                 </div>

                 <div onClick={() => updatePageProperty({ mockupFrame: 'iphone13' })} style={{
                   width: 70, flexShrink: 0, padding: 8, borderRadius: 8, cursor: 'pointer', border: mockupFrame === 'iphone13' ? '2px solid #2563eb' : '1px solid var(--color-outline-variant)', background: mockupFrame === 'iphone13' ? '#eff6ff' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center'
                 }}>
                    <div style={{width: 30, height: 60, border: '2px solid #94a3b8', borderRadius: 6, position: 'relative', marginBottom: 8}}>
                      <div style={{position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 14, height: 4, background: '#94a3b8', borderBottomLeftRadius: 2, borderBottomRightRadius: 2}}></div>
                    </div>
                    <div style={{fontSize: 10, textAlign: 'center', fontWeight: 600, color: mockupFrame === 'iphone13' ? '#1e40af' : 'var(--color-textColor)'}}>iPhone 13</div>
                 </div>
              </div>
            </div>
          </div>
        </DraggableDialog>

        {/* CENTER CANVAS */}
        <div className={styles.canvasArea}>
          <div className={styles.canvasToolbar}>
            <div style={{flex: 1}}></div>
            <span className={styles.canvasSizeLabel}>Ukuran Kanvas</span>
            <select 
              className={styles.canvasSizeSelect} 
              value={canvasSize} 
              onChange={(e) => updatePageProperty({ canvasSize: e.target.value })}
              style={{border: '1px solid var(--color-outline-variant)', outline: 'none', background: 'white'}}
            >
              <optgroup label="Google Play Console">
                <option value="512x512">App Icon (512 x 512)</option>
                <option value="1024x500">Feature Graphic (1024 x 500)</option>
                <option value="1080x2400">Phone Screenshot (1080 x 2400)</option>
                <option value="1200x1920">7-inch Tablet (1200 x 1920)</option>
                <option value="1600x2560">10-inch Tablet (1600 x 2560)</option>
                <option value="1920x1080">Chromebook (1920 x 1080)</option>
              </optgroup>
              <optgroup label="Apple App Store (iOS)">
                <option value="1024x1024">App Icon (1024 x 1024)</option>
                <option value="1320x2868">iPhone 6.9" (1320 x 2868)</option>
                <option value="1290x2796">iPhone 6.3"/6.1" (1290 x 2796)</option>
                <option value="1242x2688">iPhone 6.5" (1242 x 2688)</option>
                <option value="1179x2556">iPhone 6.1" (1179 x 2556)</option>
                <option value="2064x2752">13-inch iPad (2064 x 2752)</option>
                <option value="2048x2732">12.9-inch iPad Pro (2048 x 2732)</option>
              </optgroup>
              <optgroup label="Lainnya">
                <option value="500x1024">Custom Portrait (500 x 1024)</option>
                <option value="1080x1080">Square / Instagram (1080 x 1080)</option>
              </optgroup>
            </select>
            <button className={styles.btnResize}>Ubah Ukuran</button>
          </div>

          <div className={styles.canvasContainer} onClick={() => setActiveLayer("Background")}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '40px 0',
            }}>
              <div 
                ref={canvasRef} 
                className={styles.mockupPoster} 
                style={{ 
                  transform: `scale(${activeZoom / 100})`, 
                  transformOrigin: 'top center',
                  boxShadow: shadowEnabled ? '0 20px 40px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.1)',
                  background: canvasBackground,
                  width: currentCanvasWidth,
                  height: currentCanvasHeight,
                  position: 'relative',
                  outline: activeLayer === "Background" ? '4px solid #2563eb' : 'none',
                  marginBottom: `calc(${currentCanvasHeight}px * ${(activeZoom / 100) - 1})`,
                  marginRight: `calc(${currentCanvasWidth}px * ${(activeZoom / 100) - 1})`,
                }}
              >
              
              {/* RENDER BACKGROUND IMAGE */}
              {canvasBgImage && (
                <div style={{
                   position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                   opacity: canvasBgOpacity,
                   pointerEvents: 'none',
                   zIndex: 0,
                   ...(canvasBgMode === 'cover' ? {
                     backgroundImage: `url(${canvasBgImage})`,
                     backgroundSize: 'cover',
                     backgroundPosition: 'center',
                     transform: `scale(${canvasBgScale / 100})`
                   } : {})
                }}>
                  {canvasBgMode === 'pattern' && (
                     <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                       <defs>
                         <pattern id="brick-pattern" x="0" y="0" width="240" height="200" patternUnits="userSpaceOnUse">
                           <image href={canvasBgImage} x="20" y="10" width="80" height="80" preserveAspectRatio="xMidYMid meet" />
                           <image href={canvasBgImage} x="140" y="110" width="80" height="80" preserveAspectRatio="xMidYMid meet" />
                         </pattern>
                       </defs>
                       <rect x="0" y="0" width="100%" height="100%" fill="url(#brick-pattern)" />
                     </svg>
                  )}
                </div>
              )}
              
              {/* RENDER CSS PATTERNS */}
              {canvasBgPattern && canvasBgPattern !== 'none' && (
                <div style={{
                   position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                   opacity: 1, 
                   pointerEvents: 'none',
                   zIndex: 0, 
                   ...getPatternStyle(canvasBgPattern)
                }}></div>
              )}
              
              {/* RENDER GUIDES */}
              {guides.x !== null && (
                <div style={{ position: 'absolute', left: guides.x, top: 0, bottom: 0, width: 2, backgroundColor: '#f43f5e', zIndex: 9999, pointerEvents: 'none' }} />
              )}
              {guides.y !== null && (
                <div style={{ position: 'absolute', top: guides.y, left: 0, right: 0, height: 2, backgroundColor: '#f43f5e', zIndex: 9999, pointerEvents: 'none' }} />
              )}

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
                        width: el.w ? `${el.w}px` : 'max-content',
                        cursor: 'move',
                        outline: activeLayer === el.id ? '2px dashed #2563eb' : 'none',
                        color: el.color === 'black' ? '#ffffff' : (el.color || '#ffffff'),
                        backgroundColor: isExporting ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)',
                        backdropFilter: isExporting ? 'none' : 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20
                      }}
                      onMouseDown={(e) => { e.stopPropagation(); setActiveLayer(el.id); setDraggingLayer(el.id); }}
                    >
                       {(el.imageUrl || el.icon) && (
                         <div className={styles.badgeIcon} style={{ background: isExporting ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', overflow: 'hidden' }}>
                           {el.imageUrl ? (
                             <img src={el.imageUrl} alt="Custom Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                           ) : (
                             <span className="material-symbols-outlined" style={{fontSize: 16, color: el.color === 'black' ? '#ffffff' : (el.color || '#ffffff')}}>{el.icon}</span>
                           )}
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
                      {mockupFrame === 'iphone13' && <div className={styles.phoneNotch}></div>}
                      {mockupFrame === 'iphone15' && <div className={styles.phoneDynamicIsland}></div>}
                      {mockupFrame === 'android' && <div className={styles.phoneHolePunch}></div>}
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

          {/* BOTTOM THUMBNAILS ROW */}
          <div className={styles.thumbnailsRow}>
             {pages.map((p, i) => (
                <div 
                  key={p.id} 
                  className={`${styles.thumbnailCard} ${p.id === activePageId ? styles.active : ''}`}
                  onClick={() => setActivePageId(p.id)}
                >
                   {/* Mini preview */}
                   <div style={{ width: '40px', height: '60px', background: 'linear-gradient(135deg, #1d4ed8 0%, #10b981 100%)', position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
                      <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 30, height: 45, background: 'white', borderRadius: 6, border: '1px solid #e2e8f0' }}></div>
                   </div>
                    <div className={styles.thumbnailNumber}>{i + 1}</div>
                    
                    {/* Actions overlay */}
                    {pages.length > 0 && (
                      <div className={styles.thumbnailActions}>
                        <button 
                          className={styles.thumbnailActionBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            const newId = `Page ${Date.now()}`;
                            const newPage = { ...p, id: newId };
                            setPages(prev => {
                              const newPages = [...prev];
                              newPages.splice(i + 1, 0, newPage);
                              return newPages;
                            });
                            setActivePageId(newId);
                          }}
                          title="Duplikat"
                        >
                          <span className="material-symbols-outlined" style={{fontSize: 14}}>content_copy</span>
                        </button>
                        {pages.length > 1 && (
                          <button 
                            className={`${styles.thumbnailActionBtn} ${styles.deleteBtn}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPages(prev => prev.filter(page => page.id !== p.id));
                              if(activePageId === p.id) {
                                setActivePageId(pages[i === 0 ? 1 : i - 1].id);
                              }
                            }}
                            title="Hapus"
                          >
                            <span className="material-symbols-outlined" style={{fontSize: 14}}>delete</span>
                          </button>
                        )}
                      </div>
                    )}
                 </div>
             ))}
             <div 
               className={styles.thumbnailAdd}
               onClick={() => {
                  const newId = `Page ${pages.length + 1}`;
                  setPages([...pages, { 
                    id: newId, 
                    elements: JSON.parse(JSON.stringify(initialElements)),
                    canvasSize: "500x1024",
                    canvasBackground: 'linear-gradient(135deg, #1d4ed8 0%, #10b981 100%)',
                    canvasBgImage: null,
                    canvasBgOpacity: 0.15,
                    canvasBgMode: 'pattern',
                    canvasBgScale: 100,
                    mockupFrame: 'iphone15'
                  }]);
                  setActivePageId(newId);
               }}
             >
                <span className="material-symbols-outlined">add</span>
             </div>
             
             {/* Dropdown button from screenshot */}
             <div className={styles.thumbnailAdd} style={{ width: '40px' }}>
                <span className="material-symbols-outlined">expand_more</span>
             </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR - PROPERTIES AS DIALOG */}
        <DraggableDialog 
          title={`Properti: ${activeLayer}`}
          isOpen={showProperties} 
          onClose={() => setShowProperties(false)}
          defaultPosition={{ x: 1000, y: 80 }}
          zIndex={zIndices.properties}
          onFocus={() => bringToFront('properties')}
          width={320}
          maxHeight="70vh"
        >
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
                onChange={(e) => updatePageProperty({ canvasBackground: e.target.value })} 
                style={{marginBottom: 12}}
              />
              <div style={{display:'flex', gap: 8, flexWrap: 'wrap'}}>
                {['#ffffff', '#1e293b', 'linear-gradient(135deg, #1d4ed8 0%, #10b981 100%)', 'linear-gradient(180deg, #1e40af 0%, #047857 100%)', 'linear-gradient(45deg, #f43f5e 0%, #fb923c 100%)', 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'].map((bg, i) => (
                  <div 
                    key={i} 
                    onClick={() => updatePageProperty({ canvasBackground: bg })}
                    style={{width: 32, height: 32, borderRadius: 16, background: bg, cursor: 'pointer', border: '1px solid #cbd5e1'}}
                  />
                ))}
              </div>
              
              <span className={styles.controlLabel} style={{display:'block', marginTop:16, marginBottom:8}}>Gaya Arsitektur / Pola (3D & Tekstur)</span>
              <div style={{display:'flex', gap: 8, flexWrap: 'wrap'}}>
                {[
                  { id: 'none', label: 'Polos' },
                  { id: 'grid', label: 'Grid / Blueprint' },
                  { id: 'dots', label: 'Titik (Polka)' },
                  { id: 'isometric', label: '3D Isometrik' },
                  { id: 'waves', label: 'Gelombang (Waves)' },
                  { id: 'polygons', label: 'Poligon / Geometri' }
                ].map(pat => (
                  <div 
                    key={pat.id} 
                    onClick={() => updatePageProperty({ canvasBgPattern: pat.id })}
                    style={{
                      padding: '6px 10px', 
                      borderRadius: 6, 
                      fontSize: 11,
                      cursor: 'pointer', 
                      border: canvasBgPattern === pat.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: canvasBgPattern === pat.id ? '#eff6ff' : 'white',
                      color: canvasBgPattern === pat.id ? '#1e40af' : '#475569',
                      fontWeight: canvasBgPattern === pat.id ? 600 : 400
                    }}
                  >
                    {pat.label}
                  </div>
                ))}
              </div>

              <span className={styles.controlLabel} style={{display:'block', marginTop:16, marginBottom:8}}>Preset Latar Belakang (Ilustrasi & Arsitektur)</span>
              <div style={{display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16}}>
                {[
                  { id: '/backgrounds/bg_corporate_glass_1786344706982.png', label: 'Gedung Kaca' },
                  { id: '/backgrounds/bg_abstract_geometric_1786344723738.png', label: 'Geometris' },
                  { id: '/backgrounds/bg_islamic_mosque_1786344735119.png', label: 'Masjid' },
                  { id: '/backgrounds/bg_isometric_school_1786344744507.png', label: 'Sekolah 3D' },
                  { id: '/backgrounds/bg_liquid_waves_1786344755305.png', label: 'Liquid' },
                  { id: '/backgrounds/bg_cyberpunk_city_1786344765659.png', label: 'Kota Tech' }
                ].map(bg => (
                  <div 
                    key={bg.id} 
                    onClick={() => { updatePageProperty({ canvasBgImage: bg.id, canvasBgMode: 'cover', canvasBgOpacity: 1, canvasBackground: '#ffffff' }); }}
                    style={{
                      border: canvasBgImage === bg.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      borderRadius: 6,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      aspectRatio: '9/16',
                      backgroundImage: `url(${bg.id})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                    title={bg.label}
                  />
                ))}
              </div>

              <span className={styles.controlLabel} style={{display:'block', marginTop:16, marginBottom:8}}>Gambar Latar Belakang (Transparan)</span>
              <div style={{
                 border: '2px dashed var(--color-outline)', 
                 borderRadius: 8, 
                 padding: 16, 
                 textAlign: 'center',
                 background: '#f8fafc',
                 cursor: 'pointer',
                 position: 'relative'
              }}>
                <span className="material-symbols-outlined" style={{fontSize: 24, color: 'var(--color-outline)'}}>cloud_upload</span>
                <p style={{margin: '4px 0 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)', fontWeight: 500}}>Upload Gambar Background</p>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("upload_preset", "desain_preset");
                      
                      try {
                        const res = await fetch("https://api.cloudinary.com/v1_1/gyewfsfw/image/upload", {
                          method: "POST",
                          body: formData,
                        });
                        const data = await res.json();
                        const url = data.secure_url;
                        if (url) {
                          updatePageProperty({ canvasBgImage: url });
                        }
                      } catch (error) {
                        console.error("Gagal mengunggah gambar background:", error);
                        alert("Gagal mengunggah gambar background.");
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

              {canvasBgImage && (
                 <div style={{marginTop: 16}}>
                    <span className={styles.controlLabel} style={{display:'block', marginBottom:8}}>Mode Tampilan</span>
                    <select 
                      className={styles.selectField} 
                      style={{marginBottom: 16}}
                      value={canvasBgMode}
                      onChange={(e) => updatePageProperty({ canvasBgMode: e.target.value as 'cover' | 'pattern' })}
                    >
                       <option value="cover">Gambar Penuh (Cover)</option>
                       <option value="pattern">Pola Berulang (Watermark)</option>
                    </select>

                    <span className={styles.controlLabel} style={{display:'flex', justifyContent: 'space-between', marginBottom:8}}>
                       Opasitas Gambar
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.01"
                        value={canvasBgOpacity}
                        onChange={(e) => updatePageProperty({ canvasBgOpacity: Number(e.target.value) })}
                        style={{ flex: 1 }}
                      />
                      <input 
                        type="number"
                        min="0" max="100"
                        value={Math.round(canvasBgOpacity * 100)}
                        onChange={(e) => updatePageProperty({ canvasBgOpacity: Number(e.target.value) / 100 })}
                        className={styles.inputField}
                        style={{ width: 60, padding: '4px 8px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>%</span>
                    </div>

                    {canvasBgMode === 'cover' && (
                      <>
                        <span className={styles.controlLabel} style={{display:'flex', justifyContent: 'space-between', marginBottom:8}}>
                           Ukuran Gambar (Zoom)
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <input 
                            type="range" 
                            min="10" max="300" step="1"
                            value={canvasBgScale}
                            onChange={(e) => updatePageProperty({ canvasBgScale: Number(e.target.value) })}
                            style={{ flex: 1 }}
                          />
                          <input 
                            type="number"
                            min="10" max="300"
                            value={canvasBgScale}
                            onChange={(e) => updatePageProperty({ canvasBgScale: Number(e.target.value) })}
                            className={styles.inputField}
                            style={{ width: 60, padding: '4px 8px', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>%</span>
                        </div>
                      </>
                    )}
                    <button 
                       style={{marginTop: 8, padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold'}}
                       onClick={() => updatePageProperty({ canvasBgImage: null })}
                    >Hapus Gambar</button>
                 </div>
              )}
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

                {/* Input untuk mengunggah gambar saat layer Screenshot, Popup, atau Badge dipilih */}
                {(activeData.type === 'mockup' || activeData.type === 'image_card' || activeData.type === 'badge') && (
                  <div style={{marginBottom: 16}}>
                    <span className={styles.inputLabel} style={{display:'block', marginBottom:8}}>
                      {activeData.type === 'mockup' ? 'Upload Gambar Mockup' : (activeData.type === 'badge' ? 'Upload Logo / Ikon' : 'Upload Gambar Popup')}
                    </span>
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
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append("file", file);
                            formData.append("upload_preset", "desain_preset");
                            
                            try {
                              const res = await fetch("https://api.cloudinary.com/v1_1/gyewfsfw/image/upload", {
                                method: "POST",
                                body: formData,
                              });
                              const data = await res.json();
                              const url = data.secure_url;
                              
                              if (url) {
                                if (activeData.type === 'mockup') {
                                   setScreenshotUrl(url);
                                } else {
                                   handlePropChange('imageUrl', url);
                                }
                              }
                            } catch (error) {
                              console.error("Gagal mengunggah gambar layer:", error);
                              alert("Gagal mengunggah gambar.");
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

              {(activeData.type === 'text' || activeData.type === 'badge') && (
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
          

        </DraggableDialog>
      </div>
      {/* MODALS */}
      {showSaveModal && (
        <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'white', padding:24, borderRadius:12, width: 400, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
             <h3 style={{marginTop:0, marginBottom:16}}>Simpan Proyek Baru</h3>
             <input 
               type="text" 
               className={styles.inputField} 
               value={projectName}
               onChange={(e) => setProjectName(e.target.value)}
               placeholder="Nama Proyek (mis: Promo Agustus)"
               autoFocus
             />
             <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:24}}>
                <button className={styles.btnSecondary} onClick={() => setShowSaveModal(false)}>Batal</button>
                <button className={styles.btnPrimary} onClick={submitSaveNewProject}>Simpan</button>
             </div>
          </div>
        </div>
      )}

      {showOpenModal && (
        <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'white', padding:24, borderRadius:12, width: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
               <h3 style={{margin:0}}>Buka Proyek</h3>
               <button className={styles.iconBtn} onClick={() => setShowOpenModal(false)}><span className="material-symbols-outlined">close</span></button>
             </div>
             
             <div style={{overflowY: 'auto', flex: 1, paddingRight: 4}}>
               {projects.length === 0 ? (
                 <div style={{textAlign:'center', padding: 32, color:'#94a3b8'}}>Belum ada proyek yang tersimpan</div>
               ) : (
                 <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                   {projects.sort((a,b) => b.updatedAt - a.updatedAt).map(proj => (
                     <div key={proj.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:16, border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer'}} onClick={() => handleOpenProject(proj)}>
                       <div>
                         <div style={{fontWeight:'bold', fontSize:14}}>{proj.name}</div>
                         <div style={{fontSize:12, color:'#64748b', marginTop:4}}>{new Date(proj.updatedAt).toLocaleString()} • {proj.pages.length} Halaman</div>
                       </div>
                       <span className="material-symbols-outlined" style={{color:'#3b82f6'}}>chevron_right</span>
                     </div>
                   ))}
                 </div>
               )}
              </div>
           </div>
         </div>
       )}

       {showExportModal && (
         <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
           <div style={{background:'white', padding:24, borderRadius:12, width: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div>
                  <h3 style={{margin:0, fontSize: 18}}>Export Multi-Device (ZIP)</h3>
                  <p style={{margin: '4px 0 0 0', fontSize: 12, color: '#64748b'}}>Desain 1 kali, otomatis di-render ke semua pilihan resolusi perangkat toko aplikasi.</p>
                </div>
                {!isExportingMultiple && <button className={styles.iconBtn} onClick={() => setShowExportModal(false)}><span className="material-symbols-outlined">close</span></button>}
              </div>
              
              {!isExportingMultiple ? (
                <>
                  <div style={{marginBottom: 16}}>
                    <label style={{fontWeight: 700, fontSize: 13, color: '#1e293b', display: 'block', marginBottom: 8}}>
                      Pilih Tipe Perangkat Tujuan:
                    </label>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                      {availableDeviceTargets.map((dev) => {
                        const isChecked = selectedDevices.includes(dev.id);
                        return (
                          <div 
                            key={dev.id} 
                            style={{
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 10, 
                              padding: '8px 12px', 
                              border: isChecked ? '1px solid #2563eb' : '1px solid #e2e8f0', 
                              background: isChecked ? '#eff6ff' : '#ffffff', 
                              borderRadius: 8,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedDevices(prev => prev.filter(id => id !== dev.id));
                              } else {
                                setSelectedDevices(prev => [...prev, dev.id]);
                              }
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {}}
                              style={{cursor: 'pointer'}}
                            />
                            <div style={{flex: 1}}>
                              <div style={{fontWeight: 600, fontSize: 13, color: isChecked ? '#1d4ed8' : '#0f172a'}}>
                                {dev.label} <span style={{fontSize: 11, fontWeight: 500, color: '#64748b'}}>({dev.width} x {dev.height} px)</span>
                              </div>
                              <div style={{fontSize: 11, color: '#64748b'}}>{dev.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #e2e8f0', marginBottom: 10}}>
                    <input 
                      type="checkbox" 
                      checked={selectedExportPages.length === pages.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedExportPages(pages.map(p => p.id));
                        else setSelectedExportPages([]);
                      }}
                      id="selectAllPages"
                      style={{cursor: 'pointer'}}
                    />
                    <label htmlFor="selectAllPages" style={{fontWeight: 'bold', fontSize: 13, cursor: 'pointer'}}>Pilih Semua Halaman ({pages.length})</label>
                  </div>
                  <div style={{overflowY: 'auto', flex: 1, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140}}>
                    {pages.map(p => (
                      <div key={p.id} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <input 
                          type="checkbox" 
                          id={`export-${p.id}`}
                          checked={selectedExportPages.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedExportPages([...selectedExportPages, p.id]);
                            else setSelectedExportPages(selectedExportPages.filter(id => id !== p.id));
                          }}
                          style={{cursor: 'pointer'}}
                        />
                        <label htmlFor={`export-${p.id}`} style={{cursor: 'pointer', fontSize: 13}}>{p.id}</label>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:20}}>
                    <button className={styles.btnSecondary} onClick={() => setShowExportModal(false)}>Batal</button>
                    <button 
                      className={styles.btnPrimary} 
                      onClick={handleExportMultiple} 
                      disabled={selectedExportPages.length === 0 || selectedDevices.length === 0}
                    >
                      Export {selectedExportPages.length} Halaman x {selectedDevices.length} Perangkat (ZIP)
                    </button>
                  </div>
                </>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0'}}>
                  <div style={{width: '100%', background: '#e2e8f0', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 16}}>
                    <div style={{background: '#3b82f6', height: '100%', width: `${exportProgress}%`, transition: 'width 0.3s'}} />
                  </div>
                  <div style={{fontWeight: 'bold'}}>Mengekspor Multi-Device ke ZIP... ({exportProgress}%)</div>
                  <div style={{fontSize: 12, color: '#64748b', marginTop: 8}}>Sedang me-render kanvas sesuai ukuran resolusi tiap perangkat.</div>
                </div>
              )}
           </div>
         </div>
       )}

       {/* MODAL IMPORT DARI PLAY STORE SUBMISSIONS */}
       {showImportModal && (
         <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
           <div style={{background:'white', padding:24, borderRadius:12, width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div>
                  <h3 style={{margin:0, fontSize: 18, color: '#0f172a'}}>Tarik Aset dari Submisi Play Store</h3>
                  <p style={{margin: '4px 0 0 0', fontSize: 12, color: '#64748b'}}>Pilih submisi aplikasi untuk langsung mengimpor logo & screenshot ke editor mockup.</p>
                </div>
                <button className={styles.iconBtn} onClick={() => setShowImportModal(false)}><span className="material-symbols-outlined">close</span></button>
              </div>

              <div style={{overflowY: 'auto', flex: 1, paddingRight: 4}}>
                {loadingSubmissions ? (
                  <div style={{textAlign: 'center', padding: '32px 0', color: '#64748b'}}>
                    <span className="material-symbols-outlined" style={{fontSize: 28, animation: 'spin 1s linear infinite'}}>autorenew</span>
                    <p style={{marginTop: 8, fontSize: 13}}>Memuat daftar submisi klien...</p>
                  </div>
                ) : submissionsList.length === 0 ? (
                  <div style={{textAlign: 'center', padding: 32, color: '#94a3b8'}}>
                    <span className="material-symbols-outlined" style={{fontSize: 40, color: '#cbd5e1'}}>inbox</span>
                    <p style={{marginTop: 8, fontWeight: 600}}>Belum ada submisi dari klien</p>
                    <p style={{fontSize: 12}}>Kirimkan tautan pengumpulan aset ke klien terlebih dahulu di menu Play Store Assets.</p>
                  </div>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                    {submissionsList.map((sub: any) => {
                      const ssCount = sub.uploadedAssets?.screenshots?.length || 0;
                      const logoId = sub.uploadedAssets?.logo?.id;
                      return (
                        <div 
                          key={sub.id} 
                          style={{
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '12px 16px', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: 10, 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: '#ffffff'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                          onClick={() => handleImportSubmissionAssets(sub)}
                        >
                          <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                            {logoId ? (
                              <img 
                                src={`/api/playstore/download?submissionId=${sub.id}&fileId=${logoId}`} 
                                alt={sub.appName}
                                style={{width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid #e2e8f0'}}
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div style={{width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700}}>
                                {sub.appName ? sub.appName.charAt(0).toUpperCase() : '📱'}
                              </div>
                            )}
                            <div>
                              <div style={{fontWeight: 700, fontSize: 14, color: '#0f172a'}}>{sub.appName}</div>
                              <div style={{fontSize: 12, color: '#64748b', marginTop: 2}}>
                                Klien: {sub.clientName} • <code>{sub.packageName}</code>
                              </div>
                              <div style={{fontSize: 11, color: '#059669', marginTop: 2, fontWeight: 600}}>
                                ✓ {ssCount} Screenshot Ponsel Tersedia
                              </div>
                            </div>
                          </div>
                          <button 
                            className={styles.btnPrimary} 
                            style={{padding: '6px 14px', fontSize: 12, whiteSpace: 'nowrap'}}
                          >
                            Gunakan Aset
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
           </div>
         </div>
       )}
     </div>
   );
 }
