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

export default function Layout() {
  const { session, isAdmin, profile } = useAuth()
  const { t } = useLang()

  // User dashboards
  const [dashboards, setDashboards]           = useState([])
  const [activeDashboardId, setActiveDashId]  = useState(null)

  // Admin view
  const [adminView, setAdminView]             = useState('users')
  const [selectedCompany, setSelectedCompany] = useState(null)

  const contentRef = useRef(null)

  // Load dashboards for regular users (user_dashboards + company_dashboards)
  useEffect(() => {
    if (!session || isAdmin) return

    const load = async () => {
      const queries = [
        supabase
          .from('user_dashboards')
          .select('dashboard_id, dashboards(id, name, embed_url, description)')
          .eq('user_id', session.user.id)
          .order('assigned_at', { ascending: true }),
      ]

      // Also load company dashboards if the user has a company
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

      results.forEach(res => {
        ;(res.data || []).forEach(row => {
          const d = row.dashboards
          if (d && !seen.has(d.id)) { seen.add(d.id); boards.push(d) }
        })
      })

      setDashboards(boards)
      if (boards.length > 0 && !activeDashboardId) setActiveDashId(boards[0].id)
    }

    load()
  }, [session, isAdmin, profile?.company_id])

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
    const active = dashboards.find(d => d.id === activeDashboardId)
    return active?.name || t('nav.dashboards')
  }

  return (
    <div className="app-shell">
      <Sidebar
        dashboards={dashboards}
        activeDashboardId={activeDashboardId}
        onDashboardSelect={handleDashboardSelect}
        adminView={adminView}
        onAdminViewSelect={handleAdminViewSelect}
      />

      <div className="main-area">
        <Topbar title={getTitle()} />

        <main ref={contentRef} className="page-content">
          {isAdmin ? (
            adminView === 'users'      ? <AdminUsers /> :
            adminView === 'dashboards' ? <AdminDashboards /> :
            adminView === 'companies'  ? (
              selectedCompany
                ? <AdminCompanyDetail company={selectedCompany} onBack={handleBackFromCompany} />
                : <AdminCompanies onSelect={handleSelectCompany} />
            ) : null
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
