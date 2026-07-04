# IguanaGuard Milagro

Sistema de Registro de Voluntarios para la Protección de Iguanas en el Cantón Milagro.

## Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Vistas:** EJS + Tailwind CSS
- **Persistencia:** JSON plano (`data/iguanas.json`)
- **CI/CD:** GitHub Actions + Render

## Requisitos

- Node.js v20 LTS+
- npm v9+

## Instalación y uso

```bash
git clone https://github.com/JaviOHS/iguanaguard-milagro.git
cd iguanaguard-milagro
npm install
npm run dev     # http://localhost:3000
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm start` | Producción |
| `npm run dev` | Desarrollo con recarga automática |
| `npm run lint` | Análisis ESLint |

## Ramas

- `main` / `v2-avanzada` — Versión 2 con panel de estadísticas
- `v1-básica` — Versión 1 con CRUD básico

## Licencia

ISC
