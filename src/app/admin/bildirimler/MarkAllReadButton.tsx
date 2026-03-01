"use client";

import { Button } from "@/components/ui/Button";
import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAllReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await fetch("/api/admin/notifications/read-all", { method: "POST" });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} loading={loading}>
      <CheckCheck className="mr-1 h-4 w-4" />
      Tümünü Okundu İşaretle
    </Button>
  );
}
