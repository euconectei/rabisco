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

export type SecondaryPage = 'whats-new' | 'apoie' | 'rabisco-kids' | 'rabisco-kids/privacy'

const SECONDARY_SEO: Record<SecondaryPage, { path: string; title: string; description: string }> = {
  'whats-new': {
    path: 'whats-new',
    title: 'Novidades do Rabisco',
    description: 'O que mudou no Rabisco recentemente, em linguagem simples.',
  },
  apoie: {
    path: 'apoie',
    title: 'Apoie o Rabisco',
    description: 'O Rabisco é grátis e de código aberto. Ajude a manter o projeto no ar com um Pix de qualquer valor.',
  },
  'rabisco-kids': {
    path: 'rabisco-kids',
    title: 'Rabisco Kids — caderno de traçar para crianças',
    description: 'Caderno de traçar para crianças pequenas no Android: traços, letras, números, cursiva e desenhos. Sem propaganda e sem internet.',
  },
  'rabisco-kids/privacy': {
    path: 'rabisco-kids/privacy',
    title: 'Política de Privacidade do Rabisco Kids',
    description: 'O Rabisco Kids não coleta nenhum dado, não tem propaganda e funciona sem internet.',
  },
}

export function secondaryPageSeo(page: SecondaryPage): {
  url: string
  title: string
  description: string
  ogLocale: string
  ogImageUrl: string
} {
  const seo = SECONDARY_SEO[page]
  return {
    url: `${BASE_URL}/${seo.path}`,
    title: seo.title,
    description: seo.description,
    ogLocale: 'pt_BR',
    ogImageUrl: `${BASE_URL}/landing/pt-BR-canvas-light.webp`,
  }
}
