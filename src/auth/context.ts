import { createContext } from 'react'
import type { TokenSource } from '../drive/http'
import type { AccountHint } from './accountHint'

export type AuthStatus = 'unavailable' | 'signed-out' | 'signing-in' | 'signed-in' | 'needs-reconnect'

export interface AuthUser {
  email: string
  name: string
  picture?: string
}

export interface AuthValue {
  status: AuthStatus
  user: AuthUser | null
  hint: AccountHint | null
  error: 'failed' | null
  /** Must run from a click: Google only opens its window on a user gesture. */
  signIn(): Promise<void>
  reconnect(): Promise<void>
  signOut(): Promise<void>
  /** "Use another account": drops the remembered account. */
  forgetAccount(): void
  /** Loads the Google script ahead of the click, so the click can open the window right away. */
  prepare(): void
  tokens: TokenSource
}

export const AuthContext = createContext<AuthValue | null>(null)
