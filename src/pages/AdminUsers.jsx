import { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, Power, ShieldCheck, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useLang } from '../context/LanguageContext.jsx'

function formatDate(value, fallback) {
  if (!value) return fallback
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export default function AdminUsers() {
  const { t } = useLang()
  const [users, setUsers] = useState([])
  const [boards, setBoards] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [boardToAssign, setBoardToAssign] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const [usersRes, boardsRes, assignmentsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('dashboards').select('*').order('name'),
      supabase.from('user_dashboards').select('user_id, dashboard_id, dashboards(id, name)'),
    ])
    setUsers(usersRes.data || [])
    setBoards(boardsRes.data || [])
    setAssignments(assignmentsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selectedAssignments = useMemo(() => {
    if (!selectedUser) return []
    return assignments.filter(a => a.user_id === selectedUser.id)
  }, [assignments, selectedUser])

  const availableBoards = useMemo(() => {
    const assigned = new Set(selectedAssignments.map(a => a.dashboard_id))
    return boards.filter(b => !assigned.has(b.id))
  }, [boards, selectedAssignments])

  const toggleActive = async (user) => {
    setError('')
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    if (error) { setError(error.message); return }
    load()
  }

  const assignBoard = async () => {
    if (!selectedUser || !boardToAssign) return
    setError('')
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('user_dashboards').insert({
      user_id: selectedUser.id,
      dashboard_id: boardToAssign,
      assigned_by: userData.user?.id,
    })
    if (error) { setError(error.message); return }
    setBoardToAssign('')
    load()
  }

  const removeAssignment = async (dashboardId) => {
    setError('')
    const { error } = await supabase
      .from('user_dashboards')
      .delete()
      .eq('user_id', selectedUser.id)
      .eq('dashboard_id', dashboardId)
    if (error) { setError(error.message); return }
    load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-header-title">{t('admin.users.title')}</div>
          <div className="page-header-sub">{t('admin.users.subtitle')}</div>
        </div>
        <span className="badge badge-accent">{users.filter(u => u.is_active).length} {t('admin.users.active')}</span>
      </div>

      <div className="card table-card">
        {error && <div className="form-error visible admin-inline-error">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('admin.users.name')}</th>
                <th>{t('admin.users.company')}</th>
                <th>{t('admin.users.email')}</th>
                <th>{t('admin.users.role')}</th>
                <th>{t('admin.users.status')}</th>
                <th>{t('admin.users.last_seen')}</th>
                <th>{t('admin.users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><div className="table-loading"><div className="spinner" /></div></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state">{t('admin.users.empty')}</div></td></tr>
              ) : users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar"><UserRound size={15} /></div>
                      <strong>{user.full_name || user.email}</strong>
                    </div>
                  </td>
                  <td>{user.company_name || '-'}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'admin' ? 'badge-accent' : 'badge-warning'}`}>
                      {user.role === 'admin' && <ShieldCheck size={12} />}
                      {user.role === 'admin' ? t('admin.users.admin') : t('admin.users.user')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {user.is_active ? t('admin.users.active') : t('admin.users.inactive')}
                    </span>
                  </td>
                  <td>{formatDate(user.last_seen_at, t('admin.users.never'))}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedUser(user)}>
                        <LayoutDashboard size={13} />
                        {t('admin.users.boards')}
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => toggleActive(user)} title={user.is_active ? t('admin.users.deactivate') : t('admin.users.activate')}>
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{t('admin.user_boards.title')} {selectedUser.full_name || selectedUser.email}</div>
                <div className="page-header-sub">{selectedUser.company_name}</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedUser(null)}>x</button>
            </div>
            <div className="assign-row">
              <select className="form-input" value={boardToAssign} onChange={e => setBoardToAssign(e.target.value)}>
                <option value="">{t('admin.user_boards.assign_new')}</option>
                {availableBoards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
              </select>
              <button className="btn btn-primary" onClick={assignBoard}>{t('common.save')}</button>
            </div>
            {error && <div className="form-error visible" style={{ marginTop: 12 }}>{error}</div>}
            <div className="assigned-list">
              {selectedAssignments.length === 0 ? (
                <div className="empty-state">{t('admin.user_boards.no_boards')}</div>
              ) : selectedAssignments.map(item => (
                <div className="assigned-item" key={item.dashboard_id}>
                  <span>{item.dashboards?.name}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => removeAssignment(item.dashboard_id)}>
                    {t('admin.user_boards.remove')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
