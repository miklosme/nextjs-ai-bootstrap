<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

After finishing technical work:

- Validate correctness before handing off with `bun run typecheck`.
- Put a commit message about this change to `.current-commit-message`. Don't care about the content, just write one line. Keep it terse and sharp, do not include a semantic prefix, and do not end with a period. The commit hook consumes and clears this file during the next normal commit attempt.
