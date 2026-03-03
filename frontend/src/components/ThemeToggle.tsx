"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { SunDim, MoonStars } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Se não estiver montado, renderiza um placeholder com o mesmo tamanho para evitar layout shift
    // mas sem opacity-0 total para podermos ver se ele existe
    if (!mounted) {
        return (
            <div className="h-9 w-9 bg-slate-200/20 rounded-lg animate-pulse" />
        );
    }

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm"
            aria-label="Alternar tema"
        >
            {theme === 'dark' ? (
                <SunDim size={20} weight="duotone" className="text-yellow-500" />
            ) : (
                <MoonStars size={20} weight="duotone" className="text-indigo-600" />
            )}
        </Button>
    );
}
