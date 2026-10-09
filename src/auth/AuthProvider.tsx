import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { GoogleConfig } from '../config'
import { DriveError } from '../drive/errors'
import type { TokenSource } from '../drive/http'
import { clearAccountHint, readAccountHint, writeAccountHint, type AccountHint } from './accountHint'
import { AuthContext, type AuthStatus, type AuthUser, type AuthValue } from './context'
import { loadIdentityClient, type IdentityClient, type TokenResponse } from './googleIdentity'
import { fetchGoogleUserInfo } from './userInfo'

const RENEW_BEFORE_SEC = 300

interface Props {
  config: GoogleConfig | null
  children: ReactNode
  /** Test seam: a ready identity client instead of loading Google's script. */
  identity?: IdentityClient
  fetchUserInfo?: (accessToken: string) => Promise<AuthUser>
}

interface Session {
  accessToken: string
  expiresAt: number
}

export function AuthProvider({ config, children, identity, fetchUserInfo = fetchGoogleUserInfo }: Props) {
  const [status, setStatus] = useState<AuthStatus>(config ? 'signed-out' : 'unavailable')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hint, setHint] = useState<AccountHint | null>(() => readAccountHint())
  const [error, setError] = useState<'failed' | null>(null)
  const session = useRef<Session | null>(null)
  const renewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clientPromise = useRef<Promise<IdentityClient> | null>(identity ? Promise.resolve(identity) : null)
  const hintRef = useRef(hint)
  useEffect(() => {
    hintRef.current = hint
  }, [hint])

  const getClient = useCallback((): Promise<IdentityClient> => {
    if (!config) return Promise.reject(new DriveError('auth', 'Sign-in unavailable'))
    clientPromise.current ??= loadIdentityClient(config.clientId).catch((reason: unknown) => {
      clientPromise.current = null
      throw reason
    })
    return clientPromise.current
  }, [config])

  const clearSession = useCallback(() => {
    session.current = null
    if (renewTimer.current) clearTimeout(renewTimer.current)
    renewTimer.current = null
  }, [])

  const refreshRef = useRef<() => Promise<string>>(async () => '')

  const storeToken = useCallback((token: TokenResponse) => {
    session.current = { accessToken: token.accessToken, expiresAt: Date.now() + token.expiresInSec * 1000 }
    if (renewTimer.current) clearTimeout(renewTimer.current)
    const delayMs = Math.max(token.expiresInSec - RENEW_BEFORE_SEC, 0) * 1000
    renewTimer.current = setTimeout(() => void refreshRef.current().catch(() => {}), delayMs)
  }, [])

  const refreshToken = useCallback(async (): Promise<string> => {
    try {
      const client = await getClient()
      const token = await client.requestToken({ prompt: '', loginHint: hintRef.current?.email })
      storeToken(token)
      return token.accessToken
    } catch {
      clearSession()
      setStatus('needs-reconnect')
      throw new DriveError('auth', 'Session expired')
    }
  }, [clearSession, getClient, storeToken])
  useEffect(() => {
    refreshRef.current = refreshToken
  }, [refreshToken])

  const signIn = useCallback(async () => {
    setError(null)
    setStatus('signing-in')
    try {
      const client = await getClient()
      const remembered = hintRef.current
      const token = await client.requestToken(
        remembered ? { prompt: '', loginHint: remembered.email } : { prompt: 'consent', loginHint: undefined },
      )
      const profile = await fetchUserInfo(token.accessToken)
      storeToken(token)
      setUser(profile)
      const nextHint = { email: profile.email, name: profile.name }
      writeAccountHint(nextHint)
      setHint(nextHint)
      setStatus('signed-in')
    } catch {
      clearSession()
      setError('failed')
      setStatus('signed-out')
    }
  }, [clearSession, fetchUserInfo, getClient, storeToken])

  const reconnect = useCallback(async () => {
    setError(null)
    try {
      await refreshToken()
      setStatus('signed-in')
    } catch {
      setError('failed')
    }
  }, [refreshToken])

  const signOut = useCallback(async () => {
    const token = session.current?.accessToken
    clearSession()
    if (token) await getClient().then((client) => client.revoke(token)).catch(() => {})
    clearAccountHint()
    setHint(null)
    setUser(null)
    setStatus(config ? 'signed-out' : 'unavailable')
  }, [clearSession, config, getClient])

  const forgetAccount = useCallback(() => {
    clearAccountHint()
    setHint(null)
  }, [])

  const prepare = useCallback(() => {
    void getClient().catch(() => {})
  }, [getClient])

  const tokens = useMemo<TokenSource>(
    () => ({
      async getToken() {
        const current = session.current
        if (!current) throw new DriveError('auth', 'Not signed in')
        if (Date.now() >= current.expiresAt - 60_000) return refreshRef.current()
        return current.accessToken
      },
      refreshToken: () => refreshRef.current(),
    }),
    [],
  )

  useEffect(() => clearSession, [clearSession])

  const value = useMemo<AuthValue>(
    () => ({ status, user, hint, error, signIn, reconnect, signOut, forgetAccount, prepare, tokens }),
    [status, user, hint, error, signIn, reconnect, signOut, forgetAccount, prepare, tokens],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
