import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 24, color: '#fbf3e4', fontFamily: 'system-ui', maxWidth: 560, margin: '0 auto' }}>
        <h2>Bir şey ters gitti</h2>
        <p>Kaydın bozulmadı. Sayfayı yenileyince kaldığın yerden devam edebilirsin.</p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>{this.state.error.message}</pre>
        <button onClick={() => location.reload()} style={{ padding: '10px 18px', fontWeight: 700 }}>
          Yenile
        </button>
      </div>
    )
  }
}
