import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 24)

export type IDTypes = 'chat'

export function createId<T extends IDTypes>(label: T): `${T}-${string}` {
  if (!label) throw new Error('label is required')

  return `${label}-${nanoid()}`
}

export function unlabel(id: string): string {
  // remove the start till the first '-'
  return id.slice(id.indexOf('-') + 1)
}

export function label<T extends IDTypes>(label: T, id: string): `${T}-${string}` {
  if (id.startsWith(`${label}-`)) return id as `${T}-${string}`

  return `${label}-${id}`
}
