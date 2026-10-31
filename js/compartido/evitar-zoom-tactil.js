/* ==============================================================
   evitar-zoom-tactil.js
   Evita el zoom por doble toque en iOS/Android (respaldo del touch-action de CSS).
   Se usa en: index.html y carta.html
   ============================================================== */

/* evita el zoom por doble toque en iOS/Android (el touch-action ya lo cubre; esto es un respaldo) */
(function(){var t=0;document.addEventListener('touchend',function(e){var n=Date.now();if(n-t<350&&!(e.target.closest&&e.target.closest('input,textarea,select')))e.preventDefault();t=n;},{passive:false});
document.addEventListener('gesturestart',function(e){e.preventDefault();});})();
