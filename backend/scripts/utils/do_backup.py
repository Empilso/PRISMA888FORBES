import os
import subprocess
from datetime import datetime

# Read .env file
env_path = '/home/carneiro888/CARNEIRO888/PRISMA888V11/PRISMA888FORBES/backend/.env'
database_url = None

with open(env_path, 'r') as f:
    for line in f:
        if line.startswith('DATABASE_URL='):
            database_url = line.strip().split('=', 1)[1].strip('"').strip("'")
            break

if not database_url:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

# Generate backup filename
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
backup_filename = f'PRISMA888_DB_BACKUP_{timestamp}.dump'
backup_dir = os.getcwd()

# Run pg_dump using Docker to get version 17
command = [
    'docker', 'run', '--rm', 
    '-v', f'{backup_dir}:/backup', 
    'postgres:17', 
    'pg_dump', database_url, '-F', 'c', '-Z', '9', '-f', f'/backup/{backup_filename}'
]

try:
    print(f"Starting backup to {backup_filename} using Docker...")
    subprocess.run(command, check=True)
    print("Backup successfully completed securely.")
    
    # Check file size
    size = os.path.getsize(backup_filename)
    print(f"Backup size: {size / (1024*1024):.2f} MB")
except subprocess.CalledProcessError as e:
    print(f"Backup failed: {e}")
    exit(1)
