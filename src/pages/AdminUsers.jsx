import { useEffect, useMemo, useState } from 'react'
import { Eye, LayoutDashboard, Plus, Power, ShieldCheck, UserRound, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useLang } from '../context/LanguageContext.jsx'

function formatDate(value, fallback) {
  if (!value) return fallback
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

const emptyNewUser = { email: '', password: '', full_name: '', company_name: '' }


export default function AdminUsers() {
  const { t } = useLang()
  const [users, setUsers]             = useState([])
  const [boards, setBoards]           = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')

  // Asignaciones
  const [selectedUser, setSelectedUser]     = useState(null)
  const [boardToAssign, setBoardToAssign]   = useState('')

  // Crear usuario
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUser, setNewUser]         = useState(emptyNewUser)
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')

  // Preview tablero
  const [previewUrl, setPreviewUrl]   = useState(null)
  const [previewName, setPreviewName] = useState('')

  const load = async (signal) => {
    setLoading(true)
    setError('')
    try {
      let q1 = supabase.from('profiles').select('*').order('created_at', { ascending: false })
      let q2 = supabase.from('dashboards').select('*').order('name')
      let q3 = supabase.from('user_dashboards').select('user_id, dashboard_id, dashboards(id, name, embed_url)')
      if (signal) { q1 = q1.abortSignal(signal); q2 = q2.abortSignal(signal); q3 = q3.abortSignal(signal) }
      const [usersRes, boardsRes, assignmentsRes] = await Promise.all([q1, q2, q3])
      setUsers(usersRes.data || [])
      setBoards(boardsRes.data || [])
      setAssignments(assignmentsRes.data || [])
    } catch (err) {
      if (!signal?.aborted) setError(err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 10_000)
    load(c.signal)
    return () => { clearTimeout(t); c.abort() }
  }, [])

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
      user_id:      selectedUser.id,
      dashboard_id: boardToAssign,
      assigned_by:  userData.user?.id,
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

  const createUser = async () => {
    setCreateError('')
    const { email, password, full_name, company_name } = newUser
    if (!email.trim())        { setCreateError('El email es obligatorio'); return }
    if (!password || password.length < 6) { setCreateError('La contraseña debe tener al menos 6 caracteres'); return }
    if (!full_name.trim())    { setCreateError('El nombre es obligatorio'); return }
    if (!company_name.trim()) { setCreateError('La empresa es obligatoria'); return }

    setCreating(true)
    try {
      const { error } = await supabase.rpc('admin_create_user', {
        user_email: email.trim(),
        user_password: password,
        user_fullname: full_name.trim(),
        user_company: company_name.trim(),
      })
      if (error) throw error
    } catch (err) {
      setCreateError(err.message || 'Error al crear el usuario')
      return
    } finally {
      setCreating(false)
    }

    setShowNewUser(false)
    setNewUser(emptyNewUser)
    load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-header-title">{t('admin.users.title')}</div>
          <div className="page-header-sub">{t('admin.users.subtitle')}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge badge-accent">{users.filter(u => u.is_active).length} {t('admin.users.active')}</span>
          <button className="btn btn-primary" onClick={() => { setShowNewUser(true); setNewUser(emptyNewUser); setCreateError('') }}>
            <Plus size={15} /> Nuevo usuario
          </button>
        </div>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedUser(user); setError('') }}>
                        <LayoutDashboard size={13} /> {t('admin.users.boards')}
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

      {/* Modal: tableros del usuario */}
      {selectedUser && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-title">{t('admin.user_boards.title')} {selectedUser.full_name || selectedUser.email}</div>
                <div className="page-header-sub">{selectedUser.company_name}</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedUser(null)}><X size={16} /></button>
            </div>

            <div className="modal-body modal-body-stack">
            <div className="assign-row">
              <select className="form-input" value={boardToAssign} onChange={e => setBoardToAssign(e.target.value)}>
                <option value="">{t('admin.user_boards.assign_new')}</option>
                {availableBoards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
              </select>
              <button className="btn btn-primary" onClick={assignBoard}>{t('common.save')}</button>
            </div>

            {error && <div className="form-error visible">{error}</div>}

            <div className="assigned-list">
              {selectedAssignments.length === 0 ? (
                <div className="empty-state">{t('admin.user_boards.no_boards')}</div>
              ) : selectedAssignments.map(item => (
                <div className="assigned-item" key={item.dashboard_id}>
                  <span>{item.dashboards?.name}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setPreviewUrl(item.dashboards?.embed_url); setPreviewName(item.dashboards?.name) }}
                    >
                      <Eye size={13} /> Ver
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeAssignment(item.dashboard_id)}>
                      {t('admin.user_boards.remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: crear usuario */}
      {showNewUser && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Nuevo usuario</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNewUser(false)}><X size={16} /></button>
            </div>

            <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input className="form-input" value={newUser.full_name} placeholder="Juan García"
                onChange={e => setNewUser(u => ({ ...u, full_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              <input className="form-input" value={newUser.company_name} placeholder="Acme S.A."
                onChange={e => setNewUser(u => ({ ...u, company_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={newUser.email} placeholder="juan@empresa.com"
                onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña inicial</label>
              <input className="form-input" type="password" value={newUser.password} placeholder="Mínimo 6 caracteres"
                onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
            </div>

            {createError && <div className="form-error visible">{createError}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewUser(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={createUser} disabled={creating}>
                {creating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />}
                Crear usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview fullscreen */}
      {previewUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'var(--bg-base)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 20px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{previewName}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreviewUrl(null)}>
              <X size={14} /> Cerrar vista previa
            </button>
          </div>
          <iframe
            src={previewUrl}
            title={previewName}
            style={{ flex: 1, border: 'none', display: 'block', width: '100%' }}
            allowFullScreen
          />
        </div>
      )}
    </>
  )
}
