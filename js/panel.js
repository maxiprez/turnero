import {
  auth,
  provider,
  signInWithPopup,
  signOut,
} from "./firebase.js";
import {
  fetchConfig,
  saveConfig,
  fetchServices,
  saveServices,
  fetchBookings,
  createBooking,
  createManualBooking,
  updateBooking,
  flattenBookings,
  buildCustomerHistory,
  formatCurrency,
  formatDate,
  serviceEntries,
  createServiceId,
  buildWhatsappLink,
} from "./shared.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const state = {
  user: null,
  config: null,
  bookings: [],
};

const elements = {
  panelLoginButton: document.querySelector("#panelLoginButton"),
  panelLogoutButton: document.querySelector("#panelLogoutButton"),
  panelUserInfo: document.querySelector("#panelUserInfo"),
  panelContent: document.querySelector("#panelContent"),
  panelNotice: document.querySelector("#panelNotice"),
  panelGuard: document.querySelector("#panelGuard"),
  panelGuardMessage: document.querySelector("#panelGuardMessage"),
  settingsForm: document.querySelector("#settingsForm"),
  settingsBusinessName: document.querySelector("#settingsBusinessName"),
  settingsBookingWindow: document.querySelector("#settingsBookingWindow"),
  settingsAdminEmails: document.querySelector("#settingsAdminEmails"),
  scheduleForm: document.querySelector("#scheduleForm"),
  saveScheduleButton: document.querySelector("#saveScheduleButton"),
  servicesAdminList: document.querySelector("#servicesAdminList"),
  addServiceButton: document.querySelector("#addServiceButton"),
  saveServicesButton: document.querySelector("#saveServicesButton"),
  manualBookingForm: document.querySelector("#manualBookingForm"),
  manualDate: document.querySelector("#manualDate"),
  manualTime: document.querySelector("#manualTime"),
  manualServiceId: document.querySelector("#manualServiceId"),
  manualStatus: document.querySelector("#manualStatus"),
  saveManualBookingButton: document.querySelector("#saveManualBookingButton"),
  bookingsList: document.querySelector("#bookingsList"),
  customersList: document.querySelector("#customersList"),
};

async function boot() {
  bindEvents();
  state.config = await fetchConfig();
  state.config.services = await fetchServices();
  state.bookings = flattenBookings(await fetchBookings());
  renderEverything();
  observeAuth();
}

function bindEvents() {
  elements.panelLoginButton.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setGuardMessage(`No se pudo iniciar sesión: ${error.message}`, true);
    }
  });

  elements.panelLogoutButton.addEventListener("click", async () => {
    await signOut(auth);
  });

  elements.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncGeneralSettingsFromForm();
    await saveConfig(state.config);
    setGuardMessage("Configuración general guardada.");
  });

  elements.saveScheduleButton.addEventListener("click", async () => {
    syncScheduleFromForm();
    await saveConfig(state.config);
    setGuardMessage("Agenda guardada.");
  });

  elements.addServiceButton.addEventListener("click", () => {
    const id = createServiceId();
    state.config.services[id] = {
      name: "",
      price: 0,
      durationMinutes: 60,
      paymentLink: "",
      active: true,
    };
    renderServicesAdmin();
  });

  elements.saveServicesButton.addEventListener("click", async () => {
    syncServicesFromForm();
    await saveServices(state.config.services);
    renderServicesAdmin();
    renderManualServiceOptions();
    setGuardMessage("Servicios guardados.");
  });

  elements.manualBookingForm.addEventListener("submit", submitManualBooking);
}

function observeAuth() {
  onAuthStateChanged(auth, async (user) => {
    state.user = user;
    if (user) {
      try {
        await upsertUserProfile(user);
      } catch (error) {
        setGuardMessage(`La sesión inició, pero no pudimos registrar la usuaria: ${error.message}`, true);
      }
    }
    renderAuth();
  });
}

function renderEverything() {
  renderGeneralSettings();
  renderSchedule();
  renderServicesAdmin();
  renderManualServiceOptions();
  renderManualBookingDefaults();
  renderBookings();
  renderCustomers();
}

