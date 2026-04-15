import { generateText } from 'ai'

const TITLE_MODEL = 'openai/gpt-5.4-mini'
const MAX_TITLE_LENGTH = 80

const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const trimWrappingQuotes = (value: string) => value.replace(/^["'`]+|["'`]+$/g, '')

export async function generateThreadTitle(firstUserMessage: string): Promise<string | null> {
  const prompt = collapseWhitespace(firstUserMessage)

  if (!prompt) {
    return null
  }

  const result = await generateText({
    maxOutputTokens: 24,
    model: TITLE_MODEL,
    prompt,
    system:
      'Write a terse chat thread title using only the user message. Return plain text only, 2 to 5 words, with no quotes.',
    temperature: 0,
  })

  const title = trimWrappingQuotes(collapseWhitespace(result.text.split('\n')[0] ?? ''))
    .replace(/[.!?,:;]+$/g, '')
    .slice(0, MAX_TITLE_LENGTH)
    .trim()

  return title || null
}
