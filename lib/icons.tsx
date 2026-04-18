import { MaterialCommunityIcons, Ionicons, Feather } from "@expo/vector-icons";
import { colors } from "./theme";

// Centralize all icon usage so swapping icon sets is one-file change

export type IconName =
  | "dashboard"
  | "transactions"
  | "explain"
  | "profile"
  | "add"
  | "camera"
  | "gallery"
  | "delete"
  | "edit"
  | "calendar"
  | "search"
  | "filter"
  | "sort"
  | "check"
  | "close"
  | "back"
  | "share"
  | "pdf"
  | "excel"
  | "sync"
  | "syncDone"
  | "syncError"
  | "warning"
  | "recette"
  | "charge"
  | "receipt";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const iconMap: Record<IconName, { set: "mci" | "ion" | "feather"; icon: string }> = {
  dashboard: { set: "mci", icon: "view-dashboard-outline" },
  transactions: { set: "mci", icon: "swap-horizontal" },
  explain: { set: "mci", icon: "lightbulb-outline" },
  profile: { set: "feather", icon: "user" },
  add: { set: "feather", icon: "plus" },
  camera: { set: "feather", icon: "camera" },
  gallery: { set: "feather", icon: "image" },
  delete: { set: "feather", icon: "trash-2" },
  edit: { set: "feather", icon: "edit-2" },
  calendar: { set: "feather", icon: "calendar" },
  search: { set: "feather", icon: "search" },
  filter: { set: "feather", icon: "filter" },
  sort: { set: "mci", icon: "sort" },
  check: { set: "feather", icon: "check" },
  close: { set: "feather", icon: "x" },
  back: { set: "feather", icon: "chevron-left" },
  share: { set: "feather", icon: "share" },
  pdf: { set: "mci", icon: "file-pdf-box" },
  excel: { set: "mci", icon: "file-excel-box" },
  sync: { set: "feather", icon: "refresh-cw" },
  syncDone: { set: "mci", icon: "cloud-check-outline" },
  syncError: { set: "mci", icon: "cloud-alert" },
  warning: { set: "feather", icon: "alert-triangle" },
  recette: { set: "mci", icon: "arrow-down-circle-outline" },
  charge: { set: "mci", icon: "arrow-up-circle-outline" },
  receipt: { set: "mci", icon: "receipt" },
};

export function Icon({ name, size = 20, color = colors.textPrimary }: IconProps) {
  const entry = iconMap[name];

  if (entry.set === "mci") {
    return <MaterialCommunityIcons name={entry.icon as any} size={size} color={color} />;
  }
  if (entry.set === "ion") {
    return <Ionicons name={entry.icon as any} size={size} color={color} />;
  }
  return <Feather name={entry.icon as any} size={size} color={color} />;
}