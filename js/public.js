import {
  auth,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "./firebase.js";
import {
  fetchConfig,
  fetchServices,
  fetchBookings,
  createBooking,
  upsertUserProfile,
  buildAvailableDates,
  getDaySchedule,
  generateHourlySlots,
  serviceEntries,
  formatCurrency,
  formatDate,
} from "./shared.js";

const state = {
  user: null,
  config: null,
  bookings: {},
  selectedServiceId: null,
  selectedDate: null,
  selectedTime: null,
  currentStep: 1,
};

const elements = {
  businessName: document.querySelector("#businessName"),
  loginButton: document.querySelector("#loginButton"),
  logoutButton: document.querySelector("#logoutButton"),
  authLoggedOut: document.querySelector("#authLoggedOut"),
  authLoggedIn: document.querySelector("#authLoggedIn"),
  userAvatar: document.querySelector("#userAvatar"),
  userName: document.querySelector("#userName"),
  userEmail: document.querySelector("#userEmail"),
  servicesGrid: document.querySelector("#servicesGrid"),
  dateChips: document.querySelector("#dateChips"),
  slotsGrid: document.querySelector("#slotsGrid"),
  statusMessage: document.querySelector("#statusMessage"),
  wizardBookingForm: document.querySelector("#wizardBookingForm"),
  bookingSubmitButton: document.querySelector("#bookingSubmitButton"),
  summaryService: document.querySelector("#summaryService"),
  summaryDate: document.querySelector("#summaryDate"),
  summaryTime: document.querySelector("#summaryTime"),
  summaryPrice: document.querySelector("#summaryPrice"),
  summaryChipService: document.querySelector("#summaryChipService"),
  summaryChipDate: document.querySelector("#summaryChipDate"),
  summaryChipTime: document.querySelector("#summaryChipTime"),
  successMessage: document.querySelector("#successMessage"),
  successService: document.querySelector("#successService"),
  successDate: document.querySelector("#successDate"),
  successTime: document.querySelector("#successTime"),
  successStatus: document.querySelector("#successStatus"),
  stepPanels: document.querySelectorAll("[data-step-panel]"),
  stepIndicators: document.querySelectorAll("[data-step-indicator]"),
  toStep2Button: document.querySelector("#toStep2Button"),
  toStep3Button: document.querySelector("#toStep3Button"),
  toStep4Button: document.querySelector("#toStep4Button"),
  backToStep1Button: document.querySelector("#backToStep1Button"),
  backToStep2Button: document.querySelector("#backToStep2Button"),
  backToStep3Button: document.querySelector("#backToStep3Button"),
  restartWizardButton: document.querySelector("#restartWizardButton"),
};

async function boot() {
  bindEvents();
  await loadInitialData();
  observeAuth();
}

function bindEvents() {
  elements.loginButton.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setStatus(`No se pudo iniciar sesión: ${error.message}`, true);
    }
  });

  elements.logoutButton.addEventListener("click", async () => {
    await signOut(auth);
  });

  elements.toStep2Button.addEventListener("click", () => {
    if (!state.selectedServiceId) {
      setStatus("Elegí un servicio para continuar.", true);
      return;
    }
    setStep(2);
  });

  elements.toStep3Button.addEventListener("click", () => {
    if (!state.selectedDate) {
      setStatus("Elegí una fecha para continuar.", true);
      return;
    }
    setStep(3);
  });

  elements.toStep4Button.addEventListener("click", () => {
    if (!state.selectedTime) {
      setStatus("Elegí un horario para continuar.", true);
      return;
    }
    if (!state.user) {
      setStatus("Necesitás iniciar sesión con Google antes de completar la reserva.", true);
      return;
    }
    updateBookingSummary();
    setStep(4);
  });

  elements.backToStep1Button.addEventListener("click", () => setStep(1));
  elements.backToStep2Button.addEventListener("click", () => setStep(2));
  elements.backToStep3Button.addEventListener("click", () => setStep(3));
  elements.restartWizardButton.addEventListener("click", resetWizard);
  elements.wizardBookingForm.addEventListener("submit", submitBooking);
}

