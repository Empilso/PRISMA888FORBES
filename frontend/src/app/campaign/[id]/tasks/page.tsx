import React from "react";
import TasksContent from "./TasksContent";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <TasksContent campaignId={id} />;
}
