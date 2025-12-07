"use client"

import * as React from "react"
import { Check, ChevronDown, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface TaskStatusSelectorProps {
    status: "pending" | "in_progress" | "review" | "completed"
    onStatusChange: (status: "pending" | "in_progress" | "review" | "completed") => void
}

const statuses = [
    { value: "pending", label: "Pendente", color: "text-slate-600", bg: "bg-slate-100", hover: "hover:bg-slate-200", dot: "bg-slate-400" },
    { value: "in_progress", label: "Em Progresso", color: "text-blue-600", bg: "bg-blue-100", hover: "hover:bg-blue-200", dot: "bg-blue-500" },
    { value: "review", label: "Em Revisão", color: "text-purple-600", bg: "bg-purple-100", hover: "hover:bg-purple-200", dot: "bg-purple-500" },
    { value: "completed", label: "Concluída", color: "text-emerald-600", bg: "bg-emerald-100", hover: "hover:bg-emerald-200", dot: "bg-emerald-500" },
] as const

export function TaskStatusSelector({ status, onStatusChange }: TaskStatusSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const currentStatus = statuses.find((s) => s.value === status) || statuses[0]

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                <div
                    role="button"
                    tabIndex={0}
                    className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all cursor-pointer gap-1.5 select-none",
                        "border-transparent", // Remove badge default border style if needed or use Badge directly
                        currentStatus.bg,
                        currentStatus.color,
                        currentStatus.hover
                    )}
                >
                    <div className={cn("w-1.5 h-1.5 rounded-full", currentStatus.dot)} />
                    {currentStatus.label}
                    <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-all duration-200" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-1" align="start">
                <div className="flex flex-col gap-1">
                    {statuses.map((s) => (
                        <button
                            key={s.value}
                            onClick={(e) => {
                                e.stopPropagation()
                                onStatusChange(s.value as any)
                                setOpen(false)
                            }}
                            className={cn(
                                "w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 outline-none focus:bg-slate-100",
                                "hover:bg-slate-100",
                                status === s.value && "bg-slate-50 font-medium"
                            )}
                        >
                            <div className={cn("w-2 h-2 rounded-full", s.dot)} />
                            {s.label}
                            {status === s.value && <Check className="w-3 h-3 ml-auto opacity-50" />}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
