# Kitchen Valenzuela Workspace

This repository is organized as a small multi-area workspace.

## Main Areas

- `inventory/` - Main production inventory app.
- `labs/inventory/` - Experimental inventory components, screens, and workflows before they are promoted into the main app.
- `shared/` - Stable reusable components and utilities.
- `v3/` - Reference app. Keep paths stable unless references are updated intentionally.
- `demos/` - Older standalone experiments and demo pages.
- `backend/` - Server-side support code.
- `docs/` - Project planning notes, changelogs, and implementation notes.
- `tools/` - Utility scripts.
- `archive/` - Old exports, backups, and files kept for history.

## Promotion Rule

Build unfinished inventory work in `labs/inventory/`. When a feature is ready, move the final code into `inventory/`. Move code into `shared/` only after it is stable and useful outside a single app area.
