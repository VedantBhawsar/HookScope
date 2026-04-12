---
description: OpenWolf protocol enforcement — active on all files
globs: **/*
---

- Check .wolf/anatomy.md before reading any project file
- Check .wolf/cerebrum.md Do-Not-Repeat list before generating code
- Structure implementation as smaller, reusable components/modules instead of large monolithic files
- For frontend UI: BEFORE implementation, check `packages/ui/src/components/` for existing shadcn components. If a required component is missing, use the `shadcn` skill to install it into `@workspace/ui` first, then import from there. Never use raw HTML when a shadcn equivalent should exist.
- For ANY delete functionality: always use `<ConfirmDeleteDialog>` from `@workspace/ui/components/confirm-delete-dialog`. Never implement an inline confirm or browser `window.confirm()`. Pass `entityName`, optional `entityLabel`, `onConfirm`, and `isPending` props.
- Extract reusable layout sections (for example header/sidebar/table sections) into dedicated components when touching or adding page-level UI.
- API mutation functions must return `{ ...data, message }` so callers can show the server's `message` in toast notifications. Never hardcode toast strings when the API response already provides one. Always destructure `message` from `response.data` before calling `unwrapResponse`.
- After writing or editing files, update .wolf/anatomy.md and append to .wolf/memory.md
- After receiving a user correction, update .wolf/cerebrum.md immediately (Preferences, Learnings, or Do-Not-Repeat)
- LEARN from every interaction: if you discover a convention, user preference, or project pattern, add it to .wolf/cerebrum.md. Low threshold — when in doubt, log it.
- BEFORE fixing any bug or error: read .wolf/buglog.json for known fixes
- AFTER fixing any bug, error, failed test, failed build, or user-reported problem: ALWAYS log to .wolf/buglog.json with error_message, root_cause, fix, and tags
- If you edit a file more than twice in a session, that likely indicates a bug — log it to .wolf/buglog.json
- When the user asks to check/evaluate UI design: run `openwolf designqc` to capture screenshots, then read them from .wolf/designqc-captures/
- When the user asks to change/pick/migrate UI framework: read .wolf/reframe-frameworks.md, ask decision questions, recommend a framework, then execute with the framework's prompt
