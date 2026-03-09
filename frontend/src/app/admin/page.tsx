"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        router.push("/admin/candidatos");
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-slate-500 font-medium">Redirecionando para o Painel...</p>
            </div>
        </div>
    );
}
