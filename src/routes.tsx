import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useI18n } from './i18n/useI18n'
import { FilesPage } from './pages/FilesPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'

const EditorPage = lazy(() => import('./editor/EditorPage'))

function EditorFallback() {
  const { t } = useI18n()
  return <p className="page">{t.editor.loading}</p>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<FilesPage />} />
      <Route
        path="/edit/:fileId"
        element={
          <Suspense fallback={<EditorFallback />}>
            <EditorPage />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
