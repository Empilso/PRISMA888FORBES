import React from "react";
import { FolderOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FilesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Repositório de Arquivos</h1>
                    <p className="text-sm text-muted-foreground">
                        Central de documentos, artes e materiais da campanha.
                    </p>
                </div>
                <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload de Arquivo
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pastas Mockadas */}
                {['Jurídico', 'Financeiro', 'Marketing', 'Pesquisas', 'Fotos', 'Vídeos'].map((folder) => (
                    <Card key={folder} className="hover:bg-muted/50 cursor-pointer transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {folder}
                            </CardTitle>
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">12</div>
                            <p className="text-xs text-muted-foreground">
                                arquivos
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
