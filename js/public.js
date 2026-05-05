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
  generateDurationSlots,
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
  selectedDuration: 60,
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
  durationChips: document.querySelector("#durationChips"),
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
  summaryChipDuration: document.querySelector("#summaryChipDuration"),
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
  toStep5Button: document.querySelector("#toStep5Button"),
  backToStep1Button: document.querySelector("#backToStep1Button"),
  backToStep2Button: document.querySelector("#backToStep2Button"),
  backToStep3Button: document.querySelector("#backToStep3Button"),
  backToStep4Button: document.querySelector("#backToStep4Button"),
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
    if (!state.selectedDuration) {
      setStatus("Elegí una duración para continuar.", true);
      return;
    }
    setStep(4);
  });

  elements.toStep5Button.addEventListener("click", () => {
    if (!state.selectedTime) {
      setStatus("Elegí un horario para continuar.", true);
      return;
    }
    if (!state.user) {
      setStatus("Necesitás iniciar sesión con Google antes de completar la reserva.", true);
      return;
    }
    updateBookingSummary();
    setStep(5);
  });

  elements.backToStep1Button.addEventListener("click", () => setStep(1));
  elements.backToStep2Button.addEventListener("click", () => setStep(2));
  elements.backToStep3Button.addEventListener("click", () => setStep(3));
  elements.backToStep4Button.addEventListener("click", () => setStep(4));
  elements.restartWizardButton.addEventListener("click", resetWizard);
  elements.wizardBookingForm.addEventListener("submit", submitBooking);
}

async function loadInitialData() {
  state.config = await fetchConfig();
  state.config.services = await fetchServices();
  state.bookings = await fetchBookings();
  state.selectedServiceId = serviceEntries(state.config.services)[0]?.id || null;

  const services = serviceEntries(state.config.services);
  if (services.length > 0) {
    state.selectedServiceId = services[0].id;
  }

  state.selectedDate = buildAvailableDates(state.config)[0] || null;

  renderBusiness();
  renderServices();
  renderDates();
  renderDurations();
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
    elements.userAvatar.src = (state.user.photoURL && state.user.photoURL.replace(/s\d+-c/, "s200-c")) || "/favicon.jpg";
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
      renderSlots();
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
      state.selectedDuration = 60;
      state.selectedTime = null;
      renderDates();
      renderDurations();
      renderSlots();
      updateWizardSummary();
      setStatus("Fecha elegida. Ahora elegí la duración.");
    });
  });
}

function renderDurations() {
  const durations = [
    { minutes: 60, label: "1 hora" },
    { minutes: 120, label: "2 horas" },
    { minutes: 180, label: "3 horas" },
  ];

  elements.durationChips.innerHTML = durations
    .map(
      (dur) => `
        <button class="chip duration-chip ${dur.minutes === state.selectedDuration ? "selected" : ""}" type="button" data-duration="${dur.minutes}">
          ${dur.label}
        </button>
      `,
    )
    .join("");

  elements.durationChips.querySelectorAll("[data-duration]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDuration = Number(button.dataset.duration);
      state.selectedTime = null;
      renderDurations();
      renderSlots();
      updateWizardSummary();
      setStatus(`Duración elegida: ${button.textContent.trim()}. Ahora elegí horario.`);
    });
  });
}

function renderSlots() {
  const schedule = state.selectedDate ? getDaySchedule(state.config, state.selectedDate) : null;
  const dayBookings = state.selectedDate ? state.bookings[state.selectedDate] || {} : {};
  const durationSlots = schedule?.enabled
  ? generateDurationSlots(
      schedule.start, 
      schedule.end, 
      state.selectedDuration, 
      dayBookings, 
      state.selectedServiceId
    )
  : [];

  if (!state.selectedServiceId) {
    elements.slotsGrid.innerHTML = "<p>Primero elegí un servicio.</p>";
    return;
  }

  if (!state.selectedDuration) {
    elements.slotsGrid.innerHTML = "<p>Primero elegí una duración.</p>";
    return;
  }

  if (!durationSlots.length) {
    elements.slotsGrid.innerHTML = "<p>No hay horarios disponibles para ese día.</p>";
    return;
  }

  elements.slotsGrid.innerHTML = durationSlots
    .map((slot) => {
      const isTaken = !slot.available;
      const isSelected = slot.time === state.selectedTime;
      const disabledAttr = isTaken ? "disabled" : "";
      const classAttr = `slot-card ${isTaken ? "taken" : "available"} ${isSelected ? "selected" : ""}`;

      return `
        <button
          class="${classAttr}"
          type="button"
          data-time="${slot.time}"
          ${disabledAttr}
        >
          ${slot.time}
          <br />
          <span class="small">${state.selectedDuration / 60}h</span>
          <span class="small">${isTaken ? " · Ocupado" : ""}</span>
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
      durationMinutes: state.selectedDuration,
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
    const visualStep = Math.min(state.currentStep, 5);
    indicator.classList.toggle("is-active", step === visualStep && state.currentStep !== 6);
    indicator.classList.toggle("is-complete", step < visualStep || state.currentStep === 6);
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
  elements.summaryChipDuration.textContent = state.selectedDuration
    ? `${state.selectedDuration / 60}h`
    : "Duración pendiente";
  elements.summaryChipTime.textContent = state.selectedTime || "Horario pendiente";
}

function updateBookingSummary() {
  const service = serviceEntries(state.config?.services || {}).find(
    (item) => item.id === state.selectedServiceId,
  );

  elements.summaryService.textContent = service?.name || "-";
  elements.summaryDate.textContent = state.selectedDate ? formatDate(state.selectedDate) : "-";
  elements.summaryTime.textContent = state.selectedTime
    ? `${state.selectedTime} (${state.selectedDuration / 60}h)`
    : "-";
  elements.summaryPrice.textContent = service ? formatCurrency(service.price) : "-";
}

function showSuccessStep(service) {
  const pendingPayment = Boolean(service.paymentLink);
  elements.successService.textContent = service.name;
  elements.successDate.textContent = state.selectedDate ? formatDate(state.selectedDate) : "-";
  elements.successTime.textContent = state.selectedTime
    ? `${state.selectedTime} (${state.selectedDuration / 60}h)`
    : "-";
  elements.successStatus.textContent = pendingPayment ? "Pendiente de pago" : "Confirmado";
  elements.successMessage.textContent = pendingPayment
    ? "Tu turno quedó reservado. Ahora solo falta completar el pago para dejarlo confirmado."
    : "Tu turno quedó confirmado con éxito. Te esperamos en el horario elegido.";
  setStep(6);
}

function resetWizard() {
  state.selectedDuration = 60;
  state.selectedTime = null;
  updateWizardSummary();
  updateBookingSummary();
  renderDurations();
  renderSlots();
  setStep(1);
}

boot();
