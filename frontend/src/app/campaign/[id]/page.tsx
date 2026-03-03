
import { redirect } from "next/navigation";

export default async function CampaignRootPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/campaign/${id}/dashboard`);
}
