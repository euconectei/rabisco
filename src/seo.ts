import type { Language } from './i18n/languages'

export const BASE_URL = 'https://rabisco.dev'

export interface SeoMeta {
  lang: Language
  path: string
  url: string
  title: string
  description: string
  ogLocale: string
  ogImageUrl: string
}

const COPY: Record<Language, { title: string; description: string; ogLocale: string; ogImagePath: string }> = {
  'pt-BR': {
    title: 'Rabisco — mapa mental e fluxograma à mão, grátis e online',
    description:
      'Crie mapas mentais e fluxos desenhados à mão no mesmo canvas, salvos no seu Google Drive. Grátis, de código aberto e sem servidor.',
    ogLocale: 'pt_BR',
    ogImagePath: '/landing/pt-BR-canvas-light.webp',
  },
  en: {
    title: 'Rabisco — free online mind map and hand-drawn flowchart maker',
    description:
      'Create mind maps and hand-drawn flows on one canvas, saved to your Google Drive. Free, open source, no server.',
    ogLocale: 'en_US',
    ogImagePath: '/landing/en-canvas-light.webp',
  },
}

export function seoFor(lang: Language): SeoMeta {
  const copy = COPY[lang]
  const path = lang === 'en' ? '/en/' : '/'
  return {
    lang,
    path,
    url: `${BASE_URL}${path}`,
    title: copy.title,
    description: copy.description,
    ogLocale: copy.ogLocale,
    ogImageUrl: `${BASE_URL}${copy.ogImagePath}`,
  }
}

export function softwareApplicationJsonLd(lang: Language): string {
  const { url, description } = seoFor(lang)
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Rabisco',
    url,
    description,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    inLanguage: ['pt-BR', 'en'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    license: 'https://opensource.org/licenses/MIT',
    sameAs: ['https://github.com/euconectei/rabisco'],
  })
}
