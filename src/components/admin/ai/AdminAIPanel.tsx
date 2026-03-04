"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Minimize2,
  Maximize2,
  Trash2,
} from "lucide-react";
import { AIMessageBubble, type ChatMessage, type PendingAction } from "./AIMessageBubble";
import { AIQuickActions } from "./AIQuickActions";
import { AIConfirmDialog } from "./AIConfirmDialog";
import { getPageContext } from "@/lib/ai-agent-context";
import type { Content } from "@google/generative-ai";

export function AdminAIPanel() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // SEVİYE 3 çift onay dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: PendingAction | null;
    messageId: string;
  }>({ isOpen: false, action: null, messageId: "" });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sayfa bağlamı
  const pageContext = getPageContext(pathname);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Ctrl+K kısayolu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Panel açıldığında input'a focus
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Mesajları Gemini format'ına dönüştür
  const toGeminiHistory = useCallback((): Content[] => {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));
  }, [messages]);

  // Mesaj gönder
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    const history = toGeminiHistory();
    history.push({ role: "user", parts: [{ text: text.trim() }] });

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          currentPage: pathname,
          action: "chat",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bir hata oluştu");
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        text: data.reply || "",
        timestamp: new Date(),
      };

      // Pending action (SEVİYE 2-3)
      if (data.pendingAction) {
        aiMsg.pendingAction = data.pendingAction;
        aiMsg.actionStatus = "pending";
      }

      // Tool sonucu (SEVİYE 1)
      if (data.toolCall) {
        aiMsg.toolResult = {
          name: data.toolCall.name,
          approvalLevel: data.toolCall.approvalLevel,
        };
      }

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        text: `❌ Hata: ${err instanceof Error ? err.message : "Bilinmeyen hata"}. Tekrar denemek ister misiniz?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Onay işlemi
  const handleApprove = async (action: PendingAction, messageId: string) => {
    // SEVİYE 3 → çift onay dialog aç
    if (action.approvalLevel === 3) {
      setConfirmDialog({ isOpen: true, action, messageId });
      return;
    }

    // SEVİYE 2 → direkt onayla
    await executeApproval(action, messageId);
  };

  const executeApproval = async (
    action: PendingAction,
    messageId: string
  ) => {
    setIsActionLoading(true);
    setConfirmDialog({ isOpen: false, action: null, messageId: "" });

    try {
      const res = await fetch("/api/admin/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          approveData: {
            toolName: action.toolName,
            args: action.args,
          },
        }),
      });

      const data = await res.json();

      // Mesaj durumunu güncelle
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, actionStatus: data.approved ? "approved" : "rejected" as const }
            : m
        )
      );

      // Sonuç mesajı ekle
      const resultMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        text: data.reply || (data.approved ? "✅ İşlem tamamlandı." : "❌ İşlem başarısız."),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, resultMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        text: `❌ Onay işlemi sırasında hata: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reddetme
  const handleReject = (action: PendingAction, messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, actionStatus: "rejected" as const } : m
      )
    );

    const rejectMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "system",
      text: `${action.description} reddedildi.`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, rejectMsg]);
  };

  // Konuşmayı temizle
  const clearChat = () => {
    setMessages([]);
  };

  // Enter gönder, Shift+Enter yeni satır
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Textarea auto-resize
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const panelWidth = isExpanded ? "w-[600px]" : "w-[420px]";

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-green-500/40 active:scale-95"
          title="Vorte Asistan (Ctrl+K)"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-0 right-0 top-0 z-50 ${panelWidth} flex flex-col border-l border-gray-200 bg-gray-50 shadow-2xl transition-all duration-300`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-white px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Vorte Asistan
                </h2>
                <p className="text-[10px] text-gray-400">
                  {pageContext.pageTitle} • Gemini 2.5 Flash
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Sohbeti Temizle"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title={isExpanded ? "Küçült" : "Genişlet"}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Kapat (Ctrl+K)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages / Quick Actions */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <AIQuickActions
                shortcuts={pageContext.shortcuts}
                onAction={sendMessage}
              />
            ) : (
              <div className="space-y-1 py-3">
                {messages.map((msg) => (
                  <AIMessageBubble
                    key={msg.id}
                    message={msg}
                    onApproveAction={
                      msg.pendingAction
                        ? (action) => handleApprove(action, msg.id)
                        : undefined
                    }
                    onRejectAction={
                      msg.pendingAction
                        ? (action) => handleReject(action, msg.id)
                        : undefined
                    }
                    isActionLoading={isActionLoading}
                  />
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2.5 px-4 py-2">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t bg-white p-3">
            <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Mesajınızı yazın..."
                rows={1}
                className="max-h-[120px] flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              Ctrl+K ile aç/kapat • Enter gönder • Shift+Enter yeni satır
            </p>
          </div>
        </div>
      )}

      {/* SEVİYE 3 Çift Onay Dialog */}
      <AIConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Kritik İşlem Onayı"
        description={confirmDialog.action?.description || ""}
        details={
          confirmDialog.action
            ? JSON.stringify(confirmDialog.action.args, null, 2)
            : undefined
        }
        isLoading={isActionLoading}
        onConfirm={() => {
          if (confirmDialog.action) {
            executeApproval(confirmDialog.action, confirmDialog.messageId);
          }
        }}
        onCancel={() =>
          setConfirmDialog({ isOpen: false, action: null, messageId: "" })
        }
      />
    </>
  );
}
