import { InferUITools, tool, type UIMessage } from 'ai'
import { Bash, OverlayFs } from 'just-bash'
import { z } from 'zod'

const VIRTUAL_MOUNT_ROOT = '/workspace'
const MAX_TOOL_OUTPUT_CHARS = 12_000
const MAX_BASH_TIMEOUT_SECONDS = 25

const truncateToolText = (value: string, label: 'stdout' | 'stderr') => {
  if (value.length <= MAX_TOOL_OUTPUT_CHARS) {
    return {
      originalLength: value.length,
      text: value,
      truncated: false,
    }
  }

  const omittedCharacterCount = value.length - MAX_TOOL_OUTPUT_CHARS

  return {
    originalLength: value.length,
    text: `[${label} truncated: showing last ${MAX_TOOL_OUTPUT_CHARS} of ${value.length} characters; omitted ${omittedCharacterCount} leading characters]\n\n${value.slice(-MAX_TOOL_OUTPUT_CHARS)}`,
    truncated: true,
  }
}

const createToolOutput = ({
  command,
  cwd,
  exitCode,
  stderr,
  stdout,
  timedOut,
  timeoutSeconds,
}: {
  command: string
  cwd: string
  exitCode: number
  stderr: string
  stdout: string
  timedOut: boolean
  timeoutSeconds?: number
}) => {
  const outputSections = [`Command: ${command}`, `Cwd: ${cwd}`, `Exit code: ${exitCode}`]

  if (timeoutSeconds !== undefined) {
    outputSections.push(`Timeout: ${timeoutSeconds}s${timedOut ? ' (reached)' : ''}`)
  }

  if (stdout) {
    outputSections.push(`[stdout]\n${stdout}`)
  }

  if (stderr) {
    outputSections.push(`[stderr]\n${stderr}`)
  }

  if (!stdout && !stderr) {
    outputSections.push('[no output]')
  }

  return outputSections.join('\n\n')
}

const createBashEnvironment = (projectRoot: string) => {
  const overlay = new OverlayFs({
    mountPoint: VIRTUAL_MOUNT_ROOT,
    root: projectRoot,
  })

  return new Bash({
    cwd: VIRTUAL_MOUNT_ROOT,
    fs: overlay,
  })
}

export const FILESYSTEM_AGENT_SYSTEM_PROMPT = `You are a filesystem agent.

Available tools:
- bash: execute bash commands in /workspace against the mounted project filesystem.

Only the selected project is mounted into your environment.
Current working directory: /workspace.
Chat history files may exist under /workspace/.history.

Use the bash tool as your primary way to inspect the filesystem and ground your answers in what is actually present.
Explore before concluding. Prefer focused commands like rg, rg --files, rg --files -g, ls, tree, sed -n, head, tail, jq, wc, sort, uniq, and diff instead of dumping huge files.
Prefer rg and rg --files over broad find commands when searching project files. Use find only when raw filesystem traversal is needed.
Use line-ranged reads for large files, for example sed -n '1,200p' path.
If output is truncated, rerun a narrower command.

This bash environment uses a copy-on-write overlay:
- reads come from the mounted source files
- writes are isolated to this request only
- no bash writes persist back to the mounted source on disk

Each bash call starts in /workspace; cd, env, alias, and function changes only affect the current command. Use cd dir && ... when needed.

You may use temporary files during the current tool loop, but never claim that you changed the underlying source files through bash.
When you answer, cite the important paths you inspected and keep the response practical and concise unless the user asks for more depth.`

export const createFilesystemTools = (projectRoot: string) => {
  const bash = createBashEnvironment(projectRoot)

  return {
    bash: tool({
      description: `Execute bash commands against the mounted filesystem at ${VIRTUAL_MOUNT_ROOT}.
Each call starts from ${VIRTUAL_MOUNT_ROOT}; use "cd path && ..." for commands that need another directory.
Writes are isolated to the request-local overlay and do not persist to the source project on disk.
Returns combined output, stdout, stderr, exitCode, cwd, timeout, and truncation metadata.
Output is tail-truncated when large. If truncated, rerun a narrower command.
Optionally provide timeoutSeconds for long-running commands.`,
      inputSchema: z.object({
        command: z
          .string()
          .min(1)
          .describe(
            'A bash command or pipeline to run from /workspace. Prefer targeted inspection commands over huge output dumps.',
          ),
        timeoutSeconds: z
          .number()
          .int()
          .min(1)
          .max(MAX_BASH_TIMEOUT_SECONDS)
          .optional()
          .describe(
            `Optional command timeout in seconds, clamped by schema to ${MAX_BASH_TIMEOUT_SECONDS}s.`,
          ),
      }),
      execute: async ({ command, timeoutSeconds }) => {
        const abortController = timeoutSeconds === undefined ? undefined : new AbortController()
        let timeoutId: ReturnType<typeof setTimeout> | undefined

        if (abortController && timeoutSeconds !== undefined) {
          timeoutId = setTimeout(() => abortController.abort(), timeoutSeconds * 1000)
        }

        try {
          const result = await bash.exec(command, {
            cwd: VIRTUAL_MOUNT_ROOT,
            signal: abortController?.signal,
          })
          const stdout = truncateToolText(result.stdout, 'stdout')
          const stderr = truncateToolText(result.stderr, 'stderr')
          const timedOut = abortController?.signal.aborted ?? false

          return {
            command,
            cwd: VIRTUAL_MOUNT_ROOT,
            exitCode: result.exitCode,
            output: createToolOutput({
              command,
              cwd: VIRTUAL_MOUNT_ROOT,
              exitCode: result.exitCode,
              stderr: stderr.text,
              stdout: stdout.text,
              timedOut,
              timeoutSeconds,
            }),
            stderr: stderr.text,
            stderrLength: stderr.originalLength,
            stderrTruncated: stderr.truncated,
            stdout: stdout.text,
            stdoutLength: stdout.originalLength,
            stdoutTruncated: stdout.truncated,
            timedOut,
            timeoutSeconds,
          }
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
        }
      },
    }),
  }
}

type FilesystemTools = ReturnType<typeof createFilesystemTools>

export type FilesystemChatMessage = UIMessage<unknown, never, InferUITools<FilesystemTools>>
