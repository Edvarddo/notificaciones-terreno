export const CODIGOS = [
  {
    grupo: 'Exito o realizacion',
    items: [
      {
        codigo: 'D2',
        descripcion: 'Notificación realizada en domicilio',
      },
      {
        codigo: 'D4',
        descripcion: 'Notificación realizada luego de dos gestiones B7',
      },
      {
        codigo: 'D1',
        descripcion: 'Se deja constancia de notificación en terreno',
      },
      {
        codigo: 'D3',
        descripcion: 'Notificación realizada por vía válida distinta al domicilio',
      },
      {
        codigo: 'E1',
        descripcion: 'Se notifica personalmente en terreno',
      },
    ],
  },
  {
    grupo: 'Busqueda',
    items: [
      {
        codigo: 'B1',
        descripcion: 'No se logra ubicar al requerido en el domicilio',
      },
      {
        codigo: 'B3',
        descripcion: 'Se deja aviso',
      },
      {
        codigo: 'B4',
        descripcion: 'La persona requerida no se encuentra en el domicilio',
      },
      {
        codigo: 'B7',
        descripcion: 'Vive en el domicilio pero no se encuentra',
      },
      {
        codigo: 'B8',
        descripcion: 'Persona se mudó del domicilio',
      },
      {
        codigo: 'B10',
        descripcion: 'No se logró ubicar el domicilio o residente',
      },
    ],
  },
  {
    grupo: 'Problemas de direccion o falta de informacion',
    items: [
      {
        codigo: 'A1',
        descripcion: 'Dirección sin numeración visible',
      },
      {
        codigo: 'A2',
        descripcion: 'No existe la calle o pasaje indicado',
      },
      {
        codigo: 'A3',
        descripcion: 'Dirección incompleta o insuficiente para ubicar',
      },
      {
        codigo: 'A4',
        descripcion: 'Persona se encuentra detenida',
      },
      {
        codigo: 'A5',
        descripcion: 'Persona fallecida según información obtenida',
      },
      {
        codigo: 'B2',
        descripcion: 'Inmueble no habitado',
      },
      {
        codigo: 'B5',
        descripcion: 'No corresponde al requerido',
      },
      {
        codigo: 'B6',
        descripcion: 'No corresponde al requerido y sin mayores antecedentes',
      },
      {
        codigo: 'F4',
        descripcion: 'Luego de dos avisos no se concreta la notificación',
      },
    ],
  },
]

export const CODIGOS_EXITOSOS = new Set(['D1', 'D2', 'D3', 'D4', 'E1'])
export const CODIGOS_BUSQUEDA = new Set(['B1', 'B3', 'B4', 'B7', 'B8', 'B10'])
export const CODIGOS_NEGATIVOS = new Set(['A1', 'A2', 'A3', 'A4', 'A5', 'B2', 'B5', 'B6', 'F4'])

export const MAPA_CODIGOS = CODIGOS.flatMap((grupo) => grupo.items).reduce(
  (acc, item) => {
    acc[item.codigo] = item.descripcion
    return acc
  },
  {}
)