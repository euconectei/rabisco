export const ADSENSE_SCRIPT_HOST = 'pagead2.googlesyndication.com'

let loading: Promise<void> | null = null
const pushed = new WeakSet<HTMLElement>()

/** Injects adsbygoogle.js once per page. A failure is final for this page (blocker, offline). */
export function loadAdsense(client: string): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.src = `https://${ADSENSE_SCRIPT_HOST}/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('AdSense script failed to load')))
    document.head.append(script)
  })
  return loading
}

/** Asks AdSense to fill this <ins>. StrictMode runs effects twice; a second push on the same <ins> is an error. */
export function pushAd(ins: HTMLElement): void {
  if (pushed.has(ins)) return
  pushed.add(ins)
  const queue = (window.adsbygoogle ??= [])
  queue.push({})
}
