// src/controllers/authController.js
import { login, logout } from '../models/authModel.js';
import { getSession } from '../utils/auth-guard.js';

/** Inicializa el formulario de login. Se llama desde index.html. */
export function initLoginForm() {
  // Si ya hay una sesión guardada (de una visita anterior), no tiene
  // sentido mostrar el formulario de nuevo — lo mandamos directo a
  // donde le corresponde según su rol.
  const session = getSession();
  if (session) {
    redirigirPorRol(session.rol_id);
    return;
  }

  const form = document.getElementById('form-login');
  const inputEmail = document.getElementById('input-email');
  const inputPassword = document.getElementById('input-password');
  const btnLogin = document.getElementById('btn-login');
  const mensajeError = document.getElementById('mensaje-error');

  // "submit" es el evento que dispara un <form> al enviarse (por Enter
  // o por clic en el botón). preventDefault() evita que la página se
  // recargue de golpe, que es el comportamiento por defecto del navegador.
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando...';
    mensajeError.hidden = true;

    try {
      const { rol_id } = await login(inputEmail.value.trim(), inputPassword.value);
      redirigirPorRol(rol_id);
    } catch (error) {
      // authModel.js ya convirtió el error del servidor en un
      // Error normal de JavaScript — aquí solo mostramos su mensaje.
      mensajeError.textContent = error.message;
      mensajeError.hidden = false;
      btnLogin.disabled = false;
      btnLogin.textContent = 'Ingresar';
    }
  });
}

function redirigirPorRol(rol_id) {
  window.location.href = rol_id === 1 ? '/dashboard.html' : '/mi-calendario.html';
}

/** Engancha el botón de "Cerrar sesión" en cualquier vista que lo tenga. */
export function initLogout() {
  document.querySelectorAll('[data-accion="logout"]').forEach((el) => {
    el.addEventListener('click', () => {
      logout();
      window.location.href = '/index.html';
    });
  });
}