export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  category: 'Single' | 'Multi-Device' | 'Composition';
  icon: string;
  setup: {
    deviceCount: number;
    mockupPositions: {
      x: number;
      y: number;
      w?: number;
      h?: number;
      rotation?: number;
      is3D?: boolean;
    }[];
    titlePos: { x: number; y: number; w?: number };
    subtitlePos: { x: number; y: number; w?: number };
    badgePos?: { x: number; y: number };
  };
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'single_center',
    name: 'Single Device Centered',
    description: '1 Perangkat tegak di tengah kanvas dengan teks judul dan subtitle di atas.',
    category: 'Single',
    icon: 'smartphone',
    setup: {
      deviceCount: 1,
      mockupPositions: [{ x: 100, y: 320, w: 280, h: 606, rotation: 0, is3D: false }],
      titlePos: { x: 30, y: 130, w: 420 },
      subtitlePos: { x: 30, y: 240, w: 420 },
      badgePos: { x: 140, y: 60 }
    }
  },
  {
    id: 'single_3d_perspective',
    name: 'Device Perspective 3D',
    description: '1 Perangkat miring dengan perspektif 3D dinamis dan bayangan dramatis.',
    category: 'Single',
    icon: 'view_in_ar',
    setup: {
      deviceCount: 1,
      mockupPositions: [{ x: 80, y: 320, w: 280, h: 606, rotation: 0, is3D: true }],
      titlePos: { x: 30, y: 120, w: 420 },
      subtitlePos: { x: 30, y: 230, w: 420 },
      badgePos: { x: 140, y: 55 }
    }
  },
  {
    id: 'two_devices_duo',
    name: 'Two Devices Comparison',
    description: '2 Perangkat bersisian menampilkan variasi fitur atau alur aplikasi.',
    category: 'Multi-Device',
    icon: 'devices',
    setup: {
      deviceCount: 2,
      mockupPositions: [
        { x: 30, y: 360, w: 220, h: 480, rotation: -6, is3D: false },
        { x: 230, y: 340, w: 220, h: 480, rotation: 6, is3D: false }
      ],
      titlePos: { x: 25, y: 120, w: 430 },
      subtitlePos: { x: 25, y: 230, w: 430 },
      badgePos: { x: 140, y: 50 }
    }
  },
  {
    id: 'overlapping_devices',
    name: 'Overlapping Cascade',
    description: 'Perangkat depan menumpuk di atas perangkat belakang berkedalaman layer.',
    category: 'Multi-Device',
    icon: 'layers',
    setup: {
      deviceCount: 2,
      mockupPositions: [
        { x: 140, y: 280, w: 250, h: 540, rotation: 10, is3D: false },
        { x: 60, y: 350, w: 270, h: 580, rotation: -4, is3D: false }
      ],
      titlePos: { x: 30, y: 100, w: 420 },
      subtitlePos: { x: 30, y: 190, w: 420 },
      badgePos: { x: 130, y: 40 }
    }
  },
  {
    id: 'tablet_landscape',
    name: 'Tablet Showcase',
    description: 'Mockup layar lebar Tablet / iPad dengan fokus visual maksimal.',
    category: 'Single',
    icon: 'tablet_mac',
    setup: {
      deviceCount: 1,
      mockupPositions: [{ x: 40, y: 300, w: 400, h: 540, rotation: 0, is3D: false }],
      titlePos: { x: 30, y: 100, w: 420 },
      subtitlePos: { x: 30, y: 200, w: 420 },
      badgePos: { x: 130, y: 40 }
    }
  }
];

export interface VisualAssetCategory {
  id: string;
  name: string;
  assets: { id: string; name: string; url?: string; style?: React.CSSProperties; tag: string }[];
}

export const VISUAL_ASSETS: VisualAssetCategory[] = [
  {
    id: 'abstract_gradients',
    name: 'Abstract Gradients',
    assets: [
      { id: 'grad_aurora', name: 'Aurora Borealis', style: { background: 'linear-gradient(135deg, #059669 0%, #0284c7 50%, #4f46e5 100%)' }, tag: 'gradient' },
      { id: 'grad_sunset', name: 'Cyber Sunset', style: { background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 50%, #fde047 100%)' }, tag: 'gradient' },
      { id: 'grad_neon_violet', name: 'Neon Ultraviolet', style: { background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)' }, tag: 'gradient' },
      { id: 'grad_emerald_deep', name: 'Deep Emerald', style: { background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)' }, tag: 'gradient' },
      { id: 'grad_dark_matter', name: 'Dark Matter', style: { background: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 70%, #020617 100%)' }, tag: 'gradient' },
    ]
  },
  {
    id: 'decorative_badges',
    name: 'Badges & Floating Pills',
    assets: [
      { id: 'badge_star', name: '5.0 ★ Rating App Store', tag: 'badge' },
      { id: 'badge_security', name: '100% Encrypted & Safe', tag: 'badge' },
      { id: 'badge_award', name: '#1 App of The Day', tag: 'badge' },
      { id: 'badge_verified', name: 'Verified Enterprise', tag: 'badge' },
      { id: 'badge_speed', name: 'Ultra Fast Real-Time', tag: 'badge' },
    ]
  }
];
