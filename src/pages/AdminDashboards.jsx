import { useEffect, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useLang } from '../context/LanguageContext.jsx'

const emptyForm = { name: '', embed_url: '', description: '' }

export default function AdminDashboards() {
  const { t } = useLang()
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('dashboards')
      .select('*, user_dashboards(user_id)')
      .order('created_at', { ascending: false })
    setDashboards(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing({ id: null })
    setForm(emptyForm)
  }

  const openEdit = (board) => {
    setEditing(board)
    setForm({
      name: board.name || '',
      embed_url: board.embed_url || '',
      description: board.description || '',
    })
  }

  const save = async () => {
    if (!form.name || !form.embed_url) return
    if (editing.id) {
      await supabase.from('dashboards').update(form).eq('id', editing.id)
    } else {
      await supabase.from('dashboards').insert(form)
    }
    setEditing(null)
    setForm(emptyForm)
    load()
  }

  const remove = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return
    await supabase.from('dashboards').delete().eq('id', id)
    load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-header-title">{t('admin.boards.title')}</div>
          <div className="page-header-sub">{t('admin.boards.subtitle')}</div>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={15} />
          {t('admin.boards.new')}
        </button>
      </div>

      <div className="boards-grid">
        {loading ? (
          <div className="card table-loading"><div className="spinner" /></div>
        ) : dashboards.length === 0 ? (
          <div className="empty-state page-empty">{t('admin.boards.empty')}</div>
        ) : dashboards.map(board => (
          <article className="board-card" key={board.id}>
            <div className="board-card-main">
              <div>
                <h3>{board.name}</h3>
                {board.description && <p>{board.description}</p>}
              </div>
              <span className="badge badge-accent">
                {(board.user_dashboards || []).length} {t('admin.boards.assigned')}
              </span>
            </div>
            <div className="board-url">{board.embed_url}</div>
            <div className="row-actions">
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(board)}>
                <Edit3 size={13} />
                {t('admin.boards.edit')}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(board.id)}>
                <Trash2 size={13} />
                {t('admin.boards.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{editing.id ? t('admin.boards.edit') : t('admin.boards.new')}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditing(null)}>x</button>
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.boards.name')}</label>
              <input className="form-input" value={form.name} placeholder={t('admin.boards.name_placeholder')} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.boards.embed_url')}</label>
              <textarea className="form-input form-textarea" value={form.embed_url} placeholder={t('admin.boards.url_hint')} onChange={e => setForm({ ...form, embed_url: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.boards.description')}</label>
              <input className="form-input" value={form.description} placeholder={t('admin.boards.desc_placeholder')} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={save}>{t('admin.boards.save')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
