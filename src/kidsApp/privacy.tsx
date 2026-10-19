import { Contact, External } from '../legal/links'

const PLAY_PRIVACY_URL = 'https://policies.google.com/privacy'

export function KidsPrivacyPtBR() {
  return (
    <>
      <p>
        O Rabisco Kids é um caderno de traçar para crianças pequenas, para celular e tablet Android. Esta política explica,
        em linguagem simples, o que o app guarda e o que ele não faz. Em resumo: <strong>o Rabisco Kids não coleta nenhum
        dado</strong>, não tem propaganda e funciona sem internet.
      </p>

      <h2>1. Quem é o responsável</h2>
      <p>
        O Rabisco Kids é feito por Rafael França, pessoa física, que publica os apps como França Connect Apps. Contato:{' '}
        <Contact />
      </p>

      <h2>2. O que o app não faz</h2>
      <ul>
        <li>Não pede nome, idade, e-mail, foto nem qualquer dado da criança ou do adulto.</li>
        <li>Não tem conta nem login.</li>
        <li>Não mostra propaganda.</li>
        <li>
          Não usa analytics, ferramenta de rastreamento, relatório de erros nem nenhum SDK de terceiros que colete dados.
        </li>
        <li>
          Não acessa a internet: a versão da loja é publicada sem a permissão de internet do Android. Por isso nada do que
          a criança faz no app sai do aparelho.
        </li>
        <li>Não pede acesso a câmera, microfone, localização, contatos, fotos ou arquivos.</li>
      </ul>

      <h2>3. O que fica guardado no aparelho</h2>
      <p>O app guarda só o necessário para funcionar, e tudo fica no próprio aparelho:</p>
      <ul>
        <li>As imagens das miniaturas das páginas, numa pasta de cache que o Android pode apagar quando quiser.</li>
        <li>
          Se um adulto fizer a compra, a informação de que o "Caderno completo" foi comprado, para as páginas continuarem
          liberadas sem internet.
        </li>
      </ul>
      <p>
        Os traços que a criança faz numa página não são guardados: somem quando ela sai da página. Se uma versão futura
        passar a guardar desenhos ou estrelas, eles também vão ficar só no aparelho, e esta política vai ser atualizada
        antes.
      </p>

      <h2>4. Backup do Android</h2>
      <p>
        O Android pode incluir os dados do app no backup automático da conta Google de quem usa o aparelho, como faz com a
        maioria dos apps. É isso que permite manter a compra liberada ao trocar de aparelho. Esse backup é feito pelo
        Android e pelo Google, fica na conta Google do próprio usuário e pode ser desligado nas configurações do aparelho.
        O responsável pelo Rabisco Kids não tem acesso a ele.
      </p>

      <h2>5. Voz</h2>
      <p>
        O app fala o nome das páginas e os elogios usando o mecanismo de voz que já vem no aparelho (a "conversão de texto
        em voz" do Android). O texto falado é sempre um texto fixo do app, nunca algo digitado ou dito pela criança.
      </p>

      <h2>6. Compra</h2>
      <p>
        As 3 primeiras páginas de cada caderno são grátis. As outras são liberadas por uma compra única, feita pela Google
        Play, depois de uma pergunta para adultos. O pagamento acontece todo na Google Play: o Rabisco Kids não vê nem
        guarda dados de cartão, Pix ou conta. O app só recebe da Google Play a confirmação de que a compra foi feita. A
        compra segue a <External href={PLAY_PRIVACY_URL}>Política de Privacidade do Google</External>.
      </p>

      <h2>7. Crianças</h2>
      <p>
        O app foi feito para crianças e segue as regras do programa Famílias da Google Play. Como não coleta dados
        pessoais, não há dados da criança para consultar, corrigir ou apagar. A compra e os links para fora do app ficam
        atrás de uma pergunta para adultos.
      </p>

      <h2>8. Como apagar tudo</h2>
      <p>
        Desinstalar o app, ou limpar os dados dele nas configurações do Android, apaga tudo o que ele guardou no aparelho.
        A compra continua na sua conta Google Play e pode ser recuperada com "Restaurar compra".
      </p>

      <h2>9. Seus direitos</h2>
      <p>
        Você pode falar com o responsável pelo e-mail <Contact /> para tirar dúvidas ou exercer os direitos previstos na
        Lei Geral de Proteção de Dados (LGPD).
      </p>

      <h2>10. Mudanças nesta política</h2>
      <p>
        Se o app mudar o que guarda ou o que faz, esta página é atualizada antes da nova versão, com a data no topo.
      </p>
    </>
  )
}

export function KidsPrivacyEn() {
  return (
    <>
      <p>
        Rabisco Kids is a tracing notebook for young children, for Android phones and tablets. This policy explains, in
        plain language, what the app stores and what it does not do. In short: <strong>Rabisco Kids collects no data</strong>,
        shows no ads, and works without internet.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        Rabisco Kids is made by Rafael França, an individual who publishes apps as França Connect Apps. Contact:{' '}
        <Contact />
      </p>

      <h2>2. What the app does not do</h2>
      <ul>
        <li>It does not ask for a name, age, email, photo, or any data about the child or the adult.</li>
        <li>It has no account and no sign-in.</li>
        <li>It shows no ads.</li>
        <li>It uses no analytics, tracking, crash reporting, or any third-party SDK that collects data.</li>
        <li>
          It does not access the internet: the store version ships without the Android internet permission, so nothing the
          child does in the app leaves the device.
        </li>
        <li>It does not ask for the camera, microphone, location, contacts, photos, or files.</li>
      </ul>

      <h2>3. What is stored on the device</h2>
      <p>The app stores only what it needs to work, and all of it stays on the device:</p>
      <ul>
        <li>The page thumbnail images, in a cache folder that Android may clear at any time.</li>
        <li>
          If an adult makes the purchase, the fact that "Caderno completo" was bought, so the pages stay unlocked offline.
        </li>
      </ul>
      <p>
        The strokes a child draws on a page are not stored: they are gone when the child leaves the page. If a future
        version keeps drawings or stars, they will also stay only on the device, and this policy will be updated first.
      </p>

      <h2>4. Android backup</h2>
      <p>
        Android may include the app data in the automatic backup of the Google account on the device, as it does for most
        apps. That is what keeps the purchase unlocked on a new device. This backup is made by Android and Google, stays in
        the user's own Google account, and can be turned off in the device settings. The maker of Rabisco Kids has no
        access to it.
      </p>

      <h2>5. Voice</h2>
      <p>
        The app says page names and praise with the voice engine that comes with the device (Android text-to-speech). The
        spoken text is always fixed text from the app, never something typed or said by the child.
      </p>

      <h2>6. Purchase</h2>
      <p>
        The first 3 pages of each notebook are free. The others are unlocked by a one-time purchase through Google Play,
        after a question for adults. Payment happens entirely in Google Play: Rabisco Kids never sees or stores card, Pix,
        or account details. The app only receives Google Play's confirmation that the purchase was made. The purchase
        follows the <External href={PLAY_PRIVACY_URL}>Google Privacy Policy</External>.
      </p>

      <h2>7. Children</h2>
      <p>
        The app is made for children and follows the rules of the Google Play Families program. Since it collects no
        personal data, there is no data about the child to review, correct, or delete. The purchase and any links out of
        the app sit behind a question for adults.
      </p>

      <h2>8. How to delete everything</h2>
      <p>
        Uninstalling the app, or clearing its data in Android settings, deletes everything it stored on the device. The
        purchase stays in your Google Play account and can be recovered with "Restaurar compra" (restore purchase).
      </p>

      <h2>9. Your rights</h2>
      <p>
        You can write to <Contact /> with questions or to exercise your rights under Brazil's data protection law (LGPD)
        or the law of your country.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>If the app changes what it stores or does, this page is updated before the new version, with the date at the top.</p>
    </>
  )
}
