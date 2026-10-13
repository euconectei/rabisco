// Usage: pnpm hash-email you@example.com → prints the hash to add to src/ads/exempt.ts.
import { createHash } from 'node:crypto'

const email = process.argv[2]
if (!email) {
  console.error('Usage: pnpm hash-email you@example.com')
  process.exit(1)
}
console.log(createHash('sha256').update(email.trim().toLowerCase()).digest('hex'))
