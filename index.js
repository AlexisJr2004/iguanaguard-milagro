// Punto de entrada del servidor
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Auto-ping para evitar que Render duerma el servicio tras 15 min de inactividad
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  setInterval(() => {
    fetch(`${SELF_URL}/health`).catch(() => {});
  }, 10 * 60 * 1000);
}
