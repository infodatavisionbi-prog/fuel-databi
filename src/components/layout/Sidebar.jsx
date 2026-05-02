import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { AlertCircle, BarChart2, Building2, FileText, FolderOpen, LayoutDashboard, Receipt, Table2, Users } from 'lucide-react'
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

// ── OWNER SIDEBAR ────────────────────────────────────────────
const OWNER_EMPRESA_ITEMS = [
  { id: 'empresa',  label: 'Empresa',       icon: Building2    },
  { id: 'grupos',   label: 'Grupos',        icon: FolderOpen   },
  { id: 'stats',    label: 'Estadísticas',  icon: BarChart2    },
  { id: 'facturas', label: 'Facturas',      icon: Receipt      },
]

function OwnerSidebar({ dashboards, activeView, onSelect }) {
  return (
    <>
      <div className="nav-section">Mi empresa</div>
      {OWNER_EMPRESA_ITEMS.map(item => (
        <button
          key={item.id}
          className={`nav-item ${activeView === item.id ? 'active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          <item.icon size={15} />
          <span className="nav-item-label">{item.label}</span>
        </button>
      ))}

      {dashboards.length > 0 && (
        <>
          <div className="nav-section">Tableros</div>
          {dashboards.map(d => (
            <button
              key={d.id}
              className={`nav-item ${activeView === d.id ? 'active' : ''}`}
              onClick={() => onSelect(d.id)}
            >
              <LayoutDashboard size={15} />
              <span className="nav-item-label">{d.name}</span>
            </button>
          ))}
        </>
      )}
    </>
  )
}

// ── SIDEBAR WRAPPER ──────────────────────────────────────────
export default function Sidebar({ dashboards, activeDashboardId, onDashboardSelect, adminView, onAdminViewSelect, ownerView, ownerDashboards, onOwnerSelect, isOpen, onClose }) {
  const { isAdmin, isCompanyOwner, profile } = useAuth()
  const sidebarRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) return
    gsap.fromTo(
      sidebarRef.current,
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
    )
  }, [])

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside ref={sidebarRef} className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="DataVision" className="sidebar-logo-img" />
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {isAdmin ? (
          <AdminSidebar activeView={adminView} onSelect={onAdminViewSelect} />
        ) : isCompanyOwner ? (
          <OwnerSidebar
            dashboards={ownerDashboards || []}
            activeView={ownerView}
            onSelect={onOwnerSelect}
          />
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
    </>
  )
}
