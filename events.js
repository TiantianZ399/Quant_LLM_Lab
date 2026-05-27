(function () {
  const STORAGE_KEY = "cqllm-events-data";
  const SESSION_KEY = "cqllm-events-admin";
  const ADMIN_PASSWORD = "columbiaquantllm";

  const FALLBACK_EVENTS = {
    upcoming: [
      {
        id: "spring-info-2026",
        datetime: "March 15, 2026 · 6:00 PM EST · Location TBA",
        title: "Spring Info Session",
        description:
          "Introduction to Columbia Quant LLM Club, our research tracks, and how to get involved.",
        formUrl: "https://forms.gle/YOUR_FORM_ID",
      },
    ],
    past: [
      {
        id: "winter-kickoff-2026",
        datetime: "February 1, 2026 · 5:30 PM EST · Location TBA",
        title: "Winter Kickoff Meetup",
        description:
          "First gathering of the semester: member introductions, club roadmap, and Q&A.",
        formUrl: "https://forms.gle/YOUR_FORM_ID",
      },
    ],
  };

  let siteDefaults = null;
  let currentEvents = null;

  const upcomingGrid = document.getElementById("upcoming-events-grid");
  const pastGrid = document.getElementById("past-events-grid");
  const adminTrigger = document.getElementById("events-admin-trigger");
  const passwordModal = document.getElementById("events-password-modal");
  const passwordForm = document.getElementById("events-password-form");
  const passwordInput = document.getElementById("events-password-input");
  const passwordError = document.getElementById("events-password-error");
  const passwordCancel = document.getElementById("events-password-cancel");
  const adminPanel = document.getElementById("events-admin-panel");
  const adminClose = document.getElementById("events-admin-close");
  const adminLogout = document.getElementById("events-admin-logout");
  const adminUpcomingList = document.getElementById("admin-upcoming-list");
  const adminPastList = document.getElementById("admin-past-list");
  const eventForm = document.getElementById("events-admin-form");
  const eventEditId = document.getElementById("event-edit-id");
  const eventType = document.getElementById("event-type");
  const eventDatetime = document.getElementById("event-datetime");
  const eventTitle = document.getElementById("event-title");
  const eventDescription = document.getElementById("event-description");
  const eventFormUrl = document.getElementById("event-form-url");
  const eventFormHeading = document.getElementById("events-form-heading");
  const eventFormSubmit = document.getElementById("event-form-submit");
  const eventFormCancel = document.getElementById("event-form-cancel");
  const downloadJsonBtn = document.getElementById("events-download-json");
  const resetDefaultsBtn = document.getElementById("events-reset-defaults");

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function newEventId() {
    return "event-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function readStoredEvents() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeStoredEvents(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async function loadSiteDefaults() {
    try {
      const response = await fetch("events-data.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("missing events-data.json");
      }
      const data = await response.json();
      return normalizeEvents(data);
    } catch {
      return clone(FALLBACK_EVENTS);
    }
  }

  function normalizeEvents(data) {
    return {
      upcoming: Array.isArray(data.upcoming) ? data.upcoming : [],
      past: Array.isArray(data.past) ? data.past : [],
    };
  }

  async function resolveEvents() {
    siteDefaults = await loadSiteDefaults();
    const stored = readStoredEvents();
    currentEvents = stored ? normalizeEvents(stored) : clone(siteDefaults);
    renderPublicEvents();
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      openAdminPanel();
    }
  }

  function persistEvents() {
    writeStoredEvents(currentEvents);
    renderPublicEvents();
    renderAdminLists();
  }

  function renderEventCard(event, isPast) {
    const buttonClass = isPast ? "button secondary" : "button primary";
    const buttonLabel = isPast ? "View registration form" : "Register";
    const cardClass = isPast ? "card event-card event-card-past" : "card event-card";

    return (
      '<article class="' +
      cardClass +
      '">' +
      '<div class="role">' +
      escapeHtml(event.datetime) +
      "</div>" +
      "<h3>" +
      escapeHtml(event.title) +
      "</h3>" +
      "<p>" +
      escapeHtml(event.description) +
      "</p>" +
      '<a class="' +
      buttonClass +
      '" href="' +
      escapeHtml(event.formUrl) +
      '" target="_blank" rel="noopener noreferrer">' +
      buttonLabel +
      "</a>" +
      "</article>"
    );
  }

  function renderPublicEvents() {
    if (!currentEvents.upcoming.length) {
      upcomingGrid.innerHTML =
        '<p class="lead events-empty">No upcoming events right now. Check back soon.</p>';
    } else {
      upcomingGrid.innerHTML = currentEvents.upcoming
        .map(function (event) {
          return renderEventCard(event, false);
        })
        .join("");
    }

    if (!currentEvents.past.length) {
      pastGrid.innerHTML = '<p class="lead events-empty">No past events listed yet.</p>';
    } else {
      pastGrid.innerHTML = currentEvents.past
        .map(function (event) {
          return renderEventCard(event, true);
        })
        .join("");
    }
  }

  function findEvent(id) {
    const upcoming = currentEvents.upcoming.find(function (event) {
      return event.id === id;
    });
    if (upcoming) {
      return { event: upcoming, type: "upcoming" };
    }
    const past = currentEvents.past.find(function (event) {
      return event.id === id;
    });
    if (past) {
      return { event: past, type: "past" };
    }
    return null;
  }

  function removeEvent(id) {
    currentEvents.upcoming = currentEvents.upcoming.filter(function (event) {
      return event.id !== id;
    });
    currentEvents.past = currentEvents.past.filter(function (event) {
      return event.id !== id;
    });
  }

  function renderAdminItem(event, type) {
    const item = document.createElement("div");
    item.className = "events-admin-item";
    item.innerHTML =
      "<div>" +
      "<strong>" +
      escapeHtml(event.title) +
      "</strong>" +
      "<div class='events-admin-item-meta'>" +
      escapeHtml(event.datetime) +
      "</div>" +
      "</div>" +
      '<div class="events-admin-item-actions">' +
      '<button type="button" class="button secondary" data-action="edit" data-id="' +
      escapeHtml(event.id) +
      '">Edit</button>' +
      '<button type="button" class="button secondary" data-action="delete" data-id="' +
      escapeHtml(event.id) +
      '">Delete</button>' +
      "</div>";

    item.querySelector('[data-action="edit"]').addEventListener("click", function () {
      startEditEvent(event.id);
    });
    item.querySelector('[data-action="delete"]').addEventListener("click", function () {
      if (window.confirm("Delete this event?")) {
        removeEvent(event.id);
        if (eventEditId.value === event.id) {
          resetEventForm();
        }
        persistEvents();
      }
    });

    return item;
  }

  function renderAdminLists() {
    adminUpcomingList.replaceChildren();
    adminPastList.replaceChildren();

    currentEvents.upcoming.forEach(function (event) {
      adminUpcomingList.appendChild(renderAdminItem(event, "upcoming"));
    });
    currentEvents.past.forEach(function (event) {
      adminPastList.appendChild(renderAdminItem(event, "past"));
    });

    if (!currentEvents.upcoming.length) {
      adminUpcomingList.innerHTML = '<p class="events-admin-empty">No upcoming events.</p>';
    }
    if (!currentEvents.past.length) {
      adminPastList.innerHTML = '<p class="events-admin-empty">No past events.</p>';
    }
  }

  function resetEventForm() {
    eventEditId.value = "";
    eventForm.reset();
    eventFormHeading.textContent = "Add event";
    eventFormSubmit.textContent = "Add event";
    eventFormCancel.hidden = true;
  }

  function startEditEvent(id) {
    const found = findEvent(id);
    if (!found) {
      return;
    }
    const event = found.event;
    eventEditId.value = event.id;
    eventType.value = found.type;
    eventDatetime.value = event.datetime;
    eventTitle.value = event.title;
    eventDescription.value = event.description;
    eventFormUrl.value = event.formUrl;
    eventFormHeading.textContent = "Edit event";
    eventFormSubmit.textContent = "Save changes";
    eventFormCancel.hidden = false;
    eventForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function openPasswordModal() {
    passwordError.hidden = true;
    passwordInput.value = "";
    passwordModal.hidden = false;
    passwordInput.focus();
  }

  function closePasswordModal() {
    passwordModal.hidden = true;
  }

  function openAdminPanel() {
    sessionStorage.setItem(SESSION_KEY, "1");
    renderAdminLists();
    resetEventForm();
    adminPanel.hidden = false;
    document.body.classList.add("events-admin-open");
  }

  function closeAdminPanel() {
    adminPanel.hidden = true;
    document.body.classList.remove("events-admin-open");
  }

  function logoutAdmin() {
    sessionStorage.removeItem(SESSION_KEY);
    closeAdminPanel();
    closePasswordModal();
  }

  function downloadEventsJson() {
    const blob = new Blob([JSON.stringify(currentEvents, null, 2) + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "events-data.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  adminTrigger.addEventListener("click", function () {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      openAdminPanel();
      return;
    }
    openPasswordModal();
  });

  passwordCancel.addEventListener("click", closePasswordModal);
  passwordModal.addEventListener("click", function (event) {
    if (event.target === passwordModal) {
      closePasswordModal();
    }
  });

  passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (passwordInput.value === ADMIN_PASSWORD) {
      closePasswordModal();
      openAdminPanel();
      return;
    }
    passwordError.hidden = false;
    passwordInput.focus();
    passwordInput.select();
  });

  adminClose.addEventListener("click", closeAdminPanel);
  adminLogout.addEventListener("click", logoutAdmin);
  adminPanel.addEventListener("click", function (event) {
    if (event.target === adminPanel) {
      closeAdminPanel();
    }
  });

  eventFormCancel.addEventListener("click", resetEventForm);

  eventForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const payload = {
      id: eventEditId.value || newEventId(),
      datetime: eventDatetime.value.trim(),
      title: eventTitle.value.trim(),
      description: eventDescription.value.trim(),
      formUrl: eventFormUrl.value.trim(),
    };

    const type = eventType.value;
    const otherType = type === "upcoming" ? "past" : "upcoming";

    removeEvent(payload.id);
    currentEvents[otherType] = currentEvents[otherType].filter(function (item) {
      return item.id !== payload.id;
    });
    currentEvents[type].push(payload);

    persistEvents();
    resetEventForm();
  });

  downloadJsonBtn.addEventListener("click", downloadEventsJson);

  resetDefaultsBtn.addEventListener("click", function () {
    if (!window.confirm("Reset events to the site default file? Unsaved browser edits will be lost.")) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    currentEvents = clone(siteDefaults);
    renderPublicEvents();
    renderAdminLists();
    resetEventForm();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (!adminPanel.hidden) {
        closeAdminPanel();
      } else if (!passwordModal.hidden) {
        closePasswordModal();
      }
    }
  });

  resolveEvents();
})();
