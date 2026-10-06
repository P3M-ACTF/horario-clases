# Mi horario

Aplicación web para crear horarios de clase matutinos o vespertinos, con plantillas públicas, edición personal y funcionamiento sin conexión.

**Aplicación:** https://p3m-actf.github.io/horario-clases/

## Primeros pasos

1. Elige **Crear desde cero**, carga una plantilla del catálogo o importa un JSON personalizado.
2. Configura las asignaturas, sus colores y los profesores. Los profesores que añadas se guardan únicamente en tu navegador.
3. Usa **Editar horario habitual** para construir la semana. Arrastra las asignaturas a los huecos; entre clases ocupadas de igual duración se intercambian las asignaciones.
4. Pulsa una clase para elegir asignatura, profesor particular, destino compatible o unión con la siguiente. Todas las operaciones tienen controles utilizables con teclado.
5. Para una sustitución o cancelación puntual, selecciona la fecha y **Editar solo esta fecha**. **Restaurar horario habitual** elimina esa excepción.

Puedes gestionar varios cursos independientes desde el selector superior. **Ajustar día** permite cambiar el inicio, las duraciones y los descansos. No existe una restricción a horarios de tarde: el creador propone las 08:00 y también ofrece un ajuste vespertino a las 15:15. Las jornadas deben acabar, como máximo, a medianoche.

### Unir clases y mover descansos

Se pueden unir dos clases contiguas de la misma asignatura y profesor, aunque las separe uno o varios descansos. Los minutos de clase no cambian; los descansos interiores se colocan inmediatamente después del bloque conjunto. El resto de horas permanece igual.

Ejemplo: dos clases de 15:15–16:05 y 16:10–17:00 se convierten en 15:15–16:55, con los 5 minutos desplazados a continuación. Si había otro descanso hasta las 17:05, ambos descansos se conservan. **Separar bloque** recupera la estructura anterior, incluidas las uniones anidadas. Para cambiar la duración de un bloque unido o de su descanso desplazado, sepáralo antes.

Las uniones son parte de la estructura de la jornada. Al intercambiar asignaturas entre bloques de igual duración, los descansos mantienen su posición. Cancelar una clase deja un hueco de la misma duración.

## Plantillas públicas

El índice `site/templates/index.json` registra los archivos de plantilla de esa misma carpeta. La aplicación descubre las entradas a través del índice; no hace falta modificar la interfaz.

ASIR 2 incluye 30 clases, nueve asignaturas y el horario vespertino original de lunes a viernes, 15:15–20:55. No contiene nombres ni identificadores de profesores. La aplicación siempre empieza sin cursos personales hasta que crees o importes uno.

### Añadir una plantilla de otro curso

1. Construye o importa el horario en la aplicación.
2. Comprueba asignaturas, horas, descansos y descripción.
3. Selecciona **Exportar horario → Exportar como plantilla**. El archivo excluye profesores y excepciones por fecha.
4. Colócalo en `site/templates/`, con un nombre de archivo en minúsculas, por ejemplo `asir1-manana.json`.
5. Añade una entrada al array `templates` del índice:

```json
{
  "id": "asir1-manana",
  "name": "ASIR 1 · Mañana",
  "description": "Horario matutino de primer curso",
  "tags": ["Matutino", "L–V · 08:00–13:40"],
  "file": "asir1-manana.json"
}
```

`name` debe coincidir con el nombre del curso dentro de la plantilla. No inventes centro ni curso académico; puedes incluirlos en la descripción cuando estén confirmados. Revisa también los textos libres antes de publicar. No incluyas el HTML original ni archivos personales.

6. Ejecuta `npm test`, `npm run validate` y `npm run build`. La validación rechaza formatos incorrectos, identificadores duplicados, archivos sin registrar, profesores y excepciones en plantillas públicas.
7. Publica el cambio en `main` o envía una pull request. GitHub Actions valida y despliega el catálogo junto con la aplicación.

Los cursos ya cargados no se actualizan automáticamente: cada alumno conserva su copia. Puede volver a cargar una plantilla actualizada como un curso adicional.

### Importar y guardar copias

- **Plantilla:** un curso semanal, sin profesores ni excepciones; apropiado para compartir.
- **Copia personal de este curso:** incluye profesores y cambios por fecha.
- **Copia de todos mis cursos:** permite trasladar todos los cursos entre dispositivos.

