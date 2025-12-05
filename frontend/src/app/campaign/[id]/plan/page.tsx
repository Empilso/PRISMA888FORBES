import React from "react";
import PlanoContent from "./PlanoContent";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <PlanoContent campaignId={id} />;
}
