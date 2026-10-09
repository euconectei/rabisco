import { Excalidraw, MainMenu } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { useNavigate } from 'react-router-dom'
import { LANGUAGES } from '../i18n/languages'
import { useI18n } from '../i18n/useI18n'

export default function EditorPage() {
  const { lang, t, setLang } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="editor">
      <Excalidraw langCode={lang}>
        <MainMenu>
          <MainMenu.Item onSelect={() => navigate('/app')}>{t.editor.backToFiles}</MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.Separator />
          {LANGUAGES.filter((code) => code !== lang).map((code) => (
            <MainMenu.Item key={code} onSelect={() => setLang(code)}>
              {t.language[code]}
            </MainMenu.Item>
          ))}
        </MainMenu>
      </Excalidraw>
    </div>
  )
}
