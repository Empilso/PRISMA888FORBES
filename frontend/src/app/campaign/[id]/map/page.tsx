"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ElectoralMapFull } from "@/components/campaign/ElectoralMapFull";

export default function MapaInterativoPage() {
    const params = useParams();
    const campaignId = params.id as string;

    return (
        <div className="h-full w-full px-4 sm:px-8 py-4 sm:py-8 flex flex-col">
            <div className="flex-1 rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm relative">
                <ElectoralMapFull campaignId={campaignId} />
            </div>
        </div>
    );
}
