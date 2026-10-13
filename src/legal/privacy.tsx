import { Contact, External, GOOGLE_API_POLICY_URL, GOOGLE_PERMISSIONS_URL, Repository } from './links'

export function PrivacyPtBR() {
  return (
    <>
      <p>
        O Rabisco é um aplicativo web para desenhar mapas mentais e fluxos. Ele roda no seu navegador e guarda os seus
        arquivos no seu Google Drive. Esta política explica, em linguagem simples, quais dados são acessados, para quê,
        onde ficam e com quem são compartilhados.
      </p>

      <h2>1. Quem é o responsável</h2>
      <p>
        O responsável pelo tratamento dos dados é Rafael França, pessoa física que mantém o Rabisco, um projeto de código
        aberto (licença MIT) em <Repository />.
      </p>
      <p>
        Contato: <Contact />
      </p>

      <h2>2. Como o Rabisco funciona</h2>
      <p>
        O Rabisco é um site estático hospedado no Cloudflare Pages. Ele <strong>não tem servidor próprio</strong>: o seu
        navegador conversa direto com o Google. O Rabisco não guarda cópias dos seus desenhos.
      </p>

      <h2>3. Quais dados acessamos e para quê</h2>
      <p>Quando você entra com a sua conta Google, o Rabisco pede estas permissões:</p>
      <ul>
        <li>
          <code>openid</code>, <code>email</code> e <code>profile</code>: para mostrar qual conta está em uso (nome e
          e-mail).
        </li>
        <li>
          <code>drive.file</code>: para criar e abrir, no seu Google Drive, só os arquivos criados pelo Rabisco ou
          escolhidos por você no seletor do Google. O Rabisco não acessa os outros arquivos do seu Drive.
        </li>
        <li>
          <code>drive.install</code>: para o Rabisco aparecer no menu "Abrir com" do Drive. Essa permissão não dá acesso
          a nenhum arquivo.
        </li>
      </ul>
      <p>
        O <strong>token de acesso</strong> fica só na memória do navegador, durante a sessão. Ele{' '}
        <strong>nunca é gravado</strong> em disco nem enviado a um servidor do Rabisco.
      </p>

      <h2>4. Onde seus dados ficam</h2>
      <ul>
        <li>
          <strong>Seus desenhos</strong> (arquivos <code>.excalidraw</code> e as exportações <code>.png</code>,{' '}
          <code>.svg</code> e <code>.md</code>) ficam <strong>no seu Google Drive</strong>, numa pasta chamada{' '}
          <code>Rabisco</code>.
        </li>
        <li>
          <strong>No seu navegador</strong>, o Rabisco guarda só estes dados locais:
          <ul>
            <li>
              no <code>localStorage</code>:
              <ul>
                <li>
                  <code>rabisco.lang</code>: o idioma;
                </li>
                <li>
                  <code>rabisco.account</code>: nome e e-mail da última conta, para o "Continuar como" (
                  <strong>nunca o token</strong>);
                </li>
                <li>
                  <code>rabisco.folderId</code>: o id da pasta no Drive;
                </li>
                <li>
                  <code>rabisco.whatsNew.lastSeen</code>: a última Novidade que você viu;
                </li>
                <li>
                  <code>rabisco.exportOptions</code>: as últimas opções de exportação de imagem;
                </li>
              </ul>
            </li>
            <li>
              no <code>IndexedDB</code> (<code>rabisco</code> / <code>drafts</code>): um rascunho das alterações ainda
              não salvas no Drive, apagado depois de salvar.
            </li>
          </ul>
        </li>
      </ul>

      <h2>5. Com quem compartilhamos</h2>
      <ul>
        <li>
          <strong>Google:</strong> seus arquivos são salvos no seu Google Drive, com a sua própria conta. O Google trata
          esses dados conforme os termos dele.
        </li>
        <li>
          <strong>Cloudflare:</strong> o site é servido pelo Cloudflare Pages e usa o Cloudflare Web Analytics, que conta
          visitas de forma agregada e <strong>sem cookies</strong>.
        </li>
      </ul>
      <p>
        O Rabisco não vende dados e não envia nenhum dado dos seus desenhos, nem o seu e-mail, a terceiros além do Google.
      </p>

      <h2 id="cookies">6. Cookies e anúncios</h2>
      <p>
        O Rabisco <strong>não mostra anúncios</strong> e não grava cookies próprios: os dados locais da seção 4 ficam no{' '}
        <code>localStorage</code> e no <code>IndexedDB</code>. O login e o seletor de arquivos são serviços do Google,
        que podem usar os cookies deles conforme a política do Google.
      </p>

      <h2>7. Seus direitos (LGPD e GDPR)</h2>
      <p>
        <strong>No Brasil (LGPD):</strong> você pode pedir acesso, correção, eliminação e portabilidade dos seus dados, e
        revogar o consentimento a qualquer momento.
      </p>
      <p>
        <strong>Na Europa (EEE), no Reino Unido e na Suíça (GDPR):</strong> você tem direito de acesso, retificação,
        eliminação, limitação do tratamento, portabilidade e oposição, além de poder revogar o consentimento a qualquer
        momento e reclamar à autoridade de proteção de dados do seu país.
      </p>
      <p>
        Como o Rabisco não guarda seus dados num servidor próprio, quase tudo fica sob o seu controle direto, no seu
        Google Drive e no seu navegador. Para qualquer pedido, escreva para <Contact />.
      </p>

      <h2>8. Como revogar o acesso</h2>
      <p>
        Você pode remover o acesso do Rabisco à sua conta a qualquer momento em{' '}
        <External href={GOOGLE_PERMISSIONS_URL}>{GOOGLE_PERMISSIONS_URL}</External>. Depois disso, o Rabisco não
        consegue mais abrir seus arquivos.
      </p>

      <h2>9. Mudanças nesta política</h2>
      <p>Esta política pode mudar. Quando mudar, a data de "Última atualização" no topo também muda.</p>

      <h2>10. Uso limitado</h2>
      <p>
        O uso das informações recebidas das APIs do Google pelo Rabisco segue a{' '}
        <External href={GOOGLE_API_POLICY_URL}>Política de Dados do Usuário dos Serviços de API do Google</External>,
        incluindo os requisitos de Uso Limitado.
      </p>
    </>
  )
}

