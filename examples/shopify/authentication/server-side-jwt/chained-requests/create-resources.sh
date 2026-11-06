#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
shop_domain="${1:-${APIEASE_SHOP_DOMAIN:-}}"

if [[ ! "$shop_domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$ ]]; then
  echo "Usage: bash create-resources.sh your-store.myshopify.com" >&2
  exit 1
fi

for command_name in node apiease; do
  command -v "$command_name" >/dev/null || { echo "$command_name is required." >&2; exit 1; }
done

if [[ -z "${JWT_DEMO_USERNAME:-}" || -z "${JWT_DEMO_PASSWORD:-}" ]]; then
  echo "Set JWT_DEMO_USERNAME and JWT_DEMO_PASSWORD to a documented DummyJSON demo account." >&2
  echo "Do not supply Shopify or production credentials." >&2
  exit 1
fi

umask 077
temporary_directory="$(mktemp -d "${TMPDIR:-/tmp}/apiease-jwt-chain.XXXXXX")"
trap 'rm -rf "$temporary_directory"' EXIT

node - "$script_dir/resources/requests/jwt-chain-authenticate.json" "$temporary_directory/authenticate.json" <<'NODE'
const fs = require('node:fs');
const definition = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
definition.parameters.find(parameter => parameter.type === 'body').value = JSON.stringify({
  username: process.env.JWT_DEMO_USERNAME,
  password: process.env.JWT_DEMO_PASSWORD,
  expiresInMins: 5,
});
fs.writeFileSync(process.argv[3], JSON.stringify(definition, null, 2) + '\n', {mode: 0o600});
NODE

# Create the dependency first. Both resources deliberately have no public triggers.
apiease create request --shop-domain "$shop_domain" --file "$script_dir/resources/requests/jwt-chain-products.json"
apiease create request --shop-domain "$shop_domain" --file "$temporary_directory/authenticate.json"

echo "Created the internal JWT chain. No storefront trigger or theme block was installed."
echo "Public storefront activation is blocked; see platform-requirements.md."
