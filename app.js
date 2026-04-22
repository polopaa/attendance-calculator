/* Slot-based attendance calculator (client-side only)
 * Update TIMETABLE_EVENTS to match your college timetable.
 */

const STORAGE_KEY = "slot_attendance_calc_v3";

const DAY_TO_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function toYmdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseYmdLocal(ymd) {
  const m = String(ymd ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

function formatDateShort(date) {
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function getEndDateMay20(today) {
  // Fixed end date: May 20 of the current year (local time).
  return new Date(today.getFullYear(), 4, 20); // month is 0-based
}

function getHolidayMay1(today) {
  return `${today.getFullYear()}-05-01`;
}

function countWeekdaysInRange(startDate, endDate, holidayYmdSet) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) return counts;
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return counts;
  if (startDate > endDate) return counts;

  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  while (cur <= endDate) {
    const ymd = toYmdLocal(cur);
    if (!holidayYmdSet.has(ymd)) counts[cur.getDay()] += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return counts;
}

/**
 * Pre-made slot combinations (like "A1+TA1", "A1+SA1+TA1").
 * Users pick combinations instead of picking individual slots.
 *
 * Each combo expands into one or more slot codes used to match TIMETABLE_EVENTS.
 * Update this list to match your university's slot policy.
 */
const SLOT_COMBINATIONS = [
  // A
  { id: "A1", label: "A1", slots: ["A1"] },
  { id: "TA1", label: "TA1", slots: ["TA1"] },
  { id: "A1+TA1", label: "A1+TA1", slots: ["A1", "TA1"] },
  { id: "A1+SA1+TA1", label: "A1+SA1+TA1", slots: ["A1", "SA1", "TA1"] },

  { id: "A2", label: "A2", slots: ["A2"] },
  { id: "TA2", label: "TA2", slots: ["TA2"] },
  { id: "A2+TA2", label: "A2+TA2", slots: ["A2", "TA2"] },
  { id: "A2+SA2+TA2", label: "A2+SA2+TA2", slots: ["A2", "SA2", "TA2"] },

  // B
  { id: "B1", label: "B1", slots: ["B1"] },
  { id: "B1+TB1", label: "B1+TB1", slots: ["B1", "TB1"] },
  { id: "B1+SB1+TB1", label: "B1+SB1+TB1", slots: ["B1", "SB1", "TB1"] },

  { id: "B2", label: "B2", slots: ["B2"] },
  { id: "B2+TB2", label: "B2+TB2", slots: ["B2", "TB2"] },
  { id: "B2+SB2+TB2", label: "B2+SB2+TB2", slots: ["B2", "SB2", "TB2"] },

  // C
  { id: "C1", label: "C1", slots: ["C1"] },
  { id: "C1+TC1", label: "C1+TC1", slots: ["C1", "TC1"] },
  { id: "C1+SC1+TC1", label: "C1+SC1+TC1", slots: ["C1", "SC1", "TC1"] },

  { id: "C2", label: "C2", slots: ["C2"] },
  { id: "C2+TC2", label: "C2+TC2", slots: ["C2", "TC2"] },
  { id: "C2+SC2+TC2", label: "C2+SC2+TC2", slots: ["C2", "SC2", "TC2"] },

  // D
  { id: "D1+TDD1", label: "D1+TDD1", slots: ["D1", "TDD1"] },
  { id: "D1+TD1", label: "D1+TD1", slots: ["D1", "TD1"] },
  { id: "D1+SD1+TD1", label: "D1+SD1+TD1", slots: ["D1", "SD1", "TD1"] },

  { id: "D2", label: "D2", slots: ["D2"] },
  { id: "D2+TD2", label: "D2+TD2", slots: ["D2", "TD2"] },
  { id: "D2+TDD2", label: "D2+TDD2", slots: ["D2", "TDD2"] },
  { id: "D2+SD2+TD2", label: "D2+SD2+TD2", slots: ["D2", "SD2", "TD2"] },
  { id: "D2+TD2+TDD2", label: "D2+TD2+TDD2", slots: ["D2", "TD2", "TDD2"] },

  // E
  { id: "E1", label: "E1", slots: ["E1"] },
  { id: "E1+TE1", label: "E1+TE1", slots: ["E1", "TE1"] },
  { id: "E1+SE1+TE1", label: "E1+SE1+TE1", slots: ["E1", "SE1", "TE1"] },

  { id: "E2", label: "E2", slots: ["E2"] },
  { id: "E2+TE2", label: "E2+TE2", slots: ["E2", "TE2"] },
  { id: "E2+SE2+TE2", label: "E2+SE2+TE2", slots: ["E2", "SE2", "TE2"] },
  { id: "E2+TEE2", label: "E2+TEE2", slots: ["E2", "TEE2"] },
  { id: "E2+TE2+TEE2", label: "E2+TE2+TEE2", slots: ["E2", "TE2", "TEE2"] },

  // F
  { id: "F1", label: "F1", slots: ["F1"] },
  { id: "F1+TF1", label: "F1+TF1", slots: ["F1", "TF1"] },
  { id: "F1+SF1+TF1", label: "F1+SF1+TF1", slots: ["F1", "SF1", "TF1"] },
  { id: "F1+TFF1", label: "F1+TFF1", slots: ["F1", "TFF1"] },

  { id: "F2", label: "F2", slots: ["F2"] },
  { id: "F2+TF2", label: "F2+TF2", slots: ["F2", "TF2"] },
  { id: "F2+TFF2", label: "F2+TFF2", slots: ["F2", "TFF2"] },
  { id: "F2+SF2+TF2", label: "F2+SF2+TF2", slots: ["F2", "SF2", "TF2"] },
  { id: "F2+TF2+TFF2", label: "F2+TF2+TFF2", slots: ["F2", "TF2", "TFF2"] },
  {
    id: "F2+SF2+TF2+TFF2",
    label: "F2+SF2+TF2+TFF2",
    slots: ["F2", "SF2", "TF2", "TFF2"],
  },

  // G
  { id: "G1", label: "G1", slots: ["G1"] },
  { id: "G1+TG1", label: "G1+TG1", slots: ["G1", "TG1"] },
  { id: "G2", label: "G2", slots: ["G2"] },
];

/**
 * Each event represents ONE class session per week.
 * If a cell shows something like "A1/SE2", we store it as slots ["A1", "SE2"].
 * When calculating weekly classes, we count an event once if ANY selected slot matches.
 *
 * Source: example timetable from the prompt images (theory sessions).
 */
const TIMETABLE_EVENTS = [
  // MON
  { day: "Mon", time: "09:00", label: "09:00–09:50", slots: ["TA1"] },
  { day: "Mon", time: "10:00", label: "10:00–10:50", slots: ["TB1"] },
  { day: "Mon", time: "11:00", label: "11:00–11:50", slots: ["E1"] },
  { day: "Mon", time: "12:00", label: "12:00–12:50", slots: ["E1"] },
  { day: "Mon", time: "14:00", label: "14:00–14:50", slots: ["TA2"] },
  { day: "Mon", time: "15:00", label: "15:00–15:50", slots: ["TB2"] },
  { day: "Mon", time: "16:00", label: "16:00–16:50", slots: ["E2"] },
  { day: "Mon", time: "17:00", label: "17:00–17:50", slots: ["E2"] },

  // TUE
  { day: "Tue", time: "08:00", label: "08:00–08:50", slots: ["TFF1"] },
  { day: "Tue", time: "09:00", label: "09:00–09:50", slots: ["A1", "SE2"] },
  { day: "Tue", time: "10:00", label: "10:00–10:50", slots: ["B1", "SD2"] },
  { day: "Tue", time: "11:00", label: "11:00–11:50", slots: ["C1"] },
  { day: "Tue", time: "12:00", label: "12:00–12:50", slots: ["D1"] },
  { day: "Tue", time: "14:00", label: "14:00–14:50", slots: ["F2"] },
  { day: "Tue", time: "15:00", label: "15:00–15:50", slots: ["A2", "SF1"] },
  { day: "Tue", time: "16:00", label: "16:00–16:50", slots: ["B2", "SC1"] },
  { day: "Tue", time: "17:00", label: "17:00–17:50", slots: ["C2"] },
  { day: "Tue", time: "18:00", label: "18:00–18:50", slots: ["TDD2"] },

  // WED
  { day: "Wed", time: "08:00", label: "08:00–08:50", slots: ["TEE1"] },
  { day: "Wed", time: "09:00", label: "09:00–09:50", slots: ["D1"] },
  { day: "Wed", time: "10:00", label: "10:00–10:50", slots: ["F1"] },
  { day: "Wed", time: "11:00", label: "11:00–11:50", slots: ["G1", "TE1"] },
  { day: "Wed", time: "12:00", label: "12:00–12:50", slots: ["B1", "SC2"] },
  { day: "Wed", time: "14:00", label: "14:00–14:50", slots: ["D2"] },
  { day: "Wed", time: "15:00", label: "15:00–15:50", slots: ["F2"] },
  { day: "Wed", time: "16:00", label: "16:00–16:50", slots: ["B2", "SD1"] },
  { day: "Wed", time: "17:00", label: "17:00–17:50", slots: ["G2", "TE2"] },
  { day: "Wed", time: "18:00", label: "18:00–18:50", slots: ["TG2"] },

  // THU
  { day: "Thu", time: "08:00", label: "08:00–08:50", slots: ["TG1"] },
  { day: "Thu", time: "09:00", label: "09:00–09:50", slots: ["C1"] },
  { day: "Thu", time: "10:00", label: "10:00–10:50", slots: ["D1"] },
  { day: "Thu", time: "11:00", label: "11:00–11:50", slots: ["A1", "SB2"] },
  { day: "Thu", time: "12:00", label: "12:00–12:50", slots: ["F1"] },
  { day: "Thu", time: "14:00", label: "14:00–14:50", slots: ["E2"] },
  { day: "Thu", time: "15:00", label: "15:00–15:50", slots: ["C2"] },
  { day: "Thu", time: "16:00", label: "16:00–16:50", slots: ["A2", "SB1"] },
  { day: "Thu", time: "17:00", label: "17:00–17:50", slots: ["D2"] },
  { day: "Thu", time: "18:00", label: "18:00–18:50", slots: ["TFF2"] },

  // FRI
  { day: "Fri", time: "08:00", label: "08:00–08:50", slots: ["TDD1"] },
  { day: "Fri", time: "09:00", label: "09:00–09:50", slots: ["B1", "SA2"] },
  { day: "Fri", time: "10:00", label: "10:00–10:50", slots: ["A1", "SF2"] },
  { day: "Fri", time: "11:00", label: "11:00–11:50", slots: ["G1", "TF1"] },
  { day: "Fri", time: "12:00", label: "12:00–12:50", slots: ["E1"] },
  { day: "Fri", time: "14:00", label: "14:00–14:50", slots: ["TC2"] },
  { day: "Fri", time: "15:00", label: "15:00–15:50", slots: ["B2", "SA1"] },
  { day: "Fri", time: "16:00", label: "16:00–16:50", slots: ["A2", "SE1"] },
  { day: "Fri", time: "17:00", label: "17:00–17:50", slots: ["G2", "TF2"] },
  { day: "Fri", time: "18:00", label: "18:00–18:50", slots: ["TEE2"] },

  // SAT
  { day: "Sat", time: "09:00", label: "09:00–09:50", slots: ["TC1"] },
  { day: "Sat", time: "10:00", label: "10:00–10:50", slots: ["C1"] },
  { day: "Sat", time: "11:00", label: "11:00–11:50", slots: ["F1"] },
  { day: "Sat", time: "12:00", label: "12:00–12:50", slots: ["G1", "TD1"] },
  { day: "Sat", time: "14:00", label: "14:00–14:50", slots: ["G2", "TD2"] },
  { day: "Sat", time: "15:00", label: "15:00–15:50", slots: ["D2"] },
  { day: "Sat", time: "16:00", label: "16:00–16:50", slots: ["F2"] },
  { day: "Sat", time: "17:00", label: "17:00–17:50", slots: ["C2"] },
];

const $ = (id) => document.getElementById(id);

const els = {
  resetBtn: $("resetBtn"),

  attendanceInput: $("attendanceInput"),
  attendanceError: $("attendanceError"),
  parsedAttendance: $("parsedAttendance"),
  currentPct: $("currentPct"),

  clearBtn: $("clearBtn"),
  comboSelect: $("comboSelect"),
  selectedCombosList: $("selectedCombosList"),
  selectedCount: $("selectedCount"),
  weeklyFromSlots: $("weeklyFromSlots"),
  sessionList: $("sessionList"),

  rangeEnd: $("rangeEnd"),
  rangeEndLabel: $("rangeEndLabel"),
  holidayLabel: $("holidayLabel"),
  startDateInput: $("startDateInput"),
  remainingClasses: $("remainingClasses"),
  weeklyClasses: $("weeklyClasses"),

  attendMinus: $("attendMinus"),
  attendPlus: $("attendPlus"),
  attendInput: $("attendInput"),
  skipMinus: $("skipMinus"),
  skipPlus: $("skipPlus"),
  skipInput: $("skipInput"),
  plannedMaxLabel: $("plannedMaxLabel"),
  plannedSkip: $("plannedSkip"),
  updatedPct: $("updatedPct"),
  plannedHelp: $("plannedHelp"),

  newAttended: $("newAttended"),
  newTotal: $("newTotal"),
  remainingBig: $("remainingBig"),
  plannedBig: $("plannedBig"),
};

const nf = new Intl.NumberFormat(undefined);

function showFatalError(message) {
  const box = document.getElementById("fatalError");
  if (!box) return;
  box.hidden = false;
  box.textContent = message;
}

function setStatus(text) {
  const el = document.getElementById("jsStatus");
  if (!el) return;
  el.textContent = text;
}

function clampInt(value, min, max) {
  const n = Number.isFinite(value) ? Math.trunc(value) : 0;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function parseAttendance(value) {
  const str = String(value ?? "").trim();
  if (!str) return { attended: 0, total: 0, error: "" };

  const m = str.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) {
    return { attended: 0, total: 0, error: "Invalid format. Use attended/total (e.g. 34/42)." };
  }

  const attended = Number(m[1]);
  const total = Number(m[2]);
  if (!Number.isFinite(attended) || !Number.isFinite(total)) {
    return { attended: 0, total: 0, error: "Invalid numbers." };
  }
  if (total < 0 || attended < 0) {
    return { attended: 0, total: 0, error: "Attendance values can’t be negative." };
  }
  if (attended > total) {
    return { attended, total, error: "Attended can’t be greater than total." };
  }
  return { attended, total, error: "" };
}

function pct(attended, total) {
  if (!total) return null;
  return (attended / total) * 100;
}

function formatPct(value) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function normalizeSlotCode(code) {
  return String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function slotSortKey(code) {
  // Prefer grouping by prefix, then number (A1 < A2 < B1 ...), otherwise fallback lexical.
  const m = String(code).match(/^([A-Z]+)(\d+)$/);
  if (!m) return { kind: 1, prefix: code, num: 0, raw: code };
  return { kind: 0, prefix: m[1], num: Number(m[2]), raw: code };
}

function compareSlot(a, b) {
  const ka = slotSortKey(a);
  const kb = slotSortKey(b);
  if (ka.kind !== kb.kind) return ka.kind - kb.kind;
  if (ka.prefix !== kb.prefix) return ka.prefix.localeCompare(kb.prefix);
  if (ka.num !== kb.num) return ka.num - kb.num;
  return ka.raw.localeCompare(kb.raw);
}

function comboSortKey(comboId) {
  // Sort by first slot-like token for a stable UX (A..., B..., ...).
  const token = String(comboId).split("+")[0];
  const k = slotSortKey(token);
  return { ...k, raw: comboId };
}

function compareComboId(a, b) {
  const ka = comboSortKey(a);
  const kb = comboSortKey(b);
  if (ka.kind !== kb.kind) return ka.kind - kb.kind;
  if (ka.prefix !== kb.prefix) return ka.prefix.localeCompare(kb.prefix);
  if (ka.num !== kb.num) return ka.num - kb.num;
  return ka.raw.localeCompare(kb.raw);
}

const COMBOS_BY_ID = new Map(
  SLOT_COMBINATIONS.map((c) => [normalizeSlotCode(c.id), { ...c, id: normalizeSlotCode(c.id) }]),
);
const ALL_COMBO_IDS = [...COMBOS_BY_ID.keys()].sort(compareComboId);

function buildComboSelectOptions() {
  els.comboSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a slot combination…";
  placeholder.selected = true;
  els.comboSelect.appendChild(placeholder);

  const groups = new Map();
  for (const comboId of ALL_COMBO_IDS) {
    const key = comboId.split("+")[0].match(/^[A-Z]+/)?.[0] ?? "Other";
    let group = groups.get(key);
    if (!group) {
      group = document.createElement("optgroup");
      group.label = key;
      groups.set(key, group);
      els.comboSelect.appendChild(group);
    }
    const opt = document.createElement("option");
    opt.value = comboId;
    opt.textContent = comboId;
    group.appendChild(opt);
  }
}

let state = {
  attendance: "0/0",
  plannedAttend: 0,
  selectedCombos: new Set(),
  startDateYmd: "",
};

function saveState() {
  const payload = {
    attendance: state.attendance,
    plannedAttend: state.plannedAttend,
    selectedCombos: [...state.selectedCombos],
    startDateYmd: state.startDateYmd,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.attendance === "string") state.attendance = parsed.attendance;
    if (Number.isFinite(parsed?.plannedAttend)) state.plannedAttend = parsed.plannedAttend;
    if (typeof parsed?.startDateYmd === "string") state.startDateYmd = parsed.startDateYmd;
    if (Array.isArray(parsed?.selectedCombos)) {
      state.selectedCombos = new Set(
        parsed.selectedCombos.map(normalizeSlotCode).filter((id) => COMBOS_BY_ID.has(id)),
      );
    }
  } catch {
    // ignore
  }
}

function setAllSlots(on) {
  state.selectedCombos = new Set(on ? ALL_COMBO_IDS : []);
  syncAfterSlotsChanged();
}

function removeCombo(comboId) {
  state.selectedCombos.delete(comboId);
  syncAfterSlotsChanged();
}

function renderSelectedCombos() {
  els.selectedCombosList.innerHTML = "";
  if (!state.selectedCombos.size) return;

  const frag = document.createDocumentFragment();
  for (const comboId of ALL_COMBO_IDS) {
    if (!state.selectedCombos.has(comboId)) continue;
    const chip = document.createElement("div");
    chip.className = "chip";

    const text = document.createElement("div");
    text.className = "chipText";
    text.textContent = comboId;

    const x = document.createElement("button");
    x.type = "button";
    x.className = "chipX";
    x.textContent = "×";
    x.setAttribute("aria-label", `Remove ${comboId}`);
    x.addEventListener("click", () => removeCombo(comboId));

    chip.appendChild(text);
    chip.appendChild(x);
    frag.appendChild(chip);
  }
  els.selectedCombosList.appendChild(frag);
}

function getSelectedSlotsFromCombos() {
  const out = new Set();
  for (const comboId of state.selectedCombos) {
    const combo = COMBOS_BY_ID.get(comboId);
    if (!combo) continue;
    for (const s of combo.slots) out.add(normalizeSlotCode(s));
  }
  return out;
}

function getSelectedWeeklySessions() {
  const selectedSlots = getSelectedSlotsFromCombos();
  if (!selectedSlots.size) return [];

  return TIMETABLE_EVENTS.filter((ev) =>
    ev.slots.some((s) => selectedSlots.has(normalizeSlotCode(s))),
  );
}

function compute() {
  const attendance = parseAttendance(state.attendance);
  const selectedSessions = getSelectedWeeklySessions();
  const weeklyClasses = selectedSessions.length;
  const today = startOfTodayLocal();
  const startDate = parseYmdLocal(state.startDateYmd) ?? today;
  const endDate = getEndDateMay20(startDate);
  const holidayYmd = getHolidayMay1(endDate);
  const holidaySet = new Set([holidayYmd]);

  const counts = countWeekdaysInRange(startDate, endDate, holidaySet);
  let remaining = 0;
  for (const ev of selectedSessions) {
    const idx = DAY_TO_INDEX[ev.day];
    if (idx == null) continue;
    remaining += counts[idx] ?? 0;
  }

  const plannedAttend = clampInt(Number(state.plannedAttend), 0, remaining);

  const currentPercent = pct(attendance.attended, attendance.total);
  const newAttended = attendance.attended + plannedAttend;
  const newTotal = attendance.total + remaining;
  const updatedPercent = pct(newAttended, newTotal);

  return {
    attendance,
    weeklyClasses,
    remaining,
    plannedAttend,
    plannedSkip: remaining - plannedAttend,
    currentPercent,
    updatedPercent,
    newAttended,
    newTotal,
    selectedSessions,
    today,
    startDate,
    endDate,
    holidayYmd,
  };
}

function syncPlannedMax(remaining) {
  els.attendInput.max = String(remaining);
  els.skipInput.max = String(remaining);
  els.plannedMaxLabel.textContent = nf.format(remaining);

  if (remaining <= 0) {
    els.attendInput.value = "0";
    els.skipInput.value = "0";
    els.attendInput.disabled = true;
    els.skipInput.disabled = true;
    els.attendMinus.disabled = true;
    els.attendPlus.disabled = true;
    els.skipMinus.disabled = true;
    els.skipPlus.disabled = true;
    state.plannedAttend = 0;
    return;
  }

  els.attendInput.disabled = false;
  els.skipInput.disabled = false;
  els.attendMinus.disabled = false;
  els.attendPlus.disabled = false;
  els.skipMinus.disabled = false;
  els.skipPlus.disabled = false;
}

function renderSessions(sessions) {
  els.sessionList.innerHTML = "";
  if (!sessions.length) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Add slot combinations to see counted weekly sessions.";
    els.sessionList.appendChild(p);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const ev of sessions) {
    const div = document.createElement("div");
    div.className = "session";
    const left = document.createElement("div");
    left.className = "what";
    left.textContent = ev.slots.join(" / ");
    const right = document.createElement("div");
    right.className = "when";
    right.textContent = `${ev.day} • ${ev.label}`;
    div.appendChild(left);
    div.appendChild(right);
    frag.appendChild(div);
  }
  els.sessionList.appendChild(frag);
}

function render() {
  const r = compute();

  // Persist normalized values back into state.
  state.plannedAttend = r.plannedAttend;

  // Attendance display + error
  els.parsedAttendance.textContent = `${nf.format(r.attendance.attended)} / ${nf.format(
    r.attendance.total,
  )}`;
  els.currentPct.textContent = formatPct(r.currentPercent);

  if (r.attendance.error) {
    els.attendanceError.hidden = false;
    els.attendanceError.textContent = r.attendance.error;
  } else {
    els.attendanceError.hidden = true;
    els.attendanceError.textContent = "";
  }

  // Slots meta
  els.selectedCount.textContent = `${nf.format(state.selectedCombos.size)} selected`;
  els.weeklyFromSlots.textContent = `Weekly classes: ${nf.format(r.weeklyClasses)}`;
  renderSelectedCombos();

  // Weeks/remaining
  els.weeklyClasses.textContent = nf.format(r.weeklyClasses);
  els.remainingClasses.textContent = nf.format(r.remaining);
  els.remainingBig.textContent = nf.format(r.remaining);

  // Date range labels
  if (els.startDateInput) {
    els.startDateInput.textContent = formatDateShort(r.startDate);
    state.startDateYmd = toYmdLocal(r.startDate);
  }
  els.rangeEnd.textContent = formatDateShort(r.endDate);
  els.rangeEndLabel.textContent = r.endDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
  const holidayDate = new Date(r.endDate.getFullYear(), 4, 1);
  els.holidayLabel.textContent = holidayDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });

  // Planned attendance controls
  syncPlannedMax(r.remaining);
  els.attendInput.value = String(r.plannedAttend);
  els.skipInput.value = String(r.plannedSkip);
  els.plannedSkip.textContent = nf.format(r.plannedSkip);
  els.plannedBig.textContent = nf.format(r.plannedAttend);
  if (els.plannedHelp) {
    els.plannedHelp.textContent =
      r.startDate > r.endDate
        ? "Start date is after the end date (no classes counted)."
        : r.remaining > 0
          ? `You have ${nf.format(r.remaining)} classes left in this date range.`
          : "Add slot combinations to calculate remaining classes.";
  }

  // Updated
  els.updatedPct.textContent = formatPct(r.updatedPercent);
  els.newAttended.textContent = nf.format(r.newAttended);
  els.newTotal.textContent = nf.format(r.newTotal);

  renderSessions(r.selectedSessions);

  // Helpful live indicator for users (and quick sanity checking).
  setStatus(`Ready • ${nf.format(r.remaining)} left`);

  saveState();
}

