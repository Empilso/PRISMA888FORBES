"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { Trophy, Medal } from "lucide-react";

interface ElectionResult {
    position: number;
    candidateNumber: string;
    candidateName: string;
    votes: number;
    percentage: number;
    status: "leading" | "competitive" | "trailing";
}

interface ElectionResultsTableProps {
    results: ElectionResult[];
}

const positionIcons = {
    1: Trophy,
    2: Medal,
    3: Medal,
};

const statusVariants = {
    leading: "success" as const,
    competitive: "warning" as const,
    trailing: "destructive" as const,
};

export function ElectionResultsTable({ results }: ElectionResultsTableProps) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">POS</TableHead>
                        <TableHead className="w-[80px]">Nº</TableHead>
                        <TableHead>NOME</TableHead>
                        <TableHead className="text-right">VOTOS</TableHead>
                        <TableHead className="text-right">% VÁLIDO</TableHead>
                        <TableHead className="text-center">STATUS</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map((result) => {
                        const PositionIcon = positionIcons[result.position as keyof typeof positionIcons];
                        const iconColor =
                            result.position === 1
                                ? "text-yellow-500"
                                : result.position === 2
                                    ? "text-gray-400"
                                    : "text-amber-600";

                        return (
                            <TableRow key={result.position}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {PositionIcon && (
                                            <PositionIcon className={`h-4 w-4 ${iconColor}`} />
                                        )}
                                        <span>{result.position}º</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono font-semibold">
                                    {result.candidateNumber}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {result.candidateName}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {formatNumber(result.votes)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold">
                                    {formatPercentage(result.percentage)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={statusVariants[result.status]}>
                                        {result.status === "leading" && "Liderando"}
                                        {result.status === "competitive" && "Competitivo"}
                                        {result.status === "trailing" && "Atrás"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
