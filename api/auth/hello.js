/* // api/auth/hello.js — SOLO para diagnóstico, sin lógica real
export default function handler(req, res) {
  res.status(200).json({ mensaje: 'Vercel dev funciona' });
}
 */
// Antes: export default function handler(req, res) { ... }
function handler(req, res) {
  res.status(200).json({ mensaje: 'Vercel dev funciona' });
}
export default handler;