#!/usr/bin/env bash
set -euo pipefail
# Run on an Oracle Ubuntu VM as an ordinary sudo-enabled user.
# Clones the existing WVLRP repository and runs the private Avatar Forge API.
# Does NOT claim a GPU or photo-to-3D engine exists.
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip git
sudo mkdir -p /opt/wvlrp-forge /var/lib/wvlrp-forge
sudo chown "$USER":"$USER" /opt/wvlrp-forge
if [ ! -d /opt/wvlrp-forge/repo/.git ]; then
  git clone --depth 1 https://github.com/copperisbetter-lang/Wvlrp.git /opt/wvlrp-forge/repo
else
  git -C /opt/wvlrp-forge/repo pull --ff-only
fi
python3 -m venv /opt/wvlrp-forge/venv
/opt/wvlrp-forge/venv/bin/pip install -r /opt/wvlrp-forge/repo/avatar-forge/server/requirements.txt
if ! sudo test -f /etc/wvlrp-forge.env; then
  TOKEN=$(python3 -c 'import secrets;print(secrets.token_urlsafe(40))')
  printf 'FORGE_TOKEN=%s\nFORGE_WORKDIR=/var/lib/wvlrp-forge\n' "$TOKEN" | sudo tee /etc/wvlrp-forge.env >/dev/null
  sudo chmod 600 /etc/wvlrp-forge.env
  echo "Private token created at /etc/wvlrp-forge.env; retrieve via sudo when configuring the app."
fi
sudo tee /etc/systemd/system/wvlrp-forge.service >/dev/null <<'UNIT'
[Unit]
Description=WVLRP Avatar Forge API
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/wvlrp-forge/repo/avatar-forge/server
EnvironmentFile=/etc/wvlrp-forge.env
ExecStart=/opt/wvlrp-forge/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8765
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/wvlrp-forge
PrivateTmp=true
[Install]
WantedBy=multi-user.target
UNIT
sudo chown www-data:www-data /var/lib/wvlrp-forge
sudo chmod 700 /var/lib/wvlrp-forge
sudo systemctl daemon-reload
sudo systemctl enable --now wvlrp-forge
sudo systemctl --no-pager status wvlrp-forge
echo "API bound to localhost:8765. Configure HTTPS reverse proxy and access control before browser use."
