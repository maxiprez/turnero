# Mapa Del Proyecto

Este archivo existe para que otra instancia de Codex o cualquier persona técnica pueda entender rápido el proyecto, su estado actual y cómo seguir trabajándolo sin arrancar de cero.

## Qué es

`turnero` es una app web de turnos para negocios por agenda, inicialmente pensada para nail art.

Tiene dos caras:

- `index.html`: experiencia pública para reservar turnos
- `panel/index.html`: panel administrativo

## Stack

- `HTML`
- `CSS`
- `JavaScript vanilla`
- `Firebase Authentication` con Google
- `Firebase Realtime Database`

## Estructura de datos actual

Todo se guarda bajo `turnero/` en Realtime Database:

- `turnero/usuarios/{uid}`: perfiles de personas que iniciaron sesión con Google
- `turnero/config`: nombre del negocio, admins, ventana de reserva, agenda semanal
- `turnero/servicios/{serviceId}`: catálogo de servicios
- `turnero/turnos/{fecha}/{hora}`: turnos reservados

## Archivos clave

- `/Users/jonatanariste/develop/Argentinaps/turnero/index.html`
- `/Users/jonatanariste/develop/Argentinaps/turnero/panel/index.html`
- `/Users/jonatanariste/develop/Argentinaps/turnero/js/public.js`
- `/Users/jonatanariste/develop/Argentinaps/turnero/js/panel.js`
- `/Users/jonatanariste/develop/Argentinaps/turnero/js/shared.js`
- `/Users/jonatanariste/develop/Argentinaps/turnero/js/firebase.js`
- `/Users/jonatanariste/develop/Argentinaps/turnero/js/firebase-config.js`
- `/Users/jonatanariste/develop/Argentinaps/turnero/css/styles.css`

## Estado funcional actual

- La parte pública usa un wizard multipasos mobile-first.
- El login se hace con Google.
- Al iniciar sesión, la usuaria se registra en `turnero/usuarios`.
- Los servicios se leen desde `turnero/servicios`.
- Los turnos públicos y manuales se guardan en `turnero/turnos/{fecha}/{hora}`.
- El panel administra configuración, agenda, servicios, turnos y clientas.

## Decisiones importantes tomadas

- Los servicios viven separados de `config`.
- El panel considera admin a cualquier usuaria si `adminEmails` está vacío.
- Los turnos usan bloques por fecha y hora, con duración actual de 1 hora.
- Para evitar colisiones, el guardado de turnos se hace con `runTransaction`.

## Pendientes y próximos pasos

- Endurecer reglas de seguridad en Firebase.
- Agregar validación real de pagos.
- Posible publicación en Firebase Hosting.
- Mejorar todavía más la UX del panel.

## Cambios recientes

- Se creó el repo Git y se subió a GitHub.
- Se mejoró el README con enfoque más presentable para compartir.
- El wizard público pasó a formato más asistido y visualmente más mobile.
- Se pidió agregar:
  - carga manual de turnos desde el panel
  - listado de clientas con historial de servicios

Cada vez que se haga un cambio importante, conviene actualizar este archivo con:

- qué se agregó
- dónde vive en el código
- cómo impacta en la base de datos
