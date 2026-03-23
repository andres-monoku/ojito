import { useOjito } from './context/OjitoContext'
import Header from './components/Header'
import EmptyState from './components/EmptyState'
import ElementCard from './components/ElementCard'
import LayersTree from './components/LayersTree'
import PropsPanel from './components/PropsPanel'
import ChangesBar from './components/ChangesBar'

export default function App() {
  const { element } = useOjito()

  return (
    <>
      <Header />
      <div id="panel-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {!element ? (
          <EmptyState />
        ) : (
          <>
            <section className="panel-section">
              <div className="section-header"><span className="section-label">ELEMENTO</span></div>
              <ElementCard />
            </section>
            <div className="divider" />
            <section className="panel-section">
              <div className="section-header"><span className="section-label">CAPAS</span></div>
              <LayersTree />
            </section>
            <div className="divider" />
            <section className="panel-section">
              <div className="section-header"><span className="section-label">PROPIEDADES</span></div>
              <PropsPanel />
            </section>
          </>
        )}
      </div>
      <ChangesBar />
    </>
  )
}
