import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from 'react';
import { supabase } from './supabaseClient';

/* ============================================================
   BRAND THEME
   Exact corporate colors (Deep Navy / Vibrant Cyan-Teal) applied
   via plain CSS classes — Tailwind's arbitrary-value syntax
   (e.g. bg-[#0A4D8C], scale-[0.99]) requires a JIT build step
   that isn't available in this environment, so those never
   actually rendered correctly. Real CSS is the reliable fix.
   ============================================================ */
const THEME_CSS = `
  :root {
    --hhcs-navy: #0A4D8C;
    --hhcs-navy-dark: #073A6B;
    --hhcs-teal: #00A8B5;
    --hhcs-teal-dark: #00868F;
    --hhcs-teal-tint: #E3F6F7;
    --hhcs-navy-tint: #E7EEF6;
  }
  .hhcs-bg-navy { background-color: var(--hhcs-navy); }
  .hhcs-bg-teal { background-color: var(--hhcs-teal); }
  .hhcs-bg-teal-tint { background-color: var(--hhcs-teal-tint); }
  .hhcs-bg-navy-tint { background-color: var(--hhcs-navy-tint); }
  .hhcs-text-navy { color: var(--hhcs-navy); }
  .hhcs-text-teal { color: var(--hhcs-teal-dark); }
  .hhcs-border-teal { border-color: var(--hhcs-teal); }
  .hhcs-border-navy { border-color: var(--hhcs-navy); }
  .hhcs-btn-primary { background-color: var(--hhcs-teal); color: #ffffff; }
  .hhcs-btn-primary:active { background-color: var(--hhcs-teal-dark); }
  .hhcs-btn-primary:disabled { background-color: #94a3b8; }
  .hhcs-tab-active { background-color: #ffffff; color: var(--hhcs-teal-dark); border-bottom: 2px solid var(--hhcs-teal); }
  .hhcs-chip-active { background-color: var(--hhcs-teal); color: #ffffff; border-color: var(--hhcs-teal); }
  .hhcs-input:focus { outline: none; box-shadow: 0 0 0 2px var(--hhcs-teal); border-color: var(--hhcs-teal); }
  .hhcs-required-empty { border-color: #dc2626 !important; }

  /* Print styles for the shift report — only affects window.print() output */
  @media print {
    body * { visibility: hidden; }
    #hhcs-print-report, #hhcs-print-report * { visibility: visible; }
    #hhcs-print-report { position: absolute; left: 0; top: 0; width: 100%; }
  }
`;

/* ============================================================
   MOCK DATA — real participant roster.
   Service codes: SC = Support Coordination, SW = Support Work,
   SC.SW = both, INS = In-Home Support, QLD = Queensland region.
   ============================================================ */
const MOCK_PARTICIPANTS = [
  { id: 1, name: 'Andre Lahood', service: 'SC.SW' },
  { id: 2, name: 'Colin Brown', service: 'SC' },
  { id: 3, name: 'Craig Legender', service: 'SW' },
  { id: 4, name: 'Erin Rolinson', service: 'SC.SW' },
  { id: 5, name: 'Jatin Dhanji', service: 'SW' },
  { id: 6, name: 'John Deada', service: 'SC' },
  { id: 7, name: 'Joshua Baker', service: 'SC' },
  { id: 8, name: 'Joy Furaha Noro', service: 'SW' },
  { id: 9, name: 'Larvia Tucker', service: 'SC not funded' },
  { id: 10, name: 'Loralei Steele', service: 'INS' },
  { id: 11, name: 'Madonna McLean', service: 'SC' },
  { id: 12, name: 'Mario Chaudhry-Lyons', service: 'SC' },
  { id: 13, name: 'Mary (Abuk Wol)', service: 'SW' },
  { id: 14, name: 'Moses Ramazani', service: 'SC.SW' },
  { id: 15, name: "Naomi O'Reilly", service: 'SC' },
  { id: 16, name: 'Nikki Cohen', service: 'SC.SW' },
  { id: 17, name: 'Paige Blackler', service: 'SW' },
  { id: 18, name: 'Rick McGregor', service: 'SC' },
  { id: 19, name: 'Ruth', service: 'INS' },
  { id: 20, name: 'Scott Everett', service: 'SW' },
  { id: 21, name: 'Shayah Perera', service: 'SC.SW QLD' },
  { id: 22, name: 'Thomas Baker', service: 'SC' },
  { id: 23, name: 'Wali Kassis', service: 'SC.SW' },
  { id: 24, name: 'Yasmine Etsa', service: 'SC' },
];

function generateWeekDates(startDateStr) {
  const start = new Date(startDateStr + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const DAY_LABEL = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' });

/** Formats YYYY-MM-DD as a friendly Australian date, e.g. "Mon, 3 Aug 2026". */
const FULL_DATE_LABEL = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function pad2(n) { return String(n).padStart(2, '0'); }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
/** Returns the Monday of the week containing dateStr — Australian/NDIS rosters run Mon-Sun. */
function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return toISODate(d);
}

// Calculated fresh every time the app loads — NOT a fixed string — so the
// roster automatically rolls onto the next week (and "today" moves forward)
// without anyone needing to edit the code.
const TODAY_STR = toISODate(new Date());
const CURRENT_WEEK_START = getMondayOf(TODAY_STR);

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
  { key: 'fluids', label: 'Fluids' },
];

const WEEK_START = CURRENT_WEEK_START;
const WEEK_DATES = generateWeekDates(WEEK_START);

// participantId -> date -> mealKey -> { description, fluids_ml, notes, recorded_by }
const MOCK_FOOD_DIARY = {
  1: {
    [WEEK_DATES[0]]: {
      breakfast: { description: 'Oats with banana', notes: '', recorded_by: 'JM' },
      lunch: { description: 'Chicken sandwich', notes: 'Ate half, felt full', recorded_by: 'JM' },
      dinner: { description: '', notes: '', recorded_by: '' },
      snack: { description: 'Apple slices', notes: '', recorded_by: 'JM' },
      fluids: { fluids_ml: 900, notes: 'Prefers water over juice', recorded_by: 'JM' },
    },
  },
  4: {
    [WEEK_DATES[0]]: {
      breakfast: { description: 'Toast and eggs', notes: '', recorded_by: 'KP' },
      lunch: { description: '', notes: '', recorded_by: '' },
      dinner: { description: '', notes: '', recorded_by: '' },
      snack: { description: '', notes: '', recorded_by: '' },
      fluids: { fluids_ml: 600, notes: '', recorded_by: 'KP' },
    },
  },
};

