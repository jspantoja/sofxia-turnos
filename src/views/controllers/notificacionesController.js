// src/views/controllers/notificacionesController.js

/**
 * Muestra una notificación flotante que desaparece sola.
 * @param {string} mensaje
 * @param {'exito'|'advertencia'|'error'} tipo
 */
export function mostrarToast(mensaje, tipo = 'exito') {
  const contenedor = obtenerContenedor();

  const toast = document.createElement('div'); // crea un <div> "de la nada",
                                                  // todavía no existe en el HTML
  toast.className = `toast toast--${tipo}`;
  toast.textContent = mensaje;

  contenedor.appendChild(toast); // ahora sí lo insertamos en la página

  // requestAnimationFrame espera al siguiente "cuadro" que el navegador
  // va a dibujar, antes de agregar la clase que dispara la animación de
  // entrada — si la agregáramos en la misma línea que appendChild, el
  // navegador no alcanzaría a animar la transición, aparecería de golpe.
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  // Después de 4 segundos, se retira sola
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 4000);
}

/** Crea el contenedor de toasts una sola vez, y lo reutiliza en cada llamada. */
function obtenerContenedor() {
  let contenedor = document.getElementById('toast-container');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'toast-container';
    document.body.appendChild(contenedor);
  }
  return contenedor;
}