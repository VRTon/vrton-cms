# VRTon Web + madCMS

Sitio publico de VRTon y CMS local para editar contenido (paginas, links y colaboradores) sin tocar codigo de UI.

## Guia express (editores de contenido)

Si solo queres editar contenido y subir cambios, usa esta ruta:

1. `npm install`
2. `npm run dev`
3. Abri `http://localhost:5174` (CMS)
4. Edita contenido y hace click en `Save`
5. Revisa en `http://localhost:5173`
6. `git add content public/uploads src/generated public/api`
7. `git commit -m "content: actualiza contenido desde cms"`
8. `git push origin <tu-rama>`

Listo. El resto del README explica cada parte en detalle.

## Que incluye este repo

- Sitio publico en React + Vite.
- CMS local (`madCMS Content Manager`) para editar contenido markdown + bloques.
- Generacion automatica de JSON para consumo del frontend y API estatica.
- Soporte de idiomas `es` y `en`.

## Estructura clave

```text
content/
  i18n/                 # Traducciones fuente en markdown con bloque JSON
  pages/<slug>/<lang>.md# Paginas fuente en markdown (con bloque ```json blocks)

src/generated/          # JSON generado para consumo en app (no editar a mano)
public/api/             # JSON generado para API estatica (no editar a mano)
public/uploads/         # Assets subidos desde el CMS
scripts/generate-content.mjs
```

## Requisitos

- Node.js 18+
- npm

## Instalacion

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Este comando levanta 2 servidores en paralelo:

- Sitio publico: `http://localhost:5173`
- CMS (admin): `http://localhost:5174`

Si queres levantar solo el admin:

```bash
npm run dev:admin
```

## Como usar el CMS

Entrar a `http://localhost:5174`.

Tip: el sitio publico siempre se valida en `http://localhost:5173`.

### 1) Modo Pages

Usalo para editar el contenido de cada pagina por bloques.

- Selecciona la pagina desde el selector superior.
- Cambia idioma con los botones `ES` / `EN`.
- Arrastra bloques desde la barra lateral (Hero, Events, FAQ, Section, etc).
- Edita campos en el panel del bloque seleccionado.
- Usa Undo/Redo cuando haga falta.
- Click en `Save` para guardar.

Que pasa al guardar:

1. Se guarda el markdown en `content/pages/...`.
2. Se regenera el contenido JSON (`src/generated` y `public/api`).
3. Se dispara hot-reload del sitio publico en `5173`.

### 2) Modo Links

Edita links globales dentro del archivo i18n activo:

- `Navbar links`
- `Footer links`
- `Social links`

Esto escribe sobre `content/i18n/<lang>.md` (bloque JSON).

### 3) Modo Collaborators

Gestiona el catalogo de logos reutilizable en el bloque `events`:

- Alta/baja/edicion de colaboradores.
- Upload de logo desde el admin.
- Asignacion de colaboradores por fila/evento.

Las imagenes subidas van a:

- `public/uploads/images/collaborators/...`

Tambien se pueden subir imagenes para eventos desde el bloque `events`, y quedan en:

- `public/uploads/images/events/...`

### 4) Crear y borrar paginas

- `New page` crea por defecto: `content/pages/<slug>/es.md`.
- `Delete page` elimina el archivo activo.

Si necesitas la version en ingles de una pagina nueva, crea tambien `content/pages/<slug>/en.md` siguiendo el mismo formato frontmatter + bloques.

## Flujo de contenido recomendado

1. Editar desde el CMS.
2. Guardar con `Save`.
3. Verificar en `http://localhost:5173` que todo se vea bien.
4. Confirmar cambios en archivos fuente (`content/...`) y en generados (`src/generated`, `public/api`) antes de commitear.

## Comandos utiles

```bash
# Regenerar contenido manualmente
npm run generate:content

# Build de produccion
npm run build

# Lint
npm run lint

# Tests de arrastre/upload/seguridad de admin
npm run test:drag

# Suite usada por pre-push
npm run test:prepush
```

## Subir cambios (Git)

### 0) (Opcional, recomendado una vez)

Activar hook local de pre-push:

```bash
npm run setup:hooks
```

El hook corre `npm run test:prepush` antes de cada push.

### 1) Revisar cambios

```bash
git status
git diff
```

### 2) Agregar archivos

```bash
git add content public/uploads src/generated public/api
```

Si ademas tocaste codigo, agrega tambien `src/...` y configs que correspondan.

Atajo (agrega todo):

```bash
git add .
```

Usa este atajo solo si ya revisaste bien `git status`/`git diff`.

### 3) Commit

```bash
git commit -m "content: actualiza paginas y links desde cms"
```

### 4) Push

```bash
git push origin <tu-rama>
```

## Notas importantes

- No edites a mano `src/generated/*` ni `public/api/*` salvo casos excepcionales; se regeneran.
- El CMS corre pensado para entorno local de desarrollo.
- Limites de upload en admin:
  - Imagenes: hasta 10 MB
  - Videos: hasta 120 MB

## Problemas comunes

- `No carga el CMS en 5174`: verifica que `npm run dev` siga corriendo y que el puerto este libre.
- `Save` falla con error de regeneracion: ejecuta `npm run generate:content` y reintenta.
- `No veo cambios en el sitio publico`: refresca `http://localhost:5173` y confirma que guardaste en el idioma correcto (`ES`/`EN`).
- `Push rechazado por hook`: corre `npm run test:prepush`, corrige errores y vuelve a hacer `git push`.

