"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MFAChallengePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [factorId, setFactorId] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        async function fetchFactor() {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) {
                setError("Erro ao carregar fatores de autenticação.");
                return;
            }
            const verifiedFactor = data.all.find(f => f.status === 'verified');
            if (verifiedFactor) {
                setFactorId(verifiedFactor.id);
            } else {
                // No MFA factor found, redirect back
                const next = searchParams.get('next') || "/admin/candidatos";
                router.push(next);
            }
        }
        fetchFactor();
    }, [supabase, router, searchParams]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!factorId) return;

        setLoading(true);
        setError("");

        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId });
            if (challenge.error) {
                setError(challenge.error.message);
                setLoading(false);
                return;
            }

            const verify = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code,
            });

            if (verify.error) {
                setError("Código inválido. Tente novamente.");
            } else {
                // Success! Redirect to original destination
                const next = searchParams.get('next') || "/admin/candidatos";
                window.location.href = next;
            }
        } catch (err) {
            setError("Erro ao processar verificação.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)] px-4">
            <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/80 backdrop-blur-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Verificação em Duas Etapas</CardTitle>
                    <CardDescription>
                        Digite o código de 6 dígitos do seu aplicativo autenticador.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleVerify} className="space-y-4">
                        <div className="space-y-2 text-center">
                            <Label htmlFor="code" className="sr-only">Código de Verificação</Label>
                            <Input
                                id="code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="000000"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                className="text-center text-3xl tracking-[1em] font-mono h-16"
                                required
                                disabled={loading}
                            />
                        </div>
                        <Button type="submit" className="w-full font-bold h-12 text-lg" disabled={loading || code.length < 6}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Verificar e Entrar"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-6 mt-4">
                    <Button variant="link" onClick={() => (window.location.href = "/login")} className="text-muted-foreground text-sm">
                        Voltar para o Login
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