function renderAuth() {
  const loggedIn = Boolean(state.user);
  const isAdmin = userIsAdmin();

  elements.panelLoginButton.classList.toggle("hidden", loggedIn);
  elements.panelLogoutButton.classList.toggle("hidden", !loggedIn);
  elements.panelUserInfo.classList.toggle("hidden", !loggedIn);

  if (loggedIn) {
    elements.panelUserInfo.innerHTML = `
      <img class="avatar" src="${(state.user.photoURL && state.user.photoURL.replace(/s\d+-c/, "s200-c")) || "/favicon.jpg"}" alt="Avatar" />
      <div>
        <strong>${state.user.displayName || "Cuenta Google"}</strong>
        <p class="muted">${state.user.email || ""}</p>
      </div>
    `;
  }

  elements.panelContent.classList.toggle("hidden", !isAdmin);
  elements.panelGuard.classList.toggle("hidden", isAdmin);

  if (!loggedIn) {
    setGuardMessage("Iniciá sesión con una cuenta de Google para administrar el turnero.");
    return;
  }

  if (!isAdmin) {
    setGuardMessage(
      "Tu cuenta no está en la lista de administradoras. Agregala en `adminEmails` desde Firebase la primera vez si necesitás bootstrapear el panel.",
      true,
    );
    return;
  }

  setGuardMessage("Panel listo para administrar reservas.");
}

function userIsAdmin() {
  if (!state.user?.email) {
    return false;
  }

  const admins = state.config?.adminEmails || [];

  if (!admins.length) {
    return true;
  }

  return admins.map((email) => email.toLowerCase()).includes(state.user.email.toLowerCase());
}

function renderGeneralSettings() {
  elements.settingsBusinessName.value = state.config.businessName || "";
  elements.settingsBookingWindow.value = state.config.bookingWindowDays || 21;
  elements.settingsAdminEmails.value = (state.config.adminEmails || []).join(", ");
}

