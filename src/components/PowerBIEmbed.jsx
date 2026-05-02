import { useEffect, useRef, useState } from 'react'
import { models, service, factories } from 'powerbi-client'
import { supabase } from '../lib/supabase.js'

const pbiService = new service.Service(
  factories.hpmFactory,
  factories.wpmpFactory,
  factories.routerFactory,
)

const EDGE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/powerbi`

export default function PowerBIEmbed({ dashboard, style }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!dashboard.report_id || !dashboard.group_id) return
    if (!containerRef.current) return

    let alive = true

    const embed = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${EDGE_FN}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            report_id: dashboard.report_id,
            group_id:  dashboard.group_id,
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Error obteniendo token')
        if (!alive) return

        pbiService.embed(containerRef.current, {
          type:        'report',
          tokenType:   models.TokenType.Embed,
          accessToken: json.token,
          embedUrl:    `https://app.powerbi.com/reportEmbed?reportId=${dashboard.report_id}&groupId=${dashboard.group_id}`,
          settings: {
            panes: {
              filters:         { visible: false },
              pageNavigation:  { visible: true },
            },
            background: models.BackgroundType.Transparent,
          },
        })
        setLoading(false)
      } catch (err) {
        if (alive) { setError(err.message); setLoading(false) }
      }
    }

    embed()
    return () => {
      alive = false
      if (containerRef.current) pbiService.reset(containerRef.current)
    }
  }, [dashboard.report_id, dashboard.group_id])

  // Sin IDs configurados: fallback al iframe público
  if (!dashboard.report_id || !dashboard.group_id) {
    return (
      <iframe
        src={dashboard.embed_url}
        title={dashboard.name}
        style={{ flex: 1, border: 'none', width: '100%', ...style }}
        allowFullScreen
      />
    )
  }

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', ...style }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-base)', zIndex: 1,
        }}>
          <div className="spinner" />
        </div>
      )}
      {error && (
        <div className="form-error visible" style={{ margin: 16 }}>{error}</div>
      )}
      <div ref={containerRef} style={{ flex: 1, width: '100%' }} />
    </div>
  )
}
