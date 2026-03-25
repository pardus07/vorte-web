"use client";

import { useState } from "react";

interface SizeRecommendationProps {
  gender: "erkek" | "kadın";
}

function recommendSize(gender: "erkek" | "kadın", height: number, weight: number): string {
  if (gender === "erkek") {
    // Erkek boxer — bel çevresi tahmini
    const bmi = weight / ((height / 100) ** 2);
    if (bmi < 20 || (weight < 65 && height < 175)) return "S";
    if (bmi < 23 || (weight < 75 && height < 180)) return "M";
    if (bmi < 26 || (weight < 85 && height < 185)) return "L";
    if (bmi < 30 || weight < 100) return "XL";
    return "XXL";
  } else {
    // Kadın külot — kalça çevresi tahmini
    const bmi = weight / ((height / 100) ** 2);
    if (bmi < 19 || (weight < 52 && height < 165)) return "S";
    if (bmi < 22 || (weight < 60 && height < 170)) return "M";
    if (bmi < 25 || (weight < 70 && height < 175)) return "L";
    if (bmi < 29 || weight < 85) return "XL";
    return "XXL";
  }
}

export function SizeRecommendation({ gender }: SizeRecommendationProps) {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleRecommend = () => {
    const h = parseInt(height);
    const w = parseInt(weight);
    if (isNaN(h) || isNaN(w) || h < 100 || h > 250 || w < 30 || w > 200) return;
    setResult(recommendSize(gender, h, w));
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-700">
        Beden Önerisi
      </h4>
      <p className="mt-1 text-[11px] text-gray-400">Boy ve kilonuzu girin, size uygun bedeni önerelim.</p>

      <div className="mt-3 flex gap-2">
        <div className="flex-1">
          <label htmlFor="sr-height" className="text-[10px] font-medium text-gray-500">Boy (cm)</label>
          <input
            id="sr-height"
            type="number"
            placeholder="175"
            min={100}
            max={250}
            value={height}
            onChange={(e) => { setHeight(e.target.value); setResult(null); }}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="sr-weight" className="text-[10px] font-medium text-gray-500">Kilo (kg)</label>
          <input
            id="sr-weight"
            type="number"
            placeholder="75"
            min={30}
            max={200}
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setResult(null); }}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7AC143] focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={handleRecommend}
        disabled={!height || !weight}
        className="mt-3 w-full rounded-lg bg-[#1A1A1A] py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Beden Öner
      </button>

      {result && (
        <div className="mt-3 rounded-lg border border-[#7AC143]/30 bg-[#7AC143]/10 p-3 text-center">
          <p className="text-xs text-gray-600">Önerilen beden:</p>
          <p className="mt-1 text-2xl font-bold text-[#7AC143]">{result}</p>
          <p className="mt-1 text-[10px] text-gray-400">
            Bu öneri yaklaşıktır. Kesin sonuç için beden tablosuna bakın.
          </p>
        </div>
      )}
    </div>
  );
}
