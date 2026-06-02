export const CODIGOS = [
  {
    grupo: 'Exito o realizacion',
    items: [
      {
        codigo: 'D2',
        descripcion:
          'Se realiza la gestion dejando la notificacion directamente en domicilio señalado',
      },
      {
        codigo: 'D4',
        descripcion:
          'Luego de realizar dos gestiones B7 se comporta como un D2 en la ultima gestion',
      },
      {
        codigo: 'D1',
        descripcion:
          'Se realiza la gestion y se deja constancia de notificacion en terreno',
      },
      {
        codigo: 'D3',
        descripcion:
          'Se concreta la gestion de notificacion por una via valida distinta al domicilio',
      },
      {
        codigo: 'E1',
        descripcion: 'Se entrega personalmente en terreno la notificacion',
      },
    ],
  },
  {
    grupo: 'Busqueda',
    items: [
      {
        codigo: 'B1',
        descripcion:
          'Se busca en el domicilio y no se logra ubicar al requerido',
      },
      {
        codigo: 'B3',
        descripcion:
          'No contestan o abren la puerta en el domicilio (se debe dejar aviso)',
      },
      {
        codigo: 'B4',
        descripcion:
          'Se busca en el domicilio y la persona requerida no se encuentra',
      },
      {
        codigo: 'B7',
        descripcion:
          'La persona requerida vive en el lugar pero no se encuentra por estar trabajando o haciendo otra cosa fuera de casa',
      },
      {
        codigo: 'B8',
        descripcion:
          'Se realiza busqueda en el domicilio con resultado sin notificacion efectiva',
      },
      {
        codigo: 'B10',
        descripcion: 'Lugares de acceso cerrado',
      },
      {
        codigo: 'B10p',
        descripcion: 'Lugares de acceso cerrado o con porteria restringida',
      },
    ],
  },
  {
    grupo: 'Problemas de direccion o falta de informacion',
    items: [
      {
        codigo: 'A1',
        descripcion:
          'La direccion se constato en terreno de que no existe la numeracion o algo similar',
      },
      {
        codigo: 'A2',
        descripcion:
          'No existe la direccion en la comuna donde se realizan las gestiones',
      },
      {
        codigo: 'A3',
        descripcion:
          'Hace falta informacion como manzana, numeracion, numero de departamento, block, nombre de calle',
      },
      {
        codigo: 'A4',
        descripcion:
          'La direccion consignada presenta inconsistencias que impiden continuar la gestion',
      },
      {
        codigo: 'A5',
        descripcion:
          'No es posible determinar con certeza la ubicacion correcta para la notificacion',
      },
      {
        codigo: 'B2',
        descripcion: 'Domicilio deshabitado',
      },
      {
        codigo: 'B5',
        descripcion:
          'Persona adulta nos indica que el requerido no vive en el domicilio',
      },
      {
        codigo: 'B6',
        descripcion:
          'No se logra ubicar una referencia util para completar la notificacion',
      },
      {
        codigo: 'F4',
        descripcion:
          'Luego de dos gestiones B3, la notificación se deja negativa',
      },
    ],
  },
]

export const CODIGOS_EXITOSOS = new Set(['D1', 'D2', 'D3', 'D4', 'E1'])
export const CODIGOS_BUSQUEDA = new Set(['B1', 'B3', 'B4', 'B7', 'B8', 'B10', 'B10p'])
export const CODIGOS_NEGATIVOS = new Set(['A1', 'A2', 'A3', 'A4', 'A5', 'B2', 'B5', 'B6', 'F4'])

export const MAPA_CODIGOS = CODIGOS.flatMap((grupo) => grupo.items).reduce(
  (acc, item) => {
    acc[item.codigo] = item.descripcion
    return acc
  },
  {}
)