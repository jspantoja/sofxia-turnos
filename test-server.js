// test-server.js — imita lo que hace Vercel, sin depender de su CLI
import http from 'node:http';
import loginHandler from './api/auth/login.js';
import registerHandler from './api/auth/register.js';

const servidor = http.createServer((req, res) => {
  // CORS: autoriza que un sitio en OTRO puerto (Live Server, 5500) pueda
  // pedirle datos a este servidor (3000). En producción no hace falta,
  // porque todo va a vivir en el mismo dominio.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Antes de mandar la petición real, el navegador manda una "pregunta"
  // (OPTIONS) para confirmar que sí está autorizado. Solo hay que
  // responderle que sí, sin contenido.
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  let cuerpo = '';
  req.on('data', (fragmento) => { cuerpo += fragmento; });
  req.on('end', async () => {
    res.status = (codigo) => { res.statusCode = codigo; return res; };
    res.json = (objeto) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(objeto));
    };

    try {
      req.body = JSON.parse(cuerpo || '{}');
    } catch {
      return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
    }

    if (req.url === '/api/auth/login' && req.method === 'POST') {
      return loginHandler(req, res);
    }
    if (req.url === '/api/auth/register' && req.method === 'POST') {
      return registerHandler(req, res);
    }
    res.statusCode = 404;
    res.end('No encontrado');
  });
});

servidor.listen(3000, '127.0.0.1', () => {
  console.log('✅ Servidor de prueba escuchando en http://127.0.0.1:3000');
});