async function loadInitialData() {
  state.config = await fetchConfig();
  state.config.services = await fetchServices();
  state.bookings = await fetchBookings();
  state.selectedServiceId = serviceEntries(state.config.services)[0]?.id || null;
  state.selectedDate = buildAvailableDates(state.config)[0] || null;

  renderBusiness();
  renderServices();
  renderDates();
  renderSlots();
  renderWizard();
}

function observeAuth() {
  onAuthStateChanged(auth, async (user) => {
    state.user = user;
    renderAuth(user);

    if (user) {
      try {
        await upsertUserProfile(user);
      } catch (error) {
        setStatus(`La sesión inició, pero no pudimos registrar la usuaria: ${error.message}`, true);
      }
    }
  });
}

function renderBusiness() {
  elements.businessName.textContent = state.config.businessName;
}

function renderAuth(user) {
  const loggedIn = Boolean(user);
  elements.authLoggedOut.classList.toggle("hidden", loggedIn);
  elements.authLoggedIn.classList.toggle("hidden", !loggedIn);

  if (user) {
    elements.userAvatar.src =
      user.photoURL ||
      "https://ui-avatars.com/api/?background=ffd5cb&color=ba4e43&name=NA";
    elements.userName.textContent = user.displayName || "Cuenta Google";
    elements.userEmail.textContent = user.email || "";
  }
}

function renderServices() {
  const services = serviceEntries(state.config.services);

  if (!services.length) {
    elements.servicesGrid.innerHTML = "<p>No hay servicios activos.</p>";
    return;
  }

  elements.servicesGrid.innerHTML = services
    .map(
      (service) => `
        <article class="service-card ${service.id === state.selectedServiceId ? "selected" : ""}" data-service-id="${service.id}">
          <h3>${service.name}</h3>
          <p>${formatCurrency(service.price)}</p>
          <p class="muted small">${service.paymentLink ? "Requiere pago previo" : "Confirmación automática"}</p>
        </article>
      `,
    )
    .join("");

  elements.servicesGrid.querySelectorAll("[data-service-id]").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedServiceId = card.dataset.serviceId;
      state.selectedTime = null;
      renderServices();
      updateWizardSummary();
      setStatus("Servicio elegido. Ahora seguí con la fecha.");
    });
  });
}

function renderDates() {
  const dates = buildAvailableDates(state.config);

  if (!dates.length) {
    elements.dateChips.innerHTML = "<p>No hay días habilitados en este momento.</p>";
    return;
  }

  if (!state.selectedDate || !dates.includes(state.selectedDate)) {
    state.selectedDate = dates[0];
  }

  elements.dateChips.innerHTML = dates
    .map(
      (date) => `
        <button class="chip ${date === state.selectedDate ? "selected" : ""}" type="button" data-date="${date}">
          ${formatDate(date)}
        </button>
      `,
    )
    .join("");

  elements.dateChips.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      state.selectedTime = null;
      renderDates();
      renderSlots();
      updateWizardSummary();
      setStatus("Fecha elegida. Ahora elegí un horario.");
    });
  });
}

function renderSlots() {
  const schedule = state.selectedDate ? getDaySchedule(state.config, state.selectedDate) : null;
  const dayBookings = state.selectedDate ? state.bookings[state.selectedDate] || {} : {};
  const slots = schedule?.enabled ? generateHourlySlots(schedule.start, schedule.end) : [];

  if (!state.selectedServiceId) {
    elements.slotsGrid.innerHTML = "<p>Primero elegí un servicio.</p>";
    return;
  }

  if (!slots.length) {
    elements.slotsGrid.innerHTML = "<p>No hay horarios disponibles para ese día.</p>";
    return;
  }

  elements.slotsGrid.innerHTML = slots
    .map((time) => {
      const taken = Boolean(dayBookings[time]);
      return `
        <button
          class="slot-card ${taken ? "taken" : "available"} ${time === state.selectedTime ? "selected" : ""}"
          type="button"
          data-time="${time}"
          ${taken ? "disabled" : ""}
        >
          ${time}
          <br />
          <span class="small">${taken ? "Ocupado" : "Disponible"}</span>
        </button>
      `;
    })
    .join("");

  elements.slotsGrid.querySelectorAll("[data-time]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.user) {
        setStatus("Podés elegir horario ahora, pero vas a necesitar login con Google para confirmar.", false);
      }

      state.selectedTime = button.dataset.time;
      updateWizardSummary();
      updateBookingSummary();
      renderSlots();
      setStatus("Horario elegido. Ya podés completar tus datos.");
    });
  });

  if (!state.selectedTime) {
    setStatus("Elegí un horario para continuar.");
  }
}

