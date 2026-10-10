import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { format } from '../i18n/format'
import { useI18n } from '../i18n/useI18n'

export function AccountMenu() {
  const { t } = useI18n()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  if (!user) return null

  return (
    <div className="account-menu">
      <button
        type="button"
        className="account-button"
        aria-label={format(t.account.label, { name: user.name })}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : <span>{user.name.charAt(0).toUpperCase()}</span>}
      </button>
      {open && (
        <div className="account-popover">
          <p className="account-name">{user.name}</p>
          <p className="account-email">{user.email}</p>
          <button
            type="button"
            className="button-secondary"
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
          >
            {t.auth.signOut}
          </button>
        </div>
      )}
    </div>
  )
}
