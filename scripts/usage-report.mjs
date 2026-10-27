// `pnpm usage-report`: weekly counts from the anonymous usage events (dataset `rabisco_usage`, written by
// functions/api/event.ts). Needs CLOUDFLARE_ACCOUNT_ID and a CLOUDFLARE_API_TOKEN with "Account Analytics: Read".
const account = process.env.CLOUDFLARE_ACCOUNT_ID
const token = process.env.CLOUDFLARE_API_TOKEN
if (!account || !token) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (permission "Account Analytics: Read") to read the usage counts.')
  process.exit(1)
}

const DAYS = Number(process.env.USAGE_DAYS ?? 90)
// Rows are sampled under load: _sample_interval is how many events each stored row stands for.
const WEEK = `toStartOfInterval(timestamp, INTERVAL '7' DAY)`
const SINCE = `timestamp > NOW() - INTERVAL '${DAYS}' DAY`

async function query(sql) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: `${sql} FORMAT JSON`,
  })
  if (!response.ok) throw new Error(`Analytics Engine answered ${response.status}: ${await response.text()}`)
  return (await response.json()).data
}

const byWeek = await query(
  `SELECT ${WEEK} AS week, blob1 AS type, blob2 AS source, SUM(_sample_interval) AS events FROM rabisco_usage WHERE ${SINCE} GROUP BY week, type, source ORDER BY week`,
)
const byTemplate = await query(
  `SELECT blob3 AS template, blob1 AS type, SUM(_sample_interval) AS events FROM rabisco_usage WHERE ${SINCE} AND blob3 != '' GROUP BY template, type ORDER BY events DESC LIMIT 40`,
)

console.log(`Last ${DAYS} days, per week (created by source, and returns to edit):`)
console.table(byWeek.map((row) => ({ week: row.week.slice(0, 10), event: row.source ? `created (${row.source})` : 'returned', count: Number(row.events) })))
console.log('Per template:')
console.table(byTemplate.map((row) => ({ template: row.template, event: row.type === 'drawing_created' ? 'created' : 'returned', count: Number(row.events) })))
