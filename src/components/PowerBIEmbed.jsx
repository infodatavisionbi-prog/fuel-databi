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
        console.log('[PBI] iniciando embed para', dashboard.report_id)
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[PBI] session:', session ? 'ok' : 'null', session?.access_token ? 'token ok' : 'sin token')
        if (!session?.access_token) throw new Error('Sesión no activa — volvé a iniciar sesión')

        console.log('[PBI] fetching token desde', `${EDGE_FN}/token`)
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
        console.log('[PBI] token response:', res.status, json)
        if (!res.ok) throw new Error(json.error ?? json.message ?? 'Error obteniendo token')
        if (!alive) return

        const isMobile = window.matchMedia('(max-width: 768px)').matches

        const embedConfig = (layoutType) => ({
          type:        'report',
          tokenType:   models.TokenType.Embed,
          accessToken: json.token,
          embedUrl:    `https://app.powerbi.com/reportEmbed?reportId=${dashboard.report_id}&groupId=${dashboard.group_id}`,
          settings: {
            panes: {
              filters:        { visible: false },
              pageNavigation: { visible: !isMobile },
            },
            background: models.BackgroundType.Transparent,
            layoutType,
          },
        })

        const report = pbiService.embed(containerRef.current, embedConfig(
          isMobile ? models.LayoutType.MobilePortrait : models.LayoutType.Master
        ))

        report.on('error', (event) => {
          if (!alive) return
          const msg = event.detail?.message ?? ''
          if (isMobile && (msg === 'mobileLayoutError' || msg.toLowerCase().includes('mobilelayout'))) {
            pbiService.reset(containerRef.current)
            pbiService.embed(containerRef.current, embedConfig(models.LayoutType.Master))
            return
          }
          setError(msg || 'Error al cargar el reporte de Power BI')
          setLoading(false)
        })

        setLoading(false)
      } catch (err) {
        console.error('[PBI] error:', err.message)
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
      {/* Cubre el banner "versión de prueba gratuita" de Power BI Embedded */}
      {!loading && !error && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 44,
          background: 'var(--bg-surface)',
          zIndex: 4,
        }} />
      )}
    </div>
  )
}
