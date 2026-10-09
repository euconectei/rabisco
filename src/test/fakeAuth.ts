import type { IdentityClient, TokenResponse } from '../auth/googleIdentity'
import type { AuthUser } from '../auth/context'

export function fakeIdentity(responses: Array<TokenResponse | Error> = []) {
  const queue = [...responses]
  const identity: IdentityClient & { requestToken: ReturnType<typeof vi.fn>; revoke: ReturnType<typeof vi.fn> } = {
    requestToken: vi.fn(async () => {
      const next = queue.shift() ?? { accessToken: 'token-default', expiresInSec: 3600 }
      if (next instanceof Error) throw next
      return next
    }),
    revoke: vi.fn(async () => {}),
  }
  return { identity, queue }
}

export const tester: AuthUser = { email: 'ana@example.com', name: 'Ana Souza', picture: 'https://example.com/a.png' }
