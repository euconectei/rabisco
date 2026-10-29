import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { LoadingScreen } from './components/LoadingScreen'
import { useI18n } from './i18n/useI18n'
import { LocalModeGate } from './local/LocalModeGate'
import { FilesPage } from './pages/FilesPage'
import { LandingPage } from './pages/LandingPage'
import { LocalDrawingsPage } from './pages/LocalDrawingsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OpenFromDrivePage } from './pages/OpenFromDrivePage'
import { WhatsNewPage } from './pages/WhatsNewPage'
import { WhatsNewProvider } from './whatsNew/WhatsNewProvider'

const EditorPage = lazy(() => import('./editor/EditorPage'))
const NewFileRedirect = lazy(() => import('./editor/NewFileRedirect'))
const ImportDocsPage = lazy(() => import('./docs/ImportDocsPage'))
const TemplatePage = lazy(() => import('./templates/TemplatePage'))
const TemplatesIndexPage = lazy(() => import('./templates/TemplatesIndexPage'))
const PrivacyPage = lazy(() => import('./legal/PrivacyPage'))
const TermsPage = lazy(() => import('./legal/TermsPage'))
const SupportPage = lazy(() => import('./support/SupportPage'))
const KidsAppPage = lazy(() => import('./kidsApp/KidsPages').then((m) => ({ default: m.KidsAppPage })))
const KidsPrivacyPage = lazy(() => import('./kidsApp/KidsPages').then((m) => ({ default: m.KidsPrivacyPage })))

// Each lazy route waits with the words of what it is about to show; pages that are not part of the app
// flow (legal, support, docs, templates) do not mention the editor or offer a way back to the files.
function OpeningFallback() {
  const { t } = useI18n()
  return <LoadingScreen title={t.editor.opening} />
}

function CreatingFallback() {
  const { t } = useI18n()
  return <LoadingScreen title={t.editor.creating} />
}

function PageFallback() {
  const { t } = useI18n()
  return <LoadingScreen title={t.loading.page} back={false} />
}

export function AppRoutes() {
  return (
    <LocalModeGate>
    <WhatsNewProvider>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {/* Before the /en/* catch-all, which serves the English landing page. */}
      <Route
        path="/modelos"
        element={
          <Suspense fallback={<PageFallback />}>
            <TemplatesIndexPage lang="pt-BR" />
          </Suspense>
        }
      />
      <Route
        path="/modelos/:slug"
        element={
          <Suspense fallback={<PageFallback />}>
            <TemplatePage lang="pt-BR" />
          </Suspense>
        }
      />
      <Route
        path="/en/templates"
        element={
          <Suspense fallback={<PageFallback />}>
            <TemplatesIndexPage lang="en" />
          </Suspense>
        }
      />
      <Route
        path="/en/templates/:slug"
        element={
          <Suspense fallback={<PageFallback />}>
            <TemplatePage lang="en" />
          </Suspense>
        }
      />
      <Route path="/en/*" element={<LandingPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <FilesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/local"
        element={
          <RequireAuth>
            <LocalDrawingsPage />
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
            <Suspense fallback={<CreatingFallback />}>
              <NewFileRedirect />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/edit/:fileId"
        element={
          <RequireAuth>
            <Suspense fallback={<OpeningFallback />}>
              <EditorPage />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/docs/import"
        element={
          <Suspense fallback={<PageFallback />}>
            <ImportDocsPage />
          </Suspense>
        }
      />
      <Route
        path="/privacy"
        element={
          <Suspense fallback={<PageFallback />}>
            <PrivacyPage />
          </Suspense>
        }
      />
      <Route
        path="/terms"
        element={
          <Suspense fallback={<PageFallback />}>
            <TermsPage />
          </Suspense>
        }
      />
      <Route
        path="/apoie"
        element={
          <Suspense fallback={<PageFallback />}>
            <SupportPage />
          </Suspense>
        }
      />
      <Route
        path="/rabisco-kids"
        element={
          <Suspense fallback={<PageFallback />}>
            <KidsAppPage />
          </Suspense>
        }
      />
      <Route
        path="/rabisco-kids/privacy"
        element={
          <Suspense fallback={<PageFallback />}>
            <KidsPrivacyPage />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </WhatsNewProvider>
    </LocalModeGate>
  )
}
