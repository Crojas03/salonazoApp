import { Rocket, RefreshCw, Github } from 'lucide-react'

export default function App() {
  return (
    <div className="app">
      <div className="card">
        <div className="icon-wrapper">
          <Rocket size={32} />
        </div>

        <div className="status-badge">
          <span className="status-dot" />
          Servidor activo
        </div>

        <h1>La vista previa está funcionando</h1>
        <p className="subtitle">
          El proyecto se compiló correctamente con Vite + React + TypeScript.
          Los iconos de lucide-react también están cargando sin problemas.
        </p>

        <div className="actions">
          <button className="btn btn-primary">
            <RefreshCw size={16} />
            Recargar
          </button>
          <button className="btn btn-secondary">
            <Github size={16} />
            Ver código
          </button>
        </div>
      </div>
    </div>
  )
}
