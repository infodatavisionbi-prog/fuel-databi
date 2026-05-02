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
  const { session, isAdmin, isCompanyOwner, profile } = useAuth()
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
      const queries = [
        supabase
          .from('user_dashboards')
          .select('dashboard_id, dashboards(id, name, embed_url, description)')
          .eq('user_id', session.user.id)
          .order('assigned_at', { ascending: true }),
        supabase
          .from('group_members')
          .select('group_dashboards(dashboard_id, dashboards(id, name, embed_url, description))')
          .eq('user_id', session.user.id),
      ]

      if (profile?.company_id) {
        queries.push(
          supabase
            .from('company_dashboards')
            .select('dashboard_id, dashboards(id, name, embed_url, description)')
            .eq('company_id', profile.company_id)
        )
      }

      const results = await Promise.all(queries)
      const seen = new Set()
      const boards = []

      // user_dashboards
      ;(results[0].data || []).forEach(row => {
        const d = row.dashboards
        if (d && !seen.has(d.id)) { seen.add(d.id); boards.push(d) }
      })
      // group_dashboards (nested)
      ;(results[1].data || []).forEach(row => {
        ;(row.group_dashboards || []).forEach(gd => {
          const d = gd.dashboards
          if (d && !seen.has(d.id)) { seen.add(d.id); boards.push(d) }
        })
      })
      // company_dashboards
      if (results[2]) {
        ;(results[2].data || []).forEach(row => {
          const d = row.dashboards
          if (d && !seen.has(d.id)) { seen.add(d.id); boards.push(d) }
        })
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
