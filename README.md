# Salasaurio 🎸

Sistema de turnos online para salas de ensayo. Reservá tu sala, elegí la duración y confirmá tu horario sin llamadas ni mensajes.

## Para quién es esta app

Pensada para salas de ensayo que necesitan digitalizar sus reservas:

- Salas de ensayo para bandas
- Estudios de grabación
- Espacios de música por hora

## Qué resuelve

Una banda entra al sitio, inicia sesión con Google, elige la sala, la fecha, la duración y el horario disponible, completa los datos del grupo y confirma la reserva.

Del otro lado, el administrador de la sala puede gestionar la agenda, las salas, los precios y ver toda la información de las reservas desde un panel.

## Funcionalidades actuales

- Reserva online desde la web pública.
- Flujo de reserva tipo wizard multipasos (sala → fecha → duración → horario → datos).
- Selección de duración flexible (1h, 2h, 3h).
- Disponibilidad por sala independiente: reservar una sala no bloquea las demás.
- Login con Google para bandas y administradores.
- Registro automático de usuarios en Firebase.
- Campo para nombre de banda en el formulario de reserva.
- Salas y precios cargados y editables desde Firebase.
- Horarios y configuración de la sala administrables desde el panel.
- Panel para ver turnos registrados y datos del cliente.
- Soporte para link de pago por sala.

## Stack tecnológico

- `HTML5`
- `CSS3` con `Tailwind CSS v4`
- `JavaScript vanilla`
- `Firebase Authentication`
- `Firebase Realtime Database`

## Cómo está organizado

```
salasaurio/
├── index.html                      # Sitio público para reservar salas
├── panel/
│   └── index.html                  # Panel administrativo
├── js/
│   ├── public.js                   # Lógica del flujo de reserva
│   ├── panel.js                    # Lógica del panel
│   ├── shared.js                   # Helpers compartidos y acceso a datos
│   ├── firebase.js                 # Inicialización y exports de Firebase
│   ├── firebase-config.js          # Credenciales reales (no commitear ⚠️)
│   └── firebase-config.example.js  # Plantilla de credenciales
├── src/
│   └── input.css                   # Entrada de Tailwind CSS
├── css/
│   └── output.css                  # CSS compilado (generado, no commitear)
├── firebase-rules.json             # Reglas de seguridad de Firebase
└── .gitignore
```

## .gitignore

Estos archivos no se commitean:

```
js/firebase-config.js
css/output.css
node_modules/
```

## Base de datos

Todo se guarda dentro del nodo `salasaurio/` en Firebase Realtime Database:

- `salasaurio/usuarios/{uid}` — personas que inician sesión con Google
- `salasaurio/config` — configuración general de la sala
- `salasaurio/servicios/{serviceId}` — salas con precios, duración y links de pago
- `salasaurio/turnos/{fecha}/{hora}/{serviceId}` — reservas por sala (permite múltiples salas por horario)

## Cómo levantarlo localmente

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/salasaurio.git
cd salasaurio
```

### 2. Crear `js/firebase-config.js`

Copiá el archivo de ejemplo y completá con tus credenciales:

```bash
cp js/firebase-config.example.js js/firebase-config.js
```

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

export const TURNERO_ROOT = "salasaurio";
```

### 3. Instalar dependencias y compilar CSS

```bash
npm install
npm run dev
```

### 4. Levantar el servidor local

```bash
npx serve . -p 8765
```

Abrí en el navegador:

- `http://localhost:8765/` — sitio público de reservas
- `http://localhost:8765/panel/` — panel de administración

## Reglas de Firebase recomendadas

```json
{
  "rules": {
    "salasaurio": {
      "config": {
        ".read": true,
        ".write": "auth != null"
      },
      "servicios": {
        ".read": true,
        ".write": "auth != null"
      },
      "turnos": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "usuarios": {
        "$uid": {
          ".read": "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    }
  }
}
```

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Compila Tailwind en modo watch |
| `npm run build` | Genera el CSS minificado para producción |

## Estado del proyecto

- [x] Reserva online con wizard multipasos
- [x] Disponibilidad independiente por sala
- [x] Selección de duración (1h, 2h, 3h)
- [x] Login con Google
- [x] Panel de administración
- [x] Diseño dark mode con estética rock
- [ ] Recordatorio por WhatsApp post-reserva
- [ ] Vista "mis reservas" para el usuario
- [ ] Bloqueo de fechas específicas desde el panel
- [ ] Exportar reservas a CSV
- [ ] Publicar en Firebase Hosting

## Próximos pasos

- Agregar link de WhatsApp post-reserva desde el panel
- Filtros por sala y fecha en la lista de reservas
- Permitir cancelación de reservas por parte del usuario
- Publicar en Firebase Hosting