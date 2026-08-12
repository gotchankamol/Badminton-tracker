---
description: Run the pre-clear-chat checklist (uncommitted work, loose ends) before /clear
---

Before the user runs `/clear`, check for anything that would be lost or forgotten once the chat resets:

1. `git status --short` — flag any uncommitted or untracked changes. If there are any, summarize them and ask whether to commit first (do not commit without asking).
2. Note any in-progress task from this conversation that isn't finished yet (e.g. an open TaskList item, a half-done edit, a decision the user hasn't confirmed) and call it out explicitly.
3. Briefly note dev server state (Prisma dev / Next.js) only if relevant to what's in progress — don't restart anything.
4. Give a one-line verdict: either "clean, safe to clear" or a short list of loose ends to resolve first.

Do not run `/clear` yourself — only the user can do that. Just report the checklist result.
