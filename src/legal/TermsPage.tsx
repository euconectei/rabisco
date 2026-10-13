import { useI18n } from '../i18n/useI18n'
import { LegalPage } from './LegalPage'
import { TermsEn, TermsPtBR } from './terms'

export default function TermsPage() {
  const { lang, t } = useI18n()
  return <LegalPage title={t.legal.termsTitle}>{lang === 'pt-BR' ? <TermsPtBR /> : <TermsEn />}</LegalPage>
}
