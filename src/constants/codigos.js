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
        codigo: 'E1',
        descripcion: 'Se entrega personalmente en terreno la notificacion',
      },
    ],
  },
  {
    grupo: 'Busqueda',
    items: [
      {
        codigo: 'B3',
        descripcion:
          'No contestan o abren la puerta en el domicilio (se debe dejar aviso)',
      },
      {
        codigo: 'F4',
        descripcion:
          'Luego de dos gestiones B3, la notificación se deja negativa',
      },
      {
        codigo: 'B5',
        descripcion:
          'Persona adulta nos indica que el requerido no vive en el domicilio',
      },
      {
        codigo: 'B7',
        descripcion:
          'La persona requerida vive en el lugar pero no se encuentra por estar trabajando o haciendo otra cosa fuera de casa',
      },
      {
        codigo: 'B10',
        descripcion: 'Lugares de acceso cerrado',
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
        codigo: 'B2',
        descripcion: 'Domicilio deshabitado',
      },
    ],
  },
]

export const MAPA_CODIGOS = CODIGOS.flatMap((grupo) => grupo.items).reduce(
  (acc, item) => {
    acc[item.codigo] = item.descripcion
    return acc
  },
  {}
)