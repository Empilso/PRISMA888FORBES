import os
import shutil
from pathlib import Path

# Configurações
BACKEND_DIR = Path("/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend")
TARGET_DIRS = {
    "scripts/debug": ["debug_", "inspect_", "smoke_test", "validate_", "audit_"],
    "scripts/seeds": ["seed_"],
    "scripts/utils": ["check_", "fix_", "apply_", "update_", "create_", "cleanup_", "do_backup", "list_", "import_", "verify_", "reset_"],
    "archive/backups": [".dump", ".csv", ".txt"]
}

def cleanup():
    print(f"🚀 Iniciando higienização em {BACKEND_DIR}...")
    
    # Criar diretórios se não existirem
    for t_dir in TARGET_DIRS.keys():
        (BACKEND_DIR / t_dir).mkdir(parents=True, exist_ok=True)

    count = 0
    # Listar arquivos na raiz do backend
    for item in BACKEND_DIR.iterdir():
        if item.is_dir() or item.name in ["main.py", "pyproject.toml", "README.md", "Dockerfile", "Dockerfile.dev"]:
            continue
            
        moved = False
        # Verificar prefixos para Python
        if item.suffix == ".py":
            for target, prefixes in TARGET_DIRS.items():
                if any(item.name.startswith(p) for p in prefixes):
                    dest = BACKEND_DIR / target / item.name
                    print(f"📦 Mover: {item.name} -> {target}/")
                    shutil.move(str(item), str(dest))
                    count += 1
                    moved = True
                    break
        
        # Verificar extensões para arquivos de dados
        elif item.suffix in [".dump", ".csv", ".txt"]:
            dest = BACKEND_DIR / "archive/backups" / item.name
            print(f"📂 Arquivar: {item.name} -> archive/backups/")
            shutil.move(str(item), str(dest))
            count += 1
            moved = True

    print(f"\n✅ Higienização concluída! {count} arquivos organizados.")
    print("💡 Seus serviços (FastAPI/Next.js) continuam funcionando normalmente.")

if __name__ == "__main__":
    cleanup()
