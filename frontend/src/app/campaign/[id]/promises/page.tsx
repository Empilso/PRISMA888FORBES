"use client";

import React, { use } from "react";
import { RadarPremium } from "@/components/campaign/RadarPremium";

export default function PromisesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const campaignId = id;

    return (
        <div className="p-6 space-y-6">
            <RadarPremium campaignId={campaignId} />
        </div>
    );
}
