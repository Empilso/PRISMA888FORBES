FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

# Configurar variáveis de ambiente do UV
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

# Instalar dependências
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-install-project --no-dev

# Copiar código fonte e instalar o projeto
COPY . .
RUN uv sync --no-dev

# -- Estágio Final --
FROM python:3.12-slim-bookworm

WORKDIR /app

# Copiar o ambiente virtual do estágio de build
COPY --from=builder /app/.venv /app/.venv
COPY . .

# Adicionar o virtualenv ao PATH
ENV PATH="/app/.venv/bin:$PATH"

# Expor a porta
EXPOSE 8000

# Comando de execução
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