function syncGeneralSettingsFromForm() {
  state.config.businessName = elements.settingsBusinessName.value.trim();
  state.config.bookingWindowDays = Number(elements.settingsBookingWindow.value || 21);
  state.config.adminEmails = elements.settingsAdminEmails.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderSchedule() {
  elements.scheduleForm.innerHTML = WEEK_DAYS.map((day) => {
    const current = state.config.weeklySchedule?.[day.id] || {
      enabled: false,
      start: "10:00",
      end: "18:00",
    };

    return `
      <div class="schedule-row">
        <strong>${day.label}</strong>
        <label class="switch-inline">
          <input type="checkbox" data-day-enabled="${day.id}" ${current.enabled ? "checked" : ""} />
          <span>Abierto</span>
        </label>
        <label class="field">
          <span>Desde</span>
          <input type="time" data-day-start="${day.id}" value="${current.start}" />
        </label>
        <label class="field">
          <span>Hasta</span>
          <input type="time" data-day-end="${day.id}" value="${current.end}" />
        </label>
      </div>
    `;
  }).join("");
}

function syncScheduleFromForm() {
  state.config.weeklySchedule = WEEK_DAYS.reduce((accumulator, day) => {
    accumulator[day.id] = {
      enabled: document.querySelector(`[data-day-enabled="${day.id}"]`).checked,
      start: document.querySelector(`[data-day-start="${day.id}"]`).value || "10:00",
      end: document.querySelector(`[data-day-end="${day.id}"]`).value || "18:00",
    };
    return accumulator;
  }, {});
}

function renderServicesAdmin() {
  const services = Object.entries(state.config.services || {});

  elements.servicesAdminList.innerHTML = services
    .map(
      ([id, service]) => `
        <article class="admin-service-card" data-service="${id}">
          <h3>${service.name || "Nuevo servicio"}</h3>
          <div class="admin-service-grid">
            <label class="field">
              <span>Nombre</span>
              <input data-service-name="${id}" type="text" value="${service.name || ""}" />
            </label>
            <label class="field">
              <span>Precio</span>
              <input data-service-price="${id}" type="number" min="0" value="${service.price || 0}" />
            </label>
            <label class="field">
              <span>Duración en minutos</span>
              <input data-service-duration="${id}" type="number" min="30" step="30" value="${service.durationMinutes || 60}" />
            </label>
            <label class="field">
              <span>Link de pago</span>
              <input data-service-link="${id}" type="url" value="${service.paymentLink || ""}" />
            </label>
          </div>
          <label class="switch-inline">
            <input data-service-active="${id}" type="checkbox" ${service.active !== false ? "checked" : ""} />
            <span>Activo</span>
          </label>
        </article>
      `,
    )
    .join("");
}

function renderManualServiceOptions() {
  const services = Object.entries(state.config.services || {}).filter(
    ([, service]) => service.active !== false,
  );

  elements.manualServiceId.innerHTML = services
    .map(
      ([id, service]) =>
        `<option value="${id}">${service.name} · ${formatCurrency(service.price)}</option>`,
    )
    .join("");
}

function renderManualBookingDefaults() {
  if (!elements.manualDate.value) {
    elements.manualDate.value = toDateInputValue(new Date());
  }

  if (!elements.manualTime.value) {
    elements.manualTime.value = "10:00";
  }
}

function syncServicesFromForm() {
  const nextServices = {};

  Object.keys(state.config.services || {}).forEach((id) => {
    nextServices[id] = {
      name: document.querySelector(`[data-service-name="${id}"]`)?.value.trim() || "",
      price: Number(document.querySelector(`[data-service-price="${id}"]`)?.value || 0),
      durationMinutes: Number(
        document.querySelector(`[data-service-duration="${id}"]`)?.value || 60,
      ),
      paymentLink: document.querySelector(`[data-service-link="${id}"]`)?.value.trim() || "",
      active: document.querySelector(`[data-service-active="${id}"]`)?.checked ?? true,
    };
  });

  state.config.services = nextServices;
}

function renderBookings() {
  if (!state.bookings.length) {
    elements.bookingsList.innerHTML = "<p>No hay reservas registradas todavía.</p>";
    return;
  }

  elements.bookingsList.innerHTML = state.bookings
    .map((booking) => {
      const statusClass =
        booking.status === "confirmado"
          ? "success"
          : booking.status === "cancelado"
            ? "danger"
            : "warning";

      return `
        <article class="booking-card">
          <div class="booking-meta">
            <span class="tag">${formatDate(booking.date)}</span>
            <span class="tag">${booking.time}</span>
            <span class="tag ${statusClass}">${booking.status || "pendiente_pago"}</span>
          </div>
          <p><strong>${booking.serviceName}</strong> · ${formatCurrency(booking.price)}</p>
          <p><strong>Cliente:</strong> ${booking.customer?.fullName || "-"}</p>
          <p><strong>Banda:</strong> ${booking.customer?.band || "-"}</p>
          <p><strong>WhatsApp:</strong> ${booking.customer?.whatsapp || "-"}</p>
          ${booking.customer?.whatsapp ? `<a href="${buildWhatsappLink(booking)}" target="_blank" rel="noopener noreferrer" class="button button-secondary">Enviar WhatsApp</a>` : ""}
          <p><strong>Observaciones:</strong> ${booking.customer?.notes || "-"}</p>
          <p><strong>Email login:</strong> ${booking.user?.email || "-"}</p>
          <label class="field">
            <span>Estado</span>
            <select data-booking-status="${booking.date}|${booking.time}|${booking.serviceId}">
              <option value="pendiente_pago" ${booking.status === "pendiente_pago" ? "selected" : ""}>Pendiente de pago</option>
              <option value="confirmado" ${booking.status === "confirmado" ? "selected" : ""}>Confirmado</option>
              <option value="cancelado" ${booking.status === "cancelado" ? "selected" : ""}>Cancelado</option>
            </select>
          </label>
        </article>
      `;
    })
    .join("");

  elements.bookingsList.querySelectorAll("[data-booking-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      const [date, time, serviceId] = select.dataset.bookingStatus.split("|");
      await updateBooking(date, time, serviceId, { status: select.value });
      state.bookings = flattenBookings(await fetchBookings());
      renderBookings();
      setGuardMessage("Estado de la reserva actualizado.");
    });
  });
}

