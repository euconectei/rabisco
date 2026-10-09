import { useCallback } from 'react'
import { useAuth } from '../auth/useAuth'
import { googleConfig } from '../config'
import { useI18n } from '../i18n/useI18n'
import { pickFile } from './picker'

/** Returns a function that opens the Drive Picker (null when cancelled or unavailable). */
export function useFilePicker(): () => Promise<{ id: string; name: string } | null> {
  const { tokens } = useAuth()
  const { lang } = useI18n()
  return useCallback(async () => {
    const config = googleConfig()
    if (!config) return null
    const accessToken = await tokens.getToken()
    return pickFile({ accessToken, apiKey: config.apiKey, appId: config.appId, locale: lang })
  }, [lang, tokens])
}
