<div align="center">
  <a href="https://p3m-actf.github.io/horario-clases/">
    <img src="site/icons/icon.svg" alt="" width="80" height="80">
  </a>
  <h1>Mi horario</h1>
  <p>Tu semana de clases, a tu manera.<br>Organiza las asignaturas, consulta qué toca ahora y adapta los cambios del día.</p>
  <p>
    <a href="https://p3m-actf.github.io/horario-clases/"><strong>Abrir la aplicación</strong></a>
    · <a href="https://github.com/P3M-ACTF/horario-clases/issues/new?template=01-error.yml">Comunicar un error</a>
    · <a href="https://github.com/P3M-ACTF/horario-clases/issues/new?template=02-mejora.yml">Proponer una mejora</a>
  </p>
</div>

[![Comprobaciones y publicación](https://github.com/P3M-ACTF/horario-clases/actions/workflows/pages.yml/badge.svg)](https://github.com/P3M-ACTF/horario-clases/actions/workflows/pages.yml)

<details>
  <summary>Explora esta guía</summary>

- [De un horario de clase a una herramienta compartida](#de-un-horario-de-clase-a-una-herramienta-compartida)
- [Empieza con tu horario](#empieza-con-tu-horario)
- [Cuando cambia la semana](#cuando-cambia-la-semana)
- [Tus datos y tus copias](#tus-datos-y-tus-copias)
- [Llévalo en el móvil](#llévalo-en-el-móvil)
- [Comparte el horario de tu curso](#comparte-el-horario-de-tu-curso)
- [Participa en el proyecto](#participa-en-el-proyecto)
- [Cómo está hecha](#cómo-está-hecha)
- [Licencias](#licencias)

</details>

## De un horario de clase a una herramienta compartida

Mi horario nació de una página para consultar las clases de ASIR 2. La idea es que también pueda servir a otros cursos: eliges una plantilla o creas tu semana, le das tus colores y la llevas contigo.

Funciona tanto para **clases de mañana como de tarde**, en móvil y ordenador. Puedes tener varios cursos independientes y configurar las asignaturas, los profesores, las horas y los descansos de cada uno.

Ya puedes:

- Consultar la **semana completa o un solo día**, con la clase actual y la siguiente a la vista.
- Organizar las clases arrastrando sus tarjetas o usando los botones y el teclado.
- Unir clases, ajustar descansos y preparar cambios para una fecha concreta.
- Elegir tema claro u oscuro e imprimir el horario.
- Instalar la aplicación y consultarla o editarla sin conexión tras la primera carga completa.

**No necesitas crear una cuenta.** Los horarios que personalices se guardan en el navegador de ese dispositivo.

## Empieza con tu horario

1. **[Abre Mi horario](https://p3m-actf.github.io/horario-clases/).** Elige entre empezar desde cero, cargar una plantilla del catálogo o importar un archivo JSON compatible.
2. **Hazlo tuyo.** Pon nombre al curso y configura las asignaturas, sus abreviaturas, colores y profesores habituales.
3. **Construye tu semana.** En **Editar horario habitual**, coloca las asignaturas en sus huecos. Puedes intercambiar clases ocupadas cuando tienen la misma duración.
4. **Ajusta las horas.** Con **Ajustar día** puedes cambiar el inicio, las duraciones y los descansos. El creador propone las 08:00 y ofrece también un ajuste de tarde a las 15:15.
5. **Consulta lo que necesitas.** Cambia entre Semana y Día, navega por las fechas o vuelve a Hoy. En móvil se abre inicialmente la vista diaria.

El selector superior permite cambiar de curso, crear otro, renombrarlo, duplicarlo o eliminarlo. Los cambios se guardan automáticamente.

> [!TIP]
> Pulsa una clase para ver sus opciones. Desde ahí puedes cambiar la asignatura o el profesor de esa sesión, moverla a un destino compatible o unirla con la siguiente.

## Cuando cambia la semana

### Una sustitución o una clase cancelada

Selecciona el día y pulsa **Editar solo esta fecha**. La aplicación crea una copia de esa jornada para que puedas cambiarla sin alterar el horario habitual ni otras semanas.

Si cancelas una clase, queda un hueco: las siguientes mantienen su hora. **Restaurar horario habitual** elimina los cambios de esa fecha.

### Dos clases seguidas y un descanso en medio

Puedes unir bloques de la misma asignatura y profesor, incluso si hay descansos entre ellos. El tiempo de clase se conserva y los descansos interiores pasan al final del bloque unido.

| Antes | Después de unir |
| :--- | :--- |
| Clase de 15:15 a 16:05<br>Descanso de 16:05 a 16:10<br>Clase de 16:10 a 17:00 | Clase conjunta de 15:15 a 16:55<br>Descanso de 16:55 a 17:00 |

**Separar bloque** recupera la estructura anterior. Si había otro descanso después, también se conserva.

<details>
  <summary>Algunos detalles al ajustar la jornada</summary>

- Se pueden deshacer también las uniones realizadas sobre otros bloques unidos.
- Antes de cambiar la duración de un bloque unido o de su descanso desplazado, separa el bloque.
- Intercambiar asignaturas entre bloques de igual duración mantiene los descansos en su sitio.
- Las jornadas deben terminar, como máximo, a medianoche.
- Una excepción es una copia de ese día: los cambios posteriores en la estructura semanal no la modifican. Los cambios en las asignaturas sí se reflejan en sus clases.

</details>

## Tus datos y tus copias

Los profesores y los cambios personales que añadas se quedan en tu navegador. Cargar una plantilla crea un curso independiente: puedes modificarlo sin cambiar el catálogo, y las futuras actualizaciones del catálogo no sobrescriben tu copia.

En **Exportar horario** puedes elegir qué quieres guardar:

| Quiero… | Qué exportar |
| :--- | :--- |
| Compartir mi semana con otros alumnos | **Exportar como plantilla**: excluye profesores y cambios de fechas concretas. |
| Guardar un curso con todos sus detalles | **Copia personal de este curso**: incluye profesores y excepciones. |
| Llevar mis horarios a otro dispositivo | **Copia de todos mis cursos** y después importar allí el archivo. |

Al importar verás un resumen antes de confirmar. Se añaden copias independientes, sin reemplazar los cursos que ya tienes. Se admiten archivos de hasta 5 MB y un máximo de 50 cursos guardados.

> [!IMPORTANT]
> Los datos no se sincronizan entre dispositivos. Antes de borrar los datos del navegador o cambiar de equipo, exporta una copia personal. El guardado automático y el modo sin conexión no sustituyen esa copia.

La aplicación conserva una copia anterior válida para recuperarse de un fallo de lectura. Si no puede guardar, te avisa y permite reintentarlo; en ese caso, exporta tus cambios antes de cerrar.

## Llévalo en el móvil

Abre la aplicación con conexión y deja que termine de cargar. Así estarán disponibles también el catálogo y sus plantillas cuando estés sin internet.

- **Chrome o Edge:** utiliza **Instalar app**, cuando aparezca, o la opción de instalación del navegador.
- **Safari en iPhone:** entra en **Compartir → Añadir a la pantalla de inicio**.

Cuando haya una versión nueva aparecerá **Actualizar**. La actualización conserva tus cursos. También puedes seguir utilizando la web sin instalarla.

El enlace que puedes guardar y compartir es **[p3m-actf.github.io/horario-clases](https://p3m-actf.github.io/horario-clases/)**. Si se añade un dominio propio como acceso, esta dirección seguirá siendo la de uso habitual.

## Comparte el horario de tu curso

La primera plantilla del catálogo es **ASIR 2**, de turno vespertino: 30 clases, nueve asignaturas y jornadas de lunes a viernes, de 15:15 a 20:55. Se publica sin nombres ni identificadores de profesores.

¿Quieres que aparezca también tu curso? Prepara el horario en la aplicación, comprueba las horas y los descansos y elige **Exportar como plantilla**. Después puedes [proponer la plantilla con este formulario](https://github.com/P3M-ACTF/horario-clases/issues/new?template=03-plantilla.yml) o enviar una propuesta de cambios al repositorio (*pull request*).

Revisa el nombre y la descripción antes de compartir el archivo: esos textos también serán públicos. Usa la exportación como plantilla para el catálogo y reserva las copias personales para ti.

La [guía para añadir plantillas](docs/plantillas.md) explica cómo registrar el archivo y comprobarlo antes de publicarlo. Añadir un nuevo curso al catálogo no requiere cambiar la interfaz.

## Participa en el proyecto

No hace falta saber programar para ayudar. Puedes contarnos qué te ha fallado, qué te facilitaría consultar las clases o qué horario falta en el catálogo:

- **[Comunicar un error](https://github.com/P3M-ACTF/horario-clases/issues/new?template=01-error.yml):** explica qué estabas haciendo y qué ocurrió.
- **[Proponer una mejora](https://github.com/P3M-ACTF/horario-clases/issues/new?template=02-mejora.yml):** cuéntanos qué necesitas y en qué situación te ayudaría.
- **[Aportar o corregir una plantilla](https://github.com/P3M-ACTF/horario-clases/issues/new?template=03-plantilla.yml):** comparte un nuevo horario o indica qué habría que corregir.

Los formularios están en castellano y te guían paso a paso. Puedes consultar antes las [conversaciones abiertas](https://github.com/P3M-ACTF/horario-clases/issues) para añadir información si alguien ya ha comentado lo mismo. Para publicar una propuesta necesitarás una cuenta de GitHub.

## Cómo está hecha

| Parte | Tecnología | Para qué se utiliza |
| :--- | :--- | :--- |
| Interfaz | HTML, CSS y JavaScript modular | Mostrar y editar los horarios en el navegador. |
| Guardado | Almacenamiento local del navegador (`localStorage`) | Conservar los cursos y una copia anterior válida. |
| Instalación y uso sin conexión | Manifiesto web y *service worker* | Guardar la aplicación y el catálogo en el dispositivo. |
| Comprobaciones | Node.js y Playwright | Probar los cálculos y el funcionamiento en el navegador. |
| Publicación | GitHub Actions y GitHub Pages | Comprobar los cambios y servir la web. |

La aplicación funciona sin servidor de datos ni dependencias externas durante el uso.

Para trabajar en ella necesitas **Node.js 22 o posterior**:

```sh
git clone https://github.com/P3M-ACTF/horario-clases.git
cd horario-clases
npm ci
npm run build
npm start
```

Después abre [la aplicación local](http://127.0.0.1:4173/horario-clases/). La [guía de desarrollo y publicación](docs/desarrollo.md) incluye las pruebas, el formato de archivos, la configuración de GitHub Pages y la redirección desde un dominio temporal.

## Licencias

Puedes reutilizar y mejorar Mi horario. En este mismo repositorio conviven dos licencias, cada una para una parte del proyecto:

| Qué quieres reutilizar | Licencia |
| :--- | :--- |
| El código de la aplicación y sus archivos de soporte | [GPL-3.0](LICENSE), versión 3 únicamente. |
| Las plantillas públicas y el índice del catálogo | [CC BY-SA 4.0](site/templates/LICENSE). |

Si distribuyes una versión modificada del programa, debes facilitar su código fuente correspondiente bajo GPL-3.0. Si compartes una adaptación de una plantilla, reconoce la autoría, indica los cambios y respeta CompartirIgual. Ambas licencias permiten el uso comercial.

Consulta el [alcance de las licencias](LICENSING.md) y los [créditos de las plantillas](site/templates/README.md). Tus horarios personales siguen guardados en tu dispositivo; estas licencias no los hacen públicos.
