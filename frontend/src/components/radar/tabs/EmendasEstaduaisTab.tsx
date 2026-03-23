"use client";

import EmendasBADashboard from "@/app/radar/emendas-ba/page";

export function EmendasEstaduaisTab({ politicianName }: { politicianName: string }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <EmendasBADashboard filterName={politicianName} />
    </div>
  );
}
