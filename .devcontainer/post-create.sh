set -eu
sudo chown node:node node_modules apps/server/node_modules apps/web/node_modules
git config --global --add safe.directory '*'
git config --global credential.helper '!gh auth git-credential'
sudo apt-get update
sudo apt-get install --yes --no-install-recommends build-essential python3
npm install --global node-gyp@13.1.0
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
