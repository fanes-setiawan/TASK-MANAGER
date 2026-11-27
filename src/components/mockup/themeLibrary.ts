import { DeviceType, DeviceColor } from "./deviceSpecs";

export interface ThemeConfig {
  id: string;
  name: string;
  category: 
    | "Minimalist White"
    | "Modern Corporate"
    | "Royal Blue Premium"
    | "Luxury Black & Gold"
    | "Soft Pastel"
    | "Gradient Modern"
    | "Glassmorphism"
    | "Neumorphism"
    | "Dark Professional"
    | "Apple Inspired"
    | "Google Material Inspired"
    | "Food & Delivery"
    | "Finance & Banking"
    | "Healthcare"
    | "Education"
    | "E-Commerce"
    | "Productivity & Business";
  description: string;
  background: string;
  bgMode?: 'cover' | 'pattern';
  bgPattern?: string;
  bgImage?: string | null;
  textColor: string;
  subtextColor: string;
  accentColor: string;
  deviceType: DeviceType;
  deviceColor: DeviceColor;
  is3D: boolean;
  headerBadge: { text: string; icon: string; bg: string; color: string };
  titleText: string;
  subtitleText: string;
  ratingBadge?: { text: string; icon: string; bg: string; color: string };
  cardBg?: string;
  previewColors: string[];
}

