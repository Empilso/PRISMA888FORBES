
import React from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <AdminSidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 pt-16 md:pt-0 w-full transition-colors">
                {children}
            </main>
        </div>
    );
}
