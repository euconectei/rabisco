import type { convertToExcalidrawElements } from '@excalidraw/excalidraw'

/** What the Mermaid converter produces and `convertToExcalidrawElements` consumes. */
export type ExcalidrawElementSkeleton = NonNullable<Parameters<typeof convertToExcalidrawElements>[0]>[number]
