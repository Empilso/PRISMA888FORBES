import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
    {
        variants: {
            variant: {
                default: "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-md shadow-[var(--brand-muted)]",
                destructive: "bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 shadow-md shadow-[var(--danger-muted)]",
                outline: "border border-[var(--border-default)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]",
                secondary: "bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-sm",
                ghost: "hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                link: "text-[var(--brand-primary)] underline-offset-4 hover:underline",
            },
            size: {
                default: "h-11 px-6 py-2", /* Taller and wider for better touch targets */
                sm: "h-9 rounded-full px-4",
                lg: "h-12 rounded-full px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
