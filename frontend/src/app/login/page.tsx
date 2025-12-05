"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Shield, User } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Lógica real de login viria aqui
        console.log("Login com:", email, password);
    };

    const handleQuickLogin = (role: "admin" | "candidate") => {
        if (role === "admin") {
            router.push("/admin/dashboard");
        } else {
            // Redireciona para o dashboard da campanha mockada (ID: camp_123)
            router.push("/campaign/camp_123/dashboard");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Prisma 888</CardTitle>
                    <CardDescription className="text-center">
                        Entre na sua conta para continuar
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nome@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full">Entrar</Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Acesso Rápido (Dev)
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="flex flex-col items-center h-auto py-4 gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleQuickLogin("admin")}
                        >
                            <Shield className="h-6 w-6 text-purple-600" />
                            <span className="text-xs font-semibold">Super Admin</span>
                            <span className="text-[10px] text-muted-foreground">Visão Global</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="flex flex-col items-center h-auto py-4 gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleQuickLogin("candidate")}
                        >
                            <User className="h-6 w-6 text-blue-600" />
                            <span className="text-xs font-semibold">Candidato</span>
                            <span className="text-[10px] text-muted-foreground">Visão Tenant</span>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-xs text-muted-foreground">
                        &copy; 2024 Prisma 888. Todos os direitos reservados.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
