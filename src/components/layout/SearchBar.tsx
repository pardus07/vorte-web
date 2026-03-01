"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/arama?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ürün ara..."
        className="h-10 w-full border-b border-gray-300 bg-transparent pr-10 text-sm placeholder:text-gray-400 focus:border-[#1A1A1A] focus:outline-none"
      />
      <button
        type="submit"
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:opacity-70 transition-opacity"
        aria-label="Ara"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}
