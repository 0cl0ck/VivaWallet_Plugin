# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Payload CMS plugin for integrating Viva Wallet Smart Checkout. It's being developed in TypeScript (strict mode) using pnpm as the package manager.

## Architecture

### Plugin Structure
- **Main Entry**: `src/index.ts` - Exports `vivaWalletPlugin` function that extends Payload config
- **Export Points**: 
  - `src/exports/index.ts` - Main server-side exports
  - `src/exports/client.ts` - Client-side components
  - `src/exports/rsc.ts` - React Server Components
- **Development Environment**: `dev/` - Contains a test Payload app for plugin development

### How the Plugin Works
The plugin follows Payload's standard plugin architecture:
1. Receives plugin options via `VivaWalletPluginConfig`
2. Extends the Payload config by adding collections, fields, endpoints, and components
3. Uses spread syntax to preserve existing config while adding new features
4. Returns the modified config

## Development Commands

```bash
# Install dependencies (using pnpm)
pnpm install

# Development
pnpm dev                 # Start the development server (Next.js with Payload)
pnpm dev:generate-types  # Generate TypeScript types from Payload config
pnpm dev:generate-importmap # Generate import map for Payload

# Building
pnpm build              # Build the plugin for distribution
pnpm clean              # Remove build artifacts

# Testing
pnpm test               # Run all tests
pnpm test:int          # Run integration tests with Vitest
pnpm test:e2e          # Run E2E tests with Playwright

# Code Quality
pnpm lint              # Run ESLint
pnpm lint:fix          # Auto-fix linting issues
```

## Environment Setup

Before running the dev environment:
1. Copy `dev/.env.example` to `dev/.env`
2. Update `DATABASE_URI` (default: MongoDB)
3. Set a unique `PAYLOAD_SECRET`

## Testing Strategy

- **Integration Tests**: Located in `dev/int.spec.ts`, using Vitest
- **E2E Tests**: Located in `dev/e2e.spec.ts`, using Playwright
- **Test Database**: Uses MongoDB Memory Server for isolated testing

## Key Dependencies

- **Payload CMS**: Version 3.37.0
- **Next.js**: Version 15.4.4
- **TypeScript**: Version 5.7.3 (strict mode)
- **Database Adapters**: MongoDB (primary), also supports PostgreSQL and SQLite
- **Package Manager**: pnpm (v9 or v10)

## Development Notes

- The plugin template includes a sample `plugin-collection` and custom endpoint handler
- When modifying collections, always spread existing data to avoid conflicts
- The `disabled` option keeps schema consistent even when plugin is disabled
- Admin components are referenced using the import map syntax: `viva-wallet-plugin/client#ComponentName`