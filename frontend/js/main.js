/** Shared page behavior. Views only render live API responses; no demo records are created. */
document.addEventListener("DOMContentLoaded", () => {
  initializeNavigation();
  initializeHealthIndicator();
  initializeAuthForms();
  initializeDashboard();
  initializeLabs();
  initializeBooking();
  initializeFaculty();
  initializeAdmin();
  initializeIssueReport();
  initializeHistory();
  initializeLogout();
});

function initializeNavigation() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const panel = document.querySelector("[data-nav-panel]");
  if (!toggle || !panel) return;
  toggle.addEventListener("click", () => {
    const open = panel.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

async function initializeHealthIndicator() {
  const indicator = document.querySelector("[data-api-health]");
  if (!indicator) return;
  try {
    const result = await checkBackendHealth();
    indicator.dataset.state = "online";
    indicator.textContent = `API connected · ${result.database || "ready"}`;
  } catch (error) {
    indicator.dataset.state = "offline";
    if (error.status) {
      indicator.textContent = `Backend check failed · HTTP ${error.status}: ${error.message}`;
    } else if (error.code === "NETWORK_UNAVAILABLE") {
      indicator.dataset.state = "pending";
      indicator.textContent = indicator.dataset.pendingLabel || "API unavailable";
    } else {
      indicator.textContent = `Backend check failed · ${error.message}`;
    }
  }
}

function setMessage(element, message, kind = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.kind = kind;
  element.setAttribute("role", kind === "error" ? "alert" : "status");
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function initializeAuthForms() {
  const login = document.getElementById("login-form");
  const register = document.getElementById("register-form");
  if (login) login.addEventListener("submit", (event) => submitAuthForm(event, "/auth/login", "dashboard.html"));
  if (register) register.addEventListener("submit", (event) => submitAuthForm(event, "/auth/register", "login.html"));
}

async function submitAuthForm(event, endpoint, destination) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const message = form.querySelector("[data-form-message]");
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = "Please wait…";
  setMessage(message, "Sending request to the LabSlot API…", "info");
  try {
    const payload = formValues(form);
    await apiRequest(endpoint, { method: "POST", body: JSON.stringify(payload) });
    if (endpoint.endsWith("/login")) window.location.href = destination;
    else setMessage(message, "Registration request submitted. You can now sign in.", "success");
  } catch (error) {
    setMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = button.dataset.originalText;
  }
}

async function initializeDashboard() {
  const root = document.querySelector("[data-dashboard]");
  if (!root) return;
  const profileNode = document.querySelector("[data-profile-name]");
  const roleNode = document.querySelector("[data-profile-role]");
  const bookingsNode = document.querySelector("[data-bookings]");
  try {
    const result = apiRequest("/auth/me", { method: "GET" });
    const bookingsRequest = apiRequest("/bookings", { method: "GET" });
    const [profileResult, bookingsResult] = await Promise.allSettled([result, bookingsRequest]);
    if (profileResult.status === "fulfilled") {
      const profile = apiResource(profileResult.value, "user") || {};
      profileNode.textContent = profile.full_name || profile.name || profile.email || "Your account";
      roleNode.textContent = profile.role || "Member";
    } else {
      profileNode.textContent = "Profile unavailable";
      roleNode.textContent = "Unavailable";
      setMessage(document.querySelector("[data-dashboard-message]"), "Your profile could not be loaded. Check the API details and try again.", "error");
      appendErrorDetails(document.querySelector("[data-dashboard-message]"), profileResult.reason);
    }
    if (bookingsResult.status === "fulfilled") {
      const bookings = apiResource(bookingsResult.value, "bookings");
      renderRecords(bookingsNode, bookings, "No bookings were returned for this account.", "booking");
      const count = Array.isArray(bookings) ? bookings.length : "—";
      document.querySelector("[data-booking-count]").textContent = count;
    } else {
      renderApiError(bookingsNode, "booking information", bookingsResult.reason, () => initializeDashboard());
    }
  } catch (error) {
    setMessage(document.querySelector("[data-dashboard-message]"), "The dashboard could not load account information.", "error");
    appendErrorDetails(document.querySelector("[data-dashboard-message]"), error);
  }
}

async function initializeLabs() {
  const root = document.querySelector("[data-labs-page]");
  if (!root) return;
  const list = document.querySelector("[data-labs-list]");
  const equipmentList = document.querySelector("[data-equipment-list]");
  const search = document.querySelector("[data-labs-search]");
  let labs = null;

  search?.addEventListener("input", () => {
    if (Array.isArray(labs)) renderRecords(list, filterRecords(labs, search.value), "No matching laboratories.", "lab");
  });

  const loadLabs = async () => {
    renderLoading(list, "Loading laboratory information…");
    try {
      const result = await apiRequest("/labs", { method: "GET" });
      labs = apiResource(result, "labs");
      if (!Array.isArray(labs)) {
        renderApiError(list, "laboratory information", new Error("The API response did not contain a laboratory list."), loadLabs);
        return;
      }
      renderRecords(list, filterRecords(labs, search?.value || ""), labs.length ? "No matching laboratories." : "No laboratories have been listed yet.", "lab");
    } catch (error) {
      labs = null;
      renderApiError(list, "laboratory information", error, loadLabs);
    }
  };

  const loadEquipment = async () => {
    renderLoading(equipmentList, "Loading equipment information…");
    try {
      const result = await apiRequest("/equipment", { method: "GET" });
      const equipment = apiResource(result, "equipment");
      if (!Array.isArray(equipment)) {
        renderApiError(equipmentList, "equipment information", new Error("The API response did not contain an equipment list."), loadEquipment);
        return;
      }
      renderRecords(equipmentList, equipment, "No equipment has been listed yet.", "equipment");
    } catch (error) {
      renderApiError(equipmentList, "equipment information", error, loadEquipment);
    }
  };

  await Promise.all([loadLabs(), loadEquipment()]);
}

async function initializeBooking() {
  const form = document.querySelector("#booking-form");
  if (!form) return;
  const select = form.querySelector("[data-booking-lab]");
  const choiceState = form.querySelector("[data-lab-choice-state]");
  const submitButton = form.querySelector("[data-booking-submit]");
  const message = form.querySelector("[data-booking-message]");
  const dateInput = form.elements.date;
  dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const loadLabs = async () => {
    select.disabled = true;
    submitButton.disabled = true;
    select.replaceChildren(new Option("Loading laboratories…", ""));
    choiceState.textContent = "Fetching available laboratory choices from LabSlot…";
    try {
      const result = await apiRequest("/labs", { method: "GET" });
      const labs = apiResource(result, "labs");
      if (!Array.isArray(labs)) {
        renderApiError(choiceState, "laboratory choices", new Error("The API response did not contain a laboratory list."), loadLabs);
        return;
      }
      if (labs.length === 0) {
        select.replaceChildren(new Option("No laboratories currently listed", ""));
        choiceState.textContent = "No laboratories are available to request yet.";
        return;
      }
      select.replaceChildren(new Option("Select a laboratory", ""));
      labs.forEach((lab) => {
        if (lab.id === undefined || lab.id === null) return;
        const label = lab.name || lab.title || `Laboratory ${lab.id}`;
        const suffix = lab.location ? ` · ${lab.location}` : "";
        select.add(new Option(`${label}${suffix}`, String(lab.id)));
      });
      if (select.options.length > 1) {
        select.disabled = false;
        submitButton.disabled = false;
        choiceState.textContent = `${select.options.length - 1} laboratory choice(s) loaded.`;
      } else {
        select.replaceChildren(new Option("No selectable laboratories returned", ""));
        choiceState.textContent = "The API returned no laboratories with valid identifiers.";
      }
    } catch (error) {
      select.replaceChildren(new Option("Laboratories unavailable", ""));
      renderApiError(choiceState, "laboratory choices", error, loadLabs);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const start = form.elements.start_time;
    const end = form.elements.end_time;
    end.setCustomValidity(end.value && start.value && end.value <= start.value ? "End time must be later than start time." : "");
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    setMessage(message, "Sending your booking request to the LabSlot API…", "info");
    try {
      await apiRequest("/bookings", { method: "POST", body: JSON.stringify(formValues(form)) });
      setMessage(message, "The API accepted the booking request.", "success");
      form.reset();
      dateInput.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    } catch (error) {
      setMessage(message, error.message, "error");
    } finally {
      submitButton.disabled = select.disabled || select.options.length < 2;
    }
  });
  form.addEventListener("input", () => form.elements.end_time.setCustomValidity(""));
  await loadLabs();
}

async function initializeFaculty() {
  if (!document.querySelector("[data-faculty-page]")) return;
  const container = document.querySelector("[data-faculty-bookings]");
  const message = document.querySelector("[data-faculty-message]");

  const loadBookings = async () => {
    renderLoading(container, "Loading booking requests…");
    try {
      const result = await apiRequest("/bookings", { method: "GET" });
      const bookings = apiResource(result, "bookings");
      if (!Array.isArray(bookings)) {
        renderApiError(container, "booking requests", new Error("The API response did not contain a booking list."), loadBookings);
        return;
      }
      renderFacultyBookings(container, bookings, message, loadBookings);
    } catch (error) {
      renderApiError(container, "booking requests", error, loadBookings);
    }
  };
  await loadBookings();
}

async function initializeIssueReport() {
  const form = document.querySelector("#issue-form");
  if (!form) return;
  const select = form.querySelector("[data-issue-equipment]");
  const choiceState = form.querySelector("[data-equipment-choice-state]");
  const submitButton = form.querySelector("[data-issue-submit]");
  const message = form.querySelector("[data-issue-message]");

  const loadEquipment = async () => {
    select.disabled = true;
    submitButton.disabled = true;
    select.replaceChildren(new Option("Loading equipment…", ""));
    choiceState.textContent = "Fetching equipment choices from LabSlot…";
    try {
      const result = await apiRequest("/equipment", { method: "GET" });
      const equipment = apiResource(result, "equipment");
      if (!Array.isArray(equipment)) {
        renderApiError(choiceState, "equipment choices", new Error("The API response did not contain an equipment list."), loadEquipment);
        return;
      }
      const selectable = equipment.filter((item) => item.id !== undefined && item.id !== null);
      if (selectable.length === 0) {
        select.replaceChildren(new Option("No equipment currently listed", ""));
        choiceState.textContent = "No equipment records are available to report yet.";
        return;
      }
      select.replaceChildren(new Option("Select equipment", ""));
      selectable.forEach((item) => select.add(new Option(`${item.name || `Equipment ${item.id}`}${item.lab_name ? ` · ${item.lab_name}` : ""}`, String(item.id))));
      select.disabled = false;
      submitButton.disabled = false;
      choiceState.textContent = `${selectable.length} equipment choice(s) loaded.`;
    } catch (error) {
      select.replaceChildren(new Option("Equipment unavailable", ""));
      renderApiError(choiceState, "equipment choices", error, loadEquipment);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submitButton.disabled = true;
    setMessage(message, "Sending your issue report to the LabSlot API…", "info");
    const payload = formValues(form);
    payload.equipment_id = Number(payload.equipment_id);
    try {
      await apiRequest("/issues", { method: "POST", body: JSON.stringify(payload) });
      setMessage(message, "The API accepted your issue report.", "success");
      form.reset();
    } catch (error) {
      setMessage(message, error.message, "error");
    } finally {
      submitButton.disabled = select.disabled || select.options.length < 2;
    }
  });
  await loadEquipment();
}

async function initializeHistory() {
  if (!document.querySelector("[data-history-page]")) return;
  const bookingsNode = document.querySelector("[data-history-bookings]");
  const issuesNode = document.querySelector("[data-history-issues]");
  const loadBookings = () => loadHistoryCollection("/bookings", "bookings", bookingsNode);
  const loadIssues = () => loadHistoryCollection("/issues", "issues", issuesNode);
  document.querySelector("[data-reload-bookings]").addEventListener("click", loadBookings);
  document.querySelector("[data-reload-issues]").addEventListener("click", loadIssues);
  await Promise.all([loadBookings(), loadIssues()]);
}

async function loadHistoryCollection(endpoint, key, container) {
  renderLoading(container, `Loading ${key === "bookings" ? "booking" : "issue"} history…`);
  try {
    const result = await apiRequest(endpoint, { method: "GET" });
    const records = apiResource(result, key);
    if (!Array.isArray(records)) {
      renderApiError(container, `${key} history`, new Error(`The API response did not contain an ${key} list.`), () => loadHistoryCollection(endpoint, key, container));
      return;
    }
    container.replaceChildren();
    if (records.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = `No ${key} have been returned for this account.`;
      container.append(empty);
      return;
    }
    records.forEach((record) => {
      const card = createDataCard(record, key === "bookings" ? "Booking" : "Issue report");
      if (key === "bookings" && record.id !== undefined && record.id !== null && ["pending", "approved"].includes(String(record.status).toLowerCase())) {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "btn btn-outline-danger btn-sm mt-3";
        cancel.textContent = "Cancel booking";
        cancel.addEventListener("click", async () => {
          if (!window.confirm("Cancel this booking request?")) return;
          cancel.disabled = true;
          try {
            await apiRequest(`/bookings/${encodeURIComponent(record.id)}/cancel`, { method: "PATCH" });
            await loadHistoryCollection(endpoint, key, container);
          } catch (error) {
            renderInlineActionError(card, error.message);
            cancel.disabled = false;
          }
        });
        card.append(cancel);
      }
      container.append(card);
    });
  } catch (error) {
    renderApiError(container, `${key} history`, error, () => loadHistoryCollection(endpoint, key, container));
  }
}

function renderInlineActionError(container, message) {
  let node = container.querySelector("[data-action-error]");
  if (!node) {
    node = document.createElement("p");
    node.className = "text-danger mt-2 mb-0";
    node.dataset.actionError = "";
    node.setAttribute("role", "alert");
    container.append(node);
  }
  node.textContent = message;
}

function renderFacultyBookings(container, bookings, message, reload) {
  container.replaceChildren();
  if (bookings.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "There are no booking requests to review.";
    container.append(empty);
    return;
  }
  bookings.forEach((booking) => {
    const card = createDataCard(booking, "Booking request");
    const status = String(booking.status || "unknown").toLowerCase();
    const isPending = status === "pending";
    if (isPending && booking.id !== undefined && booking.id !== null) {
      const actions = document.createElement("div");
      actions.className = "d-flex flex-wrap gap-2 mt-3";
      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "btn btn-primary btn-sm";
      approve.textContent = "Approve";
      approve.addEventListener("click", () => submitBookingDecision(booking.id, "approve", "", actions, message, reload));
      const rejectToggle = document.createElement("button");
      rejectToggle.type = "button";
      rejectToggle.className = "btn btn-outline-primary btn-sm";
      rejectToggle.textContent = "Reject";
      const rejectForm = document.createElement("form");
      rejectForm.className = "decision-form mt-3";
      rejectForm.hidden = true;
      rejectForm.innerHTML = '<label class="form-label">Reason for rejection</label><textarea class="form-control mb-2" name="reason" rows="2" maxlength="500" required></textarea><button class="btn btn-outline-primary btn-sm" type="submit">Confirm rejection</button>';
      rejectToggle.addEventListener("click", () => { rejectForm.hidden = !rejectForm.hidden; });
      rejectForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!rejectForm.reportValidity()) return;
        submitBookingDecision(booking.id, "reject", rejectForm.elements.reason.value.trim(), actions, message, reload);
      });
      actions.append(approve, rejectToggle, rejectForm);
      card.append(actions);
    }
    container.append(card);
  });
}

