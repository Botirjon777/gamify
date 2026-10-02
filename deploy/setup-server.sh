#!/usr/bin/env bash
# One-time VPS setup for Zukkolar (run as root). Safe to re-run: every step is idempotent.
# Expects deploy/zukkolar.service and deploy/nginx-zukkolar.conf next to this script (uploaded to /tmp/zukkolar-setup).
# The app's .env is written separately (it contains secrets) — see scripts/deploy.ts --setup.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

# 1. System user and folders (same layout as /srv/hotels/<site>)
id zukkolar &>/dev/null || useradd --system --home-dir /srv/zukkolar --shell /usr/sbin/nologin zukkolar
install -d -o zukkolar -g zukkolar -m 755 /srv/zukkolar /srv/zukkolar/releases
install -d -o zukkolar -g zukkolar -m 750 /srv/zukkolar/shared
install -d -o zukkolar -g zukkolar -m 755 /srv/zukkolar/shared/media

# 2. TLS certificate for the origin. Self-signed wildcard for now → Cloudflare SSL mode "Full".
#    To use "Full (strict)", replace these two files with a Cloudflare Origin Certificate.
install -d -m 700 /etc/ssl/zukkolar
if [ ! -f /etc/ssl/zukkolar/zukkolar.uz.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
    -keyout /etc/ssl/zukkolar/zukkolar.uz.key -out /etc/ssl/zukkolar/zukkolar.uz.pem \
    -subj "/CN=zukkolar.uz" -addext "subjectAltName=DNS:zukkolar.uz,DNS:*.zukkolar.uz" 2>/dev/null
  chmod 600 /etc/ssl/zukkolar/zukkolar.uz.key
fi

# 3. systemd service (enabled; started by the first deploy once /srv/zukkolar/current exists)
install -m 644 "$HERE/zukkolar.service" /etc/systemd/system/zukkolar.service
systemctl daemon-reload
systemctl enable zukkolar.service >/dev/null

# 4. nginx site — only reload if the whole config is valid, so the hotel sites are never affected
install -m 644 "$HERE/nginx-zukkolar.conf" /etc/nginx/sites-available/zukkolar
ln -sfn /etc/nginx/sites-available/zukkolar /etc/nginx/sites-enabled/zukkolar
if nginx -t 2>/tmp/nginx-test.log; then
  systemctl reload nginx
  echo "nginx: config OK, reloaded"
else
  rm -f /etc/nginx/sites-enabled/zukkolar
  cat /tmp/nginx-test.log
  echo "nginx: config test FAILED — site disabled, nothing reloaded" >&2
  exit 1
fi

echo "setup done"
