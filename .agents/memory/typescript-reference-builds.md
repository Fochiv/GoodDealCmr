---
name: TypeScript reference builds
description: Distinguishing missing project-reference declarations from source-code type errors.
---

When a package typecheck reports TS6305 for a workspace dependency, distinguish missing project-reference declaration outputs from a code regression. The frontend bundler can succeed while `tsc -p` fails until the dependency declarations are force-built. In this workspace, rebuilding the React API client declarations made the Good Deal package typecheck pass; the root typecheck separately reported unresolved declaration outputs in the API server.

**Why:** Incremental TypeScript build state can claim a reference is current even when its declaration files are absent, producing cascades of implicit-`any` errors.

**How to apply:** For TS6305, inspect the referenced project outputs, rebuild only the affected project references, then rerun the target package typecheck. Treat full-repository typecheck results separately from the app build.