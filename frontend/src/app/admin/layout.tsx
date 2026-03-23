
export const dynamic = 'force-dynamic';

import React from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div
            className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative"
            suppressHydrationWarning
        >
            <AdminSidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 pt-16 md:pt-0 w-full transition-colors pb-24 md:pb-0">
                {children}
            </main>

            {/* Mobile Navigation Tier Gold */}
            <AdminBottomNav />
        </div>
    );
}
