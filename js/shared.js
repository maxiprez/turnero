import {
  db,
  ref,
  get,
  set,
  update,
  runTransaction,
  rootPath,
} from "./firebase.js";

export const WEEK_DAYS = [
  { id: 0, label: "Domingo" },
  { id: 1, label: "Lunes" },
  { id: 2, label: "Martes" },
  { id: 3, label: "Miércoles" },
  { id: 4, label: "Jueves" },
  { id: 5, label: "Viernes" },
  { id: 6, label: "Sábado" },
];

export const DEFAULT_CONFIG = {
  businessName: "Nail Art Studio",
  bookingWindowDays: 21,
  adminEmails: [],
  weeklySchedule: {
    0: { enabled: false, start: "10:00", end: "18:00" },
    1: { enabled: true, start: "10:00", end: "18:00" },
    2: { enabled: true, start: "10:00", end: "18:00" },
    3: { enabled: true, start: "10:00", end: "18:00" },
    4: { enabled: true, start: "10:00", end: "18:00" },
    5: { enabled: true, start: "10:00", end: "18:00" },
    6: { enabled: true, start: "10:00", end: "18:00" },
  },
};

export const DEFAULT_SERVICES = {
  service_1: {
    name: "Kapping gel",
    price: 18000,
    durationMinutes: 60,
    paymentLink: "",
    active: true,
  },
  service_2: {
    name: "Esmaltado semipermanente",
    price: 15000,
    durationMinutes: 60,
    paymentLink: "",
    active: true,
  },
};

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function toDateInputValue(date) {
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60_000);
  return adjusted.toISOString().slice(0, 10);
}

export function getDaySchedule(config, dateString) {
  const weekday = new Date(`${dateString}T12:00:00`).getDay();
  return config.weeklySchedule?.[weekday] || DEFAULT_CONFIG.weeklySchedule[weekday];
}

export function generateHourlySlots(start, end) {
  const [startHour] = start.split(":").map(Number);
  const [endHour] = end.split(":").map(Number);
  const slots = [];

  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }

  return slots;
}

export function buildAvailableDates(config) {
  const dates = [];
  const today = new Date();
  const days = Number(config.bookingWindowDays || DEFAULT_CONFIG.bookingWindowDays);

  for (let index = 0; index < days; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const dateString = toDateInputValue(date);
    const schedule = getDaySchedule(config, dateString);

    if (schedule?.enabled) {
      dates.push(dateString);
    }
  }

  return dates;
}

export async function fetchConfig() {
  const snapshot = await get(ref(db, rootPath("config")));
  const current = snapshot.val() || {};

  return {
    ...DEFAULT_CONFIG,
    ...current,
    weeklySchedule: {
      ...DEFAULT_CONFIG.weeklySchedule,
      ...(current.weeklySchedule || {}),
    },
  };
}

export async function saveConfig(nextConfig) {
  const { services, ...configWithoutServices } = nextConfig || {};
  await set(ref(db, rootPath("config")), configWithoutServices);
}

export async function fetchServices() {
  const servicesRef = ref(db, rootPath("servicios"));
  const snapshot = await get(servicesRef);
  const current = snapshot.val();

  if (current && Object.keys(current).length) {
    return current;
  }

  await set(servicesRef, DEFAULT_SERVICES);
  return DEFAULT_SERVICES;
}

export async function saveServices(services) {
  await set(ref(db, rootPath("servicios")), services);
}

export async function upsertUserProfile(user) {
  if (!user?.uid) {
    return;
  }

  const userRef = ref(db, rootPath(`usuarios/${user.uid}`));
  const snapshot = await get(userRef);
  const current = snapshot.val() || {};

  await set(userRef, {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    providerId: user.providerData?.[0]?.providerId || "google.com",
    createdAt: current.createdAt || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  });
}

export async function createBooking({ date, time, service, user, customer }) {
  const bookingRef = ref(db, rootPath(`turnos/${date}/${time}`));

  const transaction = await runTransaction(bookingRef, (currentValue) => {
    if (currentValue) {
      return;
    }

    return {
      date,
      time,
      serviceId: service.id,
      serviceName: service.name,
      price: Number(service.price || 0),
      paymentLink: service.paymentLink || "",
      durationMinutes: Number(service.durationMinutes || 60),
      status: service.paymentLink ? "pendiente_pago" : "confirmado",
      createdAt: new Date().toISOString(),
      customer,
      user: {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
      },
    };
  });

  return transaction.committed;
}

export async function createManualBooking({
  date,
  time,
  service,
  adminUser,
  customer,
  status,
}) {
  const bookingRef = ref(db, rootPath(`turnos/${date}/${time}`));

  const transaction = await runTransaction(bookingRef, (currentValue) => {
    if (currentValue) {
      return;
    }

    return {
      date,
      time,
      serviceId: service.id,
      serviceName: service.name,
      price: Number(service.price || 0),
      paymentLink: service.paymentLink || "",
      durationMinutes: Number(service.durationMinutes || 60),
      status: status || (service.paymentLink ? "pendiente_pago" : "confirmado"),
      source: "panel",
      createdAt: new Date().toISOString(),
      customer,
      user: {
        uid: adminUser?.uid || "panel-manual",
        email: adminUser?.email || "",
        displayName: adminUser?.displayName || "Carga manual",
      },
    };
  });

  return transaction.committed;
}

export async function fetchBookings() {
  const snapshot = await get(ref(db, rootPath("turnos")));
  return snapshot.val() || {};
}

export function flattenBookings(bookingsByDate = {}) {
  return Object.entries(bookingsByDate)
    .flatMap(([date, bookingsByTime]) =>
      Object.entries(bookingsByTime || {}).map(([time, booking]) => ({
        ...booking,
        date,
        time,
      })),
    )
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export async function updateBooking(date, time, payload) {
  await update(ref(db, rootPath(`turnos/${date}/${time}`)), payload);
}

export function serviceEntries(services = {}) {
  return Object.entries(services)
    .map(([id, service]) => ({ id, ...service }))
    .filter((service) => service.active !== false);
}

export function createServiceId() {
  return `service_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildCustomerHistory(bookings = []) {
  const grouped = new Map();

  bookings.forEach((booking) => {
    const name = booking.customer?.fullName?.trim() || "Cliente sin nombre";
    const whatsapp = booking.customer?.whatsapp?.trim() || "";
    const instagram = booking.customer?.instagram?.trim() || "";
    const key = (whatsapp || name).toLowerCase();

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        fullName: name,
        whatsapp,
        instagram,
        bookings: [],
      });
    }

    grouped.get(key).bookings.push(booking);
  });

  return Array.from(grouped.values())
    .map((customer) => ({
      ...customer,
      bookings: [...customer.bookings].sort((a, b) =>
        `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`),
      ),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
}
