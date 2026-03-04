import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TermsGuard } from "@/components/auth/TermsGuard"
import { createClient } from "@/lib/supabase/server"
import { CampaignBottomNav } from "@/components/dashboard/CampaignBottomNav"

export default async function CampaignLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch campaign details
    const { data: campaign } = await supabase
        .from('campaigns')
        .select('candidate_name, role')
        .eq('id', id)
        .single();

    const candidateName = campaign?.candidate_name || "Candidato";
    const role = campaign?.role || "Cargo";

    const lastUpdate = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <TermsGuard>
            <NuqsAdapter>
                <div className="flex h-screen overflow-hidden bg-background">
                    <DashboardSidebar campaignId={id} />
                    <div className="flex flex-1 flex-col min-h-0 overflow-hidden relative">
                        <div className="hidden md:block">
                            <DashboardHeader
                                candidateName={candidateName}
                                role={role}
                                lastUpdate={lastUpdate}
                            />
                        </div>
                        <main className="flex-1 overflow-y-auto overscroll-y-contain h-full w-full pb-20 md:pb-0">
                            {children}
                        </main>
                        <CampaignBottomNav campaignId={id} />
                    </div>
                </div>
            </NuqsAdapter>
        </TermsGuard>
    )
}
