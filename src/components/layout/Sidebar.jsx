import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Building2, LayoutDashboard, Users, Table2, AlertCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useLang } from '../../context/LanguageContext.jsx'

// ── USER SIDEBAR ────────────────────────────────────────────
function UserSidebar({ dashboards, activeDashboardId, onSelect }) {
  const { t } = useLang()
  const navRef = useRef(null)

  useEffect(() => {
    if (navRef.current) {
      gsap.fromTo(
        navRef.current.querySelectorAll('.nav-item'),
        { x: -12, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, stagger: 0.06, ease: 'power2.out' }
      )
    }
  }, [dashboards])

  return (
    <>
      <div className="nav-section">{t('nav.section_bi')}</div>
      <nav ref={navRef} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {dashboards.length === 0 ? (
          <div style={{
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-muted)',
            fontSize: 12,
          }}>
            <AlertCircle size={14} />
            {t('nav.no_boards')}
          </div>
        ) : (
          dashboards.map((db, i) => (
            <button
              key={db.id}
              className={`nav-item ${activeDashboardId === db.id ? 'active' : ''}`}
              onClick={() => onSelect(db.id)}
            >
              <LayoutDashboard size={15} />
              <span className="nav-item-label">{db.name}</span>
              {activeDashboardId === db.id && (
                <span style={{
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  flexShrink: 0,
                }} />
              )}
            </button>
          ))
        )}
      </nav>
    </>
  )
}

// ── ADMIN SIDEBAR ────────────────────────────────────────────
function AdminSidebar({ activeView, onSelect }) {
  const { t } = useLang()

  const items = [
    { id: 'users',      label: t('nav.users'),     icon: Users },
    { id: 'dashboards', label: t('nav.boards'),    icon: Table2 },
    { id: 'companies',  label: t('nav.companies'), icon: Building2 },
  ]

  return (
    <>
      <div className="nav-section">{t('nav.section_admin')}</div>
      {items.map(item => (
        <button
          key={item.id}
          className={`nav-item ${activeView === item.id ? 'active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          <item.icon size={15} />
          <span className="nav-item-label">{item.label}</span>
        </button>
      ))}
    </>
  )
}

// ── SIDEBAR WRAPPER ──────────────────────────────────────────
export default function Sidebar({ dashboards, activeDashboardId, onDashboardSelect, adminView, onAdminViewSelect }) {
  const { isAdmin, profile } = useAuth()
  const sidebarRef = useRef(null)

  useEffect(() => {
    gsap.fromTo(
      sidebarRef.current,
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
    )
  }, [])

  return (
    <aside ref={sidebarRef} className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="DataVision" className="sidebar-logo-img" />
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {isAdmin ? (
          <AdminSidebar activeView={adminView} onSelect={onAdminViewSelect} />
        ) : (
          <UserSidebar
            dashboards={dashboards}
            activeDashboardId={activeDashboardId}
            onSelect={onDashboardSelect}
          />
        )}
      </div>

      {/* Footer: company badge */}
      {profile?.company_name && (
        <div className="sidebar-footer">
          <div style={{
            padding: '8px 10px',
            background: 'var(--accent-dim)',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {profile.company_name}
          </div>
        </div>
      )}
    </aside>
  )
}
