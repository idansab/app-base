import { Coffee, Trees, Palette, Music, ShoppingBag, Ticket, MapPin } from "lucide-react";

// The six categories of the site. Anything older (cafe, hiking, view, beach, family, trips...)
// is folded into one of them by normalizeCategory.
export const CATEGORIES = [
  { key: "food", label: "עגלות קפה ואוכל", icon: Coffee, tone: "border-orange-200 bg-orange-50/95 text-orange-800" },
  { key: "nature", label: "טבע וטיולים", icon: Trees, tone: "border-emerald-200 bg-emerald-50/95 text-emerald-800" },
  { key: "nightlife", label: "חיי לילה", icon: Music, tone: "border-indigo-200 bg-indigo-50/95 text-indigo-800" },
  { key: "shopping", label: "קניות ושווקים", icon: ShoppingBag, tone: "border-rose-200 bg-rose-50/95 text-rose-800" },
  { key: "culture", label: "תרבות", icon: Palette, tone: "border-violet-200 bg-violet-50/95 text-violet-800" },
  { key: "attractions", label: "אטרקציות", icon: Ticket, tone: "border-sky-200 bg-sky-50/95 text-sky-800" },
];

const LEGACY = {
  cafe: "food", coffee_food: "food",
  hiking: "nature", view: "nature", beach: "nature", family: "nature", trips: "nature",
};

export const normalizeCategory = (key) => LEGACY[key] || key;

const FALLBACK = { key: "other", label: "אחר", icon: MapPin, tone: "border-slate-200 bg-slate-50/95 text-slate-700" };

export const getCategory = (key) =>
  CATEGORIES.find((category) => category.key === normalizeCategory(key)) || FALLBACK;
