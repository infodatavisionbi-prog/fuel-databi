import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

export default function PdfViewer({ invoice, onClose }) {
  const [url, setUrl]       = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    supabase.storage
      .from('invoices')
      .createSignedUrl(invoice.file_path, 300)
      .then(({ data, error }) => {
        if (error) { setError(error.message); setLoading(false); return }
        setUrl(data.signedUrl)
        setLoading(false)
      })
  }, [invoice.file_path])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
          {invoice.name}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {url && (
            <a
              href={url}
              download={invoice.name}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <Download size={13} /> Descargar
            </a>
          )}
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, position: 'relative', background: '#525659' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="spinner" />
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14,
          }}>
            Error al cargar el PDF: {error}
          </div>
        )}
        {url && (
          <iframe
            src={url}
            title={invoice.name}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>
    </div>
  )
}
