import { useState, useEffect } from 'react'
import { Sun, Moon, LogOut, Menu } from 'lucide-react'
import { useAuth }  from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useLang }  from '../../context/LanguageContext.jsx'
import { LANGS }    from '../../i18n/index.js'

function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const pad = n => String(n).padStart(2, '0')
  const h = pad(time.getHours())
  const m = pad(time.getMinutes())
  const s = pad(time.getSeconds())

  const days   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const dateStr = `${days[time.getDay()]} ${time.getDate()} ${months[time.getMonth()]}`

  return (
    <div className="topbar-clock">
      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{dateStr}</span>
      <span style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
        {h}:{m}
        <span style={{ color: 'var(--text-muted)', animation: 'pulse 1s infinite' }}>:{s}</span>
      </span>
    </div>
  )
}

export default function Topbar({ title, onMenuToggle }) {
  const { profile, logout }    = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t }   = useLang()

  return (
    <header className="topbar">
      <button
        className="btn btn-ghost btn-icon"
        onClick={onMenuToggle}
        style={{ display: 'none' }}
        id="sidebar-toggle"
      >
        <Menu size={18} />
      </button>

      <div className="topbar-title">{title}</div>

      <Clock />

      {/* Language switcher */}
      <div className="lang-switcher">
        {LANGS.map(l => (
          <button
            key={l.code}
            className={`lang-btn ${lang === l.code ? 'active' : ''}`}
            onClick={() => setLang(l.code)}
          >
            <img src={l.flag} alt={l.alt} style={{ width: 16, height: 11 }} />
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      {/* User section */}
      <div className="topbar-user">
        {/* Theme toggle */}
        <button className="btn-theme" onClick={toggleTheme} title="Cambiar tema">
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        {/* User name + company */}
        <div style={{ textAlign: 'right' }}>
          <div className="topbar-user-name" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {profile?.full_name || profile?.email}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {profile?.company_name}
          </div>
        </div>

        {/* Logout */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={logout}
          title={t('nav.logout')}
        >
          <LogOut size={13} />
          {t('nav.logout')}
        </button>
      </div>
    </header>
  )
}