async function submitBookingDecision(id, decision, reason, actions, message, reload) {
  actions.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  const endpoint = `/bookings/${encodeURIComponent(id)}/${decision}`;
  const options = { method: "PATCH" };
  if (decision === "reject") options.body = JSON.stringify({ reason });
  try {
    await apiRequest(endpoint, options);
    setMessage(message, `The API accepted the ${decision} decision.`, "success");
    await reload();
  } catch (error) {
    setMessage(message, error.message, "error");
    actions.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  }
}

async function initializeAdmin() {
  if (!document.querySelector("[data-admin-page]")) return;
  const labsNode = document.querySelector("[data-admin-labs]");
  const equipmentNode = document.querySelector("[data-admin-equipment]");
  const issuesNode = document.querySelector("[data-admin-issues]");
  const labSelect = document.querySelector("[data-admin-lab-select]");
  const adminMessage = document.querySelector("[data-admin-message]");
  let liveLabs = [];

  const loadLabs = async () => {
    renderLoading(labsNode, "Loading laboratories…");
    try {
      const result = await apiRequest("/labs", { method: "GET" });
      liveLabs = apiResource(result, "labs");
      if (!Array.isArray(liveLabs)) throw new Error("The API response did not contain a laboratory list.");
      populateAdminLabSelect(labSelect, liveLabs);
      renderAdminResources(labsNode, liveLabs, "lab", loadLabs, adminMessage);
    } catch (error) {
      liveLabs = [];
      labSelect.replaceChildren(new Option("Laboratories unavailable", ""));
      labSelect.disabled = true;
      renderApiError(labsNode, "laboratories", error, loadLabs);
    }
  };
  const loadEquipment = async () => loadAdminCollection("/equipment", equipmentNode, "equipment", "equipment", loadEquipment, adminMessage);
  const loadIssues = async () => loadAdminCollection("/issues", issuesNode, "issues", "issue", loadIssues, adminMessage);
  const loadAll = async () => { await Promise.all([loadLabs(), loadEquipment(), loadIssues()]); };

  document.querySelector("#admin-lab-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const payload = formValues(form);
    if (!payload.description) delete payload.description;
    await submitAdminMutation(form, "/labs", { method: "POST", body: JSON.stringify(payload) }, form.querySelector("[data-lab-form-message]"), "The API accepted the laboratory creation request.", loadAll);
  });

  document.querySelector("#admin-equipment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const payload = formValues(form);
    payload.quantity = Number(payload.quantity);
    await submitAdminMutation(form, "/equipment", { method: "POST", body: JSON.stringify(payload) }, form.querySelector("[data-equipment-form-message]"), "The API accepted the equipment creation request.", loadAll);
  });

  await loadAll();
}

