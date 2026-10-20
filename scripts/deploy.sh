#!/usr/bin/env bash
# Build and upload dist/ to Hostinger over SSH (scp). Usage: npm run deploy
# Needs the private key at ~/.ssh/workmate_deploy (public half added in hPanel > Advanced > SSH Access).
set -euo pipefail
HOST=31.170.166.127 PORT=65002 USER=u749943384
SITE=pink-cheetah-466690.hostingersite.com
REMOTE="${DEPLOY_PATH:-domains/$SITE/public_html}"   # relative to the SSH home folder
KEY="$HOME/.ssh/workmate_deploy"

npm run build
ssh -i "$KEY" -p $PORT -o StrictHostKeyChecking=accept-new $USER@$HOST "mkdir -p $REMOTE && rm -rf $REMOTE/assets"
scp -i "$KEY" -P $PORT -r dist/. "$USER@$HOST:$REMOTE/"   # dist/. includes the hidden .htaccess
echo "Deployed to https://$SITE (hard-refresh with Ctrl+Shift+R)"
