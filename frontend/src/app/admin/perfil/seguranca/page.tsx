"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, QrCode, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function SecuritySettingsPage() {
    const [mfaStatus, setMfaStatus] = useState<'disabled' | 'enrolling' | 'enabled'>('disabled');
    const [qrValue, setQrValue] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [factorId, setFactorId] = useState<string | null>(null);

    const supabase = createClient();

    useEffect(() => {
        async function checkMfa() {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) return;
            const verified = data.all.find(f => f.status === 'verified');
            if (verified) {
                setMfaStatus('enabled');
            }
        }
        checkMfa();
    }, []);

    const startEnrollment = async () => {
        setLoading(true);
        setError("");
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                issuer: 'Prisma 888',
                friendlyName: 'Dispositivo Principal'
            });

            if (error) {
                setError(error.message);
                return;
            }

            setFactorId(data.id);
            setQrValue(data.totp.qr_code);
            setSecret(data.totp.secret);
            setMfaStatus('enrolling');
        } catch (err) {
            setError("Erro ao iniciar ativação de MFA.");
        } finally {
            setLoading(false);
        }
    };

    const confirmEnrollment = async () => {
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
                code: verifyCode,
            });

            if (verify.error) {
                setError("Código inválido. Verifique e tente novamente.");
            } else {
                setMfaStatus('enabled');
                // Optional: persist to public.profiles via server action if trigger fails
            }
        } catch (err) {
            setError("Erro ao confirmar ativação.");
        } finally {
            setLoading(false);
        }
    };

    const unenrollMfa = async () => {
        if (!confirm("Tem certeza que deseja desativar o MFA? Sua segurança será reduzida.")) return;
        setLoading(true);
        try {
            const { data } = await supabase.auth.mfa.listFactors();
            const verified = data?.all.find(f => f.status === 'verified');
            if (verified) {
                const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
                if (error) throw error;
                setMfaStatus('disabled');
            }
        } catch (err) {
            alert("Erro ao desativar MFA.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Segurança da Conta</h1>
                <p className="text-muted-foreground mt-2">Gerencie suas chaves de segurança e autenticação em duas etapas.</p>
            </header>

            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-xl">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Autenticação de Dois Fatores (MFA)</CardTitle>
                            <CardDescription>Adicione uma camada extra de segurança usando TOTP (Google Authenticator).</CardDescription>
                        </div>
                        <div className="ml-auto">
                            {mfaStatus === 'enabled' && (
                                <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                                    ATIVO
                                </span>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {mfaStatus === 'disabled' && (
                        <div className="py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                O MFA ainda não está ativo em sua conta. Recomendamos fortemente a ativação para proteger dados sensíveis.
                            </p>
                            <Button onClick={startEnrollment} disabled={loading} className="font-bold">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Ativar Segundo Fator"}
                            </Button>
                        </div>
                    )}

                    {mfaStatus === 'enrolling' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid md:grid-cols-2 gap-8 items-start">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg">1. Escaneie o QR Code</h3>
                                    <p className="text-sm text-muted-foreground">Abra seu aplicativo autenticador e escaneie o código abaixo. Se não conseguir escanear, use a chave manual.</p>

                                    <div className="bg-white p-4 rounded-xl border-4 border-slate-100 flex items-center justify-center aspect-square max-w-[200px] mx-auto sm:mx-0">
                                        {qrValue ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={qrValue} alt="MFA QR Code" className="w-full h-full" />
                                        ) : (
                                            <QrCode className="h-24 w-24 text-slate-200" />
                                        )}
                                    </div>

                                    <div className="space-y-1.5 mt-4">
                                        <Label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Chave Manual</Label>
                                        <div className="flex gap-2">
                                            <code className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg flex-1 font-mono text-sm break-all">
                                                {secret}
                                            </code>
                                            <Button variant="outline" size="icon" onClick={() => {
                                                navigator.clipboard.writeText(secret || "");
                                                alert("Copiado!");
                                            }}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="font-bold text-lg">2. Confirme o Código</h3>
                                    <p className="text-sm text-muted-foreground">Digite o código de 6 dígitos que aparece no seu aplicativo para finalizar a ativação.</p>

                                    <div className="space-y-2">
                                        <Label htmlFor="verifyCode">Código Verificador</Label>
                                        <Input
                                            id="verifyCode"
                                            placeholder="000 000"
                                            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                                            value={verifyCode}
                                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                                            maxLength={6}
                                        />
                                    </div>

                                    {error && (
                                        <Alert variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex flex-col gap-2">
                                        <Button onClick={confirmEnrollment} disabled={loading || verifyCode.length < 6} className="w-full font-bold h-12">
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalizar Ativação"}
                                        </Button>
                                        <Button variant="ghost" onClick={() => setMfaStatus('disabled')} disabled={loading}>
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {mfaStatus === 'enabled' && (
                        <div className="space-y-6 py-4 animate-in zoom-in-95 duration-300">
                            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-start gap-4">
                                <CheckCircle2 className="h-6 w-6 mt-0.5" />
                                <div className="space-y-1">
                                    <AlertTitle className="font-bold">Conta Blindada!</AlertTitle>
                                    <AlertDescription>
                                        A autenticação em duas etapas está ativa. Seus dados PII e painel admin estão protegidos por camada dupla.
                                    </AlertDescription>
                                </div>
                            </Alert>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <Button variant="destructive" onClick={unenrollMfa} disabled={loading}>
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Desativar MFA"}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
