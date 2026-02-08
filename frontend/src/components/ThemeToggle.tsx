"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Evitar erro de hidratação (SSR vs Client Theme)
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="text-[var(--text-secondary)]">
                <div className="w-5 h-5" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="
                text-[var(--text-secondary)]
                hover:text-[var(--text-primary)]
                hover:bg-[var(--bg-tertiary)]
                transition-colors
            "
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
    );
}
