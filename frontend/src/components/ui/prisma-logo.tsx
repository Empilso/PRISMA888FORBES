import Image from "next/image";
import Link from "next/link";

interface PrismaLogoProps {
    href?: string;
    size?: "sm" | "md" | "lg";
    showSubtitle?: boolean;
    subtitle?: string;
    className?: string;
}

export function PrismaLogo({
    href = "/",
    size = "md",
    showSubtitle = false,
    subtitle = "Intelligence Platform",
    className
}: PrismaLogoProps) {
    // Sizes based on reference image proportions (width:height ≈ 1.15:1)
    const sizes = {
        sm: { width: 50, height: 44, text: "text-xl" },
        md: { width: 60, height: 52, text: "text-2xl" },
        lg: { width: 75, height: 65, text: "text-3xl" }
    };

    const config = sizes[size];

    const content = (
        <div className={`flex items-center gap-3 group cursor-pointer ${className || ""}`}>
            <div className="relative transition-transform group-hover:scale-105 animate-float">
                <Image
                    src="/prisma-icon.png"
                    alt="Prisma 888"
                    width={config.width}
                    height={config.height}
                    className="object-contain animate-glow"
                    style={{ width: "auto", height: "auto" }} // Fix for hydration warning
                    priority
                />
            </div>
            <div className="flex flex-col">
                <span
                    className={`${config.text} font-black tracking-tight text-[var(--text-primary)] leading-none`}
                    style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
                >
                    PRISMA 888
                </span>
                {showSubtitle && (
                    <span className="text-[10px] text-[var(--text-tertiary)] font-medium tracking-wide uppercase">
                        {subtitle}
                    </span>
                )}
            </div>
        </div>
    );

    if (href) {
        return <Link href={href} suppressHydrationWarning={true}>{content}</Link>;
    }

    return content;
}
