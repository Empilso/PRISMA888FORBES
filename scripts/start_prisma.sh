#!/bin/bash

# --- Configurações de Caminhos ---
PRISMA_ROOT="/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES"
FRONT_DIR="$PRISMA_ROOT/frontend"
BACK_DIR="$PRISMA_ROOT/backend"

echo "🚀 Iniciando Prisma 888 Infrastructure..."

# 1. Limpeza de processos anteriores
echo "🧹 Limpando processos antigos (Portas 3000 e 8000)..."
fuser -k 3000/tcp 2>/dev/null
fuser -k 8000/tcp 2>/dev/null
sleep 1

# 2. Iniciar Backend (Porta 8000)
echo "🧬 Iniciando Backend (Uvicorn)..."
cd "$BACK_DIR" && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &
BACK_PID=$!

# 3. Iniciar Frontend (Porta 3000)
echo "✨ Iniciando Frontend (Next.js)..."
cd "$FRONT_DIR" && npm run dev &
FRONT_PID=$!

echo "✅ Sistema online!"
echo "📟 Backend PID: $BACK_PID"
echo "📟 Frontend PID: $FRONT_PID"
echo "👉 Dashboard: http://localhost:3000"
echo "👉 API Docs: http://localhost:8000/docs"

# Manter o script rodando e capturar sinal de interrupção (Ctrl+C)
trap "kill $BACK_PID $FRONT_PID; echo '🛑 Encerrando Prisma...'; exit" SIGINT SIGTERM

wait
