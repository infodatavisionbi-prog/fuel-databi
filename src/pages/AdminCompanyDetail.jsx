import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BarChart2, Crown, Download, Eye, FileText, FolderOpen, LayoutDashboard, Plus, Power, Receipt, ShieldCheck, Trash2, Upload, UserRound, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import PdfViewer from '../components/PdfViewer.jsx'

const STATUS_OPTIONS = [
  { value: 'pendiente',  label: 'Pendiente',   badge: 'badge-warning' },
  { value: 'en_proceso', label: 'En proceso',  badge: 'badge-accent'  },
  { value: 'pagado',     label: 'Pagado',      badge: 'badge-success' },
]

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

  const toggleOwner = async (user) => {
    const newRole = user.company_role === 'owner' ? null : 'owner'
    const { error } = await supabase.from('profiles').update({ company_role: newRole }).eq('id', user.id)
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
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => toggleOwner(u)}
                        title={u.company_role === 'owner' ? 'Quitar owner' : 'Hacer owner'}
                        style={{ color: u.company_role === 'owner' ? 'var(--accent)' : undefined }}
                      >
                        <Crown size={14} />
                      </button>
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

// ── GRUPOS ────────────────────────────────────────────────────────────────────
function GroupsTab({ company }) {
  const [groups, setGroups]           = useState([])
  const [companyUsers, setCompanyUsers] = useState([])
  const [companyBoards, setCompanyBoards] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupMembers, setGroupMembers]   = useState([])
  const [groupBoards, setGroupBoards]     = useState([])
  const [loadingGroup, setLoadingGroup]   = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [newName, setNewName]   = useState('')
  const [creating, setCreating] = useState(false)
  const [userToAdd, setUserToAdd]   = useState('')
  const [boardToAdd, setBoardToAdd] = useState('')

  const load = async () => {
    setLoading(true)
    const [groupsRes, usersRes, boardsRes] = await Promise.all([
      supabase.from('groups').select('*').eq('company_id', company.id).order('name'),
      supabase.from('profiles').select('id, full_name, email').eq('company_id', company.id).order('full_name'),
      supabase.from('company_dashboards').select('dashboard_id, dashboards(id, name)').eq('company_id', company.id),
    ])
    setGroups(groupsRes.data || [])
    setCompanyUsers(usersRes.data || [])
    setCompanyBoards((boardsRes.data || []).map(r => r.dashboards).filter(Boolean))
    setError(groupsRes.error?.message || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [company.id])

  const openGroup = async (group) => {
    setSelectedGroup(group)
    setLoadingGroup(true)
    setUserToAdd('')
    setBoardToAdd('')
    const [membersRes, boardsRes] = await Promise.all([
      supabase.from('group_members').select('user_id, profiles(id, full_name, email)').eq('group_id', group.id),
      supabase.from('group_dashboards').select('dashboard_id, dashboards(id, name)').eq('group_id', group.id),
    ])
    setGroupMembers(membersRes.data || [])
    setGroupBoards(boardsRes.data || [])
    setLoadingGroup(false)
  }

  const createGroup = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const { error } = await supabase.from('groups').insert({ name: newName.trim(), company_id: company.id })
    setCreating(false)
    if (error) { setError(error.message); return }
    setShowNew(false); setNewName(''); load()
  }

  const deleteGroup = async (group, e) => {
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar "${group.name}"?`)) return
    const { error } = await supabase.from('groups').delete().eq('id', group.id)
    if (error) { setError(error.message); return }
    if (selectedGroup?.id === group.id) setSelectedGroup(null)
    load()
  }

  const addMember = async () => {
    if (!userToAdd) return
    const { error } = await supabase.from('group_members').insert({ group_id: selectedGroup.id, user_id: userToAdd })
    if (error) { setError(error.message); return }
    setUserToAdd(''); openGroup(selectedGroup)
  }

  const removeMember = async (userId) => {
    const { error } = await supabase.from('group_members').delete().eq('group_id', selectedGroup.id).eq('user_id', userId)
    if (error) { setError(error.message); return }
    openGroup(selectedGroup)
  }

  const addBoard = async () => {
    if (!boardToAdd) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('group_dashboards').insert({ group_id: selectedGroup.id, dashboard_id: boardToAdd, assigned_by: user?.id })
    if (error) { setError(error.message); return }
    setBoardToAdd(''); openGroup(selectedGroup)
  }

  const removeBoard = async (dashboardId) => {
    const { error } = await supabase.from('group_dashboards').delete().eq('group_id', selectedGroup.id).eq('dashboard_id', dashboardId)
    if (error) { setError(error.message); return }
    openGroup(selectedGroup)
  }

  const membersSet  = useMemo(() => new Set(groupMembers.map(m => m.user_id)), [groupMembers])
  const boardsSet   = useMemo(() => new Set(groupBoards.map(b => b.dashboard_id)), [groupBoards])
  const availUsers  = useMemo(() => companyUsers.filter(u => !membersSet.has(u.id)), [companyUsers, membersSet])
  const availBoards = useMemo(() => companyBoards.filter(b => !boardsSet.has(b.id)), [companyBoards, boardsSet])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setNewName('') }}>
          <Plus size={14} /> Nuevo grupo
        </button>
      </div>

      {error && <div className="form-error visible admin-inline-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selectedGroup ? '1fr 1.2fr' : '1fr', gap: 20, alignItems: 'start' }}>
        <div className="card table-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Grupo</th><th style={{ width: 110 }}></th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="2"><div className="table-loading"><div className="spinner" /></div></td></tr>
                ) : groups.length === 0 ? (
                  <tr><td colSpan="2"><div className="empty-state">Sin grupos todavía</div></td></tr>
                ) : groups.map(g => (
                  <tr key={g.id} style={{ background: selectedGroup?.id === g.id ? 'var(--bg-elevated)' : undefined }}>
                    <td><strong>{g.name}</strong></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openGroup(g)}>Gestionar</button>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={e => deleteGroup(g, e)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedGroup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 14 }}>{selectedGroup.name}</strong>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedGroup(null)}><X size={16} /></button>
            </div>
            {loadingGroup ? <div className="table-loading"><div className="spinner" /></div> : (
              <>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div className="boards-section-header" style={{ marginBottom: 10 }}>
                    <Users size={12} /> Usuarios <span className="boards-section-count">{groupMembers.length}</span>
                  </div>
                  <div className="assign-row" style={{ marginBottom: 10 }}>
                    <select className="form-input" value={userToAdd} onChange={e => setUserToAdd(e.target.value)}>
                      <option value="">Agregar usuario…</option>
                      {availUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={addMember} disabled={!userToAdd}><Plus size={13} /></button>
                  </div>
                  <div className="assigned-list" style={{ gap: 6 }}>
                    {groupMembers.length === 0 ? (
                      <div className="empty-state" style={{ padding: '8px 0', fontSize: 12 }}>Sin usuarios</div>
                    ) : groupMembers.map(m => (
                      <div className="assigned-item" key={m.user_id}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserRound size={13} style={{ color: 'var(--text-muted)' }} />
                          <span>{m.profiles?.full_name || m.profiles?.email}</span>
                        </div>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeMember(m.user_id)}><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div className="boards-section-header" style={{ marginBottom: 10 }}>
                    <LayoutDashboard size={12} /> Tableros <span className="boards-section-count">{groupBoards.length}</span>
                  </div>
                  <div className="assign-row" style={{ marginBottom: 10 }}>
                    <select className="form-input" value={boardToAdd} onChange={e => setBoardToAdd(e.target.value)}>
                      <option value="">Asignar tablero…</option>
                      {availBoards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={addBoard} disabled={!boardToAdd}><Plus size={13} /></button>
                  </div>
                  <div className="assigned-list" style={{ gap: 6 }}>
                    {groupBoards.length === 0 ? (
                      <div className="empty-state" style={{ padding: '8px 0', fontSize: 12 }}>Sin tableros</div>
                    ) : groupBoards.map(b => (
                      <div className="assigned-item" key={b.dashboard_id}>
                        <span>{b.dashboards?.name}</span>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeBoard(b.dashboard_id)}><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showNew && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Nuevo grupo</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowNew(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={newName} placeholder="Ej: Ventas" autoFocus
                  onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createGroup()} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={createGroup} disabled={creating || !newName.trim()}>
                {creating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={14} />}
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── FACTURAS ──────────────────────────────────────────────────────────────────
function InvoicesTab({ company }) {
  const { isAdmin } = useAuth()
  const [invoices, setInvoices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [viewing, setViewing]     = useState(null)
  const fileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('company_invoices')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    setInvoices(data || [])
    setError(error?.message || '')
    setLoading(false)
  }

  useEffect(() => { load() }, [company.id])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const invoiceId = crypto.randomUUID()
      const path = `${company.id}/${invoiceId}.pdf`
      const { error: storageErr } = await supabase.storage.from('invoices').upload(path, file)
      if (storageErr) throw storageErr
      const { data: { user } } = await supabase.auth.getUser()
      const { error: dbErr } = await supabase.from('company_invoices').insert({
        company_id: company.id,
        name: file.name,
        file_path: path,
        file_size: file.size,
        uploaded_by: user?.id,
      })
      if (dbErr) throw dbErr
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const updateStatus = async (inv, status) => {
    const { error } = await supabase.from('company_invoices').update({ status }).eq('id', inv.id)
    if (error) { setError(error.message); return }
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status } : i))
  }

  const deleteInvoice = async (invoice) => {
    if (!window.confirm(`¿Eliminar "${invoice.name}"?`)) return
    await supabase.storage.from('invoices').remove([invoice.file_path])
    await supabase.from('company_invoices').delete().eq('id', invoice.id)
    load()
  }

  return (
    <>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleUpload} />
          <button className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={uploading}>
            {uploading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Upload size={14} />}
            Subir factura PDF
          </button>
        </div>
      )}

      {error && <div className="form-error visible" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Estado</th>
                <th>Tamaño</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5"><div className="table-loading"><div className="spinner" /></div></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="5"><div className="empty-state">No hay facturas subidas todavía</div></td></tr>
              ) : invoices.map(inv => {
                const st = STATUS_OPTIONS.find(s => s.value === inv.status) || STATUS_OPTIONS[0]
                return (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                        <span>{inv.name}</span>
                      </div>
                    </td>
                    <td>
                      {isAdmin ? (
                        <select
                          className={`badge ${st.badge}`}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}
                          value={inv.status}
                          onChange={e => updateStatus(inv, e.target.value)}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${st.badge}`}>{st.label}</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {inv.file_size ? (inv.file_size < 1048576 ? `${(inv.file_size / 1024).toFixed(0)} KB` : `${(inv.file_size / 1048576).toFixed(1)} MB`) : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(inv.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setViewing(inv)}>
                          <Eye size={13} /> Ver
                        </button>
                        {isAdmin && (
                          <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }} onClick={() => deleteInvoice(inv)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <PdfViewer invoice={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}

// ── PRINCIPAL ─────────────────────────────────────────────────────────────────
export default function AdminCompanyDetail({ company, onBack, initialTab = 'users' }) {
  const [tab, setTab] = useState(initialTab)

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBack && (
            <button className="btn btn-ghost btn-icon" onClick={onBack} title="Volver">
              <ArrowLeft size={16} />
            </button>
          )}
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
        <button className={`company-tab ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>
          <FolderOpen size={20} />
          <span>Grupos</span>
        </button>
        <button className={`company-tab ${tab === 'invoices' ? 'active' : ''}`} onClick={() => setTab('invoices')}>
          <Receipt size={20} />
          <span>Facturas</span>
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        {tab === 'users'    && <UsersTab    company={company} />}
        {tab === 'boards'   && <BoardsTab   company={company} />}
        {tab === 'stats'    && <StatsTab    company={company} />}
        {tab === 'groups'   && <GroupsTab   company={company} />}
        {tab === 'invoices' && <InvoicesTab company={company} />}
      </div>
    </>
  )
}
