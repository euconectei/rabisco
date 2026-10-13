export type AdRegion = 'europe' | 'brazil' | 'other'

// Europe/* is broad on purpose (it also covers Russia, Turkey, Ukraine and Belarus, which only lose AdSense).
const EUROPE_OUTSIDE_PREFIX = new Set([
  'Atlantic/Azores',
  'Atlantic/Canary',
  'Atlantic/Madeira',
  'Atlantic/Faroe',
  'Atlantic/Reykjavik',
  'Arctic/Longyearbyen',
  'Asia/Nicosia',
  'Asia/Famagusta',
])

const BRAZIL = new Set([
  'America/Araguaina',
  'America/Bahia',
  'America/Belem',
  'America/Boa_Vista',
  'America/Campo_Grande',
  'America/Cuiaba',
  'America/Eirunepe',
  'America/Fortaleza',
  'America/Maceio',
  'America/Manaus',
  'America/Noronha',
  'America/Porto_Velho',
  'America/Recife',
  'America/Rio_Branco',
  'America/Santarem',
  'America/Sao_Paulo',
  'Brazil/Acre',
  'Brazil/DeNoronha',
  'Brazil/East',
  'Brazil/West',
])

/** Where the ad rules come from. A missing time zone counts as Europe, the safe side (no Google ads). */
export function adRegion(timeZone: string | undefined): AdRegion {
  if (!timeZone) return 'europe'
  if (BRAZIL.has(timeZone)) return 'brazil'
  if (timeZone.startsWith('Europe/') || EUROPE_OUTSIDE_PREFIX.has(timeZone)) return 'europe'
  return 'other'
}

export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}
