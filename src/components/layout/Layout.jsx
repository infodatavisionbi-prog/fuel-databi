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
import OwnerGroups         from '../../pages/OwnerGroups.jsx'

export default function Layout() {
  const { session, isAdmin, isCompanyOwner, isCompanyPaused, profile } = useAuth()
  const { t } = useLang()

  // User dashboards
  const [dashboards, setDashboards]           = useState([])
  const [activeDashboardId, setActiveDashId]  = useState(null)

  // Admin view
  const [adminView, setAdminView]             = useState('users')
  const [selectedCompany, setSelectedCompany] = useState(null)

  // Mobile sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const contentRef = useRef(null)

  // Load dashboards for regular users (user_dashboards + company_dashboards + group_dashboards)
  useEffect(() => {
    if (!session || isAdmin || isCompanyOwner) return

    const load = async () => {
      const DASH_FIELDS = 'id, name, embed_url, description, report_id, group_id'

      const baseQueries = [
        supabase
          .from('user_dashboards')
          .select(`dashboard_id, dashboards(${DASH_FIELDS})`)
          .eq('user_id', session.user.id)
          .order('assigned_at', { ascending: true }),
        supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', session.user.id),
      ]

      if (profile?.company_id) {
        baseQueries.push(
          supabase
            .from('company_dashboards')
            .select(`dashboard_id, dashboards(${DASH_FIELDS})`)
            .eq('company_id', profile.company_id)
        )
      }

      const results = await Promise.all(baseQueries)
      const seen = new Set()
      const boards = []

      const addBoard = (d) => { if (d && !seen.has(d.id)) { seen.add(d.id); boards.push(d) } }

      // user_dashboards
      ;(results[0].data || []).forEach(row => addBoard(row.dashboards))

      // group_dashboards — separate query to avoid group_id ambiguity
      const groupIds = (results[1].data || []).map(r => r.group_id)
      if (groupIds.length > 0) {
        const { data: gdRows } = await supabase
          .from('group_dashboards')
          .select(`dashboard_id, dashboards(${DASH_FIELDS})`)
          .in('group_id', groupIds)
        ;(gdRows || []).forEach(row => addBoard(row.dashboards))
      }

      // company_dashboards
      if (results[2]) {
        ;(results[2].data || []).forEach(row => addBoard(row.dashboards))
      }

      setDashboards(boards)
      if (boards.length > 0 && !activeDashboardId) setActiveDashId(boards[0].id)
    }

    load()
  }, [session, isAdmin, isCompanyOwner, profile?.company_id])

  // Session tracking heartbeat
  useEffect(() => {
    if (!session) return

    // Create session record if none in this tab
    if (!sessionStorage.getItem('fuel.sess')) {
      supabase.from('user_sessions')
        .insert({ user_id: session.user.id })
        .select('id')
        .single()
        .then(({ data }) => { if (data) sessionStorage.setItem('fuel.sess', data.id) })
    }

    // Ping every 2 minutes to keep last_active_at current
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

  // Page title
  const getTitle = () => {
    if (isAdmin) {
      if (adminView === 'users')      return t('admin.users.title')
      if (adminView === 'dashboards') return t('admin.boards.title')
      if (adminView === 'companies')  return selectedCompany ? selectedCompany.name : 'Empresas'
    }
    if (isCompanyOwner) return 'Grupos'
    const active = dashboards.find(d => d.id === activeDashboardId)
    return active?.name || t('nav.dashboards')
  }

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
            <img
              src="/logo.png"
              alt="DataVision"
              style={{ height: 52, objectFit: 'contain', display: 'block', margin: '0 auto 32px' }}
            />
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--danger-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 26,
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

  return (
    <div className="app-shell">
      <Sidebar
        dashboards={dashboards}
        activeDashboardId={activeDashboardId}
        onDashboardSelect={(id) => { handleDashboardSelect(id); setSidebarOpen(false) }}
        adminView={adminView}
        onAdminViewSelect={handleAdminViewSelect}
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
            <OwnerGroups />
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
