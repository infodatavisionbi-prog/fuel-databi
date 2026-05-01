import { useEffect, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useLang } from '../context/LanguageContext.jsx'

const emptyForm = { name: '', embed_url: '', description: '' }

function withTimeout(promise, label = 'Operacion', ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} demoro demasiado. Revisa conexion o permisos de Supabase.`)), ms)
    }),
  ])
}

function extractEmbedUrl(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/src=["']([^"']+)["']/)
  if (match) return match[1].replace(/&amp;/g, '&').trim()
  if (trimmed.startsWith('http')) return trimmed.replace(/&amp;/g, '&')
  return trimmed
}

function isValidPowerBiUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('powerbi.com')
  } catch {
    return false
  }
}

export default function AdminDashboards() {
  const { t } = useLang()
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(emptyForm)
  const [formError, setFormError]   = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('dashboards')
          .select('*, user_dashboards(user_id)')
          .order('created_at', { ascending: false }),
        'Cargar tableros'
      )
      if (error) throw error
      setDashboards(data || [])
    } catch (error) {
      setFormError(error.message || 'Error cargando tableros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing({ id: null })
    setForm(emptyForm)
    setFormError('')
  }

  const openEdit = (board) => {
    setEditing(board)
    setForm({
      name:        board.name || '',
      embed_url:   board.embed_url || '',
      description: board.description || '',
    })
    setFormError('')
  }

  const handleUrlChange = (raw) => {
    setForm(f => ({ ...f, embed_url: extractEmbedUrl(raw) }))
  }

  const save = async () => {
    setFormError('')
    const name     = form.name.trim()
    const embedUrl = form.embed_url.trim()

    if (!name)     { setFormError('El nombre es obligatorio'); return }
    if (!embedUrl) { setFormError('La URL de Power BI es obligatoria'); return }
    if (!isValidPowerBiUrl(embedUrl)) {
      setFormError('Pega una URL válida de Power BI (https://app.powerbi.com/...)')
      return
    }

    setSaving(true)
    const payload = {
      name:        name,
      embed_url:   embedUrl,
      description: form.description.trim() || null,
    }

    try {
      let error
      if (editing.id) {
        ({ error } = await withTimeout(
          supabase.rpc('admin_upsert_dashboard', {
            board_id: editing.id,
            board_name: payload.name,
            board_embed_url: payload.embed_url,
            board_description: payload.description,
          }),
          'Actualizar tablero'
        ))
      } else {
        ({ error } = await withTimeout(
          supabase.rpc('admin_upsert_dashboard', {
            board_id: null,
            board_name: payload.name,
            board_embed_url: payload.embed_url,
            board_description: payload.description,
          }),
          'Crear tablero'
        ))
      }

      if (error) throw error

      setEditing(null)
      setForm(emptyForm)
      load()
    } catch (error) {
      setFormError(error.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm(t('common.confirm_delete'))) return
    try {
      const { error } = await withTimeout(
        supabase.rpc('admin_delete_dashboard', { board_id: id }),
        'Eliminar tablero'
      )
      if (error) throw error
      load()
    } catch (error) {
      setFormError(error.message || 'Error eliminando tablero')
    }
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
                <Edit3 size={13} /> {t('admin.boards.edit')}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(board.id)}>
                <Trash2 size={13} /> {t('admin.boards.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                {editing.id ? t('admin.boards.edit') : t('admin.boards.new')}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>

            <div className="modal-body">
            <div className="form-group">
              <label className="form-label">{t('admin.boards.name')}</label>
              <input
                className="form-input"
                value={form.name}
                placeholder={t('admin.boards.name_placeholder')}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {t('admin.boards.embed_url')}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                  — podés pegar la URL o el código iframe completo
                </span>
              </label>
              <textarea
                className="form-input form-textarea"
                value={form.embed_url}
                placeholder={t('admin.boards.url_hint')}
                onChange={e => handleUrlChange(e.target.value)}
              />
              {isValidPowerBiUrl(form.embed_url) && (
                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
                  ✓ URL detectada correctamente
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t('admin.boards.description')}</label>
              <input
                className="form-input"
                value={form.description}
                placeholder={t('admin.boards.desc_placeholder')}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {formError && (
              <div className="form-error visible">
                {formError}
              </div>
            )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
                {t('admin.boards.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
