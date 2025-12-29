"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ElectoralMapFull } from "@/components/campaign/ElectoralMapFull";

export default function MapaInterativoPage() {
    const params = useParams();
    const campaignId = params.id as string;

    return <ElectoralMapFull campaignId={campaignId} />;
}
