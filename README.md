# Turnero Nail Art

Construí un turnero para tu negocio... y te lo regalo. 🎁

Hace poco tuve que cerrar mi propio emprendimiento y sé que hoy cada ayuda cuenta. Por eso, me puse a programar para vos.

Este proyecto forma parte de una idea simple: crear herramientas reales, útiles y gratuitas para emprendedoras y pequeños negocios que necesitan digitalizarse sin gastar una fortuna.

La app incluye:

- Agenda de servicios y horarios.
- Panel de gestión de clientes y turnos.
- Login seguro con Google y manejo de precios.

Es solo el inicio: voy a regalar 10 mini apps para emprendedores. 🛠️

## Para quién es esta app

Esta app está pensada para negocios que trabajan por agenda, por ejemplo:

- Nail art
- Belleza y estética
- Peluquerías
- Lashistas
- Cosmetología
- Servicios personalizados por turno

## Qué resuelve

`Turnero Nail Art` permite que una clienta entre, inicie sesión con Google, elija un servicio, seleccione un día y un horario disponible, complete sus datos y reserve un turno.

Del otro lado, el negocio puede administrar la agenda, los servicios, los precios y ver la información de las reservas desde un panel.

## Funcionalidades actuales

- Reserva online desde la web pública.
- Flujo de reserva tipo wizard o asistente multipasos.
- Login con Google para clientas y administradoras.
- Registro automático de usuarias en Firebase.
- Servicios cargados desde base de datos.
- Horarios y configuración del negocio administrables.
- Panel para ver turnos otorgados y datos del cliente.
- Soporte para link de pago por servicio.

## Stack tecnológico

- `HTML5`
- `CSS3`
- `JavaScript vanilla`
- `Firebase Authentication`
- `Firebase Realtime Database`

## Cómo está organizado

- [index.html](/Users/jonatanariste/develop/Argentinaps/turnero/index.html): sitio público para reservar turnos
- [panel/index.html](/Users/jonatanariste/develop/Argentinaps/turnero/panel/index.html): panel administrativo
- [js/public.js](/Users/jonatanariste/develop/Argentinaps/turnero/js/public.js): lógica del flujo de reserva
- [js/panel.js](/Users/jonatanariste/develop/Argentinaps/turnero/js/panel.js): lógica del panel
- [js/shared.js](/Users/jonatanariste/develop/Argentinaps/turnero/js/shared.js): helpers compartidos y acceso a datos
- [css/styles.css](/Users/jonatanariste/develop/Argentinaps/turnero/css/styles.css): estilos de toda la app
- [firebase-rules.json](/Users/jonatanariste/develop/Argentinaps/turnero/firebase-rules.json): ejemplo inicial de reglas

## Base de datos

Todo se guarda dentro del nodo `turnero/` en Firebase Realtime Database:

- `turnero/usuarios/{uid}`: personas que inician sesión con Google
- `turnero/config`: configuración general del negocio
- `turnero/servicios/{serviceId}`: servicios, precios, duración y links de pago
- `turnero/turnos/{fecha}/{hora}`: turnos reservados

Base conectada actualmente:

`https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/`

Completá tus credenciales reales en:

- [js/firebase-config.js](/Users/jonatanariste/develop/Argentinaps/turnero/js/firebase-config.js)

## Cómo levantarlo localmente

Desde la carpeta del proyecto:

```bash
python3 -m http.server 8765
```

Después abrí:

- `http://localhost:8765/`
- `http://localhost:8765/panel/`

## Estado del proyecto

Hoy ya permite:

- Reservar turnos online
- Cargar y editar servicios desde Firebase
- Registrar usuarias autenticadas
- Gestionar agenda y turnos desde panel
- Ofrecer links de pago según servicio

## Próximos pasos

- Mejorar reglas de seguridad en Firebase
- Separar más configuraciones por nodos específicos
- Validar pagos automáticamente
- Publicar en Firebase Hosting
- Seguir puliendo la experiencia mobile

## Idea detrás del proyecto

No es solamente un turnero. También es una forma de devolver algo útil a personas que están emprendiendo y necesitan una mano concreta.

Si esta mini app te sirve, entonces ya cumplió su objetivo.
