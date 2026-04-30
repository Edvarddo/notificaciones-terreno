import { useEffect, useRef, useState } from 'react'
import './App.css'

import { MAPA_CODIGOS } from './constants/codigos'
import RegistroForm from './components/RegistroForm'
import RegistroTable from './components/RegistroTable'
import IconTrash from './components/IconTrash'
import MenuLateral from './components/MenuLateral'
import CodigoDialog from './features/CodigoDialog'
import LoteDialog from './features/LoteDialog'
import useQrScanner from './hooks/useQrScanner'
import useNotificaciones from './hooks/useNotificaciones'
import useLoteForm from './hooks/useLoteForm'
import useRegistroForm from './hooks/useRegistroForm'
import { extraerIdDesdeQr } from './utils/qr'
import ConsultaHistorico from './pages/ConsultaHistorico'
import MonitoreoLive from './pages/MonitoreoLive'

function App() {
  const [dialogoCodigoAbierto, setDialogoCodigoAbierto] = useState(false)
  const [dialogoLoteAbierto, setDialogoLoteAbierto] = useState(false)
  const [dialogoCodigoLoteAbierto, setDialogoCodigoLoteAbierto] = useState(false)
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false)

  const inputIdRef = useRef(null)
  const [mostrarConsulta, setMostrarConsulta] = useState(false)
  const [mostrarMonitoreo, setMostrarMonitoreo] = useState(false)
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

  const irAConsulta = () => {
    setMostrarConsulta(true)
    setMostrarMonitoreo(false)
    setMenuAbierto(false)
  }

  const irAFormulario = () => {
    setMostrarConsulta(false)
    setMostrarMonitoreo(false)
    setMenuAbierto(false)
  }

  const irAMonitoreo = () => {
    setMostrarMonitoreo(true)
    setMostrarConsulta(false)
    setMenuAbierto(false)
  }

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
    onError: notificaciones.setErrorMsg,
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
  })

  const qrLote = useQrScanner({
    qrRegionId: 'qr-reader-lote',
    onError: notificaciones.setErrorMsg,
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

  const toggleQrIndividual = async () => {
    if (qrIndividual.escaneando) {
      await qrIndividual.detenerEscaneo()
    } else {
      await qrIndividual.iniciarEscaneo()
    }
  }

  const toggleTribunal = async () => {
    registro.setMostraTribunal(!registro.mostraTribunal)
  }

  const guardar = async () => {
    const ok = await notificaciones.guardarRegistro({
      idNotificacion: registro.idNotificacion,
      codigo: registro.codigo,
      observacion: registro.observacion,
      comentarios: registro.comentarios,
      esNoUrbana: registro.esNoUrbana,
      rit: registro.rit,
      año: registro.año,
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
      ritLote: lote.ritLote,
      añoLote: lote.añoLote,
      mostraTribunalLote: lote.mostraTribunalLote,
      cantidadTribunalLote: lote.cantidadTribunalLote,
      tribunalesLote: lote.tribunalesLote,
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
    // Filtrar solo registros que NO están rebajados
    const registrosFiltrados = notificaciones.registros.filter((r) => !r.es_rebajada)

    const filas = registrosFiltrados.map((r) => ({
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
      <button
        type="button"
        className="menu-flotante"
        aria-label="Abrir menu"
        aria-expanded={menuAbierto}
        onClick={() => setMenuAbierto((prev) => !prev)}
      >
        ☰
      </button>

      <MenuLateral
        abierto={menuAbierto}
        vistaConsulta={mostrarConsulta}
        onCerrar={() => setMenuAbierto(false)}
        onIrConsulta={irAConsulta}
        onIrFormulario={irAFormulario}
        onIrMonitoreo={irAMonitoreo}
        vistaMonitoreo={mostrarMonitoreo}
      />

      <div className={`contenedor ${mostrarMonitoreo ? 'contenedor-monitoreo' : ''}`}>
        <div className="header-box">
          <div className="header-top">
            <div>
              <h1 className="titulo-header">Poder Judicial</h1>
              <p className="subtitulo-header">Registro de notificaciones en terreno</p>
            </div>
          </div>
        </div>

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
        </div>

        {notificaciones.sincronizandoPendientes || notificaciones.pendientesSync > 0 ? (
          <div className="pendientes-panel pendientes-panel-activo">
            <div className="pendientes-panel-header">
              <div>
                <span className="pendientes-kicker">Pendientes offline</span>
                <h3>Cola de sincronización</h3>
              </div>
              <div className="pendientes-total">{notificaciones.pendientesSync}</div>
            </div>

            {notificaciones.sincronizandoPendientes ? (
              <div className="pendientes-vacio">Sincronizando pendientes ahora mismo...</div>
            ) : (
              <>
                <div className="pendientes-resumen">
                  <span>Registro: {notificaciones.pendientesPorTipo.guardarRegistro}</span>
                  <span>Lote: {notificaciones.pendientesPorTipo.guardarLote}</span>
                </div>

                <div className="pendientes-lista">
                  {notificaciones.pendientesDetalle.map((pendiente) => (
                    <div key={pendiente.id} className={`pendiente-item pendiente-${pendiente.tipo}`}>
                      <div className="pendiente-item-top">
                        <strong>{pendiente.descripcion}</strong>
                        <span>{pendiente.tipo === 'guardarRegistro' ? 'Registro' : 'Lote'}</span>
                      </div>
                      <div className="pendiente-item-meta">
                        {pendiente.fecha ? <span>Fecha: {pendiente.fecha}</span> : null}
                        {pendiente.codigo ? <span>Codigo: {pendiente.codigo}</span> : null}
                        <span>Intentos: {pendiente.attempts}</span>
                      </div>
                      {pendiente.lastError ? (
                        <p className="pendiente-item-error">Ultimo error: {pendiente.lastError}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}

        {mostrarMonitoreo ? (
          <MonitoreoLive fechaCertificacion={fechaCertificacion} />
        ) : mostrarConsulta ? (
          <ConsultaHistorico onVolver={irAFormulario} />
        ) : (
          <>
        <RegistroForm
          inputIdRef={inputIdRef}
          idNotificacion={registro.idNotificacion}
          onIdChange={registro.setIdNotificacion}
          escaneando={qrIndividual.escaneando}
          onToggleEscaneo={toggleQrIndividual}
          onZoomOut={qrIndividual.zoomOut}
          onZoomIn={qrIndividual.zoomIn}
          onResetZoom={qrIndividual.resetZoom}
          zoom={qrIndividual.zoom}
          codigo={registro.codigo}
          onCodigoChange={registro.handleCodigoManualChange}
          onAbrirCodigos={() => setDialogoCodigoAbierto(true)}
          descripcionCodigo={descripcionCodigo}
          codigoLimpioVista={codigoLimpioVista}
          observacion={registro.observacion}
          onObservacionChange={registro.setObservacion}
          comentarios={registro.comentarios}
          onComentariosChange={registro.setComentarios}
          esNoUrbana={registro.esNoUrbana}
          onEsNoUrbanaChange={registro.setEsNoUrbana}
          mostraTribunal={registro.mostraTribunal}
          onMostraTribunal={toggleTribunal}
          rit={registro.rit}
          onRitChange={registro.setRit}
          año={registro.año}
          onAñoChange={registro.setAño}
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
          cargaTotal={notificaciones.estadisticas.cargaTotal}
          puntos={notificaciones.estadisticas.puntos}
          urbanas={notificaciones.estadisticas.urbanas}
          rurales={notificaciones.estadisticas.rurales}
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
          onZoomOut={qrLote.zoomOut}
          onZoomIn={qrLote.zoomIn}
          onResetZoom={qrLote.resetZoom}
          zoom={qrLote.zoom}
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
          mostraTribunalLote={lote.mostraTribunalLote}
          onMostraTribunalLote={() => lote.setMostraTribunalLote((prev) => !prev)}
          tribunalesLote={lote.tribunalesLote}
          onAgregarTribunalLote={lote.agregarTribunalLote}
          onCopiarUltimoTribunalLote={lote.copiarUltimoTribunalLote}
          onQuitarTribunalLote={lote.quitarTribunalLote}
          onActualizarTribunalLote={lote.actualizarTribunalLote}
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