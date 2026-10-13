import { useI18n } from '../i18n/useI18n'
import { LegalPage } from './LegalPage'
import { PrivacyEn, PrivacyPtBR } from './privacy'

export default function PrivacyPage() {
  const { lang, t } = useI18n()
  return <LegalPage title={t.legal.privacyTitle}>{lang === 'pt-BR' ? <PrivacyPtBR /> : <PrivacyEn />}</LegalPage>
}
