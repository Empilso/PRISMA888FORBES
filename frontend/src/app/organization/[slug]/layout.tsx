import { TenantSidebar } from "@/components/organization/TenantSidebar";
import { OrganizationThemeProvider } from "@/providers/OrganizationThemeProvider";

export default async function OrganizationLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <OrganizationThemeProvider slug={slug}>
            <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
                <TenantSidebar />

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 pt-16 md:pt-0 w-full transition-colors relative">
                    {children}
                </main>
            </div>
        </OrganizationThemeProvider>
    );
}
