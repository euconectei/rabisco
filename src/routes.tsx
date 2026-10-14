import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { useI18n } from './i18n/useI18n'
import { FilesPage } from './pages/FilesPage'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OpenFromDrivePage } from './pages/OpenFromDrivePage'
import { WhatsNewPage } from './pages/WhatsNewPage'

const EditorPage = lazy(() => import('./editor/EditorPage'))
const NewFileRedirect = lazy(() => import('./editor/NewFileRedirect'))
const PrivacyPage = lazy(() => import('./legal/PrivacyPage'))
const TermsPage = lazy(() => import('./legal/TermsPage'))
const SupportPage = lazy(() => import('./support/SupportPage'))

function EditorFallback() {
  const { t } = useI18n()
  return <p className="page">{t.editor.loading}</p>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <FilesPage />
          </RequireAuth>
        }
      />
      <Route path="/whats-new" element={<WhatsNewPage />} />
      <Route
        path="/open"
        element={
          <RequireAuth>
            <OpenFromDrivePage />
          </RequireAuth>
        }
      />
      <Route
        path="/edit/new"
        element={
          <RequireAuth>
            <Suspense fallback={<EditorFallback />}>
              <NewFileRedirect />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/edit/:fileId"
        element={
          <RequireAuth>
            <Suspense fallback={<EditorFallback />}>
              <EditorPage />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/privacy"
        element={
          <Suspense fallback={<EditorFallback />}>
            <PrivacyPage />
          </Suspense>
        }
      />
      <Route
        path="/terms"
        element={
          <Suspense fallback={<EditorFallback />}>
            <TermsPage />
          </Suspense>
        }
      />
      <Route
        path="/apoie"
        element={
          <Suspense fallback={<EditorFallback />}>
            <SupportPage />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
