"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface SizeGuideProps {
  gender: "erkek" | "kadın";
}

const ERKEK_SIZES = [
  { beden: "S", bel: "72-76", kalca: "88-92", uyluk: "52-54" },
  { beden: "M", bel: "78-82", kalca: "94-98", uyluk: "55-57" },
  { beden: "L", bel: "84-88", kalca: "100-104", uyluk: "58-60" },
  { beden: "XL", bel: "90-94", kalca: "106-110", uyluk: "61-63" },
  { beden: "XXL", bel: "96-100", kalca: "112-116", uyluk: "64-66" },
];

const KADIN_SIZES = [
  { beden: "S", bel: "62-66", kalca: "88-92", uyluk: "52-54" },
  { beden: "M", bel: "68-72", kalca: "94-98", uyluk: "55-57" },
  { beden: "L", bel: "74-78", kalca: "100-104", uyluk: "58-60" },
  { beden: "XL", bel: "80-84", kalca: "106-110", uyluk: "61-63" },
  { beden: "XXL", bel: "86-90", kalca: "112-116", uyluk: "64-66" },
];

export function SizeGuide({ gender }: SizeGuideProps) {
  const [open, setOpen] = useState(false);
  const sizes = gender === "erkek" ? ERKEK_SIZES : KADIN_SIZES;
  const title = gender === "erkek" ? "Erkek Boxer Beden Tablosu" : "Kadın Külot Beden Tablosu";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-1 text-sm text-gray-500 underline-offset-2 hover:text-[#7AC143] hover:underline">
          <Ruler className="h-3.5 w-3.5" />
          Beden Rehberi
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-bold text-gray-900">
              {title}
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          
          <p className="mb-4 text-sm text-gray-500">
            Ölçüler santimetre (cm) cinsindendir. Vücut ölçülerinize en yakın bedeni seçin.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Beden</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Bel (cm)</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Kalça (cm)</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-900">Uyluk (cm)</th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((s) => (
                  <tr key={s.beden} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium text-gray-900">{s.beden}</td>
                    <td className="px-3 py-2 text-gray-600">{s.bel}</td>
                    <td className="px-3 py-2 text-gray-600">{s.kalca}</td>
                    <td className="px-3 py-2 text-gray-600">{s.uyluk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            * Ölçüler yaklaşık değerlerdir ve kumaş esnekliğine göre değişebilir.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
