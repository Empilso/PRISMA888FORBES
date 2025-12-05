"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, FileText } from "lucide-react";
import { acceptTerms, hasAcceptedTerms } from "@/lib/profiles";
import { useToast } from "@/components/ui/use-toast";

/**
 * Componente: Aceite de Termos
 * 
 * Exibe a tela de aceite de termos e bloqueia o acesso ao sistema
 * até que o usuário aceite.
 * 
 * Uso: Adicionar em um middleware ou layout protegido
 */
export function TermsAcceptance() {
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        checkTermsStatus();
    }, []);

    const checkTermsStatus = async () => {
        const hasAccepted = await hasAcceptedTerms();
        if (hasAccepted) {
            // Usuário já aceitou, redireciona para dashboard
            router.push("/admin/dashboard");
        } else {
            setChecking(false);
        }
    };

    const handleAccept = async () => {
        if (!accepted) {
            toast({
                title: "Atenção",
                description: "Você precisa aceitar os termos para continuar.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        const result = await acceptTerms();

        if (result.success) {
            toast({
                title: "✅ Termos aceitos!",
                description: "Bem-vindo ao Prisma 888. Redirecionando...",
            });

            // Aguarda 1 segundo e redireciona
            setTimeout(() => {
                router.push("/admin/dashboard");
            }, 1000);
        } else {
            toast({
                title: "Erro",
                description: result.error || "Não foi possível registrar o aceite.",
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Termos de Uso e Política de Privacidade</CardTitle>
                    <CardDescription>
                        Leia atentamente os termos abaixo antes de continuar
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <ScrollArea className="h-[400px] rounded-md border bg-white p-6">
                        <div className="space-y-4 text-sm text-muted-foreground">
                            <h3 className="font-semibold text-lg text-foreground">1. Aceitação dos Termos</h3>
                            <p>
                                Ao acessar e usar o Prisma 888, você concorda com estes Termos de Uso. Se você não
                                concorda, não utilize a plataforma.
                            </p>

                            <h3 className="font-semibold text-lg text-foreground">2. Uso da Plataforma</h3>
                            <p>
                                O Prisma 888 é uma ferramenta de gestão de campanhas políticas que utiliza
                                inteligência artificial para análise de dados eleitorais e geração de estratégias.
                            </p>
                            <p>
                                Você se compromete a usar a plataforma de forma ética, respeitando as leis
                                eleitorais brasileiras e os direitos de terceiros.
                            </p>

                            <h3 className="font-semibold text-lg text-foreground">3. Privacidade e Dados</h3>
                            <p>
                                Nós coletamos e processamos dados pessoais conforme nossa Política de Privacidade.
                                Seus dados são armazenados de forma segura e não serão compartilhados com terceiros
                                sem seu consentimento.
                            </p>
                            <p>
                                Os dados eleitorais utilizados pela plataforma são obtidos de fontes públicas (TSE)
                                e processados em conformidade com a LGPD.
                            </p>

                            <h3 className="font-semibold text-lg text-foreground">4. Propriedade Intelectual</h3>
                            <p>
                                Todo o conteúdo gerado pela IA (estratégias, análises, relatórios) pertence ao
                                usuário da plataforma. O Prisma 888 não reivindica direitos sobre o conteúdo gerado.
                            </p>

                            <h3 className="font-semibold text-lg text-foreground">5. Limitações de Responsabilidade</h3>
                            <p>
                                O Prisma 888 é uma ferramenta de apoio à decisão. As estratégias geradas pela IA
                                devem ser revisadas por profissionais qualificados antes da execução.
                            </p>
                            <p>
                                Não nos responsabilizamos por decisões tomadas com base exclusivamente nas
                                sugestões da plataforma.
                            </p>

                            <h3 className="font-semibold text-lg text-foreground">6. Modificações</h3>
                            <p>
                                Podemos atualizar estes termos a qualquer momento. Você será notificado sobre
                                mudanças significativas.
                            </p>

                            <h3 className="font-semibold text-lg text-foreground">7. Contato</h3>
                            <p>
                                Para dúvidas ou solicitações relacionadas aos seus dados, entre em contato através
                                de: suporte@prisma888.com
                            </p>

                            <p className="pt-4 border-t text-xs">
                                Última atualização: 02 de dezembro de 2024
                            </p>
                        </div>
                    </ScrollArea>

                    <div className="mt-6 flex items-start space-x-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <Checkbox
                            id="terms"
                            checked={accepted}
                            onCheckedChange={(checked) => setAccepted(checked as boolean)}
                            className="mt-1"
                        />
                        <label
                            htmlFor="terms"
                            className="text-sm font-medium leading-relaxed cursor-pointer"
                        >
                            Li e aceito os Termos de Uso e Política de Privacidade do Prisma 888.
                            Estou ciente de que a plataforma utiliza inteligência artificial para análise
                            de dados públicos e geração de estratégias.
                        </label>
                    </div>
                </CardContent>

                <CardFooter className="flex justify-between">
                    <p className="text-xs text-muted-foreground">
                        Sua aceitação será registrada em {new Date().toLocaleDateString("pt-BR")}
                    </p>
                    <Button onClick={handleAccept} disabled={!accepted || loading} size="lg">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Aceitar e Continuar
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