function populateAdminLabSelect(select, labs) {
  select.replaceChildren(new Option(labs.length ? "Select a laboratory" : "No laboratories currently listed", ""));
  labs.forEach((lab) => {
    if (lab.id === undefined || lab.id === null) return;
    select.add(new Option(lab.name || `Laboratory ${lab.id}`, String(lab.id)));
  });
  select.disabled = select.options.length < 2;
  document.querySelector("[data-admin-equipment-submit]").disabled = select.disabled;
}

async function loadAdminCollection(endpoint, container, key, kind, reload, message) {
  renderLoading(container, `Loading ${key}…`);
  try {
    const result = await apiRequest(endpoint, { method: "GET" });
    const records = apiResource(result, key);
    if (!Array.isArray(records)) throw new Error(`The API response did not contain an ${key} list.`);
    if (kind === "equipment") renderAdminResources(container, records, kind, reload, message);
    else renderAdminIssues(container, records, message, reload);
  } catch (error) {
    renderApiError(container, key, error, reload);
  }
}

function renderAdminResources(container, records, kind, reload, message) {
  container.replaceChildren();
  if (records.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = `No ${kind === "lab" ? "laboratories" : "equipment"} are currently listed.`;
    container.append(empty);
    return;
  }
  records.forEach((record) => {
    const card = createDataCard(record, kind === "lab" ? "Laboratory" : "Equipment");
    if (record.id !== undefined && record.id !== null) {
      const actions = document.createElement("div");
      actions.className = "d-flex flex-wrap gap-2 mt-3";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-outline-primary btn-sm";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => toggleAdminEdit(card, record, kind, reload, message));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn-outline-danger btn-sm";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Delete this ${kind === "lab" ? "laboratory" : "equipment"} record? This cannot be undone.`)) return;
        remove.disabled = true;
        try {
          await apiRequest(`/${kind === "lab" ? "labs" : "equipment"}/${encodeURIComponent(record.id)}`, { method: "DELETE" });
          setMessage(message, "The API confirmed the record deletion.", "success");
          await reload();
        } catch (error) {
          setMessage(message, error.message, "error");
          remove.disabled = false;
        }
      });
      actions.append(edit, remove);
      card.append(actions);
    }
    container.append(card);
  });
}

function toggleAdminEdit(card, record, kind, reload, message) {
  const existing = card.querySelector("[data-admin-edit-form]");
  if (existing) { existing.remove(); return; }
  const fields = kind === "lab"
    ? [["name", "Name", record.name || "", "text", true], ["location", "Location", record.location || "", "text", true], ["description", "Description", record.description || "", "text", false], ["status", "Status", record.status || "", "text", false]]
    : [["name", "Name", record.name || "", "text", true], ["lab_id", "Laboratory ID", record.lab_id ?? "", "number", true], ["quantity", "Quantity", record.quantity ?? "", "number", true], ["status", "Status", record.status || "", "text", false]];
  const form = document.createElement("form");
  form.className = "admin-edit-form surface-card p-3 mt-3";
  form.dataset.adminEditForm = "";
  fields.forEach(([name, label, value, type, required]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "mb-2";
    const labelNode = document.createElement("label");
    labelNode.className = "form-label";
    labelNode.textContent = label;
    const input = document.createElement("input");
    input.className = "form-control";
    input.name = name;
    input.type = type;
    input.value = value;
    input.required = required;
    if (name === "quantity") { input.min = "1"; input.step = "1"; }
    if (name === "lab_id") { input.min = "1"; input.step = "1"; }
    labelNode.htmlFor = `edit-${kind}-${name}-${record.id}`;
    input.id = labelNode.htmlFor;
    wrapper.append(labelNode, input);
    form.append(wrapper);
  });
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "btn btn-primary btn-sm";
  save.textContent = "Save changes";
  form.append(save);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const payload = formValues(form);
    if (kind === "equipment") {
      payload.quantity = Number(payload.quantity);
      payload.lab_id = Number(payload.lab_id);
    }
    save.disabled = true;
    try {
      await apiRequest(`/${kind === "lab" ? "labs" : "equipment"}/${encodeURIComponent(record.id)}`, { method: "PUT", body: JSON.stringify(payload) });
      setMessage(message, "The API confirmed the record update.", "success");
      await reload();
    } catch (error) {
      setMessage(message, error.message, "error");
      save.disabled = false;
    }
  });
  card.append(form);
}

function renderAdminIssues(container, issues, message, reload) {
  container.replaceChildren();
  if (issues.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No equipment issues have been reported.";
    container.append(empty);
    return;
  }
  issues.forEach((issue) => {
    const card = createDataCard(issue, "Equipment issue");
    if (issue.id !== undefined && issue.id !== null) {
      const form = document.createElement("form");
      form.className = "d-flex flex-wrap align-items-end gap-2 mt-3";
      const group = document.createElement("div");
      group.className = "flex-grow-1";
      group.innerHTML = '<label class="form-label">Update status</label>';
      const select = document.createElement("select");
      select.className = "form-select";
      select.name = "status";
      select.required = true;
      const current = issue.status || "open";
      ["open", "in_progress", "resolved"].forEach((status) => select.add(new Option(status.replace("_", " "), status, status === current, status === current)));
      group.append(select);
      const save = document.createElement("button");
      save.type = "submit";
      save.className = "btn btn-outline-primary";
      save.textContent = "Update issue";
      form.append(group, save);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        save.disabled = true;
        try {
          await apiRequest(`/issues/${encodeURIComponent(issue.id)}`, { method: "PATCH", body: JSON.stringify(formValues(form)) });
          setMessage(message, "The API confirmed the issue status update.", "success");
          await reload();
        } catch (error) {
          setMessage(message, error.message, "error");
          save.disabled = false;
        }
      });
      card.append(form);
    }
    container.append(card);
  });
}

async function submitAdminMutation(form, endpoint, options, feedback, successMessage, reload) {
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  setMessage(feedback, "Sending request to the LabSlot API…", "info");
  try {
    await apiRequest(endpoint, options);
    setMessage(feedback, successMessage, "success");
    form.reset();
    await reload();
  } catch (error) {
    setMessage(feedback, error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function createDataCard(record, fallbackTitle) {
  const card = document.createElement("article");
  card.className = "data-row";
  const heading = document.createElement("div");
  heading.className = "d-flex justify-content-between align-items-start gap-2";
  const title = document.createElement("h3");
  title.textContent = record.name || record.title || record.lab_name || `${fallbackTitle}${record.id !== undefined ? ` #${record.id}` : ""}`;
  heading.append(title);
  if (record.status) {
    const badge = document.createElement("span");
    badge.className = "badge-soft";
    badge.textContent = String(record.status).replaceAll("_", " ");
    heading.append(badge);
  }
  card.append(heading);
  const detail = [record.date, record.start_time && record.end_time ? `${record.start_time}–${record.end_time}` : record.start_time, record.location, record.building, record.email, record.student_email, record.purpose, record.description, record.quantity !== undefined ? `Quantity: ${record.quantity}` : "", record.lab_id !== undefined ? `Lab ID: ${record.lab_id}` : "", record.equipment_name].filter(Boolean).join(" · ");
  if (detail) {
    const paragraph = document.createElement("p");
    paragraph.textContent = detail;
    card.append(paragraph);
  }
  return card;
}

function filterRecords(records, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return records;
  return records.filter((record) => Object.values(record || {}).some((value) => String(value ?? "").toLowerCase().includes(needle)));
}

function renderRecords(container, records, emptyMessage, kind) {
  if (!container) return;
  container.replaceChildren();
  if (!Array.isArray(records) || records.length === 0) {
    const state = document.createElement("div");
    state.className = "empty-state";
    state.textContent = emptyMessage;
    if (container.classList.contains("row")) {
      const column = document.createElement("div");
      column.className = "col-12";
      column.append(state);
      container.append(column);
    } else {
      container.append(state);
    }
    return;
  }
  records.forEach((record) => {
    const card = document.createElement("article");
    card.className = kind === "lab" ? "lab-card" : "data-row";
    const title = record.name || record.title || record.lab_name || `${kind[0].toUpperCase()}${kind.slice(1)} ${record.id ?? ""}`.trim();
    const status = record.status || record.availability || "";
    const detail = [record.location, record.building, record.description, record.quantity !== undefined ? `Quantity: ${record.quantity}` : "", record.lab_name].filter(Boolean).join(" · ");
    const heading = document.createElement("div");
    heading.className = "d-flex justify-content-between align-items-start gap-2";
    const titleNode = document.createElement("h3");
    titleNode.textContent = title;
    heading.append(titleNode);
    if (status) {
      const badge = document.createElement("span");
      badge.className = "badge-soft";
      badge.textContent = status;
      heading.append(badge);
    }
    card.append(heading);
    if (detail) {
      const description = document.createElement("p");
      description.className = "mb-0 mt-2";
      description.textContent = detail;
      card.append(description);
    }
    if (kind === "lab") {
      const column = document.createElement("div");
      column.className = "col-sm-6 col-lg-4";
      column.append(card);
      container.append(column);
    } else {
      container.append(card);
    }
  });
}

function renderLoading(container, message) {
  if (!container) return;
  container.replaceChildren();
  const state = document.createElement("div");
  state.className = "loading-state";
  state.setAttribute("role", "status");
  state.textContent = message;
  appendResourceState(container, state);
}

function renderApiError(container, resourceName, error, retry) {
  if (!container) return;
  container.replaceChildren();
  const offline = error.code === "NETWORK_UNAVAILABLE";
  const state = document.createElement("div");
  state.className = `empty-state api-state${offline ? " api-state-pending" : " api-state-error"}`;
  state.setAttribute("role", "alert");

  const title = document.createElement("h3");
  title.className = "h6 fw-bold mb-2";
  title.textContent = offline ? "Waiting for the backend" : `Couldn't load ${resourceName}`;
  state.append(title);

  const message = document.createElement("p");
  message.className = "mb-3";
  message.textContent = offline
    ? `This section will load when the LabSlot backend is connected. You can continue using the rest of the page while it is unavailable.`
    : `Please try again. The API returned an error while loading ${resourceName}.`;
  state.append(message);

  if (!offline) {
    const details = document.createElement("details");
    details.className = "api-error-details mb-3";
    const summary = document.createElement("summary");
    summary.textContent = "API error details";
    const detailText = document.createElement("p");
    detailText.className = "mb-0 mt-2";
    detailText.textContent = getApiErrorDetails(error);
    details.append(summary, detailText);
    state.append(details);
  }

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.className = "btn btn-outline-primary btn-sm";
  retryButton.textContent = "Try again";
  retryButton.addEventListener("click", retry);
  state.append(retryButton);
  appendResourceState(container, state);
}

function getApiErrorDetails(error) {
  return [error.status ? `HTTP ${error.status}` : "API response error", error.message, error.details].filter(Boolean).join(" · ");
}

function appendErrorDetails(container, error) {
  if (!container) return;
  const details = document.createElement("details");
  details.className = "api-error-details mt-2";
  const summary = document.createElement("summary");
  summary.textContent = "API error details";
  const text = document.createElement("p");
  text.className = "mb-0 mt-2";
  text.textContent = getApiErrorDetails(error);
  details.append(summary, text);
  container.append(details);
}

function appendResourceState(container, state) {
  if (container.classList.contains("row")) {
    const column = document.createElement("div");
    column.className = "col-12";
    column.append(state);
    container.append(column);
  } else {
    container.append(state);
  }
}

function renderError(container, message) {
  if (!container) return;
  container.replaceChildren();
  const state = document.createElement("div");
  state.className = "empty-state api-state api-state-error";
  state.setAttribute("role", "alert");
  state.textContent = message;
  appendResourceState(container, state);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
}

function initializeLogout() {
  document.querySelectorAll("[data-logout]").forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      const feedback = document.querySelector("[data-logout-message]");
      link.setAttribute("aria-disabled", "true");
      try {
        await apiRequest("/auth/logout", { method: "POST" });
        window.location.href = link.href;
      } catch (error) {
        link.removeAttribute("aria-disabled");
        if (feedback) feedback.textContent = `Sign out failed: ${error.message}`;
      }
    });
  });
}
