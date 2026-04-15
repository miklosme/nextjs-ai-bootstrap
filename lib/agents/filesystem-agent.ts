import { InferUITools, tool, type UIMessage } from 'ai'
import { Bash, OverlayFs } from 'just-bash'
import path from 'node:path'
import { z } from 'zod'

const HOST_MOUNT_SOURCE_ROOT = path.join(process.cwd(), 'projects')
const VIRTUAL_MOUNT_ROOT = '/workspace'
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
    mountPoint: VIRTUAL_MOUNT_ROOT,
    root: HOST_MOUNT_SOURCE_ROOT,
  })

  return new Bash({
    cwd: VIRTUAL_MOUNT_ROOT,
    fs: overlay,
  })
}

export const FILESYSTEM_AGENT_SYSTEM_PROMPT = `You are a filesystem agent.

Use the bash tool as your primary way to inspect the filesystem and ground your answers in what is actually present.
Explore before concluding. Prefer focused commands like rg, find, ls, tree, sed -n, head, tail, cat, jq, and wc instead of dumping huge files.

This bash environment uses a copy-on-write overlay:
- reads come from the mounted source files
- writes are isolated to this request only
- no bash writes persist back to the mounted source on disk

You may use temporary files during the current tool loop, but never claim that you changed the underlying source files through bash.
When you answer, cite the important paths you inspected and keep the response practical and concise unless the user asks for more depth.`

export const createFilesystemTools = () => {
  const bash = createBashEnvironment()

  return {
    bash: tool({
      description: `Execute bash commands against the mounted filesystem at ${VIRTUAL_MOUNT_ROOT}.
Use this to inspect files, compare directories, search with ripgrep, read JSON or Markdown, and do lightweight scratch work inside the request-local overlay.`,
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
          cwd: VIRTUAL_MOUNT_ROOT,
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