function renderCustomers() {
  const customers = buildCustomerHistory(state.bookings);

  if (!customers.length) {
    elements.customersList.innerHTML = "<p>Todavía no hay clientes con historial.</p>";
    return;
  }

  elements.customersList.innerHTML = customers
    .map((customer) => {
      const latest = customer.bookings[0];
      const history = customer.bookings
        .slice(0, 6)
        .map(
          (booking) => `
            <div class="customer-history-item">
              <span>${formatDate(booking.date)} · ${booking.time}</span>
              <strong>${booking.serviceName}</strong>
              <span>${formatCurrency(booking.price)}</span>
            </div>
          `,
        )
        .join("");

      return `
        <article class="booking-card">
          <div class="booking-meta">
            <span class="tag">${customer.bookings.length} reserva(s)</span>
            <span class="tag">${latest ? `Último: ${formatDate(latest.date)}` : "Sin actividad"}</span>
          </div>
          <p><strong>${customer.fullName}</strong></p>
          <p><strong>Banda:</strong> ${customer.band || "-"}</p>
          <p><strong>WhatsApp:</strong> ${customer.whatsapp || "-"}</p>
          <div class="customer-history-list">${history}</div>
        </article>
      `;
    })
    .join("");
}

async function submitManualBooking(event) {
  event.preventDefault();

  const serviceId = elements.manualServiceId.value;
  const service = Object.entries(state.config.services || {})
    .map(([id, current]) => ({ id, ...current }))
    .find((item) => item.id === serviceId);

  if (!service) {
    setGuardMessage("Elegí un servicio válido para cargar la reserva.", true);
    return;
  }

  const formData = new FormData(elements.manualBookingForm);
  elements.saveManualBookingButton.disabled = true;

  try {
    const committed = await createManualBooking({
      date: String(formData.get("manualDate") || ""),
      time: String(formData.get("manualTime") || "").slice(0, 5),
      service,
      adminUser: state.user,
      status: String(formData.get("manualStatus") || "confirmado"),
      durationMinutes: Number(formData.get("manualDuration") || 60),
      customer: {
        fullName: String(formData.get("manualFullName") || "").trim(),
        band: String(formData.get("manualBand") || "").trim(),
        whatsapp: String(formData.get("manualWhatsapp") || "").trim(),
        notes: String(formData.get("manualNotes") || "").trim(),
      },
    });

    if (!committed) {
      setGuardMessage("Ese horario ya está ocupado. Elegí otro.", true);
      return;
    }

    elements.manualBookingForm.reset();
    renderManualBookingDefaults();
    state.bookings = flattenBookings(await fetchBookings());
    renderBookings();
    renderCustomers();
    
    const whatsappLink = buildWhatsappLink({
      serviceName: service.name,
      date: String(formData.get("manualDate") || ""),
      time: String(formData.get("manualTime") || "").slice(0, 5),
      durationMinutes: Number(formData.get("manualDuration") || 60),
      customer: {
        whatsapp: String(formData.get("manualWhatsapp") || "").trim(),
      },
    });
    
    setGuardMessage(`Reserva manual guardada. <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer">Enviar WhatsApp</a>`);
    setTimeout(() => setGuardMessage(""), 10000);
  } catch (error) {
    setGuardMessage(`No se pudo guardar la reserva manual: ${error.message}`, true);
  } finally {
    elements.saveManualBookingButton.disabled = false;
  }
}

function setGuardMessage(message, isError = false) {
  elements.panelGuardMessage.innerHTML = message;
  elements.panelGuardMessage.style.color = isError ? "var(--danger)" : "var(--muted)";
  if (elements.panelNotice) {
    elements.panelNotice.innerHTML = message;
    elements.panelNotice.style.color = isError ? "var(--danger)" : "var(--muted)";
  }
}

boot();