La importación muestra un resumen y siempre añade copias independientes. No reemplaza cursos existentes. Máximo: 5 MB por archivo y 50 cursos guardados. Los datos se guardan en `localStorage`, con una copia anterior válida para recuperación. Borrar los datos del navegador, cambiar de perfil o usar otro dispositivo no conserva automáticamente esos datos: exporta copias periódicas. Si se agota el almacenamiento, la app mantiene los cambios en memoria y muestra una opción para reintentar el guardado; exporta antes de cerrarla.

## Instalar y usar sin conexión

La instalación depende del navegador. En Chrome/Edge utiliza **Instalar app** o el menú del navegador. En Safari para iPhone: **Compartir → Añadir a la pantalla de inicio**.

Una primera carga completa guarda la aplicación y todas las plantillas del catálogo para funcionar sin conexión. No se necesitan cuentas, servidor de datos, fuentes remotas ni servicios de pago. Cuando hay una versión nueva aparece **Actualizar**; la actualización conserva el almacenamiento personal. El navegador puede liberar su almacenamiento, por lo que la caché y el guardado no sustituyen una copia exportada.

## Desarrollo y comprobación

Requiere Node.js 22 o posterior. La aplicación publicada no tiene dependencias de ejecución. Playwright solo se usa en las pruebas de desarrollo.

```sh
npm ci
npm test
npm run validate
npm run build
npm start
```

Abre `http://127.0.0.1:4173/horario-clases/`. No abras `index.html` directamente desde el disco: los módulos y el modo sin conexión requieren HTTP/HTTPS.

```sh
# En Linux/macOS, preparar Chromium para las pruebas:
npx playwright install --with-deps chromium
npx playwright test
```

En Windows, las pruebas utilizan Microsoft Edge instalado. Los resultados y capturas se guardan en `test-results/`, fuera de Git.

La compilación genera `dist/`, los iconos PNG y el service worker. La versión de caché se deriva de todo el contenido de la aplicación y las plantillas, por lo que cada cambio produce una versión coherente y renovable.

### Formato de archivos, versión 1

Plantilla: `{ "schemaVersion": 1, "type": "template", "course": { ... } }`.

Copia personal: `{ "schemaVersion": 1, "type": "backup", "courses": [ ... ] }`.

Un curso tiene `id`, `name`, `description`, `timeZone`, `subjects`, `week` y `exceptions`. Las asignaturas tienen `id`, `name`, `short`, `color` hexadecimal y `teacher` opcional. Las claves de `week` son los días de JavaScript: `0` domingo, `1` lunes, hasta `6` sábado. Las excepciones se identifican mediante `AAAA-MM-DD`.

Cada jornada tiene `start` (minutos desde medianoche) y `blocks` ordenados. Cada bloque tiene `id`, `kind` (`lesson`, `break` o `free`) y `duration` en minutos. Las clases añaden `subjectId` (o `null` si el hueco está vacío) y `teacherOverride` opcional. Los descansos pueden tener `label`. `merge.original` y `movedBy` guardan la estructura necesaria para deshacer uniones; se recomienda generarlos con la aplicación.

Los intervalos incluyen el inicio y excluyen el final. El cálculo de «Ahora» utiliza la zona horaria del curso; las excepciones tienen prioridad sobre la semana habitual. Cambiar la estructura semanal no modifica las excepciones ya creadas, aunque los cambios en el catálogo de asignaturas sí se reflejan en sus clases.

## GitHub Pages y dominio de un año

El repositorio público publica `dist/` mediante `.github/workflows/pages.yml` después de pasar las pruebas. En **Settings → Pages**, la fuente debe ser **GitHub Actions**. Las rutas relativas y el alcance del service worker están preparados para `/horario-clases/`.

La dirección permanente es **https://p3m-actf.github.io/horario-clases/**. Al comprar un dominio, contrata o habilita en su proveedor una **redirección web HTTPS (302) hacia esa dirección completa**, conservando `github.io` como dirección visible. Una entrada DNS por sí sola no hace una redirección HTTP. No configures el dominio comprado como *Custom domain* de este repositorio y no uses redirección enmarcada.

Antes de comprarlo, comprueba que su proveedor permite esa redirección HTTPS. Cuando no renueves el dominio, la app seguirá en el mismo enlace de GitHub Pages y los datos conservarán su origen. Actualiza tus marcadores al enlace permanente antes de que caduque. No se necesita una migración del horario por ese vencimiento.

Documentación: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [publicación con Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
