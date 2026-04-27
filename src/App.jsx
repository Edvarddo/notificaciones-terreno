import { useEffect, useRef, useState } from 'react'
import './App.css'

import { MAPA_CODIGOS } from './constants/codigos'
import RegistroForm from './components/RegistroForm'
import RegistroTable from './components/RegistroTable'
import IconTrash from './components/IconTrash'
import CodigoDialog from './features/CodigoDialog'
import LoteDialog from './features/LoteDialog'
import useQrScanner from './hooks/useQrScanner'
import useNotificaciones from './hooks/useNotificaciones'
import useLoteForm from './hooks/useLoteForm'
import useRegistroForm from './hooks/useRegistroForm'
import { extraerIdDesdeQr } from './utils/qr'
import ConsultaHistorico from './pages/ConsultaHistorico'

function App() {
  const [dialogoCodigoAbierto, setDialogoCodigoAbierto] = useState(false)
  const [dialogoLoteAbierto, setDialogoLoteAbierto] = useState(false)
  const [dialogoCodigoLoteAbierto, setDialogoCodigoLoteAbierto] = useState(false)
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false)

  const inputIdRef = useRef(null)
  const [mostrarConsulta, setMostrarConsulta] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)

  const hayModalAbierto =
    dialogoCodigoAbierto ||
    dialogoLoteAbierto ||
    dialogoCodigoLoteAbierto ||
    dialogoEliminarAbierto

  const [fechaCertificacion] = useState(() => {
    const hoy = new Date()
    const y = hoy.getFullYear()
    const m = String(hoy.getMonth() + 1).padStart(2, '0')
    const d = String(hoy.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })

  const registro = useRegistroForm()
  const lote = useLoteForm()

  const codigoLimpioVista = registro.codigo.trim().toUpperCase()
  const descripcionCodigo = MAPA_CODIGOS[codigoLimpioVista] || ''

  const codigoLoteVista = lote.codigoLote.trim().toUpperCase()
  const descripcionCodigoLote = MAPA_CODIGOS[codigoLoteVista] || ''

  const enfocarId = () => {
    setTimeout(() => inputIdRef.current?.focus(), 50)
  }

  const obtenerHoraActual = () => {
    const ahora = new Date()
    const horas = String(ahora.getHours()).padStart(2, '0')
    const minutos = String(ahora.getMinutes()).padStart(2, '0')
    return `${horas}${minutos}`
  }

  const notificaciones = useNotificaciones({
    fechaCertificacion,
    enfocarId,
  })

  const [ultimoIdAgregadoLote, setUltimoIdAgregadoLote] = useState('')
  const ultimoIdAgregadoLoteTimer = useRef(null)

  useEffect(() => {
    notificaciones.cargar()
    enfocarId()
  }, [])

  useEffect(() => {
    const body = document.body
    if (hayModalAbierto) {
      body.classList.add('modal-abierto')
    } else {
      body.classList.remove('modal-abierto')
    }

    return () => {
      body.classList.remove('modal-abierto')
    }
  }, [hayModalAbierto])

  const qrIndividual = useQrScanner({
    qrRegionId: 'qr-reader',
    onDetected: async (decodedText) => {
      const idExtraido = extraerIdDesdeQr(decodedText)

      if (!/^\d{1,8}$/.test(idExtraido)) {
        notificaciones.setErrorMsg('QR inválido: ID no numérica o mayor a 8 dígitos')
        return
      }

      registro.setIdNotificacion(idExtraido)
      notificaciones.setMensaje(`Escaneado ${idExtraido} con éxito`)
      await qrIndividual.detenerEscaneo()
      enfocarId()
    },
    enabled: !hayModalAbierto,
  })

  const qrLote = useQrScanner({
    qrRegionId: 'qr-reader-lote',
    onDetected: async (decodedText) => {
      const idExtraido = extraerIdDesdeQr(decodedText)

      if (!/^\d{1,8}$/.test(idExtraido)) {
        notificaciones.setErrorMsg('QR inválido: ID no numérica o mayor a 8 dígitos')
        return
      }

      const resultado = lote.agregarIdTemporal(idExtraido, (idDuplicado) => {
        notificaciones.setMensaje(`ID repetido omitido: ${idDuplicado}`)
      })

      if (resultado.agregado) {
        notificaciones.setMensaje(`Escaneado ${resultado.id} con éxito`)
        setUltimoIdAgregadoLote(idExtraido)

        if (ultimoIdAgregadoLoteTimer.current) {
          clearTimeout(ultimoIdAgregadoLoteTimer.current)
        }

        ultimoIdAgregadoLoteTimer.current = setTimeout(() => {
          setUltimoIdAgregadoLote('')
          ultimoIdAgregadoLoteTimer.current = null
        }, 2200)
      } else {
        notificaciones.setErrorMsg(`La ID ${resultado.id} ya estaba escaneada`)
      }
    },
    enabled: dialogoLoteAbierto,
  })

  const abrirDialogoLote = () => {
    notificaciones.limpiarMensajes()
    if (!lote.horaLote) {
      lote.setHoraLote(obtenerHoraActual())
    }
    setDialogoLoteAbierto(true)
  }

  const cerrarDialogoLote = () => {
    qrLote.detenerEscaneo().catch(() => {})
    setDialogoLoteAbierto(false)
  }

  const seleccionarCodigo = (codigoElegido) => {
    registro.setCodigo(codigoElegido)
    setDialogoCodigoAbierto(false)
  }

  const seleccionarCodigoLote = (codigoElegido) => {
    lote.setCodigoLote(codigoElegido)
    setDialogoCodigoLoteAbierto(false)
  }

  const guardar = async () => {
    const ok = await notificaciones.guardarRegistro({
      idNotificacion: registro.idNotificacion,
      codigo: registro.codigo,
      observacion: registro.observacion,
      esNoUrbana: registro.esNoUrbana,
    })

    if (ok?.ok) {
      registro.limpiarFormulario()
    }
  }

  const guardarLote = async () => {
    await notificaciones.guardarLoteRegistros({
      idsTemporales: lote.idsTemporales,
      horaLote: lote.horaLote,
      codigoLote: lote.codigoLote,
      observacionLote: lote.observacionLote,
      esNoUrbanaLote: lote.esNoUrbanaLote,
      onSuccess: async () => {
        lote.limpiarLote()
        await cerrarDialogoLote()
      },
    })
  }

  const abrirDialogoEliminarUltimo = () => {
    if (!notificaciones.registros.length) {
      notificaciones.setErrorMsg('No hay registros para eliminar')
      return
    }
    setDialogoEliminarAbierto(true)
  }

  const confirmarEliminarUltimo = async () => {
    await notificaciones.eliminarUltimoRegistro()
    setDialogoEliminarAbierto(false)
  }

  const descargarCsv = () => {
    const filas = notificaciones.registros.map((r) => ({
      id_notificacion: r.id_notificacion ?? '',
      codigo: r.codigo ?? '',
      hora: r.hora ?? '',
      observacion: r.observacion ?? '',
    }))

    const escaparCsv = (valor) => {
      const texto = String(valor ?? '')
      if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
        return `"${texto.replace(/"/g, '""')}"`
      }
      return texto
    }

    const encabezado = ['id_notificacion', 'codigo', 'hora', 'observacion']
    const lineas = [
      encabezado.join(','),
      ...filas.map((fila) =>
        [
          escaparCsv(fila.id_notificacion),
          escaparCsv(fila.codigo),
          escaparCsv(fila.hora),
          escaparCsv(fila.observacion),
        ].join(',')
      ),
    ]

    const contenido = '\uFEFF' + lineas.join('\n')
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `notificaciones_${fechaCertificacion}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="pagina">
      <div className="contenedor">
        <div className="header-box">
          <div className="header-top">
            <div>
              <h1 className="titulo-header">Poder Judicial</h1>
              <p className="subtitulo-header">Registro de notificaciones en terreno</p>
            </div>

            {!mostrarConsulta ? (
              <div className="menu-wrapper">
                <button
                  type="button"
                  className="menu-hamburguesa"
                  aria-label="Abrir menu"
                  aria-expanded={menuAbierto}
                  onClick={() => setMenuAbierto((prev) => !prev)}
                >
                  ☰
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {menuAbierto ? (
          <>
            <div className="menu-backdrop" onClick={() => setMenuAbierto(false)} />
            <aside className="menu-sidebar" aria-label="Menu principal">
              <div className="menu-sidebar-header">
                <span>Menu</span>
                <button
                  type="button"
                  className="menu-cerrar"
                  aria-label="Cerrar menu"
                  onClick={() => setMenuAbierto(false)}
                >
                  ×
                </button>
              </div>

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMostrarConsulta(true)
                  setMenuAbierto(false)
                }}
              >
                Consultar Fechas Anteriores
              </button>
            </aside>
          </>
        ) : null}

        {dialogoEliminarAbierto ? (
          <div className="dialogo-overlay top" onClick={() => setDialogoEliminarAbierto(false)}>
            <div className="dialogo-codigos dialogo-confirmar" onClick={(e) => e.stopPropagation()}>
              <div className="dialogo-header">
                <h3 className="dialogo-titulo">Confirmar eliminacion</h3>
                <button
                  type="button"
                  className="dialogo-cerrar"
                  onClick={() => setDialogoEliminarAbierto(false)}
                >
                  Cerrar
                </button>
              </div>

              <div className="dialogo-contenido">
                <p className="dialogo-texto-eliminar">
                  Vas a eliminar el ultimo registro guardado.
                </p>
                <p className="dialogo-texto-eliminar">
                  <strong>ID:</strong> {notificaciones.registros[0]?.id_notificacion} |{' '}
                  <strong>Codigo:</strong> {notificaciones.registros[0]?.codigo}
                </p>

                <div className="acciones-confirmar-eliminar">
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={() => setDialogoEliminarAbierto(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="boton-peligro"
                    onClick={confirmarEliminarUltimo}
                  >
                    <span className="boton-con-icono">
                      <IconTrash />
                      Si, eliminar
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="fecha-box">
          <strong>Fecha de certificacion:</strong> {fechaCertificacion}
          {notificaciones.sincronizandoPendientes ? (
            <div className="estado-sync estado-sync-en-proceso">Sincronizando pendientes...</div>
          ) : null}
          {notificaciones.pendientesSync > 0 ? (
            <div className="estado-sync estado-sync-pendiente">
              Pendientes offline: {notificaciones.pendientesSync}
            </div>
          ) : null}
        </div>

        {mostrarConsulta ? (
          <ConsultaHistorico onVolver={() => setMostrarConsulta(false)} />
        ) : (
          <>
        <RegistroForm
          inputIdRef={inputIdRef}
          idNotificacion={registro.idNotificacion}
          onIdChange={registro.setIdNotificacion}
          escaneando={qrIndividual.escaneando}
          onToggleEscaneo={
            qrIndividual.escaneando
              ? qrIndividual.detenerEscaneo
              : qrIndividual.iniciarEscaneo
          }
          codigo={registro.codigo}
          onCodigoChange={registro.handleCodigoManualChange}
          onAbrirCodigos={() => setDialogoCodigoAbierto(true)}
          descripcionCodigo={descripcionCodigo}
          codigoLimpioVista={codigoLimpioVista}
          observacion={registro.observacion}
          onObservacionChange={registro.setObservacion}
          esNoUrbana={registro.esNoUrbana}
          onEsNoUrbanaChange={registro.setEsNoUrbana}
          cargando={notificaciones.cargando}
          onGuardar={guardar}
          onEliminarUltimo={abrirDialogoEliminarUltimo}
          onAbrirLote={abrirDialogoLote}
          dialogoLoteAbierto={dialogoLoteAbierto}
        />

        {notificaciones.mensaje ? (
          <div className="mensaje-ok">{notificaciones.mensaje}</div>
        ) : null}

        {notificaciones.errorMsg ? (
          <div className="mensaje-error">{notificaciones.errorMsg}</div>
        ) : null}

        <div className="mensajes-apilables">
          {notificaciones.mensajes.map((msg, index) => (
            <div
              key={msg.id}
              className={`mensaje-apilable mensaje-apilable-${msg.tipo}`}
              style={{ bottom: `${20 + index * 80}px` }}
            >
              {msg.texto}
            </div>
          ))}
        </div>

        <RegistroTable
          registros={notificaciones.registros}
          onRecargar={notificaciones.cargar}
          onActualizarRegistro={notificaciones.actualizarRegistro}
          onDescargarCsv={descargarCsv}
          puntos={notificaciones.estadisticas.puntos}
        />

        <CodigoDialog
          abierto={dialogoCodigoAbierto}
          titulo="Codigos frecuentes"
          valorActual={codigoLimpioVista}
          onClose={() => setDialogoCodigoAbierto(false)}
          onSelect={seleccionarCodigo}
        />

        <CodigoDialog
          abierto={dialogoCodigoLoteAbierto}
          titulo="Codigos frecuentes del lote"
          valorActual={codigoLoteVista}
          onClose={() => setDialogoCodigoLoteAbierto(false)}
          onSelect={seleccionarCodigoLote}
          top
        />

        <LoteDialog
          abierto={dialogoLoteAbierto}
          onClose={cerrarDialogoLote}
          escaneandoLote={qrLote.escaneando}
          onToggleEscaneo={
            qrLote.escaneando
              ? qrLote.detenerEscaneo
              : qrLote.iniciarEscaneo
          }
          guardandoLote={notificaciones.guardandoLote}
          onLimpiarLote={lote.limpiarLote}
          idsTemporales={lote.idsTemporales}
          onQuitarId={lote.quitarIdTemporal}
          horaLote={lote.horaLote}
          onHoraChange={lote.handleHoraLoteChange}
          codigoLote={lote.codigoLote}
          onCodigoChange={lote.handleCodigoLoteManualChange}
          onAbrirCodigos={() => setDialogoCodigoLoteAbierto(true)}
          codigoLoteVista={codigoLoteVista}
          descripcionCodigoLote={descripcionCodigoLote}
          observacionLote={lote.observacionLote}
          onObservacionChange={lote.setObservacionLote}
          esNoUrbanaLote={lote.esNoUrbanaLote}
          onEsNoUrbanaLoteChange={lote.setEsNoUrbanaLote}
          ultimoIdAgregadoLote={ultimoIdAgregadoLote}
          onGuardarLote={guardarLote}
        />
          </>
        )}
      </div>
    </div>
  )
}

export default App