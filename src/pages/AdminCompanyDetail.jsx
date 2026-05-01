import { Fragment, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart2, Eye, LayoutDashboard, Plus, Power, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

function fmtDate(v, fallback = '—') {
  if (!v) return fallback
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(v))
}

function fmtDuration(seconds) {
  if (!seconds || seconds < 60) return '<1 min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── USUARIOS ──────────────────────────────────────────────────────────────────
function UsersTab({ company }) {
  const [users, setUsers]         = useState([])
  const [allUsers, setAllUsers]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [userToAdd, setUserToAdd] = useState('')

  const load = async () => {
    setLoading(true)
    const [compRes, allRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('company_id', company.id).order('full_name'),
      supabase.from('profiles').select('id, full_name, email').order('full_name'),
    ])
    setUsers(compRes.data || [])
    setAllUsers(allRes.data || [])
    setError(compRes.error?.message || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [company.id])

  const usersNotIn = useMemo(() => {
    const inComp = new Set(users.map(u => u.id))
    return allUsers.filter(u => !inComp.has(u.id))
  }, [users, allUsers])

  const addUser = async () => {
    if (!userToAdd) return
    const { error } = await supabase
      .from('profiles')
      .update({ company_id: company.id, company_name: company.name })
      .eq('id', userToAdd)
    if (error) { setError(error.message); return }
    setShowAdd(false)
    setUserToAdd('')
    load()
  }

  const removeUser = async (userId) => {
    const { error } = await supabase.from('profiles').update({ company_id: null }).eq('id', userId)
    if (error) { setError(error.message); return }
    load()
  }

  const toggleActive = async (user) => {
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    if (error) { setError(error.message); return }
    load()
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setUserToAdd('') }}>
          <Plus size={14} /> Agregar usuario
        </button>
      </div>

      <div className="card table-card">
        {error && <div className="form-error visible admin-inline-error">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6"><div className="table-loading"><div className="spinner" /></div></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6"><div className="empty-state">No hay usuarios en esta empresa</div></td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar"><UserRound size={14} /></div>
                      <strong>{u.full_name || u.email}</strong>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-accent' : 'badge-warning'}`}>
                      {u.role === 'admin' && <ShieldCheck size={11} />}
                      {u.role === 'admin' ? 'Admin' : 'Usuario'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{fmtDate(u.last_seen_at)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-icon" onClick={() => toggleActive(u)}
                        title={u.is_active ? 'Desactivar' : 'Activar'}>
                        <Power size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => removeUser(u.id)}
                        title="Quitar de empresa" style={{ color: 'var(--danger)' }}>
                        <X size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Agregar usuario a {company.name}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Seleccioná un usuario</label>
              <select className="form-input" value={userToAdd} onChange={e => setUserToAdd(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {usersNotIn.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={addUser} disabled={!userToAdd}>Agregar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── TABLEROS ──────────────────────────────────────────────────────────────────
function BoardsTab({ company }) {
  const [assigned, setAssigned]       = useState([])
  const [allBoards, setAllBoards]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [boardToAdd, setBoardToAdd]   = useState('')
  const [previewUrl, setPreviewUrl]   = useState(null)
  const [previewName, setPreviewName] = useState('')

  const load = async () => {
    setLoading(true)
    const [assignedRes, allRes] = await Promise.all([
      supabase.from('company_dashboards')
        .select('dashboard_id, dashboards(id, name, embed_url)')
        .eq('company_id', company.id),
      supabase.from('dashboards').select('*').order('name'),
    ])
    setAssigned(assignedRes.data || [])
    setAllBoards(allRes.data || [])
    setError(assignedRes.error?.message || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [company.id])

  const available = useMemo(() => {
    const ids = new Set(assigned.map(a => a.dashboard_id))
    return allBoards.filter(b => !ids.has(b.id))
  }, [allBoards, assigned])

  const assignBoard = async () => {
    if (!boardToAdd) return
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('company_dashboards').insert({
      company_id: company.id, dashboard_id: boardToAdd, assigned_by: userData.user?.id,
    })
    if (error) { setError(error.message); return }
    setBoardToAdd('')
    load()
  }

  const removeBoard = async (dashboardId) => {
    const { error } = await supabase.from('company_dashboards')
      .delete().eq('company_id', company.id).eq('dashboard_id', dashboardId)
    if (error) { setError(error.message); return }
    load()
  }

  if (loading) return <div className="table-loading"><div className="spinner" /></div>

  return (
    <>
      <div className="assign-row" style={{ marginBottom: 16 }}>
        <select className="form-input" value={boardToAdd} onChange={e => setBoardToAdd(e.target.value)}>
          <option value="">Asignar tablero…</option>
          {available.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={assignBoard} disabled={!boardToAdd}>Asignar</button>
      </div>

      {error && <div className="form-error visible" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="assigned-list">
        {assigned.length === 0 ? (
          <div className="empty-state">No hay tableros asignados a esta empresa</div>
        ) : assigned.map(item => (
          <div className="assigned-item" key={item.dashboard_id}>
            <span>{item.dashboards?.name}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setPreviewUrl(item.dashboards?.embed_url); setPreviewName(item.dashboards?.name) }}
              >
                <Eye size={13} /> Ver
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => removeBoard(item.dashboard_id)}>
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      {previewUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{previewName}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreviewUrl(null)}>
              <X size={14} /> Cerrar
            </button>
          </div>
          <iframe src={previewUrl} title={previewName} style={{ flex: 1, border: 'none', width: '100%' }} allowFullScreen />
        </div>
      )}
    </>
  )
}

// ── ESTADÍSTICAS ──────────────────────────────────────────────────────────────
function StatsTab({ company }) {
  const [users, setUsers]       = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: compUsers, error: usersErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, last_seen_at')
        .eq('company_id', company.id)
        .order('full_name')

      if (usersErr) { setError(usersErr.message); setLoading(false); return }
      setUsers(compUsers || [])

      if (compUsers && compUsers.length > 0) {
        const { data: sessData, error: sessErr } = await supabase
          .from('user_sessions')
          .select('*')
          .in('user_id', compUsers.map(u => u.id))
          .order('started_at', { ascending: false })

        // 42P01 = tabla no existe aún (correr migración SQL)
        if (sessErr && sessErr.code !== '42P01') setError(sessErr.message)
        else setSessions(sessData || [])
      }
      setLoading(false)
    }
    load()
  }, [company.id])

  const statsByUser = useMemo(() => {
    const map = {}
    users.forEach(u => { map[u.id] = { ...u, sessions: [], totalSeconds: 0 } })
    sessions.forEach(s => {
      if (!map[s.user_id]) return
      const end = new Date(s.ended_at || s.last_active_at)
      const dur = Math.max(0, Math.floor((end - new Date(s.started_at)) / 1000))
      map[s.user_id].sessions.push({ ...s, dur })
      map[s.user_id].totalSeconds += dur
    })
    return Object.values(map)
  }, [users, sessions])

  if (loading) return <div className="table-loading"><div className="spinner" /></div>
  if (error)   return <div className="form-error visible" style={{ marginTop: 8 }}>{error}</div>
  if (users.length === 0) return <div className="empty-state">Esta empresa no tiene usuarios todavía</div>

  const totalSessions = sessions.length
  const activeNow     = sessions.filter(s => !s.ended_at && new Date(s.last_active_at) > new Date(Date.now() - 5 * 60000)).length
  const totalHours    = Math.floor(statsByUser.reduce((a, u) => a + u.totalSeconds, 0) / 3600)

  return (
    <>
      {/* Summary cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-value">{users.length}</div>
          <div className="stat-card-label">Usuarios</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{totalSessions}</div>
          <div className="stat-card-label">Sesiones totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{totalHours}h</div>
          <div className="stat-card-label">Tiempo acumulado</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: activeNow > 0 ? 'var(--success)' : undefined }}>
            {activeNow}
          </div>
          <div className="stat-card-label">Activos ahora</div>
        </div>
      </div>

      {/* Per-user breakdown */}
      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Sesiones</th>
                <th>Tiempo total</th>
                <th>Último acceso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {statsByUser.map(u => (
                <Fragment key={u.id}>
                  <tr
                    style={{ cursor: u.sessions.length > 0 ? 'pointer' : 'default' }}
                    onClick={() => u.sessions.length > 0 && setExpanded(expanded === u.id ? null : u.id)}
                  >
                    <td>
                      <div className="user-cell">
                        <div className="avatar"><UserRound size={14} /></div>
                        <strong>{u.full_name || u.email}</strong>
                      </div>
                    </td>
                    <td><span className="badge badge-accent">{u.sessions.length}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {u.sessions.length > 0 ? fmtDuration(u.totalSeconds) : '—'}
                    </td>
                    <td>{fmtDate(u.last_seen_at)}</td>
                    <td style={{ width: 32, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
                      {u.sessions.length > 0 && (expanded === u.id ? '▲' : '▼')}
                    </td>
                  </tr>
                  {expanded === u.id && u.sessions.map(s => (
                    <tr key={s.id} style={{ background: 'var(--bg-elevated)' }}>
                      <td style={{ paddingLeft: 48, fontSize: 12, color: 'var(--text-muted)' }}>
                        {fmtDate(s.started_at)}
                      </td>
                      <td colSpan="2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {fmtDuration(s.dur)}
                        <span
                          className={`badge ${s.ended_at ? 'badge-success' : 'badge-warning'}`}
                          style={{ marginLeft: 8, fontSize: 10 }}
                        >
                          {s.ended_at ? 'cerrada' : 'activa'}
                        </span>
                      </td>
                      <td colSpan="2" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        hasta {fmtDate(s.ended_at || s.last_active_at)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── PRINCIPAL ─────────────────────────────────────────────────────────────────
export default function AdminCompanyDetail({ company, onBack }) {
  const [tab, setTab] = useState('users')

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-icon" onClick={onBack} title="Volver">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="page-header-title">{company.name}</div>
            <div className="page-header-sub">Gestión de empresa</div>
          </div>
        </div>
      </div>

      <div className="company-tabs">
        <button className={`company-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          <Users size={20} />
          <span>Usuarios</span>
        </button>
        <button className={`company-tab ${tab === 'boards' ? 'active' : ''}`} onClick={() => setTab('boards')}>
          <LayoutDashboard size={20} />
          <span>Tableros</span>
        </button>
        <button className={`company-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          <BarChart2 size={20} />
          <span>Estadísticas</span>
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === 'users'  && <UsersTab  company={company} />}
        {tab === 'boards' && <BoardsTab company={company} />}
        {tab === 'stats'  && <StatsTab  company={company} />}
      </div>
    </>
  )
}
