"use client";

import { Check } from "lucide-react";

interface ColorOption {
  color: string;
  colorHex: string;
  available: boolean;
}

interface ColorSelectorProps {
  colors: ColorOption[];
  selectedColor: string;
  onSelect: (color: string) => void;
}

export function ColorSelector({ colors, selectedColor, onSelect }: ColorSelectorProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Renk:</span>
        <span className="text-sm text-gray-500">{selectedColor}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => {
          const isSelected = selectedColor === c.color;
          const isLight = isLightColor(c.colorHex);

          return (
            <button
              key={c.color}
              onClick={() => c.available && onSelect(c.color)}
              disabled={!c.available}
              className={`relative h-9 w-9 rounded-full border-2 transition-all ${
                isSelected
                  ? "border-[#7AC143] ring-2 ring-[#7AC143]/30"
                  : c.available
                    ? "border-gray-300 hover:border-gray-400"
                    : "border-gray-200 opacity-40"
              }`}
              style={{ backgroundColor: c.colorHex }}
              title={c.color}
            >
              {isSelected && (
                <Check
                  className={`absolute inset-0 m-auto h-4 w-4 ${
                    isLight ? "text-gray-800" : "text-white"
                  }`}
                />
              )}
              {!c.available && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="block h-[1px] w-full rotate-45 bg-red-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
