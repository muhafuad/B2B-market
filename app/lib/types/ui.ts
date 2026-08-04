import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface BadgeColor {
  variant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning";
}

export const statusColors: Record<string, BadgeColor["variant"]> = {
  active: "success",
  inactive: "secondary",
  blacklisted: "destructive",
  pending: "warning",
  draft: "secondary",
  sent: "default",
  accepted: "success",
  rejected: "destructive",
  quoted: "default",
  ordered: "default",
  cancelled: "destructive",
  approved: "success",
  in_production: "warning",
  in_transit: "default",
  shipped: "default",
  delivered: "success",
  completed: "success",
  received: "success",
  inspected: "success",
  stored: "success",
  scheduled: "warning",
  confirmed: "success",
  processing: "warning",
  refunded: "destructive",
  returned: "destructive",
  paid: "success",
  unpaid: "destructive",
  partial: "warning",
  verified: "success",
  on_leave: "warning",
  archived: "secondary",
  low: "secondary",
  medium: "default",
  high: "warning",
  urgent: "destructive",
};

export function formatCurrency(amount: number, symbol = "ETB "): string {
  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-ET", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-ET", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
