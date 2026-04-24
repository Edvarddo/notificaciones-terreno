import { useEffect, useRef, useState } from 'react'
import './App.css'

import { MAPA_CODIGOS } from './constants/codigos'
import RegistroForm from './components/RegistroForm'
import RegistroTable from './components/RegistroTable'
import CodigoDialog from './features/CodigoDialog'
import LoteDialog from './features/LoteDialog'
import useQrScanner from './hooks/useQrScanner'
import useNotificaciones from './hooks/useNotificaciones'
import useLoteForm from './hooks/useLoteForm'
import useRegistroForm from './hooks/useRegistroForm'
import { extraerIdDesdeQr } from './utils/qr'

function App() {
  const [dialogoCodigoAbierto, setDialogoCodigoAbierto] = useState(false)
  const [dialogoLoteAbierto, setDialogoLoteAbierto] = useState(false)
  const [dialogoCodigoLoteAbierto, setDialogoCodigoLoteAbierto] = useState(false)

  const inputIdRef = useRef(null)

  const hayModalAbierto = dialogoCodigoAbierto || dialogoLoteAbierto || dialogoCodigoLoteAbierto

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

  const vibrar = (duracion = 200) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(duracion)
    }
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
    elementId: 'qr-reader',
    onError: notificaciones.setErrorMsg,
    onDecoded: async (decodedText) => {
      const idExtraido = extraerIdDesdeQr(decodedText)
      registro.setIdNotificacion(idExtraido)
      vibrar(200)
      notificaciones.setMensaje('QR leído correctamente')
      await qrIndividual.detenerEscaneo()
      enfocarId()
    },
  })

  const qrLote = useQrScanner({
    elementId: 'qr-reader-lote',
    onError: notificaciones.setErrorMsg,
    onDecoded: async (decodedText) => {
      const idExtraido = extraerIdDesdeQr(decodedText)

      const resultado = lote.agregarIdTemporal(idExtraido, (idDuplicado) => {
        notificaciones.setMensaje(`ID repetido omitido: ${idDuplicado}`)
      })

      if (resultado.agregado) {
        vibrar(200)
        notificaciones.setMensaje(`Agregado al lote: ${idExtraido}`)
        setUltimoIdAgregadoLote(idExtraido)

        if (ultimoIdAgregadoLoteTimer.current) {
          clearTimeout(ultimoIdAgregadoLoteTimer.current)
        }

        ultimoIdAgregadoLoteTimer.current = setTimeout(() => {
          setUltimoIdAgregadoLote('')
          ultimoIdAgregadoLoteTimer.current = null
        }, 2200)
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

  const cerrarDialogoLote = async () => {
    await qrLote.detenerEscaneo()
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
          <h1 className="titulo-header">Poder Judicial</h1>
          <p className="subtitulo-header">Registro de notificaciones en terreno</p>
        </div>

        <div className="fecha-box">
          <strong>Fecha de certificacion:</strong> {fechaCertificacion}
        </div>

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
          onEliminarUltimo={notificaciones.eliminarUltimoRegistro}
          onAbrirLote={abrirDialogoLote}
          dialogoLoteAbierto={dialogoLoteAbierto}
        />

        {notificaciones.mensaje ? (
          <div className="mensaje-ok">{notificaciones.mensaje}</div>
        ) : null}

        {notificaciones.errorMsg ? (
          <div className="mensaje-error">{notificaciones.errorMsg}</div>
        ) : null}

        <RegistroTable
          registros={notificaciones.registros}
          onRecargar={notificaciones.cargar}
          onActualizarRegistro={notificaciones.actualizarRegistro}
          onDescargarCsv={descargarCsv}
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
      </div>
    </div>
  )
}

export default App