const AWOKEN_OPTIONS = ['Self-settled', 'Required assistance', 'Distressed', 'Toileting', 'N/A'];
const MOOD_OPTIONS = ['Calm', 'Settled', 'Unsettled', 'Distressed', 'Content'];

// participantId -> date -> [{ id, time_slot, status, how_awoken, mood, notes, recorded_by }]
const MOCK_SLEEP_LOGS = {
  1: {
    [TODAY_STR]: [
      { id: 'sl-1', time_slot: '20:00', status: 'awake', how_awoken: 'N/A', mood: 'Settled', notes: 'Watching TV before bed', recorded_by: 'JM' },
      { id: 'sl-2', time_slot: '22:00', status: 'asleep', how_awoken: 'N/A', mood: 'Calm', notes: '', recorded_by: 'JM' },
    ],
  },
  4: {
    [TODAY_STR]: [
      { id: 'sl-7', time_slot: '20:00', status: 'asleep', how_awoken: 'N/A', mood: 'Calm', notes: '', recorded_by: 'KP' },
    ],
  },
};

// participantId -> date -> free-text shift notes about sleep for that day (separate from per-hour slots)
const MOCK_SLEEP_DAY_NOTES = {};

// participantId -> [{ id, medication_name, scheduled_date, scheduled_time, status, recorded_by }]
const MOCK_SIGNOFFS = {
  1: [
    { id: 101, medication_name: 'Metformin 500mg', scheduled_date: TODAY_STR, scheduled_time: '08:00', status: 'given', recorded_by: 'JM' },
    { id: 102, medication_name: 'Metformin 500mg', scheduled_date: TODAY_STR, scheduled_time: '18:00', status: 'pending', recorded_by: '' },
    { id: 103, medication_name: 'Vitamin D', scheduled_date: TODAY_STR, scheduled_time: '08:00', status: 'pending', recorded_by: '' },
  ],
  13: [
    { id: 104, medication_name: 'Sertraline 50mg', scheduled_date: TODAY_STR, scheduled_time: '09:00', status: 'missed', recorded_by: 'TN' },
  ],
};

/* ============================================================
   STAFF ROSTER — for the click-your-name login screen.
   ============================================================ */
const STAFF_LIST = [
  { name: 'Kabanda Mbuyi', role: null },
  { name: 'Karma Dema', role: null },
  { name: 'Mary Johns', role: null },
  { name: 'Melissa Egan', role: 'Admin' },
  { name: 'Michael Cohen', role: 'Driver' },
  { name: 'Miriam Lee', role: null },
  { name: 'Okechukwu Ibe', role: null },
  { name: 'Saxena Johnson', role: null },
  { name: 'Sayed Khilwati', role: 'RN' },
  { name: 'Bernice Ritchie', role: null },
  { name: 'Chanceline Ibanda', role: null },
  { name: 'Chhoti Ranwa', role: null },
  { name: 'Faraja Mugisho', role: null },
];

/* ============================================================
   PARTICIPANT CONTEXT
   ============================================================ */
const ParticipantContext = createContext(null);

function ParticipantProvider({ children }) {
  const [participants, setParticipants] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pulls from the SAME Supabase "participants" table used by the main
  // NDIS Staff Portal — nothing is written here, only read.
  useEffect(() => {
    let cancelled = false;
    async function loadParticipants() {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('participants')
        .select('id, name, service')
        .order('name', { ascending: true });
      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setParticipants(data || []);
        if (data && data.length > 0) setSelectedId(data[0].id);
      }
      setLoading(false);
    }
    loadParticipants();
    return () => { cancelled = true; };
  }, []);

  function selectParticipant(id) {
    setSelectedId(id);
  }

  const selectedParticipant = useMemo(
    () => participants.find((p) => String(p.id) === String(selectedId)) || null,
    [participants, selectedId]
  );

  const value = { participants, selectedId, selectedParticipant, selectParticipant, loading, error };
  return <ParticipantContext.Provider value={value}>{children}</ParticipantContext.Provider>;
}

function useParticipant() {
  const ctx = useContext(ParticipantContext);
  if (!ctx) throw new Error('useParticipant must be used within a ParticipantProvider');
  return ctx;
}

/* ============================================================
   STAFF ATTRIBUTION CONTEXT
   Every log entry (sleep check, food diary, medication sign-off)
   must be attributed to the staff member who recorded it. This
   is captured once per session in the header and stamped onto
   every save — same idea as `recorded_by` in the DB schema.
   ============================================================ */
const StaffContext = createContext(null);

function StaffProvider({ children }) {
  const [staffName, setStaffName] = useState('');
  return <StaffContext.Provider value={{ staffName, setStaffName }}>{children}</StaffContext.Provider>;
}

function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used within a StaffProvider');
  return ctx;
}

/** Shared guard used by every save handler below. Returns true if OK to proceed. */
function requireStaffName(staffName) {
  if (!staffName || !staffName.trim()) {
    alert('Please enter your name or initials at the top of the page before saving an entry.');
    return false;
  }
  return true;
}

/* ============================================================
   STAFF LOGIN — click your name, then enter a 4-digit PIN.
   NOTE: there is no backend staff/PIN table wired up yet, so the
   PIN is not actually validated against anything — this is a
   friendlier entry flow, not real authentication. Ask if you'd
   like a Supabase "staff" table with real PINs to check against.
   ============================================================ */
