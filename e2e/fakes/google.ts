import type { Page, Route } from '@playwright/test'

export const FAKE_TOKEN = 'fake-token'
export const FAKE_USER = { email: 'tester@example.com', name: 'Tester' }
const FOLDER_MIME = 'application/vnd.google-apps.folder'

// Stands in for Google Identity Services: requestAccessToken answers with a fixed token.
const FAKE_GIS_SCRIPT = `
window.google = window.google || {};
window.google.accounts = {
  oauth2: {
    initTokenClient: function (config) {
      return {
        requestAccessToken: function () {
          setTimeout(function () { config.callback({ access_token: '${FAKE_TOKEN}', expires_in: 3600, scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.install openid email profile' }) }, 0)
        },
      }
    },
    revoke: function (_token, done) { done() },
  },
};
`

export interface FakeFile {
  id: string
  name: string
  mimeType: string
  parents: string[]
  version: number
  modifiedTime: string
  content: string
  thumbnail?: { image: string; mimeType: string }
  trashed: boolean
}

/** An in-memory Google Drive answering the REST calls the app makes. */
export class FakeDrive {
  readonly files = new Map<string, FakeFile>()
  readonly requests: string[] = []
  /** Statuses to answer the next content uploads with (e.g. [503, 503] to exercise retries). */
  uploadFailures: number[] = []
  private seq = 1
  private clock = Date.parse('2026-10-09T12:00:00Z')

  private tick(): string {
    this.clock += 60_000
    return new Date(this.clock).toISOString()
  }

  add(file: { name: string; content: string; mimeType?: string; parents?: string[] }): FakeFile {
    const created: FakeFile = {
      id: `fake-${this.seq++}`,
      name: file.name,
      mimeType: file.mimeType ?? 'application/vnd.excalidraw+json',
      parents: file.parents ?? [],
      version: 1,
      modifiedTime: this.tick(),
      content: file.content,
      trashed: false,
    }
    this.files.set(created.id, created)
    return created
  }

  /** Simulates an edit made outside the app (another tab, the tablet). */
  editExternally(id: string, content: string): void {
    const file = this.files.get(id)!
    file.content = content
    file.version += 1
    file.modifiedTime = this.tick()
  }

  byName(name: string): FakeFile | undefined {
    return [...this.files.values()].find((file) => file.name === name)
  }

  private meta(file: FakeFile) {
    return { id: file.id, name: file.name, version: String(file.version), modifiedTime: file.modifiedTime, parents: file.parents }
  }

  private static parseMultipart(contentType: string, body: string): { metadata: Record<string, unknown>; content: string } {
    const boundary = contentType.split('boundary=')[1]
    const parts = body.split(`--${boundary}`).slice(1, -1)
    const payload = (part: string) => part.slice(part.indexOf('\r\n\r\n') + 4, part.lastIndexOf('\r\n'))
    return { metadata: JSON.parse(payload(parts[0])) as Record<string, unknown>, content: payload(parts[1]) }
  }

  async handle(route: Route): Promise<void> {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    this.requests.push(`${method} ${url.pathname}${url.search}`)
    if (request.headers().authorization !== `Bearer ${FAKE_TOKEN}`) {
      return route.fulfill({ status: 401, json: { error: { code: 401 } } })
    }
    const isUpload = url.pathname.startsWith('/upload/')
    const id = url.pathname.match(/\/files\/([^/]+)$/)?.[1]
    const notFound = () => route.fulfill({ status: 404, json: { error: { code: 404 } } })

    if (method === 'GET' && !id) {
      const query = url.searchParams.get('q') ?? ''
      const all = [...this.files.values()].filter((file) => !file.trashed)
      if (query.includes(`mimeType='${FOLDER_MIME}'`)) {
        const name = query.match(/name='([^']+)'/)?.[1]
        return route.fulfill({ json: { files: all.filter((f) => f.mimeType === FOLDER_MIME && f.name === name).map((f) => ({ id: f.id })) } })
      }
      const files = all.filter((f) => f.mimeType !== FOLDER_MIME).sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime))
      return route.fulfill({ json: { files: files.map((f) => this.meta(f)) } })
    }
    if (method === 'POST' && !isUpload) {
      const body = request.postDataJSON() as { name: string; mimeType: string }
      return route.fulfill({ json: { id: this.add({ name: body.name, mimeType: body.mimeType, content: '' }).id } })
    }
    if (method === 'POST' && isUpload) {
      const { metadata, content } = FakeDrive.parseMultipart(request.headers()['content-type'], request.postData() ?? '')
      const file = this.add({ name: String(metadata.name), mimeType: String(metadata.mimeType), parents: metadata.parents as string[], content })
      return route.fulfill({ json: this.meta(file) })
    }
    const file = id ? this.files.get(id) : undefined
    if (!file) return notFound()
    if (method === 'GET') {
      if (url.searchParams.get('alt') === 'media') return route.fulfill({ body: file.content, contentType: 'application/json' })
      if (url.searchParams.get('fields') === 'id,trashed') return route.fulfill({ json: { id: file.id, trashed: file.trashed } })
      return route.fulfill({ json: this.meta(file) })
    }
    if (method === 'PATCH' && isUpload) {
      const failure = this.uploadFailures.shift()
      if (failure) return route.fulfill({ status: failure, json: { error: { code: failure } } })
      const { metadata, content } = FakeDrive.parseMultipart(request.headers()['content-type'], request.postData() ?? '')
      file.content = content
      const hints = metadata.contentHints as { thumbnail?: FakeFile['thumbnail'] } | undefined
      if (hints?.thumbnail) file.thumbnail = hints.thumbnail
      file.version += 1
      file.modifiedTime = this.tick()
      return route.fulfill({ json: this.meta(file) })
    }
    if (method === 'PATCH') {
      file.name = (request.postDataJSON() as { name: string }).name
      file.version += 1
      return route.fulfill({ json: this.meta(file) })
    }
    return route.fulfill({ status: 400, json: { error: { code: 400 } } })
  }
}

export async function installFakeGoogle(page: Page, drive: FakeDrive = new FakeDrive()): Promise<FakeDrive> {
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_GIS_SCRIPT }),
  )
  await page.route(/^https:\/\/www\.googleapis\.com\/(upload\/)?drive\/v3\//, (route) => drive.handle(route))
  await page.route('https://www.googleapis.com/oauth2/v3/userinfo', (route) => {
    const authorized = route.request().headers().authorization === `Bearer ${FAKE_TOKEN}`
    return authorized
      ? route.fulfill({ json: FAKE_USER })
      : route.fulfill({ status: 401, json: { error: 'invalid_token' } })
  })
  return drive
}
