# Compartir una plantilla de horario

[Volver a Mi horario](../README.md)

El índice [`site/templates/index.json`](../site/templates/index.json) registra los archivos de plantilla de esa misma carpeta. La aplicación descubre las entradas a través del índice; no hace falta modificar la interfaz.

ASIR 2 incluye 30 clases, nueve asignaturas y el horario vespertino original de lunes a viernes, 15:15–20:55. No contiene nombres ni identificadores de profesores. La aplicación siempre empieza sin cursos personales hasta que crees o importes uno.

## Añadir una plantilla de otro curso

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

   `name` debe coincidir con el nombre del curso dentro de la plantilla. Incluye el centro o el curso académico en la descripción solo cuando estén confirmados. Revisa también los textos libres antes de publicar. No incluyas el HTML original ni archivos personales.

6. Ejecuta `npm test`, `npm run validate` y `npm run build`. La validación rechaza formatos incorrectos, identificadores duplicados, archivos sin registrar, profesores y excepciones en plantillas públicas.
7. Publica el cambio en `main` o envía una pull request. GitHub Actions valida y despliega el catálogo junto con la aplicación.

Los cursos ya cargados no se actualizan automáticamente: cada alumno conserva su copia. Puede volver a cargar una plantilla actualizada como un curso adicional.

Si prefieres que te ayudemos a incorporarla, abre el [formulario de plantillas](https://github.com/P3M-ACTF/horario-clases/issues/new?template=03-plantilla.yml). Puedes pegar el contenido del JSON exportado en el formulario. La propuesta se revisará antes de añadir el archivo y su entrada al catálogo.