export function PrivacyEn() {
  return (
    <>
      <p>
        Rabisco is a web app for drawing mind maps and flowcharts. It runs in your browser and keeps your files in your
        Google Drive. This policy explains, in plain language, what data is accessed, why, where it lives, and who it is
        shared with.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        The data controller is Rafael França, the individual who maintains Rabisco, an open-source project (MIT license)
        at <Repository />.
      </p>
      <p>
        Contact: <Contact />
      </p>

      <h2>2. How Rabisco works</h2>
      <p>
        Rabisco is a static website hosted on Cloudflare Pages. It has <strong>no server of its own</strong>: your browser
        talks directly to Google. Rabisco does not keep copies of your drawings.
      </p>

      <h2>3. What data we access and why</h2>
      <p>When you sign in with your Google account, Rabisco asks for these permissions:</p>
      <ul>
        <li>
          <code>openid</code>, <code>email</code>, and <code>profile</code>: to show which account is in use (name and
          email).
        </li>
        <li>
          <code>drive.file</code>: to create and open, in your Google Drive, only the files Rabisco created or that you
          picked in Google's file picker. Rabisco does not access your other Drive files.
        </li>
        <li>
          <code>drive.install</code>: so Rabisco shows up in Drive's "Open with" menu. This permission gives access to no
          file.
        </li>
      </ul>
      <p>
        The <strong>access token</strong> is kept only in browser memory, during the session. It is{' '}
        <strong>never written</strong> to disk or sent to a Rabisco server.
      </p>

      <h2>4. Where your data lives</h2>
      <ul>
        <li>
          <strong>Your drawings</strong> (<code>.excalidraw</code> files and <code>.png</code>, <code>.svg</code>, and{' '}
          <code>.md</code> exports) live <strong>in your Google Drive</strong>, in a folder called <code>Rabisco</code>.
        </li>
        <li>
          <strong>In your browser</strong>, Rabisco keeps only this local data:
          <ul>
            <li>
              in <code>localStorage</code>:
              <ul>
                <li>
                  <code>rabisco.lang</code>: the language;
                </li>
                <li>
                  <code>rabisco.account</code>: name and email of the last account, for "Continue as" (
                  <strong>never the token</strong>);
                </li>
                <li>
                  <code>rabisco.folderId</code>: the Drive folder id;
                </li>
                <li>
                  <code>rabisco.whatsNew.lastSeen</code>: the latest News item you saw;
                </li>
                <li>
                  <code>rabisco.exportOptions</code>: your last image export options;
                </li>
              </ul>
            </li>
            <li>
              in <code>IndexedDB</code> (<code>rabisco</code> / <code>drafts</code>): a draft of changes not yet saved to
              Drive, deleted after saving.
            </li>
          </ul>
        </li>
      </ul>

      <h2>5. Who we share with</h2>
      <ul>
        <li>
          <strong>Google:</strong> your files are saved to your Google Drive, with your own account. Google handles that
          data under its own terms.
        </li>
        <li>
          <strong>Cloudflare:</strong> the site is served by Cloudflare Pages and uses Cloudflare Web Analytics, which
          counts visits in aggregate and <strong>without cookies</strong>.
        </li>
      </ul>
      <p>
        Rabisco does not sell data and sends no data from your drawings, nor your email, to anyone other than Google.
      </p>

      <h2 id="cookies">6. Cookies and ads</h2>
      <p>
        Rabisco <strong>shows no ads</strong> and sets no cookies of its own: the local data in section 4 lives in{' '}
        <code>localStorage</code> and <code>IndexedDB</code>. Sign-in and the file picker are Google services, which may
        use their own cookies under Google's policy.
      </p>

      <h2>7. Your rights (LGPD and GDPR)</h2>
      <p>
        <strong>In Brazil (LGPD):</strong> you may request access, correction, deletion, and portability of your data, and
        withdraw consent at any time.
      </p>
      <p>
        <strong>In Europe (EEA), the United Kingdom, and Switzerland (GDPR):</strong> you have the right of access,
        rectification, erasure, restriction of processing, portability, and objection, and you may withdraw consent at any
        time and complain to your country's data protection authority.
      </p>
      <p>
        Because Rabisco keeps no data on a server of its own, nearly everything is under your direct control, in your
        Google Drive and your browser. For any request, write to <Contact />.
      </p>

      <h2>8. How to revoke access</h2>
      <p>
        You can remove Rabisco's access to your account at any time at{' '}
        <External href={GOOGLE_PERMISSIONS_URL}>{GOOGLE_PERMISSIONS_URL}</External>. After that, Rabisco can no longer
        open your files.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>This policy may change. When it does, the "Last updated" date at the top changes too.</p>

      <h2>10. Limited Use</h2>
      <p>
        Rabisco's use of information received from Google APIs adheres to the{' '}
        <External href={GOOGLE_API_POLICY_URL}>Google API Services User Data Policy</External>, including the Limited Use
        requirements.
      </p>
    </>
  )
}
