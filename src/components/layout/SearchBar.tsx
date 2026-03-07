"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

interface Suggestion {
  name: string;
  url: string;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      router.push(`/arama?q=${encodeURIComponent(query.trim())}`);
    }
  };

  // Debounced fetch for suggestions
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data: Suggestion[] = await res.json();
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSearch} className="relative w-full">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
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

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <Link
              key={i}
              href={s.url}
              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              onClick={() => {
                setShowSuggestions(false);
                setQuery("");
              }}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
