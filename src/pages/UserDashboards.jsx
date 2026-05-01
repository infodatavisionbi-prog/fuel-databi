import { Maximize2, RefreshCw, LayoutDashboard } from 'lucide-react'
import { useLang } from '../context/LanguageContext.jsx'

export default function UserDashboards({ dashboards, activeDashboardId }) {
  const { t } = useLang()
  const active = dashboards.find(d => d.id === activeDashboardId)

  if (!active) {
    return (
      <div className="empty-state page-empty">
        <div className="empty-state-icon"><LayoutDashboard size={26} /></div>
        <div className="empty-state-title">{t('dash.empty_title')}</div>
        <div className="empty-state-desc">{t('dash.empty_desc')}</div>
      </div>
    )
  }

  const reloadFrame = () => {
    const frame = document.getElementById('powerbi-frame')
    if (frame) frame.src = frame.src
  }

  const openFullscreen = () => {
    const frame = document.getElementById('powerbi-frame')
    if (frame?.requestFullscreen) frame.requestFullscreen()
    else window.open(active.embed_url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="dashboard-view">
      <div className="page-header">
        <div>
          <div className="page-header-title">{active.name}</div>
          {active.description && <div className="page-header-sub">{active.description}</div>}
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-sm" onClick={reloadFrame} title={t('dash.reload')}>
            <RefreshCw size={14} />
            {t('dash.reload')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openFullscreen} title={t('dash.fullscreen')}>
            <Maximize2 size={14} />
            {t('dash.fullscreen')}
          </button>
        </div>
      </div>

      <div className="powerbi-shell">
        <iframe
          id="powerbi-frame"
          title={active.name}
          src={active.embed_url}
          allowFullScreen
          className="powerbi-frame"
        />
      </div>
    </section>
  )
}
