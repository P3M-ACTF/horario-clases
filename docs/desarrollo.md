# Desarrollo y publicación

[Volver a Mi horario](../README.md)

## Preparar el proyecto

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

## Formato de archivos, versión 1

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