function syncAfterSlotsChanged() {
  // When remaining changes, plannedAttend might exceed max; render() will clamp it.
  render();
}

function attachEvents() {
  els.attendanceInput.addEventListener("input", (e) => {
    state.attendance = e.target.value;
    render();
  });

  const setAttend = (nextAttend) => {
    const r = compute();
    state.plannedAttend = clampInt(Number(nextAttend), 0, r.remaining);
    render();
  };

  const setSkip = (nextSkip) => {
    const r = compute();
    const skip = clampInt(Number(nextSkip), 0, r.remaining);
    state.plannedAttend = r.remaining - skip;
    render();
  };

  els.attendMinus.addEventListener("click", () => {
    const r = compute();
    setAttend(r.plannedAttend - 1);
  });
  els.attendPlus.addEventListener("click", () => {
    const r = compute();
    setAttend(r.plannedAttend + 1);
  });
  els.skipMinus.addEventListener("click", () => {
    const r = compute();
    setSkip(r.plannedSkip - 1);
  });
  els.skipPlus.addEventListener("click", () => {
    const r = compute();
    setSkip(r.plannedSkip + 1);
  });

  els.attendInput.addEventListener("input", (e) => setAttend(e.target.value));
  els.skipInput.addEventListener("input", (e) => setSkip(e.target.value));

  els.comboSelect.addEventListener("change", () => {
    const comboId = normalizeSlotCode(els.comboSelect.value);
    if (comboId && COMBOS_BY_ID.has(comboId)) state.selectedCombos.add(comboId);
    els.comboSelect.selectedIndex = 0;
    syncAfterSlotsChanged();
  });

  // startDateInput is now a display element, no event listener needed

  els.clearBtn.addEventListener("click", () => setAllSlots(false));

  els.resetBtn.addEventListener("click", () => {
    state = {
      attendance: "0/0",
      plannedAttend: 0,
      selectedCombos: new Set(),
      startDateYmd: toYmdLocal(startOfTodayLocal()),
    };
    els.attendanceInput.value = state.attendance;
    els.comboSelect.selectedIndex = 0;
    if (els.startDateInput) els.startDateInput.textContent = formatDateShort(startOfTodayLocal());
    render();
  });
}

function init() {
  buildComboSelectOptions();
  loadState();

  // Apply loaded state to UI.
  els.attendanceInput.value = state.attendance;
  els.attendInput.value = String(state.plannedAttend);
  els.skipInput.value = "0";
  els.comboSelect.selectedIndex = 0;
  if (els.startDateInput) {
    els.startDateInput.textContent = formatDateShort(startOfTodayLocal());
    state.startDateYmd = toYmdLocal(startOfTodayLocal());
  }

  attachEvents();
  render();
  setStatus("Ready");
}

window.addEventListener("error", (e) => {
  const msg = e?.error?.stack || e?.message || "Unexpected error.";
  showFatalError(msg);
  setStatus("Error");
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e?.reason?.stack || String(e?.reason ?? "Unhandled promise rejection.");
  showFatalError(msg);
  setStatus("Error");
});

try {
  init();
} catch (e) {
  const msg = e?.stack || String(e);
  showFatalError(msg);
  setStatus("Error");
}