async function submitBooking(event) {
  event.preventDefault();

  if (!state.user) {
    setStatus("Necesitás iniciar sesión con Google antes de reservar.", true);
    return;
  }

  const service = serviceEntries(state.config.services).find(
    (item) => item.id === state.selectedServiceId,
  );

  if (!service || !state.selectedDate || !state.selectedTime) {
    setStatus("Falta completar servicio, fecha u horario.", true);
    return;
  }

  const formData = new FormData(elements.wizardBookingForm);
  const customer = {
    fullName: String(formData.get("fullName") || "").trim(),
    whatsapp: String(formData.get("whatsapp") || "").trim(),
    instagram: String(formData.get("instagram") || "").trim(),
    notes: String(formData.get("notes") || "").trim(),
  };

  elements.bookingSubmitButton.disabled = true;

  try {
    const committed = await createBooking({
      date: state.selectedDate,
      time: state.selectedTime,
      service,
      user: state.user,
      customer,
    });

    if (!committed) {
      setStatus("Ese horario acaba de ocuparse. Elegí otro.", true);
      return;
    }

    state.bookings = await fetchBookings();
    renderSlots();
    elements.wizardBookingForm.reset();
    showSuccessStep(service);

    if (service.paymentLink) {
      setStatus("Turno reservado como pendiente de pago. Abrimos el link de pago en una nueva pestaña.");
      window.open(service.paymentLink, "_blank", "noopener,noreferrer");
    } else {
      setStatus("Turno reservado con éxito.");
    }
  } catch (error) {
    setStatus(`No se pudo reservar el turno: ${error.message}`, true);
  } finally {
    elements.bookingSubmitButton.disabled = false;
  }
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function setStep(step) {
  state.currentStep = step;
  renderWizard();
}

function renderWizard() {
  elements.stepPanels.forEach((panel) => {
    panel.classList.toggle("hidden", Number(panel.dataset.stepPanel) !== state.currentStep);
  });

  elements.stepIndicators.forEach((indicator) => {
    const step = Number(indicator.dataset.stepIndicator);
    const visualStep = Math.min(state.currentStep, 4);
    indicator.classList.toggle("is-active", step === visualStep && state.currentStep !== 5);
    indicator.classList.toggle("is-complete", step < visualStep || state.currentStep === 5);
  });

  updateWizardSummary();
  updateBookingSummary();
}

function updateWizardSummary() {
  const service = serviceEntries(state.config?.services || {}).find(
    (item) => item.id === state.selectedServiceId,
  );

  elements.summaryChipService.textContent = service ? service.name : "Servicio pendiente";
  elements.summaryChipDate.textContent = state.selectedDate
    ? formatDate(state.selectedDate)
    : "Fecha pendiente";
  elements.summaryChipTime.textContent = state.selectedTime || "Horario pendiente";
}

function updateBookingSummary() {
  const service = serviceEntries(state.config?.services || {}).find(
    (item) => item.id === state.selectedServiceId,
  );

  elements.summaryService.textContent = service?.name || "-";
  elements.summaryDate.textContent = state.selectedDate ? formatDate(state.selectedDate) : "-";
  elements.summaryTime.textContent = state.selectedTime || "-";
  elements.summaryPrice.textContent = service ? formatCurrency(service.price) : "-";
}

function showSuccessStep(service) {
  const pendingPayment = Boolean(service.paymentLink);
  elements.successService.textContent = service.name;
  elements.successDate.textContent = state.selectedDate ? formatDate(state.selectedDate) : "-";
  elements.successTime.textContent = state.selectedTime || "-";
  elements.successStatus.textContent = pendingPayment ? "Pendiente de pago" : "Confirmado";
  elements.successMessage.textContent = pendingPayment
    ? "Tu turno quedó reservado. Ahora solo falta completar el pago para dejarlo confirmado."
    : "Tu turno quedó confirmado con éxito. Te esperamos en el horario elegido.";
  setStep(5);
}

function resetWizard() {
  state.selectedTime = null;
  updateWizardSummary();
  updateBookingSummary();
  renderSlots();
  setStep(1);
}

boot();
