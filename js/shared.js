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
  businessName: "Salasaurio",
  bookingWindowDays: 21,
  adminEmails: [],
  weeklySchedule: {
    0: { enabled: false, start: "15:00", end: "23:00" },
    1: { enabled: true, start: "15:00", end: "23:00" },
    2: { enabled: true, start: "15:00", end: "23:00" },
    3: { enabled: true, start: "15:00", end: "23:00" },
    4: { enabled: true, start: "15:00", end: "23:00" },
    5: { enabled: true, start: "15:00", end: "23:00" },
    6: { enabled: true, start: "15:00", end: "23:00" },
  },
};

export const DEFAULT_SERVICES = {
  room_1: {
    name: "Sala 1",
    price: 18000,
    durationMinutes: 60,
    paymentLink: "",
    active: true,
  },
  room_2: {
    name: "Sala 2",
    price: 15000,
    durationMinutes: 60,
    paymentLink: "",
    active: true,
  },
  room_3: {
    name: "Sala 3",
    price: 18000,
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

export function generateDurationSlots(start, end, durationMinutes, dayBookings, serviceId) {
  if (!serviceId) return [];
  
  const [startHour] = start.split(":").map(Number);
  const [endHour] = end.split(":").map(Number);
  const blocks = Math.floor(durationMinutes / 60);
  const slots = [];

  for (let hour = startHour; hour <= endHour - blocks; hour += 1) {
    const time = `${String(hour).padStart(2, "0")}:00`;
    let available = true;

    for (let i = 0; i < blocks; i += 1) {
      const currentHour = hour + i;
      const slotTime = `${String(currentHour).padStart(2, "0")}:00`;
      const slotData = dayBookings[slotTime];

      if (!slotData) continue;
      const isReserved = Object.keys(slotData).includes(serviceId);
      
      const isOldFormatMatch = slotData.serviceId === serviceId;

      if (isReserved || isOldFormatMatch) {
        available = false;
        break; 
      }
    }
    slots.push({ time, available });
  }
  return slots;
}

export function buildAvailableDates(config) {
  const dates = [];
  const today = new Date();
  const days = Number(config?.bookingWindowDays || DEFAULT_CONFIG.bookingWindowDays);
  const effectiveConfig = config || DEFAULT_CONFIG;
 
  for (let index = 0; index < days; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const dateString = toDateInputValue(date);
    const schedule = getDaySchedule(effectiveConfig, dateString);
 
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

export async function createBooking({ date, time, service, user, customer, durationMinutes }) {
  const duration = durationMinutes || 60;
  const blocks = Math.floor(duration / 60);

  for (let i = 0; i < blocks; i += 1) {
    const [hour] = time.split(":").map(Number);
    const slotTime = `${String(hour + i).padStart(2, "0")}:00`;
    const bookingRef = ref(db, rootPath(`reservas/${date}/${slotTime}/${service.id}`));

    const isFirst = i === 0;
    const transaction = await runTransaction(bookingRef, (currentValue) => {
      if (currentValue) {
        return;
      }

      return {
        date,
        time: slotTime,
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
        bookingGroup: isFirst ? `${date}-${time}-${service.id}` : `${date}-${time}-${service.id}`,
        isPrimary: isFirst,
      };
    });

    if (!transaction.committed) {
      return false;
    }
  }

  return true;
}

export async function createManualBooking({
  date,
  time,
  service,
  adminUser,
  customer,
  status,
  durationMinutes,
}) {
  const duration = durationMinutes || 60;
  const blocks = Math.floor(duration / 60);

  for (let i = 0; i < blocks; i += 1) {
    const [hour] = time.split(":").map(Number);
    const slotTime = `${String(hour + i).padStart(2, "0")}:00`;
    const bookingRef = ref(db, rootPath(`reservas/${date}/${slotTime}/${service.id}`));

    const isFirst = i === 0;
    const transaction = await runTransaction(bookingRef, (currentValue) => {
      if (currentValue) {
        return;
      }

      return {
        date,
        time: slotTime,
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
        bookingGroup: `${date}-${time}-${service.id}`,
        isPrimary: isFirst,
      };
    });

    if (!transaction.committed) {
      return false;
    }
  }

  return true;
}

export async function fetchBookings() {
  const snapshot = await get(ref(db, rootPath("reservas")));
  return snapshot.val() || {};
}

export function flattenBookings(bookingsByDate = {}) {
  return Object.entries(bookingsByDate)
    .flatMap(([date, bookingsByTime]) =>
      Object.entries(bookingsByTime || {}).flatMap(([time, value]) => {
        if (value && value.serviceId && value.date) {
          return [{ ...value, date, time, serviceId: value.serviceId }];
        }
        return Object.entries(value || {}).map(([serviceId, booking]) => ({
          ...booking,
          date,
          time,
          serviceId,
        }));
      }),
    )
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export async function updateBooking(date, time, serviceId, payload) {
  await update(ref(db, rootPath(`reservas/${date}/${time}/${serviceId}`)), payload);
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
    const band = booking.customer?.band?.trim() || "";
    const whatsapp = booking.customer?.whatsapp?.trim() || "";
    const key = (whatsapp || name).toLowerCase();

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        band: band,
        fullName: name,
        whatsapp,
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
