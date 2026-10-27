/** One box of a Mermaid flowchart and where its arrows lead, for showing the chart as text. */
export interface FlowchartStep {
  label: string
  next: { label: string; via: string | null }[]
}

// `A([Start])`, `B{Question?}`, `C[Action]`, `D((Circle))`, `E[(Database)]`: an id glued to a bracketed label.
const NODE = /([A-Za-z][\w-]*)\s*(\(\[|\[\(|\(\(|\[|\{|\()(.+?)(\]\)|\)\]|\)\)|\]|\}|\))/g
// `A --> B`, `A -- Yes --> B`, `A -->|Yes| B` (after node labels were reduced to ids).
const EDGE = /([A-Za-z][\w-]*)\s*(?:--\s*([^-]+?)\s*-->|-->\s*(?:\|([^|]+)\|)?)\s*([A-Za-z][\w-]*)/g

/** The boxes of a simple Mermaid `flowchart`, in order of first appearance, with their outgoing arrows. */
export function flowchartSteps(source: string): FlowchartStep[] {
  const labels = new Map<string, string>()
  const order: string[] = []
  const edges: { from: string; to: string; via: string | null }[] = []
  for (const raw of source.split(/\r?\n/).slice(1)) {
    const line = raw.trim()
    if (!line || line.startsWith('%%')) continue
    const reduced = line.replace(NODE, (_match, id: string, _open, label: string) => {
      if (!labels.has(id)) labels.set(id, label.trim())
      return id
    })
    for (const id of reduced.match(/[A-Za-z][\w-]*/g) ?? []) if (labels.has(id) && !order.includes(id)) order.push(id)
    for (const edge of reduced.matchAll(EDGE)) edges.push({ from: edge[1], to: edge[4], via: (edge[2] ?? edge[3])?.trim() ?? null })
  }
  return order.map((id) => ({
    label: labels.get(id)!,
    next: edges.filter((edge) => edge.from === id && labels.has(edge.to)).map((edge) => ({ label: labels.get(edge.to)!, via: edge.via })),
  }))
}
