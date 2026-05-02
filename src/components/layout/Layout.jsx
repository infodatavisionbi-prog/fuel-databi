import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useAuth }  from '../../context/AuthContext.jsx'
import { useLang }  from '../../context/LanguageContext.jsx'
import { supabase } from '../../lib/supabase.js'
import Topbar              from './Topbar.jsx'
import Sidebar             from './Sidebar.jsx'
import UserDashboards      from '../../pages/UserDashboards.jsx'
import AdminUsers          from '../../pages/AdminUsers.jsx'
import AdminDashboards     from '../../pages/AdminDashboards.jsx'
import AdminCompanies      from '../../pages/AdminCompanies.jsx'
import AdminCompanyDetail  from '../../pages/AdminCompanyDetail.jsx'
import PowerBIEmbed        from '../PowerBIEmbed.jsx'

const OWNER_TAB_MAP = {
  empresa:  'users',
  grupos:   'groups',
  stats:    'stats',
  facturas: 'invoices',
}

export default function Layout() {
  const { session, isAdmin, isCompanyOwner, isCompanyPaused, profile } = useAuth()
  const { t } = useLang()

  // User dashboards
  const [dashboards, setDashboards]          = useState([])
  const [activeDashboardId, setActiveDashId] = useState(null)

  // Admin view
  const [adminView, setAdminView]             = useState('users')
  const [selectedCompany, setSelectedCompany] = useState(null)

  // Owner view
  const [ownerView, setOwnerView]         = useState('empresa')
  const [ownerCompany, setOwnerCompany]   = useState(null)
  const [ownerDashboards, setOwnerDashboards] = useState([])

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const contentRef = useRef(null)

  // Load dashboards for regular users
  useEffect(() => {
    if (!session || isAdmin || isCompanyOwner) return

    const load = async () => {
      const DASH_FIELDS = 'id, name, embed_url, description, report_id, group_id'

      const baseQueries = [
        supabase.from('user_dashboards')
          .select(`dashboard_id, dashboards(${DASH_FIELDS})`)
          .eq('user_id', session.user.id)
          .order('assigned_at', { ascending: true }),
        supabase.from('group_members')
          .select('group_id')
          .eq('user_id', session.user.id),
      ]

      if (profile?.company_id) {
        baseQueries.push(
          supabase.from('company_dashboards')
            .select(`dashboard_id, dashboards(${DASH_FIELDS})`)
            .eq('company_id', profile.company_id)
        )
      }

      const results = await Promise.all(baseQueries)
      const seen = new Set()
      const boards = []
      const addBoard = (d) => { if (d && !seen.has(d.id)) { seen.add(d.id); boards.push(d) } }

      ;(results[0].data || []).forEach(row => addBoard(row.dashboards))

      const groupIds = (results[1].data || []).map(r => r.group_id)
      if (groupIds.length > 0) {
        const { data: gdRows } = await supabase
          .from('group_dashboards')
          .select(`dashboard_id, dashboards(${DASH_FIELDS})`)
          .in('group_id', groupIds)
        ;(gdRows || []).forEach(row => addBoard(row.dashboards))
      }

      if (results[2]) {
        ;(results[2].data || []).forEach(row => addBoard(row.dashboards))
      }

      setDashboards(boards)
      if (boards.length > 0 && !activeDashboardId) setActiveDashId(boards[0].id)
    }

    load()
  }, [session, isAdmin, isCompanyOwner, profile?.company_id])

  // Load company + dashboards for owner
  useEffect(() => {
    if (!session || !isCompanyOwner || !profile?.company_id) return

    const load = async () => {
      const DASH_FIELDS = 'id, name, embed_url, description, report_id, group_id'
      const [companyRes, boardsRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', profile.company_id).single(),
        supabase.from('company_dashboards')
          .select(`dashboard_id, dashboards(${DASH_FIELDS})`)
          .eq('company_id', profile.company_id),
      ])
      setOwnerCompany(companyRes.data || null)
      setOwnerDashboards((boardsRes.data || []).map(r => r.dashboards).filter(Boolean))
    }

    load()
  }, [session, isCompanyOwner, profile?.company_id])

  // Session tracking heartbeat
  useEffect(() => {
    if (!session) return

    if (!sessionStorage.getItem('fuel.sess')) {
      supabase.from('user_sessions')
        .insert({ user_id: session.user.id })
        .select('id')
        .single()
        .then(({ data }) => { if (data) sessionStorage.setItem('fuel.sess', data.id) })
    }

    const interval = setInterval(() => {
      const sid = sessionStorage.getItem('fuel.sess')
      if (sid) {
        supabase.from('user_sessions')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', sid)
          .then(() => {})
      }
    }, 120000)

    return () => clearInterval(interval)
  }, [session])

  const animate = () => gsap.fromTo(contentRef.current,
    { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' })

  const handleDashboardSelect = (id) => {
    if (id === activeDashboardId) return
    animate()
    setActiveDashId(id)
  }

  const handleAdminViewSelect = (view) => {
    if (view === adminView) return
    animate()
    setAdminView(view)
    setSelectedCompany(null)
    setSidebarOpen(false)
  }

  const handleSelectCompany = (company) => {
    animate()
    setSelectedCompany(company)
  }

  const handleBackFromCompany = () => {
    animate()
    setSelectedCompany(null)
  }

  const handleOwnerSelect = (view) => {
    if (view === ownerView) return
    animate()
    setOwnerView(view)
    setSidebarOpen(false)
  }

  const getTitle = () => {
    if (isAdmin) {
      if (adminView === 'users')      return t('admin.users.title')
      if (adminView === 'dashboards') return t('admin.boards.title')
      if (adminView === 'companies')  return selectedCompany ? selectedCompany.name : 'Empresas'
    }
    if (isCompanyOwner) {
      if (ownerView === 'empresa')  return 'Empresa'
      if (ownerView === 'grupos')   return 'Grupos'
      if (ownerView === 'stats')    return 'Estadísticas'
      if (ownerView === 'facturas') return 'Facturas'
      const dash = ownerDashboards.find(d => d.id === ownerView)
      return dash?.name || ''
    }
    const active = dashboards.find(d => d.id === activeDashboardId)
    return active?.name || t('nav.dashboards')
  }

  // ── PAUSED ────────────────────────────────────────────────
  if (isCompanyPaused) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }}>
        <Topbar title="" onMenuToggle={() => {}} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            textAlign: 'center', maxWidth: 480, padding: '52px 44px',
            background: 'var(--bg-card)', borderRadius: 18,
            border: '1px solid var(--border)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.18)',
          }}>
            <img src="/logo.png" alt="DataVision"
              style={{ height: 52, objectFit: 'contain', display: 'block', margin: '0 auto 32px' }} />
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--danger-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 26,
            }}>🔒</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              Acceso suspendido
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Su FEE mensual está pendiente de pago.<br />
              Contactar al administrador.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── OWNER content ─────────────────────────────────────────
  const ownerContent = () => {
    if (!ownerCompany) return <div className="table-loading"><div className="spinner" /></div>

    if (OWNER_TAB_MAP[ownerView]) {
      return (
        <AdminCompanyDetail
          key={ownerView}
          company={ownerCompany}
          initialTab={OWNER_TAB_MAP[ownerView]}
        />
      )
    }

    const dashboard = ownerDashboards.find(d => d.id === ownerView)
    if (dashboard) {
      return (
        <section className="dashboard-view">
          <div className="powerbi-shell">
            <PowerBIEmbed key={dashboard.id} dashboard={dashboard} style={{ height: '100%' }} />
          </div>
        </section>
      )
    }

    return null
  }

  return (
    <div className="app-shell">
      <Sidebar
        dashboards={dashboards}
        activeDashboardId={activeDashboardId}
        onDashboardSelect={(id) => { handleDashboardSelect(id); setSidebarOpen(false) }}
        adminView={adminView}
        onAdminViewSelect={handleAdminViewSelect}
        ownerView={ownerView}
        ownerDashboards={ownerDashboards}
        onOwnerSelect={handleOwnerSelect}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-area">
        <Topbar title={getTitle()} onMenuToggle={() => setSidebarOpen(o => !o)} />

        <main ref={contentRef} className="page-content">
          {isAdmin ? (
            adminView === 'users'      ? <AdminUsers /> :
            adminView === 'dashboards' ? <AdminDashboards /> :
            adminView === 'companies'  ? (
              selectedCompany
                ? <AdminCompanyDetail company={selectedCompany} onBack={handleBackFromCompany} />
                : <AdminCompanies onSelect={handleSelectCompany} />
            ) : null
          ) : isCompanyOwner ? (
            ownerContent()
          ) : (
            <UserDashboards
              dashboards={dashboards}
              activeDashboardId={activeDashboardId}
              onDashboardsChange={setDashboards}
            />
          )}
        </main>
      </div>
    </div>
  )
}
