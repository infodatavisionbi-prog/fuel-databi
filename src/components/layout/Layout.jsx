import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useAuth }  from '../../context/AuthContext.jsx'
import { useLang }  from '../../context/LanguageContext.jsx'
import { supabase } from '../../lib/supabase.js'
import Topbar   from './Topbar.jsx'
import Sidebar  from './Sidebar.jsx'
import UserDashboards  from '../../pages/UserDashboards.jsx'
import AdminUsers      from '../../pages/AdminUsers.jsx'
import AdminDashboards from '../../pages/AdminDashboards.jsx'

export default function Layout() {
  const { session, isAdmin, profile } = useAuth()
  const { t } = useLang()

  // User dashboards
  const [dashboards, setDashboards]         = useState([])
  const [activeDashboardId, setActiveDashId] = useState(null)

  // Admin view
  const [adminView, setAdminView]           = useState('users')

  const contentRef = useRef(null)

  // Load dashboards for regular users
  useEffect(() => {
    if (!session || isAdmin) return

    const load = async () => {
      const { data } = await supabase
        .from('user_dashboards')
        .select('dashboard_id, dashboards(id, name, embed_url, description)')
        .eq('user_id', session.user.id)
        .order('assigned_at', { ascending: true })

      if (data) {
        const boards = data.map(row => row.dashboards).filter(Boolean)
        setDashboards(boards)
        if (boards.length > 0 && !activeDashboardId) {
          setActiveDashId(boards[0].id)
        }
      }
    }

    load()
  }, [session, isAdmin])

  const handleDashboardSelect = (id) => {
    if (id === activeDashboardId) return
    gsap.fromTo(contentRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
    )
    setActiveDashId(id)
  }

  const handleAdminViewSelect = (view) => {
    if (view === adminView) return
    gsap.fromTo(contentRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
    )
    setAdminView(view)
  }

  // Page title
  const getTitle = () => {
    if (isAdmin) {
      return adminView === 'users' ? t('admin.users.title') : t('admin.boards.title')
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
            adminView === 'users'
              ? <AdminUsers />
              : <AdminDashboards />
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