function StaffLogin() {
  const { setStaffName } = useStaff();
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function pressDigit(d) {
    if (pin.length >= 4) return;
    setError('');
    setPin((p) => p + d);
  }

  function backspace() {
    setError('');
    setPin((p) => p.slice(0, -1));
  }

  function enter() {
    if (pin.length !== 4) {
      setError('Enter your 4-digit PIN.');
      return;
    }
    setStaffName(selected.role ? `${selected.name} (${selected.role})` : selected.name);
  }

  if (!selected) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
        <div className="w-full max-w-md lg:max-w-2xl xl:max-w-3xl space-y-4">
          <header className="hhcs-bg-navy rounded-xl p-4 lg:p-6 text-center">
            <h1 className="text-lg lg:text-2xl font-bold text-white">Hope Health & Care Services</h1>
            <p className="text-xs lg:text-sm text-slate-200">NDIS Participant Care Log — Staff Portal</p>
          </header>
          <div className="rounded-xl border hhcs-border-navy bg-white p-4 lg:p-6">
            <p className="text-sm font-semibold hhcs-text-navy mb-3">Tap your name to sign in</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {STAFF_LIST.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setSelected(s)}
                  className="text-left rounded-lg border border-slate-200 px-3 py-2.5 hover:hhcs-bg-teal-tint hover:hhcs-border-teal transition-colors"
                >
                  <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                  {s.role && <p className="text-xs hhcs-text-teal">{s.role}</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-10 flex items-center justify-center">
      <div className="w-full max-w-sm space-y-4">
        <header className="hhcs-bg-navy rounded-xl p-4 text-center">
          <h1 className="text-lg font-bold text-white">{selected.name}</h1>
          {selected.role && <p className="text-xs text-slate-200">{selected.role}</p>}
        </header>
        <div className="rounded-xl border hhcs-border-navy bg-white p-6 space-y-4">
          <p className="text-sm font-semibold hhcs-text-navy text-center">Enter your 4-digit PIN</p>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-11 h-12 rounded-lg border flex items-center justify-center text-lg font-bold
                  ${pin.length > i ? 'hhcs-border-teal hhcs-bg-teal-tint hhcs-text-teal' : 'border-slate-200 text-slate-300'}`}
              >
                {pin.length > i ? '•' : ''}
              </div>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => pressDigit(d)}
                className="py-3 rounded-lg border border-slate-200 text-lg font-semibold text-slate-700 hover:hhcs-bg-teal-tint"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setSelected(null); setPin(''); setError(''); }}
              className="py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-500"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => pressDigit('0')}
              className="py-3 rounded-lg border border-slate-200 text-lg font-semibold text-slate-700 hover:hhcs-bg-teal-tint"
            >
              0
            </button>
            <button
              type="button"
              onClick={backspace}
              className="py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-500"
            >
              ⌫
            </button>
          </div>
          <button
            type="button"
            onClick={enter}
            disabled={pin.length !== 4}
            className="hhcs-btn-primary w-full font-semibold py-3 rounded-lg disabled:cursor-not-allowed"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COMPACT STATUS BAR — shown once signed in, replaces the old
   free-text name field in the main dashboard.
   ============================================================ */
function StaffAttributionBar() {
  const { staffName, setStaffName } = useStaff();

  return (
    <div className="rounded-xl border hhcs-border-navy bg-white p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold hhcs-text-navy uppercase tracking-wide">Signed in as</p>
        <p className="text-sm font-semibold text-slate-800">{staffName}</p>
      </div>
      <button
        type="button"
        onClick={() => setStaffName('')}
        className="text-xs font-medium hhcs-text-teal underline shrink-0"
      >
        Switch user
      </button>
    </div>
  );
}

/* ============================================================
   PARTICIPANT SELECTOR
   ============================================================ */
function ParticipantSelector({ className = '' }) {
  const { participants, selectedId, selectParticipant, loading, error } = useParticipant();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return participants;
    const q = query.toLowerCase();
    // Null-safe: some participant records may be missing a name or service
    // value, and calling .toLowerCase() directly on undefined/null used to
    // throw and blank the whole app. String(val || '') guards against that.
    return participants.filter((p) => {
      const name = String(p?.name || '').toLowerCase();
      const service = String(p?.service || '').toLowerCase();
      return name.includes(q) || service.includes(q);
    });
  }, [participants, query]);

  const selected = participants.find((p) => String(p.id) === String(selectedId));

  if (loading) return <div className={`animate-pulse h-12 bg-slate-200 rounded-lg ${className}`} />;
  if (error) {
    return (
      <div className={`text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
        Could not load participants: {error}
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hhcs-input w-full flex items-center justify-between gap-3 rounded-xl border border-slate-300
                   bg-white px-4 py-3 text-left shadow-sm"
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">Participant</p>
          <p className="truncate font-semibold text-slate-800">
            {selected ? selected.name : 'Select participant'}
          </p>
        </div>
        {selected?.service && (
          <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-full hhcs-bg-navy-tint hhcs-text-navy">
            {selected.service}
          </span>
        )}
        <svg
          className={`shrink-0 w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
            <input
              autoFocus
              type="text"
              inputMode="search"
              placeholder="Search name or service code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <ul>
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-slate-400">No matches</li>}
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => { selectParticipant(p.id); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-2
                             hover:bg-slate-50 transition-colors
                             ${String(p.id) === String(selectedId) ? 'hhcs-bg-teal-tint' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-800 truncate">{p.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full hhcs-bg-navy-tint hhcs-text-navy">
                    {p.service}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SIGNATURE PAD
   ============================================================ */
function SignaturePad({ onChange, height = 160, value = null }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);

  const getPos = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(canvas, e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(canvas, e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    hasDrawn.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    // Always push the latest canvas contents up on pointer/touch release —
    // this is what was previously silently dropped when the parent
    // re-rendered or the component unmounted before onChange fired.
    if (hasDrawn.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    onChange(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width } = canvas.parentElement.getBoundingClientRect();
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext('2d').scale(ratio, ratio);
      // Restore a previously-saved signature (e.g. reopening an in-progress
      // row) so the drawing isn't lost on re-render/resize.
      if (value) {
        const img = new Image();
        img.onload = () => {
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        };
        img.src = value;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 touch-none"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-slate-400">Sign with finger or stylus</span>
        <button type="button" onClick={clear} className="text-xs font-medium hhcs-text-teal">
          Clear
        </button>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-500',
  given: 'bg-emerald-100 text-emerald-700',
  missed: 'bg-red-100 text-red-700',
  refused: 'bg-amber-100 text-amber-700',
};

/* ============================================================
   SHARED DATA CONTEXTS for Medication / Food Diary / Sleep Log.
   These used to be plain useState inside each tab component,
   which meant (a) switching tabs could lose in-progress data
   depending on how the tab was rendered, and (b) there was no
   way for the "Download & Print Shift Report" feature to see
   this data at all. Lifting it up here fixes both at once —
   the data now lives above the tabs and above the report.
   ============================================================ */
const MedicationDataContext = createContext(null);
function MedicationDataProvider({ children }) {
  const [signoffsByParticipant, setSignoffsByParticipant] = useState(MOCK_SIGNOFFS);
  return (
    <MedicationDataContext.Provider value={{ signoffsByParticipant, setSignoffsByParticipant }}>
      {children}
    </MedicationDataContext.Provider>
  );
}
function useMedicationData() {
  const ctx = useContext(MedicationDataContext);
  if (!ctx) throw new Error('useMedicationData must be used within a MedicationDataProvider');
  return ctx;
}

const FoodDiaryContext = createContext(null);
function FoodDiaryProvider({ children }) {
  const [diaryByParticipant, setDiaryByParticipant] = useState(MOCK_FOOD_DIARY);
  return (
    <FoodDiaryContext.Provider value={{ diaryByParticipant, setDiaryByParticipant }}>
      {children}
    </FoodDiaryContext.Provider>
  );
}
function useFoodDiary() {
  const ctx = useContext(FoodDiaryContext);
  if (!ctx) throw new Error('useFoodDiary must be used within a FoodDiaryProvider');
  return ctx;
}

const SleepLogContext = createContext(null);
function SleepLogDataProvider({ children }) {
  const [logsByParticipant, setLogsByParticipant] = useState(MOCK_SLEEP_LOGS);
  const [dayNotesByParticipant, setDayNotesByParticipant] = useState(MOCK_SLEEP_DAY_NOTES);
  return (
    <SleepLogContext.Provider value={{ logsByParticipant, setLogsByParticipant, dayNotesByParticipant, setDayNotesByParticipant }}>
      {children}
    </SleepLogContext.Provider>
  );
}
function useSleepLogData() {
  const ctx = useContext(SleepLogContext);
  if (!ctx) throw new Error('useSleepLogData must be used within a SleepLogDataProvider');
  return ctx;
}


/* ============================================================
   MEDICATION SIGN-OFF — dynamic dose times, staff attribution.
   Signature is now stored on the sign-off record itself (was
   previously captured into local state and then discarded when
   the row was confirmed — the record never actually kept it).
   ============================================================ */
function MedicationSignOff() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const { signoffsByParticipant, setSignoffsByParticipant } = useMedicationData();
  const [activeRow, setActiveRow] = useState(null);
  const [signature, setSignature] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('given');
  const [notes, setNotes] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newDose, setNewDose] = useState({ medication_name: '', scheduled_time: '08:00' });
  const [date, setDate] = useState(TODAY_STR); // navigable — defaults to today, auto-calculated above

  const allSignoffs = signoffsByParticipant[selectedId] || [];
  const signoffs = allSignoffs.filter((s) => s.scheduled_date === date);

  // NOTE: we intentionally do NOT clear activeRow/signature/notes when the
  // participant or date changes anymore — the parent Dashboard now keeps
  // this whole tab mounted (see App/Dashboard below) instead of unmounting
  // it when the user switches tabs, so in-progress typing is preserved.
  // Switching *participant* still makes sense to reset the open row though,
  // since a row keyed to another participant is no longer relevant.
  useEffect(() => {
    setActiveRow(null);
    setSignature(null);
    setNotes('');
  }, [selectedId]);

  function openRow(s) {
    if (s.status !== 'pending') return;
    if (activeRow === s.id) {
      setActiveRow(null);
      return;
    }
    setActiveRow(s.id);
    setSignature(s.signature || null);
    setNotes(s.notes || '');
    setPendingStatus('given');
  }

  const submitSignOff = useCallback(
    async (signoffId) => {
      if (!requireStaffName(staffName)) return;
      if (pendingStatus === 'given' && !signature) {
        alert('A signature is required to confirm medication was given.');
        return;
      }
      setSubmitting(true);
      await new Promise((r) => setTimeout(r, 350)); // simulated network latency
      setSignoffsByParticipant((prev) => ({
        ...prev,
        [selectedId]: (prev[selectedId] || []).map((s) =>
          s.id === signoffId
            ? {
                ...s,
                status: pendingStatus,
                recorded_by: staffName.trim(),
                // Persist the captured signature data URL onto the record so
                // it survives after the row collapses — this is the actual
                // fix for "signature doesn't save".
                signature: pendingStatus === 'given' ? signature : s.signature || null,
                notes: notes.trim(),
                signed_at: new Date().toISOString(),
              }
            : s
        ),
      }));
      setActiveRow(null);
      setSignature(null);
      setNotes('');
      setPendingStatus('given');
      setSubmitting(false);
    },
    [pendingStatus, signature, notes, selectedId, staffName, setSignoffsByParticipant]
  );

  function addDose() {
    if (!requireStaffName(staffName)) return;
    if (!newDose.medication_name.trim()) {
      alert('Enter a medication name.');
      return;
    }
    const entry = {
      id: `new-${Date.now()}`,
      medication_name: newDose.medication_name.trim(),
      scheduled_date: date,
      scheduled_time: newDose.scheduled_time,
      status: 'pending',
      recorded_by: '',
      added_by: staffName.trim(),
      signature: null,
    };
    setSignoffsByParticipant((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), entry],
    }));
    setNewDose({ medication_name: '', scheduled_time: '08:00' });
    setAddOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border hhcs-border-navy p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold hhcs-text-navy">Medication Sign-Off</h2>
            <p className="text-xs text-slate-500">
              Scheduled medication administration record for{' '}
              <span className="font-semibold text-slate-700">{selectedParticipant?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="hhcs-input rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Action bar */}
        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-slate-500">
            Showing schedule for <span className="font-semibold">{FULL_DATE_LABEL(date)}</span>
          </p>
          <button
            type="button"
            onClick={() => setAddOpen((o) => !o)}
            className="hhcs-btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm"
          >
            {addOpen ? 'Cancel' : '+ Add Scheduled Dose'}
          </button>
        </div>

        {/* Add dose form */}
        {addOpen && (
          <div className="rounded-xl border hhcs-border-teal hhcs-bg-teal-tint p-4 space-y-3">
            <p className="text-xs font-bold hhcs-text-navy uppercase tracking-wide">Add New Scheduled Dose for {FULL_DATE_LABEL(date)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medication Name & Dose</label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol 500mg, 1 tablet"
                  value={newDose.medication_name}
                  onChange={(e) => setNewDose((d) => ({ ...d, medication_name: e.target.value }))}
                  className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Time</label>
                <input
                  type="time"
                  value={newDose.scheduled_time}
                  onChange={(e) => setNewDose((d) => ({ ...d, scheduled_time: e.target.value }))}
                  className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={addDose}
                className="hhcs-btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Save to Schedule
              </button>
            </div>
          </div>
        )}

        {/* Medication list */}
        <div className="space-y-3">
          {signoffs.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm text-slate-500">No scheduled medications for this date.</p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-2 text-xs font-semibold hhcs-text-teal underline"
              >
                Add a dose
              </button>
            </div>
          ) : (
            signoffs.map((s) => {
              const isOpen = activeRow === s.id;
              const isPending = s.status === 'pending';
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border transition-all ${
                    isOpen ? 'hhcs-border-teal shadow-md bg-white' : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Summary row */}
                  <div
                    onClick={() => openRow(s)}
                    className={`p-4 flex items-center justify-between gap-3 ${
                      isPending ? 'cursor-pointer hover:bg-slate-50' : ''
                    } rounded-xl`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded hhcs-bg-navy-tint hhcs-text-navy">
                          {s.scheduled_time}
                        </span>
                        <h3 className="font-semibold text-slate-800 truncate">{s.medication_name}</h3>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {s.recorded_by && <span>Recorded by: {s.recorded_by}</span>}
                        {s.added_by && !s.recorded_by && <span>Added by: {s.added_by}</span>}
                        {s.notes && <span className="truncate max-w-xs">Note: {s.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${STATUS_STYLES[s.status]}`}>
                        {s.status}
                      </span>
                      {isPending && (
                        <svg
                          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Expanded sign-off drawer */}
                  {isOpen && isPending && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/50 rounded-b-xl">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Administration Status</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: 'given', label: 'Given' },
                            { key: 'refused', label: 'Refused' },
                            { key: 'missed', label: 'Missed' },
                          ].map((st) => (
                            <button
                              key={st.key}
                              type="button"
                              onClick={() => setPendingStatus(st.key)}
                              className={`py-2 rounded-lg border text-xs font-semibold transition-colors ${
                                pendingStatus === st.key ? 'hhcs-chip-active shadow-sm' : 'border-slate-200 text-slate-700 bg-white'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {pendingStatus === 'given' && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Staff Signature <span className="text-red-500">*</span>
                          </label>
                          <SignaturePad
                            value={signature}
                            onChange={(dataUrl) => setSignature(dataUrl)}
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Notes / Reason (optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Taken with water, refused due to nausea..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveRow(null)}
                          className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => submitSignOff(s.id)}
                          className="hhcs-btn-primary px-5 py-2 rounded-lg text-xs font-semibold shadow-sm disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Signing...' : 'Confirm & Sign'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   FOOD & FLUID DIARY
   ============================================================ */
function FoodDiaryTab() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const { diaryByParticipant, setDiaryByParticipant } = useFoodDiary();
  const [date, setDate] = useState(TODAY_STR); // navigable — defaults to today, auto-calculated above
  const [savingKey, setSavingKey] = useState(null);

  const participantDiary = diaryByParticipant[selectedId] || {};
  const dayDiary = participantDiary[date] || {};

  const updateMealField = useCallback(
    async (mealKey, field, value) => {
      if (!requireStaffName(staffName)) return;
      setSavingKey(`${mealKey}-${field}`);
      await new Promise((r) => setTimeout(r, 250)); // simulated latency

      setDiaryByParticipant((prev) => {
        const pData = prev[selectedId] || {};
        const dData = pData[date] || {};
        const mealData = dData[mealKey] || {};

        const updatedMeal = {
          ...mealData,
          [field]: value,
          recorded_by: staffName.trim(),
        };

        return {
          ...prev,
          [selectedId]: {
            ...pData,
            [date]: {
              ...dData,
              [mealKey]: updatedMeal,
            },
          },
        };
      });
      setSavingKey(null);
    },
    [selectedId, date, staffName, setDiaryByParticipant]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border hhcs-border-navy p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold hhcs-text-navy">Food & Fluid Intake Diary</h2>
            <p className="text-xs text-slate-500">
              Daily nutritional and hydration log for <span className="font-semibold text-slate-700">{selectedParticipant?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="hhcs-input rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {MEAL_TYPES.map((meal) => {
            const mData = dayDiary[meal.key] || {};
            const isFluids = meal.key === 'fluids';

            return (
              <div key={meal.key} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full hhcs-bg-teal" />
                    <h3 className="font-bold text-slate-800 text-sm">{meal.label}</h3>
                  </div>
                  {mData.recorded_by && (
                    <span className="text-xs text-slate-400">Recorded by: {mData.recorded_by}</span>
                  )}
                </div>

                {isFluids ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Total Fluid Intake (mL)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1200"
                        value={mData.fluids_ml ?? ''}
                        onChange={(e) => updateMealField(meal.key, 'fluids_ml', e.target.value ? Number(e.target.value) : '')}
                        onBlur={(e) => updateMealField(meal.key, 'fluids_ml', e.target.value ? Number(e.target.value) : '')}
                        className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white font-semibold hhcs-text-teal"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Preferences</label>
                      <input
                        type="text"
                        placeholder="e.g. Prefers water, drank well with lunch"
                        value={mData.notes || ''}
                        onChange={(e) => updateMealField(meal.key, 'notes', e.target.value)}
                        onBlur={(e) => updateMealField(meal.key, 'notes', e.target.value)}
                        className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Meal Description / What was eaten</label>
                      <input
                        type="text"
                        placeholder="e.g. Porridge with milk, two pieces of toast"
                        value={mData.description || ''}
                        onChange={(e) => updateMealField(meal.key, 'description', e.target.value)}
                        onBlur={(e) => updateMealField(meal.key, 'description', e.target.value)}
                        className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Portion / Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Ate all, left crusts"
                        value={mData.notes || ''}
                        onChange={(e) => updateMealField(meal.key, 'notes', e.target.value)}
                        onBlur={(e) => updateMealField(meal.key, 'notes', e.target.value)}
                        className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  </div>
                )}
                {savingKey && savingKey.startsWith(meal.key) && (
                  <p className="text-xs hhcs-text-teal font-medium text-right">Saving changes...</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   SLEEP & NIGHT MONITORING LOG
   ============================================================ */
function SleepLogTab() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const { logsByParticipant, setLogsByParticipant, dayNotesByParticipant, setDayNotesByParticipant } = useSleepLogData();
  const [date, setDate] = useState(TODAY_STR); // navigable — defaults to today, auto-calculated above
  const [selectedSlot, setSelectedSlot] = useState(null); // time string e.g. "22:00"
  const [status, setStatus] = useState('asleep');
  const [sleepTime, setSleepTime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [howAwoken, setHowAwoken] = useState('Self-settled');
  const [mood, setMood] = useState('Calm');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Time slots across 24 hours: 12 PM through 11 PM (PM block), then 12 AM through 11 AM (AM block)
  const PM_SLOTS = ['12 PM', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  const AM_SLOTS = ['12 AM', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

  const participantLogs = logsByParticipant[selectedId] || {};
  const dayLogs = participantLogs[date] || [];

  const dayNotes = (dayNotesByParticipant[selectedId] || {})[date] || '';

  function openSlot(hourLabel, isPM) {
    // Convert hour label to 24h time slot identifier e.g. "22:00" or "02:00"
    let hr = parseInt(hourLabel, 10);
    if (isPM) {
      if (hr !== 12) hr += 12;
    } else {
      if (hr === 12) hr = 0;
    }
    const timeSlotStr = `${pad2(hr)}:00`;
    setSelectedSlot(timeSlotStr);

    // Check if an entry already exists for this slot
    const existing = dayLogs.find((l) => l.time_slot === timeSlotStr);
    if (existing) {
      setStatus(existing.status || 'asleep');
      setSleepTime(existing.sleep_time || '22:00');
      setWakeTime(existing.wake_time || '06:00');
      setHowAwoken(existing.how_awoken || 'Self-settled');
      setMood(existing.mood || 'Calm');
      setNotes(existing.notes || '');
    } else {
      setStatus('asleep');
      setSleepTime(timeSlotStr);
      setWakeTime('06:00');
      setHowAwoken('Self-settled');
      setMood('Calm');
      setNotes('');
    }
  }

  const saveCheckEntry = useCallback(
    async () => {
      if (!requireStaffName(staffName)) return;
      if (!selectedSlot) return;
      setSaving(true);
      await new Promise((r) => setTimeout(r, 300)); // simulated latency

      const newEntry = {
        id: `sl-${Date.now()}`,
        time_slot: selectedSlot,
        status,
        sleep_time: status === 'asleep' ? sleepTime : '',
        wake_time: status === 'awake' ? wakeTime : '',
        how_awoken: howAwoken,
        mood,
        notes: notes.trim(),
        recorded_by: staffName.trim(),
      };

      setLogsByParticipant((prev) => {
        const pLogs = prev[selectedId] || {};
        const dLogs = pLogs[date] || [];
        // Replace existing entry for this slot or append
        const filtered = dLogs.filter((l) => l.time_slot !== selectedSlot);
        return {
          ...prev,
          [selectedId]: {
            ...pLogs,
            [date]: [...filtered, newEntry],
          },
        };
      });

      setSaving(false);
      setSelectedSlot(null);
    },
    [staffName, selectedSlot, status, sleepTime, wakeTime, howAwoken, mood, notes, selectedId, date, setLogsByParticipant]
  );

  const saveDayNotes = useCallback(
    async (text) => {
      if (!requireStaffName(staffName)) return;
      setDayNotesByParticipant((prev) => {
        const pNotes = prev[selectedId] || {};
        return {
          ...prev,
          [selectedId]: {
            ...pNotes,
            [date]: text,
          },
        };
      });
    },
    [staffName, selectedId, date, setDayNotesByParticipant]
  );

  function getSlotStatus(hourLabel, isPM) {
    let hr = parseInt(hourLabel, 10);
    if (isPM) {
      if (hr !== 12) hr += 12;
    } else {
      if (hr === 12) hr = 0;
    }
    const timeSlotStr = `${pad2(hr)}:00`;
    const found = dayLogs.find((l) => l.time_slot === timeSlotStr);
    return found ? found.status : 'pending';
  }

  const statusColorMap = {
    pending: 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200',
    asleep: 'hhcs-bg-navy text-white border-transparent',
    awake: 'hhcs-bg-teal text-white border-transparent',
    checked: 'bg-emerald-600 text-white border-transparent',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border hhcs-border-navy p-4 sm:p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold hhcs-text-navy">Sleep & Night Monitoring Log</h2>
            <p className="text-xs text-slate-500">
              Hourly night check roster for <span className="font-semibold text-slate-700">{selectedParticipant?.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="hhcs-input rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-lg">
          <span className="font-semibold text-slate-700">Status Legend:</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300" /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded hhcs-bg-navy" /> Asleep</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded hhcs-bg-teal" /> Awake</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-600" /> Checked</span>
        </div>

        {/* Hour selector grid: PM then AM */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">PM Hours</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
              {PM_SLOTS.map((hour) => {
                const st = getSlotStatus(hour, true);
                return (
                  <button
                    key={`pm-${hour}`}
                    type="button"
                    onClick={() => openSlot(hour, true)}
                    className={`py-3 px-2 rounded-xl border text-center font-semibold text-xs transition-transform active:scale-95 shadow-sm ${statusColorMap[st]}`}
                  >
                    <span className="block text-sm">{hour}</span>
                    <span className="block text-[10px] uppercase opacity-80 mt-0.5">{st}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">AM Hours</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
              {AM_SLOTS.map((hour) => {
                const st = getSlotStatus(hour, false);
                return (
                  <button
                    key={`am-${hour}`}
                    type="button"
                    onClick={() => openSlot(hour, false)}
                    className={`py-3 px-2 rounded-xl border text-center font-semibold text-xs transition-transform active:scale-95 shadow-sm ${statusColorMap[st]}`}
                  >
                    <span className="block text-sm">{hour}</span>
                    <span className="block text-[10px] uppercase opacity-80 mt-0.5">{st}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Check Editor Modal Drawer */}
        {selectedSlot && (
          <div className="rounded-xl border-2 hhcs-border-teal hhcs-bg-teal-tint p-4 sm:p-6 space-y-4 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-teal-200 pb-3">
              <div>
                <h3 className="text-base font-bold hhcs-text-navy">
                  Editing {selectedSlot.startsWith('0') || selectedSlot.startsWith('1') && parseInt(selectedSlot) < 12 ? `${selectedSlot} AM` : `${selectedSlot} PM`} Check
                </h3>
                <p className="text-xs text-slate-600">Record participant sleep state, mood, and observations for this check interval.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="text-xs font-bold hhcs-text-navy bg-white px-3 py-1.5 rounded-lg shadow-sm"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'asleep', label: 'Asleep' },
                    { key: 'awake', label: 'Awake' },
                    { key: 'checked', label: 'Checked' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStatus(s.key)}
                      className={`py-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                        status === s.key ? 'hhcs-chip-active shadow-sm' : 'border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Time Inputs Based on Status Selection */}
              {status === 'asleep' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Sleep Time</label>
                  <input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
              )}

              {status === 'awake' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Wake Time</label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">How Awoken</label>
                  <select
                    value={howAwoken}
                    onChange={(e) => setHowAwoken(e.target.value)}
                    className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {AWOKEN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {MOOD_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Notes / Observations</label>
                <textarea
                  rows={2}
                  placeholder="Enter any specific observations during check..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="hhcs-input w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveCheckEntry}
                  className="hhcs-btn-primary px-5 py-2 rounded-lg text-xs font-semibold shadow-sm disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Check'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Free-text overall shift sleep notes */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold hhcs-text-navy uppercase tracking-wide">
            Overall Sleep Summary Notes for {FULL_DATE_LABEL(date)}
          </label>
          <textarea
            rows={3}
            placeholder="Enter general summary of participant's night sleep quality, disturbances, or routines..."
            value={dayNotes}
            onChange={(e) => saveDayNotes(e.target.value)}
            className="hhcs-input w-full rounded-xl border border-slate-300 p-3 text-sm bg-white"
          />
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   PROGRESS NOTES & INCIDENT REPORTS
   ============================================================ */
function ProgressNotesTab() {
  const { selectedParticipant } = useParticipant();
  const { staffName } = useStaff();
  const [noteType, setNoteType] = useState('progress');
  const [content, setContent] = useState('');
  const [signature, setSignature] = useState(null);
  const [savedNotes, setSavedNotes] = useState([
    {
      id: 1,
      type: 'progress',
      date: TODAY_STR,
      time: '14:30',
      content: 'Participant engaged well in community access walk. Enjoyed coffee at local cafe.',
      staff: 'Melissa Egan (Admin)',
    },
  ]);

  function handleSave() {
    if (!requireStaffName(staffName)) return;
    if (!content.trim()) {
      alert('Please enter note content.');
      return;
    }
    const newNote = {
      id: Date.now(),
      type: noteType,
      date: TODAY_STR,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: content.trim(),
      staff: staffName,
      signature: signature,
    };
    setSavedNotes([newNote, ...savedNotes]);
    setContent('');
    setSignature(null);
    alert('Note successfully saved.');
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border hhcs-border-navy p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold hhcs-text-navy">Progress Notes & Incident Reports</h2>
        <div className="flex gap-2">
          {[
            { key: 'progress', label: 'Progress Note' },
            { key: 'incident', label: 'Incident Report' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setNoteType(t.key)}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                noteType === t.key ? 'hhcs-chip-active shadow-sm' : 'border-slate-200 text-slate-700 bg-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <textarea
            rows={4}
            placeholder={`Enter ${noteType === 'progress' ? 'progress observations' : 'incident details and actions taken'} for ${selectedParticipant?.name}...`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="hhcs-input w-full rounded-xl border border-slate-300 p-3 text-sm bg-white"
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Staff Signature</label>
            <SignaturePad value={signature} onChange={(url) => setSignature(url)} />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="hhcs-btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm"
            >
              Save {noteType === 'progress' ? 'Progress Note' : 'Incident Report'}
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold hhcs-text-navy">Recent Logged Notes</h3>
          {savedNotes.map((n) => (
            <div key={n.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold px-2 py-0.5 rounded uppercase ${n.type === 'incident' ? 'bg-red-100 text-red-700' : 'hhcs-bg-navy-tint hhcs-text-navy'}`}>
                  {n.type}
                </span>
                <span className="text-slate-400">{n.date} at {n.time}</span>
              </div>
              <p className="text-sm text-slate-800">{n.content}</p>
              <p className="text-xs text-slate-500 italic">Recorded by: {n.staff}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   GALLERY TAB
   ============================================================ */
function GalleryTab() {
  const { selectedParticipant } = useParticipant();
  const [images, setImages] = useState([]);

  function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      id: Date.now() + Math.random(),
      url: URL.createObjectURL(file),
      name: file.name,
      date: new Date().toLocaleDateString(),
    }));
    setImages([...newImages, ...images]);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border hhcs-border-navy p-4 sm:p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold hhcs-text-navy">Participant Gallery / Photo Uploads</h2>
        <p className="text-xs text-slate-500">Upload photos of activities, meals, or community outings for {selectedParticipant?.name}.</p>

        <label className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
          <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold text-slate-700">Click to upload photos</span>
          <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {images.map((img) => (
            <div key={img.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <img src={img.url} alt={img.name} className="w-full h-32 object-cover" />
              <div className="p-2 text-[10px] text-slate-500 truncate">{img.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ============================================================
   DOWNLOAD & PRINT SHIFT REPORT
   ============================================================ */
function PrintReportView() {
  const { selectedParticipant } = useParticipant();
  const { signoffsByParticipant } = useMedicationData();
  const { diaryByParticipant } = useFoodDiary();
  const { logsByParticipant, dayNotesByParticipant } = useSleepLogData();

  const signoffs = (signoffsByParticipant[selectedParticipant?.id] || []).filter((s) => s.scheduled_date === TODAY_STR);
  const diary = (diaryByParticipant[selectedParticipant?.id] || {})[TODAY_STR] || {};
  const sleepLogs = (logsByParticipant[selectedParticipant?.id] || {})[TODAY_STR] || [];
  const dayNotes = ((dayNotesByParticipant[selectedParticipant?.id] || {})[TODAY_STR]) || '';

  return (
    <div id="hhcs-print-report" className="bg-white rounded-xl border hhcs-border-navy p-6 space-y-6 shadow-sm">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold hhcs-text-navy">Hope Health & Care Services</h1>
          <p className="text-xs text-slate-500">End of Shift Comprehensive Care Report</p>
        </div>
        <div className="text-right text-xs">
          <p className="font-semibold text-slate-700">Date: {FULL_DATE_LABEL(TODAY_STR)}</p>
          <p className="text-slate-500">Participant: <span className="font-semibold text-slate-700">{selectedParticipant?.name}</span></p>
        </div>
      </div>

      {/* Medication Summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wide">Medication Administration Summary</h3>
        <table className="w-full text-xs text-left border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="border border-slate-200 p-2">Time</th>
              <th className="border border-slate-200 p-2">Medication</th>
              <th className="border border-slate-200 p-2">Status</th>
              <th className="border border-slate-200 p-2">Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {signoffs.length === 0 ? (
              <tr><td colSpan="4" className="p-2 text-slate-400 text-center">No medications logged for today.</td></tr>
            ) : (
              signoffs.map((s) => (
                <tr key={s.id}>
                  <td className="border border-slate-200 p-2 font-medium">{s.scheduled_time}</td>
                  <td className="border border-slate-200 p-2">{s.medication_name}</td>
                  <td className="border border-slate-200 p-2 uppercase font-semibold">{s.status}</td>
                  <td className="border border-slate-200 p-2">{s.recorded_by || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Food Diary Summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wide">Food & Fluid Diary Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {MEAL_TYPES.map((meal) => {
            const mData = diary[meal.key] || {};
            return (
              <div key={meal.key} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                <p className="font-bold hhcs-text-navy">{meal.label}</p>
                <p className="text-slate-700 mt-1">{mData.description || (meal.key === 'fluids' ? `${mData.fluids_ml || 0} mL` : 'Not recorded')}</p>
                {mData.notes && <p className="text-slate-400 text-[10px] mt-0.5">Note: {mData.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sleep Log Summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wide">Sleep & Night Monitoring Summary</h3>
        {dayNotes && <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200"><strong>Night Summary:</strong> {dayNotes}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          {sleepLogs.map((l) => (
            <div key={l.id} className="text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 min-w-[120px]">
              <span className="font-bold hhcs-text-navy">{l.time_slot}</span> — <span className="uppercase font-semibold">{l.status}</span>
              {l.notes && <p className="text-[10px] text-slate-500 truncate">{l.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
        <div className="text-xs text-slate-400">
          <p>Hope Health & Care Services — NDIS Care Portal</p>
          <p>Generated automatically from shift records.</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="hhcs-btn-primary px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm"
        >
          Print Report
        </button>
      </div>
    </div>
  );
}


/* ============================================================
   MAIN DASHBOARD LAYOUT & ROOT APP COMPONENT
   ============================================================ */
function Dashboard() {
  const { staffName } = useStaff();
  const [activeTab, setActiveTab] = useState('medication');

  // If staff member has not signed in yet, show the sign-in screen
  if (!staffName) {
    return <StaffLogin />;
  }

  return (
    <ParticipantProvider>
      <MedicationDataProvider>
        <FoodDiaryProvider>
          <SleepLogDataProvider>
            <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-10">
              <style>{THEME_CSS}</style>
              <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <header className="hhcs-bg-navy rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold">Hope Health & Care Services</h1>
                    <p className="text-xs sm:text-sm text-slate-200">NDIS Participant Care Log — Staff Portal</p>
                  </div>
                  <div className="w-full sm:w-auto">
                    <StaffAttributionBar />
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Left Sidebar: Participant selector & Navigation tabs */}
                  <aside className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl border hhcs-border-navy p-4 shadow-sm space-y-3">
                      <p className="text-xs font-bold hhcs-text-navy uppercase tracking-wide">Select Participant</p>
                      <ParticipantSelector />
                    </div>

                    <div className="bg-white rounded-2xl border hhcs-border-navy p-2 shadow-sm space-y-1">
                      {[
                        { key: 'medication', label: 'Medication Sign-Off' },
                        { key: 'food', label: 'Food & Fluid Diary' },
                        { key: 'sleep', label: 'Sleep Log' },
                        { key: 'progress', label: 'Progress Notes & Incidents' },
                        { key: 'gallery', label: 'Gallery' },
                        { key: 'print', label: 'Download & Print Report' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setActiveTab(tab.key)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-colors ${
                            activeTab === tab.key
                              ? 'hhcs-bg-navy text-white shadow-sm'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </aside>

                  {/* Main Content Area */}
                  <main className="lg:col-span-3">
                    {activeTab === 'medication' && <MedicationSignOff />}
                    {activeTab === 'food' && <FoodDiaryTab />}
                    {activeTab === 'sleep' && <SleepLogTab />}
                    {activeTab === 'progress' && <ProgressNotesTab />}
                    {activeTab === 'gallery' && <GalleryTab />}
                    {activeTab === 'print' && <PrintReportView />}
                  </main>
                </div>
              </div>
            </div>
          </SleepLogDataProvider>
        </FoodDiaryProvider>
      </MedicationDataProvider>
    </ParticipantProvider>
  );
}

export default function App() {
  return (
    <StaffProvider>
      <Dashboard />
    </StaffProvider>
  );
}
