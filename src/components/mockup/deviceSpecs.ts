export type DeviceType = 
  | 'iphone_dynamic_island' // iPhone 16 Pro / 15 Pro
  | 'iphone_notch'          // iPhone 14 / 13
  | 'android_punch_hole'    // Modern Flagship Samsung/Pixel
  | 'android_waterdrop'     // Budget/Midrange Android
  | 'tablet_modern'         // iPad Pro / Galaxy Tab
  | 'custom_minimal';       // Clean frame without hardware cuts

export type DeviceColor = 'black' | 'titanium' | 'silver' | 'gold' | 'midnight' | 'white';

export interface DeviceConfig {
  type: DeviceType;
  color: DeviceColor;
  scale: number;
  rotation: number; // degrees
  x: number;
  y: number;
  shadow: boolean;
  reflection: boolean;
  ambientLight: boolean;
  is3D: boolean;
}

export const DEVICE_SPECS: Record<DeviceType, {
  name: string;
  category: 'Apple' | 'Android' | 'Tablet';
  aspectRatio: number; // width / height
  baseWidth: number;
  baseHeight: number;
  bezelWidth: number;
  cornerRadius: number;
  screenCornerRadius: number;
  hasDynamicIsland?: boolean;
  hasNotch?: boolean;
  hasPunchHole?: boolean;
  hasWaterdrop?: boolean;
  buttons: { side: 'left' | 'right'; top: number; height: number }[];
}> = {
  iphone_dynamic_island: {
    name: 'iPhone 16 / 15 Pro (Dynamic Island)',
    category: 'Apple',
    aspectRatio: 1290 / 2796,
    baseWidth: 280,
    baseHeight: 606,
    bezelWidth: 8,
    cornerRadius: 52,
    screenCornerRadius: 46,
    hasDynamicIsland: true,
    buttons: [
      { side: 'left', top: 110, height: 28 }, // Action Button
      { side: 'left', top: 155, height: 50 }, // Volume Up
      { side: 'left', top: 215, height: 50 }, // Volume Down
      { side: 'right', top: 170, height: 75 }, // Power Button
    ]
  },
  iphone_notch: {
    name: 'iPhone 14 / 13 (Classic Notch)',
    category: 'Apple',
    aspectRatio: 1242 / 2688,
    baseWidth: 280,
    baseHeight: 605,
    bezelWidth: 9,
    cornerRadius: 50,
    screenCornerRadius: 42,
    hasNotch: true,
    buttons: [
      { side: 'left', top: 100, height: 26 }, // Mute switch
      { side: 'left', top: 145, height: 48 }, // Vol +
      { side: 'left', top: 202, height: 48 }, // Vol -
      { side: 'right', top: 165, height: 70 }, // Power
    ]
  },
  android_punch_hole: {
    name: 'Android Flagship (Center Punch-Hole)',
    category: 'Android',
    aspectRatio: 1080 / 2400,
    baseWidth: 275,
    baseHeight: 611,
    bezelWidth: 7,
    cornerRadius: 44,
    screenCornerRadius: 38,
    hasPunchHole: true,
    buttons: [
      { side: 'right', top: 160, height: 65 }, // Volume rocker
      { side: 'right', top: 245, height: 45 }, // Power
    ]
  },
  android_waterdrop: {
    name: 'Android (Waterdrop Notch)',
    category: 'Android',
    aspectRatio: 1080 / 2400,
    baseWidth: 275,
    baseHeight: 611,
    bezelWidth: 8,
    cornerRadius: 40,
    screenCornerRadius: 34,
    hasWaterdrop: true,
    buttons: [
      { side: 'right', top: 160, height: 60 },
      { side: 'right', top: 235, height: 40 },
    ]
  },
  tablet_modern: {
    name: 'iPad Pro / Tablet 10-12"',
    category: 'Tablet',
    aspectRatio: 2048 / 2732,
    baseWidth: 420,
    baseHeight: 560,
    bezelWidth: 12,
    cornerRadius: 32,
    screenCornerRadius: 24,
    hasPunchHole: false,
    buttons: [
      { side: 'right', top: 70, height: 35 },
      { side: 'right', top: 115, height: 35 },
    ]
  },
  custom_minimal: {
    name: 'Minimal Clean Border',
    category: 'Apple',
    aspectRatio: 1080 / 2400,
    baseWidth: 275,
    baseHeight: 611,
    bezelWidth: 6,
    cornerRadius: 36,
    screenCornerRadius: 30,
    buttons: []
  }
};

export const COLOR_CONFIGS: Record<DeviceColor, {
  name: string;
  bodyGradient: string;
  borderOuter: string;
  bezelBorder: string;
  sideHighlight: string;
  buttonColor: string;
}> = {
  black: {
    name: 'Obsidian Black',
    bodyGradient: 'linear-gradient(145deg, #1e293b 0%, #0f172a 50%, #020617 100%)',
    borderOuter: '#334155',
    bezelBorder: '#0b0f19',
    sideHighlight: 'rgba(255, 255, 255, 0.12)',
    buttonColor: '#1e293b'
  },
  titanium: {
    name: 'Natural Titanium',
    bodyGradient: 'linear-gradient(145deg, #78716c 0%, #57534e 50%, #44403c 100%)',
    borderOuter: '#a8a29e',
    bezelBorder: '#292524',
    sideHighlight: 'rgba(255, 255, 255, 0.35)',
    buttonColor: '#78716c'
  },
  silver: {
    name: 'Pure Silver',
    bodyGradient: 'linear-gradient(145deg, #f1f5f9 0%, #cbd5e1 50%, #94a3b8 100%)',
    borderOuter: '#e2e8f0',
    bezelBorder: '#1e293b',
    sideHighlight: 'rgba(255, 255, 255, 0.8)',
    buttonColor: '#cbd5e1'
  },
  gold: {
    name: 'Champagne Gold',
    bodyGradient: 'linear-gradient(145deg, #fef08a 0%, #eab308 50%, #ca8a04 100%)',
    borderOuter: '#fef9c3',
    bezelBorder: '#422006',
    sideHighlight: 'rgba(255, 255, 255, 0.6)',
    buttonColor: '#eab308'
  },
  midnight: {
    name: 'Deep Midnight Blue',
    bodyGradient: 'linear-gradient(145deg, #1e3a8a 0%, #172554 50%, #030712 100%)',
    borderOuter: '#3b82f6',
    bezelBorder: '#0f172a',
    sideHighlight: 'rgba(96, 165, 250, 0.3)',
    buttonColor: '#1d4ed8'
  },
  white: {
    name: 'Ceramic White',
    bodyGradient: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
    borderOuter: '#f1f5f9',
    bezelBorder: '#0f172a',
    sideHighlight: 'rgba(255, 255, 255, 0.95)',
    buttonColor: '#e2e8f0'
  }
};
