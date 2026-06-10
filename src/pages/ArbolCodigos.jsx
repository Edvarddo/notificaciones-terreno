import { MAPA_CODIGOS } from '../constants/codigos'

const ARBOL_PERSONALES = {
  codigo: 'PERSONAL',
  hijos: [
    {
      codigo: 'B3',
      hijos: [
        {
          codigo: 'B3',
          hijos: [{ codigo: 'F4' }],
        },
        { codigo: 'B5' },
        {
          codigo: 'B7',
          hijos: [{ codigo: 'E1' }],
        },
      ],
    },
    {
      codigo: 'B7',
      hijos: [
        {
          codigo: 'B7',
          hijos: [{ codigo: 'D4' }],
        },
      ],
    },
    { codigo: 'E1' },
    { codigo: 'B5' },
    { codigo: 'A1' },
    { codigo: 'A2' },
    { codigo: 'A3' },
    {
      codigo: 'B10',
      hijos: [
        {
          codigo: 'B10',
          hijos: [{ codigo: 'F4' }],
        },
        {
          codigo: 'B3',
          hijos: [{ codigo: 'F4' }],
        },
        { codigo: 'B5' },
        {
          codigo: 'B7',
          hijos: [{ codigo: 'E1/D4' }],
        },
      ],
    },
  ],
}

function descripcionCodigo(codigo) {
  return String(codigo)
    .split('/')
    .map((item) => MAPA_CODIGOS[item] || item)
    .join(' / ')
}

function NodoArbol({ nodo, nivel = 0 }) {
  const esRaiz = nivel === 0
  const tieneHijos = Array.isArray(nodo.hijos) && nodo.hijos.length > 0

  return (
    <div className={`arbol-nodo-wrap nivel-${nivel}`}>
      <div className={esRaiz ? 'arbol-nodo-raiz' : 'arbol-nodo-card'}>
        <div className="arbol-nodo-chip">{nodo.codigo}</div>

        {!esRaiz ? (
          <div className="arbol-nodo-desc">
            {descripcionCodigo(nodo.codigo)}
          </div>
        ) : null}
      </div>

      {tieneHijos ? (
        <div className="arbol-hijos">
          {nodo.hijos.map((hijo, index) => (
            <NodoArbol
              key={`${hijo.codigo}-${nivel}-${index}`}
              nodo={hijo}
              nivel={nivel + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function ArbolCodigos({ onVolver }) {
  return (
    <div className="arbol-page">
      <div className="arbol-codigos-header">
        <div>
          <span className="arbol-codigos-kicker">Personales</span>
          <h2>Árbol de rutas personales</h2>
          <p>
            Rutas posibles para primera, segunda y tercera gestión.
          </p>
        </div>

        <button type="button" className="boton-secundario" onClick={onVolver}>
          Volver
        </button>
      </div>

      <section className="arbol-panel">
        
        <NodoArbol nodo={ARBOL_PERSONALES} />
      </section>
    </div>
  )
}