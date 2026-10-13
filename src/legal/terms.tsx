import { Contact, External, GOOGLE_PERMISSIONS_URL, Repository } from './links'

export function TermsPtBR() {
  return (
    <>
      <p>
        Estes termos valem para o uso do Rabisco (<External href="https://rabisco.euconectei.com.br">https://rabisco.euconectei.com.br</External>
        ). Ao usar o Rabisco, você concorda com eles.
      </p>

      <h2>1. O serviço</h2>
      <p>
        O Rabisco é um editor gratuito de mapas mentais e desenhos. Ele funciona no seu navegador e salva seus arquivos no{' '}
        <strong>seu</strong> Google Drive. O Rabisco não guarda os seus desenhos.
      </p>

      <h2>2. Grátis e "no estado em que se encontra"</h2>
      <p>
        O Rabisco é oferecido de graça e <strong>no estado em que se encontra</strong>, <strong>sem garantias</strong> de
        qualquer tipo, expressas ou implícitas, inclusive de adequação a um fim específico, de disponibilidade ou de
        ausência de erros.
      </p>

      <h2>3. Responsabilidade pelo conteúdo</h2>
      <p>
        Você é o único responsável pelo que cria e guarda com o Rabisco, por ter os direitos sobre esse conteúdo e por
        cumprir a lei ao usá-lo. O Rabisco não responde por perda de dados, indisponibilidade do serviço ou danos
        decorrentes do uso.
      </p>

      <h2>4. Código aberto</h2>
      <p>
        O código do Rabisco é aberto, sob a <strong>licença MIT</strong> (<Repository />). Você pode usá-lo, modificá-lo e
        distribuí-lo conforme essa licença.
      </p>

      <h2>5. Conta e acesso</h2>
      <p>
        Para usar o Rabisco, você entra com uma conta Google. Você pode revogar o acesso a qualquer momento em{' '}
        <External href={GOOGLE_PERMISSIONS_URL}>{GOOGLE_PERMISSIONS_URL}</External>.
      </p>

      <h2>6. Mudanças</h2>
      <p>
        O Rabisco e estes termos podem mudar a qualquer momento. Quando os termos mudarem, a data de "Última atualização"
        no topo também muda.
      </p>

      <h2>7. Contato</h2>
      <p>
        Dúvidas sobre estes termos: <Contact />.
      </p>
    </>
  )
}

export function TermsEn() {
  return (
    <>
      <p>
        These terms apply to your use of Rabisco (<External href="https://rabisco.euconectei.com.br">https://rabisco.euconectei.com.br</External>
        ). By using Rabisco, you agree to them.
      </p>

      <h2>1. The service</h2>
      <p>
        Rabisco is a free editor for mind maps and drawings. It runs in your browser and saves your files to{' '}
        <strong>your own</strong> Google Drive. Rabisco does not store your drawings.
      </p>

      <h2>2. Free and "as is"</h2>
      <p>
        Rabisco is provided free of charge and <strong>"as is"</strong>, <strong>without warranties</strong> of any kind,
        express or implied, including fitness for a particular purpose, availability, or absence of errors.
      </p>

      <h2>3. Responsibility for content</h2>
      <p>
        You alone are responsible for what you create and keep with Rabisco, for having the rights to that content, and
        for complying with the law when using it. Rabisco is not liable for data loss, service unavailability, or damages
        arising from use.
      </p>

      <h2>4. Open source</h2>
      <p>
        Rabisco's code is open source under the <strong>MIT license</strong> (<Repository />). You may use, modify, and
        distribute it under that license.
      </p>

      <h2>5. Account and access</h2>
      <p>
        To use Rabisco, you sign in with a Google account. You can revoke access at any time at{' '}
        <External href={GOOGLE_PERMISSIONS_URL}>{GOOGLE_PERMISSIONS_URL}</External>.
      </p>

      <h2>6. Changes</h2>
      <p>
        Rabisco and these terms may change at any time. When the terms change, the "Last updated" date at the top
        changes too.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about these terms: <Contact />.
      </p>
    </>
  )
}
