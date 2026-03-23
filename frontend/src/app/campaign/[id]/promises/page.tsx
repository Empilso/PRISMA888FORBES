import { RadarTabsView } from "@/components/dashboard/RadarTabsView";

export default async function PromisesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Radar de Inteligência</h2>
            </div>
            <RadarTabsView campaignId={id} />
        </div>
    );
}
