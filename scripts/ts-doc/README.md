# TypeDoc Documentation Utilities

This directory contains shared utilities for TypeDoc documentation generation.

## Files

### `extract-common-symbols.mjs`
A shared utility module that extracts symbols from the common project's TypeDoc output (`common.json`) and generates external symbol link mappings. This allows backend and frontend projects to link to common types.

**Exported Functions:**
- `ensureCommonDocumentation()` - Generates common TypeDoc JSON if it doesn't exist
- `extractCommonSymbols(commonJsonPath, relativePath)` - Extracts symbols and returns mapping object wrapped in `{ "common": {...} }`
- `getProjectRoot()` - Gets the project root directory
- `getCommonJsonPath()` - Gets the path to common.json

**Used by:**
- `backend/typedoc.config.mjs`
- `frontend/typedoc.config.mjs`

## TypeDoc Configuration Files

Each project has its own `typedoc.config.mjs` that:
1. Imports utilities from this directory
2. Ensures common documentation exists
3. Extracts common symbol mappings
4. Merges them with the project's existing external symbol links
5. Exports the complete configuration to TypeDoc

**Configuration files:**
- `common/typedoc.config.mjs` - Common project configuration
- `backend/typedoc.config.mjs` - Backend configuration with common symbol mappings
- `frontend/typedoc.config.mjs` - Frontend configuration with common symbol mappings

## Generating Documentation

Run TypeDoc from each project directory to ensure the `.mjs` config file is loaded:

```bash
# Generate common documentation
cd common && npx typedoc

# Generate backend documentation (automatically links to common symbols)
cd backend && npx typedoc

# Generate frontend documentation (automatically links to common symbols)
cd frontend && npx typedoc
```

Or explicitly specify the config file from the project root:

```bash
# Common
npx typedoc --options common/typedoc.config.mjs

# Backend
npx typedoc --options backend/typedoc.config.mjs

# Frontend
npx typedoc --options frontend/typedoc.config.mjs
```

## How It Works

1. When `npx typedoc` runs, TypeDoc loads the `.mjs` config file
2. The config calls `ensureCommonDocumentation()` to generate common docs if needed
3. It calls `extractCommonSymbols()` to get symbol mappings from common
4. These mappings are merged into `externalSymbolLinkMappings`
5. TypeDoc generates documentation with all external symbol links resolved

No temporary files, no wrapper scripts needed!
