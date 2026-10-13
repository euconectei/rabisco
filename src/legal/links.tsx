import type { ReactNode } from 'react'
import { REPOSITORY_URL } from '../components/links'

export const CONTACT_EMAIL = 'rafaelfms@gmail.com'

export function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function Contact() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
}

export function Repository() {
  return <External href={REPOSITORY_URL}>{REPOSITORY_URL}</External>
}

export const GOOGLE_PERMISSIONS_URL = 'https://myaccount.google.com/permissions'
export const GOOGLE_API_POLICY_URL = 'https://developers.google.com/terms/api-services-user-data-policy'
