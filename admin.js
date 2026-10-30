(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const vehicles = ["Auto", "SUV", "Pickup"];
  const basePrices = { Express: [15000, 18000, 22000], Full: [26000, 30000, 35000], Premium: [34000, 38000, 43000] };
  const extraNames = ["Lavado detallado de motor", "Revitalizador de cueros"];
  const baseExtras = [35000, 10000];
  const serviceItems = {
    Express: ["Lavado de exterior", "Encerado líquido"],
    Full: ["Lavado de exterior", "Encerado líquido", "Limpieza de interior", "Aspirado premium"],
    Premium: ["Lavado de exterior", "Encerado líquido", "Detallado de interior", "Revivido de plásticos", "Limpieza profunda de llantas"]
  };
  let db;
  let settings = { wa: "2612079115", slots: ["09:00", "11:30", "14:00", "16:30", "18:00"], blocked: [], busy: [], pr: {}, ex: [] };
  let privateData = { turns: [], clients: [] };
  let activeTab = "agenda";

  const esc = value => String(value == null ? "" : value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
  const money = value => "$" + Number(value || 0).toLocaleString("es-AR");
  const phoneForWhatsApp = value => {
    let phone = String(value || "").replace(/\D/g, "").replace(/^0+/, "");
    if (phone.length === 10) phone = "549" + phone;
    else if (phone.length === 12 && phone.startsWith("54") && phone[2] !== "9") phone = "549" + phone.slice(2);
    return phone;
  };
  const appointmentDate = value => {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return value;
    return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, month - 1, day));
  };
  const confirmationLink = turn => {
    const phone = phoneForWhatsApp(turn.phone);
    if (!phone) return "";
    const service = turn.svc || turn.service || "lavado";
    const vehicle = turn.veh || turn.vehicle || "vehículo";
    const extras = (turn.x || []).map(index => extraNames[index]).filter(Boolean);
    const message = `🚗💦 ¡Tu turno en FINAL TOUCH está confirmado!

📅 Fecha: ${appointmentDate(turn.date)}
🕒 Horario: ${turn.time} hs
🚘 Vehículo: ${[turn.brand, turn.model].filter(Boolean).join(" ") || vehicle}
🧽 Servicio: ${service} · ${vehicle}${extras.length ? " · " + extras.join(", ") : ""}
📍 Domicilio: ${turn.addr || turn.address || "a coordinar"}

Para poder realizar el lavado, necesitamos que tengas disponibles:
🔹 Una canilla con acceso a agua.
🔹 Un enchufe eléctrico.

⏱️ Duración estimada: entre 2 horas y media y 3 horas, dependiendo del estado general del vehículo.

¡Muchas gracias por elegirnos y confiar en nuestro servicio!

Nos vemos pronto para darle a tu vehículo el cuidado que se merece. ✨

FINAL TOUCH | Lavado Premium a Domicilio 💙`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };
  const notify = text => {
    const message = $("#message");
    message.textContent = text;
    message.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveErrorMessage = error => {
    const code = error && error.code ? ` (${error.code})` : "";
    const reason = `${error && error.code ? error.code : ""} ${error && error.message ? error.message : ""}`.toLowerCase();
    if (reason.includes("42501") || reason.includes("row-level security")) {
      return "Supabase rechazó el guardado por permisos. Revisá que el correo de ingreso sea el mismo autorizado en la política SQL de final_touch_private.";
    }
    if (reason.includes("401") || reason.includes("jwt") || reason.includes("session")) {
      return "La sesión del panel venció. Cerrá sesión, volvé a ingresar y probá guardar otra vez.";
    }
    if (reason.includes("does not exist") || reason.includes("schema cache") || reason.includes("pgrst205")) {
      return "Supabase no encuentra la tabla privada. Volvé a ejecutar el SQL de configuración en el proyecto correcto.";
    }
    const message = error && error.message ? error.message : "Error desconocido";
    return `No se pudo guardar${code}: ${message}`;
  };
  const hideMessage = () => { $("#message").style.display = "none"; };
  const defaultSettings = () => ({
    wa: "2612079115", slots: ["09:00", "11:30", "14:00", "16:30", "18:00"],
    blocked: [], busy: [], pr: {}, ex: [], promo: ""
  });

  async function loadSettings() {
    const { data, error } = await db.from("final_touch_settings").select("data").eq("id", "main").maybeSingle();
    if (error) throw error;
    settings = { ...defaultSettings(), ...(data && data.data ? data.data : {}) };
  }

  async function savePrivateData() {
    const { error } = await db.from("final_touch_private").upsert({ id: "main", data: privateData }, { onConflict: "id" });
    if (error) throw error;
  }

  async function savePublicSettings() {
    settings.busy = privateData.turns.map(turn => `${turn.date}|${turn.time}`);
    const publicData = {
      wa: settings.wa,
      slots: settings.slots,
      blocked: settings.blocked,
      busy: settings.busy,
      pr: settings.pr,
      ex: settings.ex,
      promo: settings.promo || ""
    };
    const { error } = await db.from("final_touch_settings").upsert({ id: "main", data: publicData }, { onConflict: "id" });
    if (error) throw error;
  }

  async function persist({ syncPublic = true } = {}) {
    await savePrivateData();
    if (!syncPublic) return true;
    try {
      await savePublicSettings();
      return true;
    } catch (error) {
      console.error("No se pudo actualizar la disponibilidad pública de Final Touch:", error.message);
      return false;
    }
  }

  function showLogin() {
    $("#login").hidden = false;
    $("#app").hidden = true;
    $("#logout").hidden = true;
  }

  async function enterAdmin() {
    const { data, error } = await db.from("final_touch_private").select("data").eq("id", "main").maybeSingle();
    if (error) throw error;

    if (data && data.data) {
      privateData = { turns: [], clients: [], ...data.data };
    } else {
      privateData = { turns: [], clients: [] };
      await savePrivateData();
    }

    await loadSettings();
    $("#login").hidden = true;
    $("#app").hidden = false;
    $("#logout").hidden = false;
    render();
  }

  async function handleSession(session) {
    if (!session) {
      showLogin();
      return;
    }
    try {
      await enterAdmin();
    } catch (error) {
      await db.auth.signOut();
      showLogin();
      console.error("No se pudo abrir la administración de Final Touch:", error.message);
      notify(error.code === "42501"
        ? "Ese correo no tiene permiso de administración. Revisá el correo autorizado en Supabase."
        : "No se pudo cargar el panel. Revisá la configuración de Supabase e intentá de nuevo.");
    }
  }

  function appointmentForm() {
    const serviceOptions = Object.keys(basePrices).map(name => `<option>${name}</option>`).join("");
    const vehicleOptions = vehicles.map(name => `<option>${name}</option>`).join("");
    const timeOptions = settings.slots.map(time => `<option>${esc(time)}</option>`).join("");
    const extraOptions = extraNames.map((name, index) => `<label><span><input type="checkbox" name="extra" value="${index}"> ${name}</span></label>`).join("");
    return `<section class="panel"><h2>Cargar un turno ya agendado</h2>
      <form id="turn-form" class="grid">
        <label>Fecha<input name="date" type="date" required></label>
        <label>Horario<select name="time" required>${timeOptions}</select></label>
        <label>Nombre del cliente<input name="name" required></label>
        <label>Teléfono<input name="phone" inputmode="tel"></label>
        <label>Dirección<input name="address"></label>
        <label>Marca del vehículo<input name="brand" placeholder="Ej.: Toyota"></label>
        <label>Modelo del vehículo<input name="model" placeholder="Ej.: Corolla"></label>
        <label>Información adicional (opcional)<input name="info" placeholder="Ej.: solo lavado exterior"></label>
        <label>Servicio<select name="service">${serviceOptions}</select></label>
        <label>Vehículo<select name="vehicle">${vehicleOptions}</select></label>
        <div class="grid">${extraOptions}</div>
        <button type="submit">Guardar turno</button>
      </form>
      <p class="note">Los datos del cliente solo los ves desde este acceso. El público verá únicamente los horarios ocupados.</p>
    </section>`;
  }

  function renderAgenda() {
    const turns = [...privateData.turns].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const rows = turns.length ? turns.map(turn => {
      const confirmUrl = confirmationLink(turn);
      return `<div class="row"><div><b>${esc(turn.date)} · ${esc(turn.time)}</b><div>${esc(turn.name)} · ${esc(turn.svc || turn.service)} (${esc(turn.veh || turn.vehicle)})</div><small>${[turn.brand, turn.model].filter(Boolean).map(esc).join(" ")}${turn.brand || turn.model ? " · " : ""}${esc(turn.phone)}${turn.addr || turn.address ? " · " + esc(turn.addr || turn.address) : ""}</small></div><div class="actions">${confirmUrl ? `<a class="btn" target="_blank" rel="noopener" href="${confirmUrl}">Confirmar por WhatsApp</a>` : "<small>Agregá un teléfono para enviar la confirmación</small>"}<button class="secondary" data-delete-turn="${esc(turn.id)}">Quitar</button></div></div>`;
    }).join("") : "<p>Todavía no cargaste turnos.</p>";
    return `<h2>Agenda</h2>${appointmentForm()}<section class="panel"><h2>Turnos cargados</h2>${rows}</section>`;
  }

  function renderClients() {
    const clients = privateData.clients.map(client => `<div class="row"><div><b>${esc(client.name)}</b><small>${esc(client.phone)}</small><small>${(client.washes || []).length} lavados registrados</small></div></div>`).join("");
    return `<h2>Clientes</h2><section class="panel"><form id="client-form" class="grid"><label>Nombre<input name="name" required></label><label>Teléfono<input name="phone" inputmode="tel"></label><button type="submit">Agregar cliente</button></form></section><section class="panel">${clients || "<p>Todavía no cargaste clientes.</p>"}</section>`;
  }

  function renderSettings() {
    const prices = Object.keys(basePrices).map(service => `<section class="panel"><h3>${service}</h3><div class="grid">${vehicles.map((vehicle, index) => `<label>${vehicle}<input name="price-${service}-${index}" type="number" min="0" value="${esc((settings.pr[service] || basePrices[service])[index])}"></label>`).join("")}</div></section>`).join("");
    const extras = extraNames.map((name, index) => `<label>${name}<input name="extra-${index}" type="number" min="0" value="${esc(Number.isFinite(Number(settings.ex[index])) ? settings.ex[index] : baseExtras[index])}"></label>`).join("");
    return `<h2>Ajustes privados</h2><form id="settings-form">
      <section class="panel"><div class="grid"><label>WhatsApp para reservas<input name="wa" inputmode="tel" value="${esc(settings.wa)}"></label><label>Horarios separados por coma<input name="slots" value="${esc(settings.slots.join(", "))}"></label></div></section>
      <h3>Precios por servicio y vehículo</h3>${prices}
      <section class="panel"><h3>Extras</h3><div class="grid">${extras}</div></section>
      <section class="panel"><label>Mensaje para recordatorios<textarea name="promo" rows="3">${esc(settings.promo || "")}</textarea></label></section>
      <section class="panel"><h3>Bloquear un horario puntual</h3><div class="grid"><label>Fecha<input id="block-date" type="date"></label><label>Horario<select id="block-time">${settings.slots.map(time => `<option>${esc(time)}</option>`).join("")}</select></label><button id="block-slot" type="button">Bloquear horario</button></div>${settings.blocked.map(slot => `<div class="row"><span>${esc(slot.replace("|", " · "))}</span><button type="button" class="secondary" data-unblock="${esc(slot)}">Liberar</button></div>`).join("")}</section>
      <button type="submit">Guardar ajustes</button>
    </form>`;
  }

  function render() {
    $$("#app nav button").forEach(button => button.classList.toggle("active", button.dataset.tab === activeTab));
    $("#content").innerHTML = activeTab === "agenda" ? renderAgenda() : activeTab === "clientes" ? renderClients() : renderSettings();
  }

  async function addTurn(event) {
    event.preventDefault();
    hideMessage();
    const form = event.currentTarget;
    const values = new FormData(form);
    const date = String(values.get("date") || "");
    const time = String(values.get("time") || "");
    if (privateData.turns.some(turn => turn.date === date && turn.time === time)) {
      notify("Ya hay un turno cargado en ese horario.");
      return;
    }
    const name = String(values.get("name") || "").trim();
    const phone = String(values.get("phone") || "").trim();
    const turn = {
      id: crypto.randomUUID(),
      date,
      time,
      name,
      phone,
      addr: String(values.get("address") || "").trim(),
      brand: String(values.get("brand") || "").trim(),
      model: String(values.get("model") || "").trim(),
      info: String(values.get("info") || "").trim(),
      svc: String(values.get("service") || "Express"),
      veh: String(values.get("vehicle") || "Auto"),
      x: values.getAll("extra").map(Number)
    };
    const oldClients = privateData.clients;
    privateData.turns.push(turn);
    if (phone && !privateData.clients.some(client => client.phone === phone)) {
      privateData.clients.push({ id: crypto.randomUUID(), name, phone, washes: [] });
    }
    try {
      const synced = await persist();
      notify(synced ? "Turno guardado. Ese horario ya no aparecerá disponible para los clientes." : "El turno se guardó en tu agenda, pero no se pudo actualizar la disponibilidad pública. Revisá la conexión y volvé a guardar los ajustes.");
      render();
    } catch (error) {
      privateData.turns = privateData.turns.filter(item => item.id !== turn.id);
      privateData.clients = oldClients;
      console.error("No se pudo guardar el turno de Final Touch:", error);
      notify(saveErrorMessage(error));
    }
  }

  async function addClient(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") || "").trim();
    const phone = String(values.get("phone") || "").trim();
    if (!name) return;
    if (phone && privateData.clients.some(client => client.phone === phone)) {
      notify("Ya hay un cliente registrado con ese teléfono.");
      return;
    }
    const client = { id: crypto.randomUUID(), name, phone, washes: [] };
    privateData.clients.push(client);
    try {
      await persist({ syncPublic: false });
      notify("Cliente guardado de forma privada.");
      render();
    } catch (error) {
      privateData.clients = privateData.clients.filter(item => item.id !== client.id);
      console.error("No se pudo guardar el cliente de Final Touch:", error.message);
      notify("No se pudo guardar el cliente. Revisá la conexión e intentá de nuevo.");
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const slots = String(values.get("slots") || "").split(",").map(value => value.trim());
    if (!slots.length || slots.some(value => !/^\d{1,2}:\d{2}$/.test(value))) {
      notify("Revisá los horarios. Usá el formato 09:00, 11:30, 14:00.");
      return;
    }
    settings.wa = String(values.get("wa") || "").trim();
    settings.slots = [...new Set(slots.map(value => value.padStart(5, "0")))].sort();
    settings.promo = String(values.get("promo") || "").trim();
    settings.pr = {};
    Object.keys(basePrices).forEach(service => {
      settings.pr[service] = vehicles.map((_, index) => Number(values.get(`price-${service}-${index}`)) || 0);
    });
    settings.ex = extraNames.map((_, index) => Number(values.get(`extra-${index}`)) || 0);
    try {
      await savePublicSettings();
      notify("Ajustes guardados. Se reflejarán en la página pública.");
      render();
    } catch (error) {
      console.error("No se pudieron guardar los ajustes de Final Touch:", error.message);
      notify("No se pudieron guardar los ajustes. Revisá la conexión e intentá de nuevo.");
    }
  }

  $("#login-form").addEventListener("submit", async event => {
    event.preventDefault();
    hideMessage();
    if (!db) return notify("Todavía falta conectar Supabase. Revisá la configuración del proyecto.");
    const email = $("#email").value.trim();
    try {
      const { error } = await db.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}${location.pathname}` }
      });
      if (error) throw error;
      notify("Te enviamos un enlace por correo. Abrilo en este dispositivo para entrar al panel.");
    } catch (error) {
      console.error("No se pudo iniciar sesión en Final Touch:", error.message);
      const reason = `${error.code || ""} ${error.message || ""}`.toLowerCase();
      if (reason.includes("not authorized") || reason.includes("not allowed")) {
        notify("Supabase no permite enviar a este correo todavía. Confirmá que aceptaste la invitación a la organización con este mismo correo y volvé a intentar.");
      } else if (reason.includes("rate limit") || reason.includes("too many requests")) {
        notify("Supabase limitó los correos de prueba. Esperá una hora antes de volver a intentarlo.");
      } else {
        notify(`No se pudo enviar el enlace: ${error.message || "revisá la configuración de correo y acceso en Supabase."}`);
      }
    }
  });

  $("#logout").addEventListener("click", async () => {
    const { error } = await db.auth.signOut();
    if (error) {
      console.error("No se pudo cerrar sesión en Final Touch:", error.message);
      notify("No se pudo cerrar la sesión. Intentá nuevamente.");
      return;
    }
    showLogin();
  });

  $("#app").addEventListener("click", async event => {
    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      activeTab = tabButton.dataset.tab;
      render();
      return;
    }
    if (event.target.closest("#block-slot")) {
      const date = $("#block-date").value;
      const time = $("#block-time").value;
      if (!date) return notify("Elegí una fecha para bloquear.");
      const slot = `${date}|${time}`;
      if (privateData.turns.some(turn => turn.date === date && turn.time === time)) return notify("Ese horario tiene un turno cargado; quitá el turno antes de bloquearlo.");
      const wasBlocked = settings.blocked.includes(slot);
      if (!wasBlocked) settings.blocked.push(slot);
      try {
        await savePublicSettings();
        notify("Horario bloqueado para los clientes.");
        render();
      } catch (error) {
        if (!wasBlocked) settings.blocked = settings.blocked.filter(item => item !== slot);
        console.error("No se pudo bloquear el horario de Final Touch:", error.message);
        notify("No se pudo bloquear el horario. Revisá la conexión e intentá de nuevo.");
      }
      return;
    }
    const deleteButton = event.target.closest("[data-delete-turn]");
    const unblockButton = event.target.closest("[data-unblock]");
    if (unblockButton) {
      const slot = unblockButton.dataset.unblock;
      settings.blocked = settings.blocked.filter(item => item !== slot);
      try {
        await savePublicSettings();
        notify("Horario liberado.");
        render();
      } catch (error) {
        settings.blocked.push(slot);
        console.error("No se pudo liberar el horario de Final Touch:", error.message);
        notify("No se pudo liberar el horario. Revisá la conexión e intentá de nuevo.");
      }
      return;
    }
    if (!deleteButton) return;
    const oldTurns = privateData.turns;
    privateData.turns = oldTurns.filter(turn => turn.id !== deleteButton.dataset.deleteTurn);
    try {
      const synced = await persist();
      notify(synced ? "Turno quitado de la agenda." : "Se quitó de tu agenda, pero la disponibilidad pública no se pudo actualizar.");
      render();
    } catch (error) {
      privateData.turns = oldTurns;
      console.error("No se pudo quitar el turno de Final Touch:", error.message);
      notify("No se pudo actualizar la agenda. Intentá de nuevo.");
    }
  });

  $("#app").addEventListener("submit", event => {
    if (event.target.id === "turn-form") addTurn(event);
    if (event.target.id === "client-form") addClient(event);
    if (event.target.id === "settings-form") saveSettings(event);
  });

  async function initialize() {
    const url = window.FINAL_TOUCH_SUPABASE_URL;
    const key = window.FINAL_TOUCH_SUPABASE_ANON_KEY;
    if (!window.supabase || !url || !key || url.includes("PEGAR_") || key.includes("PEGAR_")) {
      showLogin();
      notify("El panel está preparado, pero todavía falta crear y conectar tu base privada de Supabase.");
      return;
    }
    db = window.supabase.createClient(url, key);
    try {
      const { data, error } = await db.auth.getSession();
      if (error) throw error;
      await handleSession(data.session);
    } catch (error) {
      notify("No se pudo comprobar la sesión. Recargá la página e intentá de nuevo.");
      console.error("No se pudo comprobar la sesión de Final Touch:", error.message);
    }
  }

  initialize();
})();
