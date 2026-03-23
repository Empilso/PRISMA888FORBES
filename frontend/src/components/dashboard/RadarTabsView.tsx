"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import EmendasBADashboard from "@/app/radar/emendas-ba/page"; // Reutilizando a lógica criada

export function RadarTabsView({ campaignId }: { campaignId: string }) {
  return (
    <div className="w-full space-y-4">
      <Tabs defaultValue="emendas-ba" className="w-full">
        <div className="flex items-center justify-between pb-4 border-b">
          <TabsList className="bg-transparent p-0 gap-6 h-auto">
            <TabsTrigger 
              value="alba-verbas" 
              className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold transition-all"
            >
              ALBA Verbas
            </TabsTrigger>
            <TabsTrigger 
              value="emendas-ba" 
              className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold transition-all"
            >
              Emendas BA-GOV
            </TabsTrigger>
            <TabsTrigger 
              value="emendas-fed" 
              className="px-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold transition-all opacity-50"
              disabled
            >
              Emendas Federal
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="alba-verbas" className="mt-6">
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground italic">Módulo de Verbas Indenizatórias (Gabinete) em migração para arquitetura 2026...</p>
          </Card>
        </TabsContent>

        <TabsContent value="emendas-ba" className="mt-6 border-none p-0">
          <EmendasBADashboard />
        </TabsContent>
        
        <TabsContent value="emendas-fed">
           {/* Futuro CEAP/Federal */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
