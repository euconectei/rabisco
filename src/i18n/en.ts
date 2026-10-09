import type { Messages } from './pt-BR'

export const en: Messages = {
  app: {
    name: 'Rabisco',
    tagline: 'Mind maps and hand-drawn flows on one canvas, saved to your Google Drive.',
  },
  landing: { start: 'Get started' },
  files: { title: 'My files', empty: 'No files yet.', new: 'New' },
  editor: { backToFiles: 'My files', loading: 'Loading the editor…' },
  notFound: { title: 'Page not found', backHome: 'Back to home' },
  language: { label: 'Language', 'pt-BR': 'Português', en: 'English' },
  whatsNew: {
    title: 'News',
    intro: "What changed in Rabisco lately, in plain words.",
    back: 'Back',
    link: 'News',
    linkUnseen: 'News (something new)',
    menuItem: 'News ({version})',
    sections: {
      launch: {
        title: 'Rabisco is here',
        items: [
          'Sketch flows and ideas with a hand-drawn look, on a board with no edges.',
          'Use it in Portuguese or English: Rabisco follows your browser language, and you can switch anytime.',
          'Coming soon: sign in with your Google account and keep your drawings in your Google Drive.',
        ],
      },
    },
  },
}
