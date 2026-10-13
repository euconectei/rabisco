import { REPOSITORY_URL } from '../components/links'
import type { Messages } from '../i18n/pt-BR'

/** Our own ad: text and link only, no script, no cookie. */
export function houseAd(t: Messages): { text: string; cta: string; href: string } {
  return { text: t.ads.house.text, cta: t.ads.house.cta, href: REPOSITORY_URL }
}
