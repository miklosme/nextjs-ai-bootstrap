import { InferUITools, tool, type UIMessage } from 'ai'
import { Bash, OverlayFs } from 'just-bash'
import { z } from 'zod'

const REPO_ROOT = process.cwd()
const VIRTUAL_REPO_ROOT = '/workspace'
const MAX_TOOL_OUTPUT_CHARS = 12_000

const truncateToolText = (value: string, label: 'stdout' | 'stderr') => {
  if (value.length <= MAX_TOOL_OUTPUT_CHARS) {
    return { text: value, truncated: false }
  }

  return {
    text: `${value.slice(0, MAX_TOOL_OUTPUT_CHARS)}\n\n[${label} truncated after ${MAX_TOOL_OUTPUT_CHARS} characters]`,
    truncated: true,
  }
}

const createBashEnvironment = () => {
  const overlay = new OverlayFs({
    mountPoint: VIRTUAL_REPO_ROOT,
    root: REPO_ROOT,
  })

  return new Bash({
    cwd: VIRTUAL_REPO_ROOT,
    fs: overlay,
  })
}

export const FILESYSTEM_AGENT_SYSTEM_PROMPT = `You are a filesystem-native agent inside a Next.js starter app.

The repository is mounted at ${VIRTUAL_REPO_ROOT}. The gitignored examples live in ${VIRTUAL_REPO_ROOT}/projects.

Use the bash tool as your primary way to inspect the filesystem and ground your answers in what is actually present.
Explore before concluding. Prefer focused commands like rg, find, ls, tree, sed -n, head, tail, cat, jq, and wc instead of dumping huge files.

This bash environment uses a copy-on-write overlay:
- reads come from the real repository on disk
- writes are isolated to this request only
- no bash writes persist back to the repo

You may use temporary files during the current tool loop, but never claim that you changed the real repository through bash.
When you answer, cite the important paths you inspected and keep the response practical and concise unless the user asks for more depth.`

export const createFilesystemTools = () => {
  const bash = createBashEnvironment()

  return {
    bash: tool({
      description: `Execute bash commands against the mounted repository at ${VIRTUAL_REPO_ROOT}.
Use this to inspect code, compare files, search with ripgrep, read JSON/Markdown, and do lightweight scratch work inside the request-local overlay.`,
      inputSchema: z.object({
        command: z
          .string()
          .min(1)
          .describe(
            'A bash command or pipeline to run from /workspace. Prefer targeted inspection commands over huge output dumps.',
          ),
      }),
      execute: async ({ command }) => {
        const result = await bash.exec(command)
        const stdout = truncateToolText(result.stdout, 'stdout')
        const stderr = truncateToolText(result.stderr, 'stderr')

        return {
          command,
          cwd: VIRTUAL_REPO_ROOT,
          exitCode: result.exitCode,
          stderr: stderr.text,
          stderrTruncated: stderr.truncated,
          stdout: stdout.text,
          stdoutTruncated: stdout.truncated,
        }
      },
    }),
  }
}

export type FilesystemChatMessage = UIMessage<
  unknown,
  never,
  InferUITools<ReturnType<typeof createFilesystemTools>>
>
