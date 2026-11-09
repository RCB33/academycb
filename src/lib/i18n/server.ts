import 'server-only'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { createTranslator, localeCookie, parseLocale } from './translate'

export const getLocale = cache(async () => parseLocale((await cookies()).get(localeCookie)?.value))
export async function getT() { return createTranslator(await getLocale()) }
