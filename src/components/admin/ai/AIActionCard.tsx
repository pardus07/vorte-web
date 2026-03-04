"use client";

import { useState } from "react";
import {
  Check,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Mail,
  Settings,
  ShoppingCart,
  Factory,
  Tag,
  Users,
  AlertTriangle,
} from "lucide-react";
import type { ApprovalLevel } from "@/lib/ai-agent-tools";

interface PendingAction {
  toolName: string;
  args: Record<string, unknown>;
  approvalLevel: ApprovalLevel;
  description: string;
}

interface AIActionCardProps {
  action: PendingAction;
  onApprove: (action: PendingAction) => void;
  onReject: (action: PendingAction) => void;
  isLoading?: boolean;
  status?: "pending" | "approved" | "rejected";
}

// Tool adından kategori ikonu
function getToolIcon(toolName: string): React.ReactNode {
  if (toolName.includes("blog") || toolName.includes("page"))
    return <FileText className="h-4 w-4" />;
  if (toolName.includes("product") || toolName.includes("categor"))
    return <Package className="h-4 w-4" />;
  if (toolName.includes("email") || toolName.includes("message") || toolName.includes("reply"))
    return <Mail className="h-4 w-4" />;
  if (toolName.includes("setting"))
    return <Settings className="h-4 w-4" />;
  if (toolName.includes("order") || toolName.includes("shipment") || toolName.includes("refund") || toolName.includes("invoice"))
    return <ShoppingCart className="h-4 w-4" />;
  if (toolName.includes("production"))
    return <Factory className="h-4 w-4" />;
  if (toolName.includes("coupon"))
    return <Tag className="h-4 w-4" />;
  if (toolName.includes("dealer") || toolName.includes("user") || toolName.includes("customer"))
    return <Users className="h-4 w-4" />;
  return <Settings className="h-4 w-4" />;
}

// Onay seviyesine göre renk
function getApprovalColor(level: ApprovalLevel) {
  if (level === 3) return {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    icon: "text-red-600",
  };
  return {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    icon: "text-amber-600",
  };
}

// Args'ı okunabilir özete dönüştür
function formatArgsPreview(toolName: string, args: Record<string, unknown>): string[] {
  const lines: string[] = [];

  // Blog
  if (toolName === "create_blog_post" || toolName === "update_blog_post") {
    if (args.title) lines.push(`📝 Başlık: ${args.title}`);
    if (args.slug) lines.push(`🔗 Slug: ${args.slug}`);
    if (args.tags) lines.push(`🏷️ Etiketler: ${args.tags}`);
    if (args.seoTitle) lines.push(`🔍 SEO: ${args.seoTitle}`);
    if (args.published !== undefined)
      lines.push(`📌 Durum: ${args.published ? "Yayında" : "Taslak"}`);
    return lines;
  }

  // Ürün
  if (toolName === "create_product" || toolName === "update_product") {
    if (args.name) lines.push(`📦 Ürün: ${args.name}`);
    if (args.basePrice) lines.push(`💰 Fiyat: ₺${args.basePrice}`);
    if (args.gender) lines.push(`👤 Cinsiyet: ${args.gender}`);
    if (Array.isArray(args.variants))
      lines.push(`🎨 Varyasyon: ${args.variants.length} adet`);
    return lines;
  }

  // Sipariş
  if (toolName === "update_order") {
    if (args.id) lines.push(`📋 Sipariş: ${args.id}`);
    if (args.status) lines.push(`📌 Yeni Durum: ${args.status}`);
    if (args.note) lines.push(`📝 Not: ${args.note}`);
    return lines;
  }

  // Kupon
  if (toolName === "create_coupon") {
    if (args.code) lines.push(`🏷️ Kod: ${args.code}`);
    if (args.campaignName) lines.push(`📋 Kampanya: ${args.campaignName}`);
    if (args.discountValue)
      lines.push(
        `💰 İndirim: ${args.discountType === "PERCENTAGE" ? `%${args.discountValue}` : `₺${args.discountValue}`}`
      );
    if (args.startDate && args.endDate)
      lines.push(`📅 Süre: ${args.startDate} → ${args.endDate}`);
    return lines;
  }

  // Üretim
  if (toolName === "create_production_order") {
    if (args.productId) lines.push(`📦 Ürün ID: ${args.productId}`);
    if (Array.isArray(args.variants)) {
      const total = (args.variants as Array<{ quantity: number }>).reduce(
        (sum, v) => sum + (v.quantity || 0),
        0
      );
      lines.push(`🏭 Toplam Adet: ${total}`);
    }
    if (args.targetDate) lines.push(`📅 Hedef: ${args.targetDate}`);
    if (args.priority) lines.push(`⚡ Öncelik: ${args.priority}`);
    return lines;
  }

  // Ayarlar
  if (toolName === "update_settings") {
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined && value !== null) {
        lines.push(`⚙️ ${key}: ${String(value).substring(0, 60)}`);
      }
    }
    return lines;
  }

  // Silme işlemleri
  if (toolName.startsWith("delete_")) {
    if (args.id) lines.push(`🗑️ Silinecek ID: ${args.id}`);
    return lines;
  }

  // Genel
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && value !== null && key !== "content" && key !== "htmlContent") {
      const strValue = typeof value === "object" ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 60);
      lines.push(`${key}: ${strValue}`);
    }
  }
  return lines;
}

export function AIActionCard({
  action,
  onApprove,
  onReject,
  isLoading,
  status = "pending",
}: AIActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = getApprovalColor(action.approvalLevel);
  const preview = formatArgsPreview(action.toolName, action.args);

  // HTML içerik önizleme (blog/email)
  const htmlContent =
    (action.args.content as string) || (action.args.htmlContent as string);

  if (status === "approved") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <Check className="h-4 w-4" />
          <span className="font-medium">✅ {action.description} — Onaylandı</span>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <X className="h-4 w-4" />
          <span>❌ {action.description} — Reddedildi</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className={colors.icon}>{getToolIcon(action.toolName)}</span>
        <span className="flex-1 text-sm font-medium text-gray-900">
          {action.description}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors.badge}`}
        >
          {action.approvalLevel === 3 && (
            <AlertTriangle className="mr-1 h-3 w-3" />
          )}
          {action.approvalLevel === 3 ? "Kritik" : "Onay Gerekli"}
        </span>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="border-t border-inherit px-3 py-2 space-y-0.5">
          {preview.map((line, i) => (
            <p key={i} className="text-xs text-gray-600">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* HTML önizleme (expand/collapse) */}
      {htmlContent && (
        <div className="border-t border-inherit">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            <Eye className="h-3 w-3" />
            <span>{expanded ? "Önizlemeyi Kapat" : "İçeriği Önizle"}</span>
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {expanded && (
            <div className="max-h-64 overflow-y-auto border-t border-inherit bg-white px-3 py-2">
              <div
                className="prose prose-sm max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-inherit px-3 py-2.5">
        <button
          onClick={() => onReject(action)}
          disabled={isLoading}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Reddet
        </button>
        <button
          onClick={() => onApprove(action)}
          disabled={isLoading}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? "İşleniyor..." : "Onayla"}
        </button>
      </div>
    </div>
  );
}