export const THEME_LIBRARY: ThemeConfig[] = [
  // 1. Minimalist White
  {
    id: "minimalist_white",
    name: "Pure Minimalist",
    category: "Minimalist White",
    description: "Desain ultra bersih dengan aksen monokrom kontemporer dan ruang bernapas luas.",
    background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
    textColor: "#0f172a",
    subtextColor: "#64748b",
    accentColor: "#0f172a",
    deviceType: "iphone_dynamic_island",
    deviceColor: "silver",
    is3D: false,
    headerBadge: { text: "Simplicity First", icon: "check_circle", bg: "#f1f5f9", color: "#0f172a" },
    titleText: "Less Noise.\nMore Focus.",
    subtitleText: "Dirancang secara minimalis untuk pengalaman pengguna tanpa gangguan.",
    previewColors: ["#ffffff", "#f1f5f9", "#0f172a"]
  },

  // 2. Modern Corporate
  {
    id: "modern_corporate",
    name: "Enterprise Corporate",
    category: "Modern Corporate",
    description: "Karakter korporat profesional dengan warna navy mantap dan struktur rapi.",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
    textColor: "#ffffff",
    subtextColor: "#cbd5e1",
    accentColor: "#38bdf8",
    deviceType: "iphone_dynamic_island",
    deviceColor: "titanium",
    is3D: true,
    headerBadge: { text: "Enterprise Grade", icon: "security", bg: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" },
    titleText: "Scalable Solutions\nFor Modern Business",
    subtitleText: "Infrastruktur aman dan andal untuk tim bertumbuh cepat.",
    previewColors: ["#0f172a", "#1e293b", "#38bdf8"]
  },

  // 3. Royal Blue Premium
  {
    id: "royal_blue_premium",
    name: "Royal Cobalt Luxe",
    category: "Royal Blue Premium",
    description: "Gradasi biru safir eksklusif dengan elemen visual berkelas dan terpercaya.",
    background: "linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 60%, #0f172a 100%)",
    textColor: "#ffffff",
    subtextColor: "#93c5fd",
    accentColor: "#60a5fa",
    deviceType: "iphone_dynamic_island",
    deviceColor: "midnight",
    is3D: false,
    headerBadge: { text: "Verified Security", icon: "verified", bg: "rgba(255,255,255,0.2)", color: "#ffffff" },
    titleText: "Find Your Dream\nExperience Today",
    subtitleText: "Layanan terpercaya dengan reservasi instan & garansi penuh.",
    previewColors: ["#1d4ed8", "#1e3a8a", "#60a5fa"]
  },

  // 4. Luxury Black & Gold
  {
    id: "luxury_black_gold",
    name: "Imperial Black & Gold",
    category: "Luxury Black & Gold",
    description: "Kemewahan estetika emas murni di atas kanvas hitam matte eksklusif.",
    background: "radial-gradient(circle at 50% 20%, #1c1917 0%, #0c0a09 70%, #000000 100%)",
    textColor: "#fef08a",
    subtextColor: "#d6d3d1",
    accentColor: "#eab308",
    deviceType: "iphone_dynamic_island",
    deviceColor: "gold",
    is3D: true,
    headerBadge: { text: "Signature Edition", icon: "diamond", bg: "rgba(234, 179, 8, 0.2)", color: "#fde047" },
    titleText: "Elevate Your Wealth\nWith Prestige",
    subtitleText: "Akses eksklusif layanan VIP dan manajemen portofolio privat.",
    previewColors: ["#000000", "#1c1917", "#eab308"]
  },

  // 5. Soft Pastel
  {
    id: "soft_pastel",
    name: "Pastel Dreamscape",
    category: "Soft Pastel",
    description: "Kombinasi warna pastel lembut yang menenangkan, ramah, dan bersahabat.",
    background: "linear-gradient(135deg, #fdf2f8 0%, #f5f3ff 50%, #eff6ff 100%)",
    textColor: "#475569",
    subtextColor: "#64748b",
    accentColor: "#ec4899",
    deviceType: "android_punch_hole",
    deviceColor: "white",
    is3D: false,
    headerBadge: { text: "Mindful Living", icon: "favorite", bg: "#fce7f3", color: "#db2777" },
    titleText: "Feel Calm,\nLive Mindfully",
    subtitleText: "Catat perasaanmu dan bangun rutinitas positif setiap hari.",
    previewColors: ["#fdf2f8", "#f5f3ff", "#ec4899"]
  },

  // 6. Gradient Modern
  {
    id: "gradient_modern",
    name: "Electric Sunset Fusion",
    category: "Gradient Modern",
    description: "Gradasi spektrum ultraviolet hingga hot-pink menyala dengan energi tinggi.",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #db2777 100%)",
    textColor: "#ffffff",
    subtextColor: "#fbcfe8",
    accentColor: "#f472b6",
    deviceType: "iphone_dynamic_island",
    deviceColor: "black",
    is3D: true,
    headerBadge: { text: "Next Gen Social", icon: "bolt", bg: "rgba(255,255,255,0.25)", color: "#ffffff" },
    titleText: "Useful. Social.\nExpressive.",
    subtitleText: "Bagikan momen terbaikmu dengan jutaan kreator di seluruh dunia.",
    previewColors: ["#4f46e5", "#7c3aed", "#db2777"]
  },

  // 7. Glassmorphism
  {
    id: "glassmorphism",
    name: "Frosted Glass Cyber",
    category: "Glassmorphism",
    description: "Efek blur frosted glass transparan dengan border neon halus & kedalaman nyata.",
    background: "radial-gradient(circle at 20% 20%, #2563eb 0%, #0f172a 60%, #030712 100%)",
    textColor: "#ffffff",
    subtextColor: "#94a3b8",
    accentColor: "#38bdf8",
    deviceType: "iphone_dynamic_island",
    deviceColor: "silver",
    is3D: true,
    headerBadge: { text: "Glass UI v2", icon: "blur_on", bg: "rgba(255,255,255,0.12)", color: "#e2e8f0" },
    titleText: "Translucent Depth\nFuture Design",
    subtitleText: "Visual multi-dimensi dengan aksen frosted glass berkilau.",
    previewColors: ["#2563eb", "#0f172a", "#38bdf8"]
  },

  // 8. Neumorphism
  {
    id: "neumorphism",
    name: "Soft Emboss Neumorphic",
    category: "Neumorphism",
    description: "Desain timbul-tenggelam taktil yang estetik dengan bayangan ganda lembut.",
    background: "linear-gradient(180deg, #e0e5ec 0%, #e0e5ec 100%)",
    textColor: "#334155",
    subtextColor: "#64748b",
    accentColor: "#3b82f6",
    deviceType: "android_punch_hole",
    deviceColor: "white",
    is3D: false,
    headerBadge: { text: "Tactile Flow", icon: "touch_app", bg: "#e0e5ec", color: "#334155" },
    titleText: "Tactile Control\nAt Your Fingertips",
    subtitleText: "Sentuhan fisik natural berpadu dengan kemudahan digital.",
    previewColors: ["#e0e5ec", "#cbd5e1", "#334155"]
  },

  // 9. Dark Professional
  {
    id: "dark_professional",
    name: "Carbon Dark Pro",
    category: "Dark Professional",
    description: "Tema gelap pekat dengan aksen kontras tinggi untuk efisiensi visual maksimal.",
    background: "linear-gradient(180deg, #090d16 0%, #020617 100%)",
    textColor: "#ffffff",
    subtextColor: "#94a3b8",
    accentColor: "#10b981",
    deviceType: "iphone_dynamic_island",
    deviceColor: "black",
    is3D: false,
    headerBadge: { text: "Pro Performance", icon: "speed", bg: "#1e293b", color: "#10b981" },
    titleText: "Lightning Fast\nDeveloper Tools",
    subtitleText: "Dioptimalkan untuk performa tinggi tanpa latensi dan konsumsi baterai rendah.",
    previewColors: ["#090d16", "#1e293b", "#10b981"]
  },

  // 10. Apple Inspired
  {
    id: "apple_inspired",
    name: "Cupertino Clean Aesthetic",
    category: "Apple Inspired",
    description: "Tipografi SF Pro yang presisi, ruang bernapas luas, dan kurva rounded khas Apple.",
    background: "linear-gradient(180deg, #fbfbfd 0%, #f5f5f7 100%)",
    textColor: "#1d1d1f",
    subtextColor: "#86868b",
    accentColor: "#0071e3",
    deviceType: "iphone_dynamic_island",
    deviceColor: "titanium",
    is3D: false,
    headerBadge: { text: "Designed by Cupertino", icon: "apple", bg: "#e8e8ed", color: "#1d1d1f" },
    titleText: "Magical in Every\nSingle Way.",
    subtitleText: "Performa luar biasa dengan kesederhanaan intuitif yang Anda cintai.",
    previewColors: ["#fbfbfd", "#f5f5f7", "#0071e3"]
  },

  // 11. Google Material Inspired
  {
    id: "google_material",
    name: "Material You Dynamic",
    category: "Google Material Inspired",
    description: "Harmoni warna adaptif Material 3 dengan pill buttons dan layout ceria.",
    background: "linear-gradient(135deg, #e8def8 0%, #d0bcff 50%, #f2effa 100%)",
    textColor: "#1d192b",
    subtextColor: "#49454f",
    accentColor: "#6750a4",
    deviceType: "android_punch_hole",
    deviceColor: "black",
    is3D: false,
    headerBadge: { text: "Material Design 3", icon: "palette", bg: "#eaddff", color: "#21005d" },
    titleText: "Adaptive Color,\nTruly Personal.",
    subtitleText: "Antarmuka yang menyesuaikan preferensi dan kepribadian unik Anda.",
    previewColors: ["#e8def8", "#d0bcff", "#6750a4"]
  },

  // 12. Food & Delivery
  {
    id: "food_delivery",
    name: "Gourmet Fresh Bowl",
    category: "Food & Delivery",
    description: "Warna cream hangat dipadu forest green organik untuk aplikasi kuliner selera tinggi.",
    background: "linear-gradient(180deg, #f4f1ea 0%, #e6decb 100%)",
    textColor: "#064e3b",
    subtextColor: "#374151",
    accentColor: "#059669",
    deviceType: "iphone_dynamic_island",
    deviceColor: "titanium",
    is3D: false,
    headerBadge: { text: "Fast Delivery 20m", icon: "lunch_dining", bg: "#d1fae5", color: "#065f46" },
    titleText: "Build Your Bowl,\nFresh Everyday.",
    subtitleText: "Bahan organik langsung dari petani lokal diantar hangat ke depan pintu Anda.",
    previewColors: ["#f4f1ea", "#064e3b", "#059669"]
  },

  // 13. Finance & Banking
  {
    id: "finance_banking",
    name: "Apex Wealth & Fintech",
    category: "Finance & Banking",
    description: "Tema emerald green and black yang memancarkan stabilitas moneter dan pertumbuhan.",
    background: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)",
    textColor: "#ffffff",
    subtextColor: "#a7f3d0",
    accentColor: "#34d399",
    deviceType: "iphone_dynamic_island",
    deviceColor: "black",
    is3D: true,
    headerBadge: { text: "Bank-Grade Encryption", icon: "account_balance", bg: "rgba(52, 211, 153, 0.15)", color: "#34d399" },
    titleText: "Smart Spending.\nZero Hidden Fees.",
    subtitleText: "Kelola portofolio, transfer internasional bebas biaya, dan catat cashflow.",
    previewColors: ["#022c22", "#064e3b", "#34d399"]
  },

  // 14. Healthcare
  {
    id: "healthcare",
    name: "Vital Clinical Care",
    category: "Healthcare",
    description: "Warna cyan medis higienis yang memberikan ketenangan dan kepercayaan pasien.",
    background: "linear-gradient(180deg, #0891b2 0%, #0e7490 60%, #155e75 100%)",
    textColor: "#ffffff",
    subtextColor: "#cffafe",
    accentColor: "#22d3ee",
    deviceType: "iphone_dynamic_island",
    deviceColor: "white",
    is3D: false,
    headerBadge: { text: "Doctor Approved", icon: "medical_services", bg: "rgba(255,255,255,0.2)", color: "#ffffff" },
    titleText: "Your Health Partner,\nAvailable 24/7",
    subtitleText: "Konsultasi dokter spesialis, tebus resep, dan cek lab dalam satu genggaman.",
    previewColors: ["#0891b2", "#0e7490", "#22d3ee"]
  },

  // 15. Education
  {
    id: "education",
    name: "Interactive Academy",
    category: "Education",
    description: "Warna indigo edukatif yang meningkatkan konsentrasi dan motivasi belajar.",
    background: "linear-gradient(135deg, #312e81 0%, #3730a3 50%, #1e1b4b 100%)",
    textColor: "#ffffff",
    subtextColor: "#c7d2fe",
    accentColor: "#f59e0b",
    deviceType: "tablet_modern",
    deviceColor: "silver",
    is3D: true,
    headerBadge: { text: "Top Learning App", icon: "school", bg: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" },
    titleText: "Master Any Skill\nStep by Step",
    subtitleText: "Kurikulum terstruktur dengan kuis interaktif dan sertifikasi internasional.",
    previewColors: ["#312e81", "#3730a3", "#f59e0b"]
  },

  // 16. E-Commerce
  {
    id: "ecommerce",
    name: "Modern Marketplace",
    category: "E-Commerce",
    description: "Warna oranye ceria berenergi tinggi yang memicu konversi pembelian.",
    background: "linear-gradient(135deg, #ea580c 0%, #c2410c 60%, #7c2d12 100%)",
    textColor: "#ffffff",
    subtextColor: "#fed7aa",
    accentColor: "#fde047",
    deviceType: "iphone_dynamic_island",
    deviceColor: "titanium",
    is3D: false,
    headerBadge: { text: "Flash Sale 70% Off", icon: "shopping_bag", bg: "rgba(255,255,255,0.2)", color: "#ffffff" },
    titleText: "Shop Trending Deals\nEvery Single Day",
    subtitleText: "Gratis ongkir tanpa minimum belanja dengan metode pembayaran instan.",
    previewColors: ["#ea580c", "#c2410c", "#fde047"]
  },

  // 17. Productivity & Business
  {
    id: "productivity_business",
    name: "Agile Task Master",
    category: "Productivity & Business",
    description: "Kombinasi slate dan emerald yang dirancang untuk fokus kerja tanpa distraksi.",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #064e3b 100%)",
    textColor: "#ffffff",
    subtextColor: "#94a3b8",
    accentColor: "#10b981",
    deviceType: "iphone_dynamic_island",
    deviceColor: "titanium",
    is3D: true,
    headerBadge: { text: "Kanban & Roadmaps", icon: "task_alt", bg: "rgba(16, 185, 129, 0.2)", color: "#34d399" },
    titleText: "Organize Everything,\nDeliver Faster.",
    subtitleText: "Sinkronisasi sprint tim secara real-time dari desktop hingga mobile.",
    previewColors: ["#0f172a", "#1e293b", "#10b981"]
  }
];
