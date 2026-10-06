import {
  Coffee,
  Trees,
  Mountain,
  Palette,
  Music,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Sunset,
  Waves,
  MapPin,
} from "lucide-react";

export const CATEGORIES = [
  { key: "cafe", label: "בתי קפה", icon: Coffee, tone: "border-amber-200 bg-amber-50/95 text-amber-800" },
  { key: "nature", label: "טבע ומעיינות", icon: Trees, tone: "border-emerald-200 bg-emerald-50/95 text-emerald-800" },
  { key: "hiking", label: "מסלולי הליכה", icon: Mountain, tone: "border-lime-200 bg-lime-50/95 text-lime-800" },
  { key: "culture", label: "תרבות ואמנות", icon: Palette, tone: "border-violet-200 bg-violet-50/95 text-violet-800" },
  { key: "nightlife", label: "חיי לילה", icon: Music, tone: "border-indigo-200 bg-indigo-50/95 text-indigo-800" },
  { key: "shopping", label: "שווקים וקניות", icon: ShoppingBag, tone: "border-rose-200 bg-rose-50/95 text-rose-800" },
  { key: "family", label: "בילוי משפחתי", icon: Users, tone: "border-sky-200 bg-sky-50/95 text-sky-800" },
  { key: "food", label: "אוכל ואוכל רחוב", icon: UtensilsCrossed, tone: "border-orange-200 bg-orange-50/95 text-orange-800" },
  { key: "view", label: "תצפיות", icon: Sunset, tone: "border-yellow-200 bg-yellow-50/95 text-yellow-800" },
  { key: "beach", label: "חופים", icon: Waves, tone: "border-cyan-200 bg-cyan-50/95 text-cyan-800" },
  { key: "other", label: "אחר", icon: MapPin, tone: "border-slate-200 bg-slate-50/95 text-slate-700" },
];

export const getCategory = (key) =>
  CATEGORIES.find((category) => category.key === key) || CATEGORIES[CATEGORIES.length - 1];
