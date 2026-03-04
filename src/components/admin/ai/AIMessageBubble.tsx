"use client";

import { Sparkles, User } from "lucide-react";
import { AIActionCard } from "./AIActionCard";
import type { ApprovalLevel } from "@/lib/ai-agent-tools";

export interface PendingAction {
  toolName: string;
  args: Record<string, unknown>;
  approvalLevel: ApprovalLevel;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model" | "system";
  text: string;
  timestamp: Date;
  /** SEVİYE 2-3 onay gerektiren eylem */
  pendingAction?: PendingAction;
  /** Onay durumu */
  actionStatus?: "pending" | "approved" | "rejected";
  /** Tool sonuç verisi (SEVİYE 1) */
  toolResult?: {
    name: string;
    approvalLevel: number;
  };
}

interface AIMessageBubbleProps {
  message: ChatMessage;
  onApproveAction?: (action: PendingAction) => void;
  onRejectAction?: (action: PendingAction) => void;
  isActionLoading?: boolean;
}

export function AIMessageBubble({
  message,
  onApproveAction,
  onRejectAction,
  isActionLoading,
}: AIMessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // Sistem mesajı
  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-1">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2.5 px-4 py-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-gray-800 text-white"
            : "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Mesaj */}
      <div
        className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-gray-800 text-white"
              : "rounded-tl-sm bg-white text-gray-800 shadow-sm border border-gray-100"
          }`}
        >
          {/* Mesaj metni — satır aralarını koru */}
          <div className="whitespace-pre-wrap">{message.text}</div>
        </div>

        {/* Onay kartı (SEVİYE 2-3) */}
        {message.pendingAction && onApproveAction && onRejectAction && (
          <AIActionCard
            action={message.pendingAction}
            onApprove={onApproveAction}
            onReject={onRejectAction}
            isLoading={isActionLoading}
            status={message.actionStatus}
          />
        )}

        {/* Zaman */}
        <p
          className={`text-[10px] text-gray-400 ${isUser ? "text-right" : "text-left"}`}
        >
          {message.timestamp.toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
