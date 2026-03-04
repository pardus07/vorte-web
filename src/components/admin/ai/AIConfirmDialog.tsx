"use client";

import { AlertTriangle, X } from "lucide-react";

interface AIConfirmDialogProps {
  title: string;
  description: string;
  details?: string;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AIConfirmDialog({
  title,
  description,
  details,
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: AIConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details */}
        {details && (
          <div className="border-b px-5 py-3">
            <pre className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 font-mono max-h-48 overflow-y-auto">
              {details}
            </pre>
          </div>
        )}

        {/* Warning */}
        <div className="px-5 py-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800 font-medium">
              ⚠️ Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "İşleniyor..." : "Evet, Uygula"}
          </button>
        </div>
      </div>
    </div>
  );
}
