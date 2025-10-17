# Integración de Hoja de Personaje

Esta documentación describe los cambios realizados para integrar la funcionalidad de la Hoja de Personaje en el `ControlPanelPlayer`.

## Archivos Creados

- `api/models/CharacterSheet.js`: Esquema de Mongoose para la hoja de personaje.
- `api/routes/character.js`: Rutas de la API para gestionar la hoja (`GET /me`, `POST`).
- `src/components/CharacterSheet.jsx`: Componente de React para el formulario de la hoja de personaje.
- `src/lib/pdfService.js`: Servicio para generar el PDF a partir de una plantilla.
- `public/Hoja genérica para Mago 20º Aniversario Editable.pdf`: Plantilla de PDF.

## Archivos Modificados

- `api/index.js`: Para registrar las nuevas rutas de la API.
- `src/pages/ControlPanelPlayer.jsx`: Para añadir la interfaz de pestañas e integrar el componente `CharacterSheet`.
- `package.json`: Para añadir la dependencia `pdf-lib`.

## Instalación

1. Asegúrate de que los nuevos archivos están en sus respectivas carpetas.
2. Si `npm install` no se ha ejecutado automáticamente, corre el siguiente comando para instalar la nueva dependencia:
   ```bash
   npm install pdf-lib
   ```

## Depuración y Puntos Clave

### Coordenadas del PDF

El archivo `src/lib/pdfService.js` contiene la lógica para rellenar el PDF. Las coordenadas `(x, y)` para cada campo son **placeholders** y necesitan ser ajustadas manualmente.

```javascript
// src/lib/pdfService.js

// --- IMPORTANT --- //
// The X/Y coordinates in this file are placeholders. They need to be manually
// adjusted to match the exact layout of the PDF template. This is typically
// a trial-and-error process.
// ----------------- //

// Ejemplo de ajuste:
drawText(page, sheetData.name, 100, 700, font); // Cambia 100 y 700 hasta que el texto "Nombre" aparezca en el lugar correcto.
```

### Pruebas de API

Puedes probar los endpoints de la API usando una herramienta como `curl` o Postman.

- **Obtener Hoja (GET):**
  ```bash
  curl -X GET http://localhost:3001/api/character/me -H "Authorization: Bearer <TU_TOKEN_JWT>"
  ```

- **Guardar Hoja (POST):**
  ```bash
  curl -X POST http://localhost:3001/api/character -H "Authorization: Bearer <TU_TOKEN_JWT>" -H "Content-Type: application/json" -d '{"name": "Mi Personaje", ...}'
  ```
