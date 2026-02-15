import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('178.156.250.174', username='root', password='8hdTu5XoO6kT9PgZ')

def run(cmd, timeout=300):
    print(f'\n>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out.strip():
        print(out[-2000:])
    if err.strip():
        print('STDERR:', err[-1000:])
    return out

# Step 1: Pull latest code
run('cd /opt/stack/atlas && git pull origin main', timeout=60)

# Step 2: Build container
run('cd /opt/stack && docker compose build --no-cache atlas', timeout=600)

# Step 3: Restart
run('cd /opt/stack && docker compose up -d atlas')

# Wait for startup
print('\nWaiting 60s for startup + translation warmup...')
time.sleep(60)

# Step 4: Check health (via Caddy reverse proxy)
result = run('curl -s https://atlas.slowhorses.net/api/health 2>&1')
print('\n--- PARSING HEALTH ---')
import json
try:
    health = json.loads(result.strip())
    ok = health['summary']['ok']
    total = health['summary']['total']
    print(f'Health: {ok}/{total} OK')
    for svc in health['services']:
        status_icon = 'OK' if svc['status'] == 'ok' else ('STALE' if svc['status'] == 'stale' else 'EMPTY')
        print(f'  [{status_icon:5s}] {svc["name"]:30s} ({svc["key"]})')
except Exception as e:
    print(f'Health parse failed: {e}')
    print(result[:500])

ssh.close()
print('\nDone!')
