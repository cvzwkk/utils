# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- **anon-wallet** (`/`) — "Vanta", a fully client-side anonymous Bitcoin wallet generator with BIP39/BIP32 derivation, P2WSH multisig builder, LSB image steganography (PNG output, AES-GCM + PBKDF2), OP_RETURN raw-text embedding in PSBT-built transactions, an entropy collection pool, and a Tor/I2P/Lokinet/Mixnet routing simulator. Cyberpunk dark theme with a custom canvas particle backdrop. All wallet operations run in-browser via bitcoinjs-lib + bip32 + @scure/bip39 + @bitcoinerlab/secp256k1.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
