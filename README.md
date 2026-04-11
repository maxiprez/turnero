# Turnero Nail Art

App de turnos hecha en HTML, CSS y JavaScript vanilla, usando Firebase como backend:

- `index.html`: experiencia pública para que clientas inicien sesión con Google y reserven.
- `panel/index.html`: panel de administración para configurar días, horarios, servicios, precios y revisar reservas.

## Firebase usado

- Auth con Google para el login de clientas y administradoras.
- Realtime Database para guardar:
  - `turnero/usuarios/{uid}`
  - `turnero/config`
  - `turnero/servicios/{serviceId}`
  - `turnero/turnos/{fecha}/{hora}`

## Estructura actual en la base

Todo queda guardado dentro de `turnero/`:

- `turnero/usuarios/{uid}`: perfil básico de cada persona que inicia sesión con Google
- `turnero/config`: nombre del negocio, ventana de reserva y admins
- `turnero/servicios/{serviceId}`: catálogo de servicios, precios, duración y link de pago
- `turnero/turnos/{fecha}/{hora}`: turnos otorgados con datos de clienta, servicio, pago y estado

## Cómo abrirlo localmente

Conviene servir la carpeta con un servidor estático, no abrir los HTML con `file://`.

Por ejemplo, desde la raíz del proyecto:

`python3 -m http.server 8080`

Y luego abrir:

- `http://127.0.0.1:8080/`
- `http://127.0.0.1:8080/panel/`

## Suposición importante

Se asumió esta URL de Realtime Database:

`https://argentinapps-default-rtdb.firebaseio.com`

Si tu proyecto usa otra URL, cambiála en:

`/Users/jonatanariste/develop/Argentinaps/turnero/js/firebase-config.js`

## Flujo actual

1. La clienta inicia sesión con Google.
2. Elige servicio, fecha y horario disponible.
3. Completa nombre, WhatsApp, Instagram y observaciones.
4. El turno se guarda en `turnero/turnos`.
5. Si el servicio tiene `paymentLink`, el turno queda en `pendiente_pago` y se abre el link para pagar.

## Limitación actual

Sin webhook de pagos ni backend servidor, el pago no puede validarse automáticamente. Por eso el panel permite cambiar manualmente el estado del turno a:

- `pendiente_pago`
- `confirmado`
- `cancelado`

## Seguridad recomendada

Revisá y adaptá las reglas de Realtime Database antes de publicar. Dejé un ejemplo inicial en:

`/Users/jonatanariste/develop/Argentinaps/turnero/firebase-rules.json`
