import React from "react";

export type IconName =
  | "dashboard" | "transactions" | "explain" | "profile"
  | "add" | "camera" | "gallery" | "delete" | "edit"
  | "calendar" | "search" | "filter" | "sort" | "check"
  | "close" | "back" | "share" | "pdf" | "excel"
  | "sync" | "syncDone" | "syncError" | "warning"| "download" | "cpu" | "scale" | "refresh" | "checkCircle" | "alertTriangle" | "info"
  | "recette" | "charge" | "receipt"| "dollarSign" | "clock" | "barChart" | "tool" | "alertCircle" | "zap";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

const iconMap: Record<IconName, { set: "mci" | "feather"; icon: string }> = {
  dashboard: { set: "mci", icon: "view-dashboard-outline" },
  transactions: { set: "mci", icon: "swap-horizontal" },
  explain: { set: "mci", icon: "lightbulb-outline" },
  download: { set: "feather", icon: "download" },
  dollarSign: { set: "feather", icon: "dollar-sign" },
clock: { set: "feather", icon: "clock" },
barChart: { set: "feather", icon: "bar-chart-2" },
tool: { set: "feather", icon: "tool" },
alertCircle: { set: "feather", icon: "alert-circle" },
zap: { set: "feather", icon: "zap" },
book: { set: "feather", icon: "book-open" },
  cpu: { set: "feather", icon: "cpu" },
  scale: { set: "feather", icon: "sliders" },
  refresh: { set: "feather", icon: "refresh-cw" },
  checkCircle: { set: "feather", icon: "check-circle" },
  alertTriangle: { set: "feather", icon: "alert-triangle" },
  info: { set: "feather", icon: "info" },
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
  receipt: { set: "feather", icon: "file-text" },
};

export function Icon({ name, size = 20, color = "#1A1F1B" }: IconProps) {
  const entry = iconMap[name];
  if (entry.set === "mci") {
    const { MaterialCommunityIcons } = require("@expo/vector-icons");
    return <MaterialCommunityIcons name={entry.icon} size={size} color={color} />;
  }
  const { Feather } = require("@expo/vector-icons");
  return <Feather name={entry.icon} size={size} color={color} />;
}
