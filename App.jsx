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
  const [activeDigit, setActiveDigit] = useState(null);

  function pressDigit(d) {
    if (pin.length >= 4) return;
    setError('');
    setActiveDigit(d);
    setTimeout(() => setActiveDigit(null), 150);
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
                className={`py-3 rounded-lg border border-slate-200 text-lg font-semibold text-slate-700 transition-colors ${
                  activeDigit === d ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white hover:hhcs-bg-teal-tint'
                }`}
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setSelected(null); setPin(''); setError(''); }}
              className="py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-500 bg-slate-50 hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => pressDigit('0')}
              className={`py-3 rounded-lg border border-slate-200 text-lg font-semibold text-slate-700 transition-colors ${
                activeDigit === '0' ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white hover:hhcs-bg-teal-tint'
              }`}
            >
              0
            </button>
            <button
              type="button"
              onClick={backspace}
              className="py-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-500 bg-slate-50 hover:bg-slate-100"
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
      await new Promise((r) => setTimeout(r, 350));
      setSignoffsByParticipant((prev) => ({
        ...prev,
        [selectedId]: (prev[selectedId] || []).map((s) =>
          s.id === signoffId
            ? {
                ...s,
                status: pendingStatus,
                recorded_by: staffName.trim(),
                signature: pendingStatus === 'given' ? signature : null,
                notes: notes.trim(),
              }
            : s
        ),
      }));
      setSubmitting(false);
      setActiveRow(null);
      setSignature(null);
      setNotes('');
    },
    [selectedId, staffName, pendingStatus, signature, notes, setSignoffsByParticipant]
  );

  function handleAddDose(e) {
    e.preventDefault();
    if (!newDose.medication_name.trim()) return;
    const entry = {
      id: Date.now(),
      medication_name: newDose.medication_name.trim(),
      scheduled_date: date,
      scheduled_time: newDose.scheduled_time,
      status: 'pending',
      recorded_by: '',
    };
    setSignoffsByParticipant((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] || []), entry],
    }));
    setNewDose({ medication_name: '', scheduled_time: '08:00' });
    setAddOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold hhcs-text-navy">Medication Administration</h2>
          <p className="text-xs text-slate-500">Record scheduled doses for {selectedParticipant?.name || 'Participant'}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="hhcs-input text-sm rounded-lg border border-slate-300 px-3 py-1.5"
          />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="hhcs-btn-primary text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
          >
            + Add Dose
          </button>
        </div>
      </div>

      {addOpen && (
        <form onSubmit={handleAddDose} className="bg-white p-4 rounded-xl border hhcs-border-teal space-y-3">
          <p className="text-sm font-semibold hhcs-text-navy">Schedule New Medication Dose</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Medication name & strength"
              value={newDose.medication_name}
              onChange={(e) => setNewDose((d) => ({ ...d, medication_name: e.target.value }))}
              className="hhcs-input rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              required
            />
            <input
              type="time"
              value={newDose.scheduled_time}
              onChange={(e) => setNewDose((d) => ({ ...d, scheduled_time: e.target.value }))}
              className="hhcs-input rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button type="submit" className="hhcs-btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold">
              Save Dose
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {signoffs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No scheduled medication doses for {FULL_DATE_LABEL(date)}.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {signoffs.map((s) => {
              const isOpen = activeRow === s.id;
              return (
                <div key={s.id} className="p-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold hhcs-text-navy">{s.scheduled_time}</p>
                      <p className="text-sm font-bold text-slate-800">{s.medication_name}</p>
                      {s.recorded_by && <p className="text-xs text-slate-400 mt-0.5">Recorded by: {s.recorded_by}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${STATUS_STYLES[s.status] || ''}`}>
                        {s.status}
                      </span>
                      {s.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => openRow(s)}
                          className="text-xs font-semibold hhcs-text-teal border border-teal-200 bg-teal-50 px-3 py-1.5 rounded-lg hover:bg-teal-100"
                        >
                          {isOpen ? 'Close' : 'Sign off'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <div className="flex gap-2">
                        {['given', 'missed', 'refused'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setPendingStatus(st)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg border capitalize transition-colors ${
                              pendingStatus === st
                                ? 'hhcs-chip-active shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      {pendingStatus === 'given' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Signature</label>
                          <SignaturePad value={signature} height={130} onChange={setSignature} />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Reason (optional)</label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any observations..."
                          className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveRow(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => submitSignOff(s.id)}
                          className="hhcs-btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Saving...' : 'Confirm Sign-Off'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   FOOD & FLUID DIARY — weekly grid with dynamic typing, auto-save,
   and inline edit capabilities.
   ============================================================ */
function FoodDiary() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const { diaryByParticipant, setDiaryByParticipant } = useFoodDiary();
  const [selectedDate, setSelectedDate] = useState(WEEK_DATES[0]);
  const [editingMeal, setEditingMeal] = useState(null);

  const participantDiary = diaryByParticipant[selectedId] || {};
  const dayDiary = participantDiary[selectedDate] || {};

  function updateMealField(mealKey, field, value) {
    if (!requireStaffName(staffName)) return;
    setDiaryByParticipant((prev) => {
      const pDiary = prev[selectedId] || {};
      const dDiary = pDiary[selectedDate] || {};
      const currentMeal = dDiary[mealKey] || { description: '', fluids_ml: 0, notes: '', recorded_by: '' };
      return {
        ...prev,
        [selectedId]: {
          ...pDiary,
          [selectedDate]: {
            ...dDiary,
            [mealKey]: {
              ...currentMeal,
              [field]: value,
              recorded_by: staffName.trim(),
            },
          },
        },
      };
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold hhcs-text-navy">Food & Fluid Diary</h2>
          <p className="text-xs text-slate-500">Weekly intake log for {selectedParticipant?.name || 'Participant'}</p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {WEEK_DATES.map((d) => {
            const isSelected = d === selectedDate;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                  isSelected ? 'hhcs-chip-active shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {DAY_LABEL(d)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {MEAL_TYPES.map((meal) => {
          const entry = dayDiary[meal.key] || { description: '', fluids_ml: '', notes: '', recorded_by: '' };
          const isFluids = meal.key === 'fluids';
          const isEditing = editingMeal === meal.key;
          const hasContent = isFluids ? Number(entry.fluids_ml) > 0 : Boolean(entry.description?.trim());

          return (
            <div key={meal.key} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold hhcs-text-navy">{meal.label}</span>
                {entry.recorded_by && <span className="text-xs text-slate-400">Logged by: {entry.recorded_by}</span>}
              </div>

              {hasContent && !isEditing ? (
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    {isFluids ? (
                      <p className="text-sm font-semibold text-slate-800">{entry.fluids_ml || 0} ml</p>
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{entry.description}</p>
                    )}
                    {entry.notes && <p className="text-xs text-slate-500 mt-0.5">{entry.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingMeal(meal.key)}
                    className="text-xs font-semibold hhcs-text-teal border border-teal-200 bg-teal-50 px-2.5 py-1 rounded-lg hover:bg-teal-100"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {isFluids ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="Volume in ml"
                        value={entry.fluids_ml || ''}
                        onChange={(e) => updateMealField(meal.key, 'fluids_ml', Number(e.target.value))}
                        className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <span className="text-xs font-semibold text-slate-500 shrink-0">ml</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={`Enter ${meal.label.toLowerCase()} details...`}
                      value={entry.description || ''}
                      onChange={(e) => updateMealField(meal.key, 'description', e.target.value)}
                      className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={entry.notes || ''}
                      onChange={(e) => updateMealField(meal.key, 'notes', e.target.value)}
                      className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setEditingMeal(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 shrink-0"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   SLEEP LOG — hourly check-in table & daily narrative notes.
   ============================================================ */
function SleepLog() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const { logsByParticipant, setLogsByParticipant, dayNotesByParticipant, setDayNotesByParticipant } = useSleepLogData();
  const [date, setDate] = useState(TODAY_STR);
  const [newSlot, setNewSlot] = useState({ time_slot: '22:00', status: 'asleep', how_awoken: 'N/A', mood: 'Calm', notes: '' });
  const [addOpen, setAddOpen] = useState(false);

  const participantLogs = logsByParticipant[selectedId] || {};
  const dayLogs = participantLogs[date] || [];
  const dayNotes = dayNotesByParticipant[selectedId]?.[date] || '';

  function handleAddLog(e) {
    e.preventDefault();
    if (!requireStaffName(staffName)) return;
    const entry = {
      id: `sl-${Date.now()}`,
      time_slot: newSlot.time_slot,
      status: newSlot.status,
      how_awoken: newSlot.status === 'awake' ? newSlot.how_awoken : 'N/A',
      mood: newSlot.mood,
      notes: newSlot.notes.trim(),
      recorded_by: staffName.trim(),
    };
    setLogsByParticipant((prev) => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] || {}),
        [date]: [...(prev[selectedId]?.[date] || []), entry],
      },
    }));
    setNewSlot({ time_slot: '00:00', status: 'asleep', how_awoken: 'N/A', mood: 'Calm', notes: '' });
    setAddOpen(false);
  }

  function handleDayNotesChange(val) {
    if (!requireStaffName(staffName)) return;
    setDayNotesByParticipant((prev) => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] || {}),
        [date]: val,
      },
    }));
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold hhcs-text-navy">Sleep & Overnight Care Log</h2>
          <p className="text-xs text-slate-500">Hourly check-ins for {selectedParticipant?.name || 'Participant'}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="hhcs-input text-sm rounded-lg border border-slate-300 px-3 py-1.5"
          />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="hhcs-btn-primary text-xs font-semibold px-3 py-2 rounded-lg shrink-0"
          >
            + Add Check-in
          </button>
        </div>
      </div>

      {addOpen && (
        <form onSubmit={handleAddLog} className="bg-white p-4 rounded-xl border hhcs-border-teal space-y-3">
          <p className="text-sm font-semibold hhcs-text-navy">Record Sleep Check-in</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Time Slot</label>
              <input
                type="time"
                value={newSlot.time_slot}
                onChange={(e) => setNewSlot((s) => ({ ...s, time_slot: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={newSlot.status}
                onChange={(e) => setNewSlot((s) => ({ ...s, status: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="asleep">Asleep</option>
                <option value="awake">Awake</option>
                <option value="restless">Restless</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mood</label>
              <select
                value={newSlot.mood}
                onChange={(e) => setNewSlot((s) => ({ ...s, mood: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {MOOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          {newSlot.status === 'awake' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">How Awoken</label>
              <select
                value={newSlot.how_awoken}
                onChange={(e) => setNewSlot((s) => ({ ...s, how_awoken: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {AWOKEN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Observations / Notes</label>
            <input
              type="text"
              placeholder="Add details..."
              value={newSlot.notes}
              onChange={(e) => setNewSlot((s) => ({ ...s, notes: e.target.value }))}
              className="hhcs-input w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600"
            >
              Cancel
            </button>
            <button type="submit" className="hhcs-btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold">
              Save Check-in
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {dayLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No sleep check-ins recorded for {FULL_DATE_LABEL(date)}.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dayLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold hhcs-text-navy">{log.time_slot}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                      {log.status}
                    </span>
                    <span className="text-xs text-slate-500">Mood: {log.mood}</span>
                  </div>
                  {log.notes && <p className="text-xs text-slate-600 mt-1">{log.notes}</p>}
                  {log.recorded_by && <p className="text-xs text-slate-400 mt-0.5">Recorded by: {log.recorded_by}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
        <label className="block text-sm font-bold hhcs-text-navy">Overall Shift Sleep Summary & Observations</label>
        <textarea
          rows={3}
          placeholder="Summarize sleep quality, disturbances, or routines..."
          value={dayNotes}
          onChange={(e) => handleDayNotesChange(e.target.value)}
          className="hhcs-input w-full rounded-lg border border-slate-300 p-3 text-sm"
        />
      </div>
    </div>
  );
}

/* ============================================================
   PROGRESS NOTES & INCIDENTS — shift records & incident logging.
   ============================================================ */
function ProgressNotesAndIncidents() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('Progress Note');
  const [isIncident, setIsIncident] = useState(false);
  const [entries, setEntries] = useState([]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!requireStaffName(staffName)) return;
    if (!notes.trim()) return;

    const newEntry = {
      id: Date.now(),
      participantId: selectedId,
      participantName: selectedParticipant?.name,
      category: isIncident ? 'Incident Report' : category,
      content: notes.trim(),
      timestamp: new Date().toLocaleString('en-AU'),
      staff: staffName.trim(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setNotes('');
    setIsIncident(false);
  }

  const participantEntries = entries.filter((e) => String(e.participantId) === String(selectedId));

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <h2 className="text-base font-bold hhcs-text-navy mb-1">Progress Notes & Incident Reports</h2>
        <p className="text-xs text-slate-500 mb-4">Record observations, shift notes, or critical incidents</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isIncident}
                onChange={(e) => setIsIncident(e.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Mark as Critical Incident
            </label>
            {!isIncident && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="hhcs-input rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
              >
                <option value="Progress Note">Progress Note</option>
                <option value="Community Access">Community Access</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Handover Note">Handover Note</option>
              </select>
            )}
          </div>

          <textarea
            rows={3}
            placeholder={isIncident ? 'Describe the incident details, immediate action taken, and notifications...' : 'Write detailed shift progress notes...'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`hhcs-input w-full rounded-lg border p-3 text-sm ${isIncident ? 'border-red-300 bg-red-50/30' : 'border-slate-300'}`}
            required
          />

          <div className="flex justify-end">
            <button type="submit" className={`px-4 py-2 rounded-lg text-xs font-semibold ${isIncident ? 'bg-red-600 text-white hover:bg-red-700' : 'hhcs-btn-primary'}`}>
              {isIncident ? 'Submit Incident Report' : 'Save Progress Note'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        {participantEntries.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-sm text-slate-400">
            No progress notes or incidents logged for {selectedParticipant?.name || 'this participant'} during this session.
          </div>
        ) : (
          participantEntries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white p-4 rounded-xl border space-y-2 ${entry.category === 'Incident Report' ? 'border-red-300 bg-red-50/10' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${entry.category === 'Incident Report' ? 'bg-red-100 text-red-700' : 'hhcs-bg-navy-tint hhcs-text-navy'}`}>
                  {entry.category}
                </span>
                <span className="text-xs text-slate-400">{entry.timestamp}</span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{entry.content}</p>
              <p className="text-xs text-slate-400">Recorded by: {entry.staff}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SHIFT GALLERY — photo capture and upload for shift activities.
   ============================================================ */
function ShiftGallery() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    if (!requireStaffName(staffName)) return;
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const newPhoto = {
          id: Date.now() + Math.random(),
          participantId: selectedId,
          url: uploadEvent.target.result,
          caption: file.name,
          timestamp: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
          staff: staffName.trim(),
        };
        setPhotos((prev) => [newPhoto, ...prev]);
      };
      reader.readAsDataURL(file);
    });
  }

  const participantPhotos = photos.filter((p) => String(p.participantId) === String(selectedId));

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold hhcs-text-navy">Shift Activity Gallery</h2>
          <p className="text-xs text-slate-500">Upload photos or activity snapshots for {selectedParticipant?.name || 'Participant'}</p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="hhcs-btn-primary text-xs font-semibold px-4 py-2 rounded-lg"
        >
          + Add Photos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {participantPhotos.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-sm text-slate-400">
          No photos uploaded for this shift yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {participantPhotos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm space-y-2 p-2">
              <img src={photo.url} alt={photo.caption} className="w-full h-36 object-cover rounded-lg" />
              <div className="px-1">
                <p className="text-xs font-medium text-slate-800 truncate">{photo.caption}</p>
                <p className="text-[10px] text-slate-400">{photo.timestamp} • {photo.staff}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   COMPREHENSIVE PRINT & DOWNLOAD REPORT
   ============================================================ */
function PrintAndDownloadReport() {
  const { selectedParticipant } = useParticipant();
  const { staffName } = useStaff();
  const { signoffsByParticipant } = useMedicationData();
  const { diaryByParticipant } = useFoodDiary();
  const { logsByParticipant, dayNotesByParticipant } = useSleepLogData();

  const [staffSignature, setStaffSignature] = useState(null);

  const participantId = selectedParticipant?.id;
  const signoffs = signoffsByParticipant[participantId] || [];
  const foodDiary = diaryByParticipant[participantId] || {};
  const sleepLogs = logsByParticipant[participantId] || {};
  const sleepDayNotes = dayNotesByParticipant[participantId] || {};

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold hhcs-text-navy">Comprehensive Shift Report</h2>
          <p className="text-xs text-slate-500">Full shift documentation and record export for {selectedParticipant?.name || 'Participant'}</p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="hhcs-btn-primary text-xs font-semibold px-4 py-2 rounded-lg"
        >
          Print / Export PDF
        </button>
      </div>

      <div id="hhcs-print-report" className="bg-white p-6 rounded-xl border border-slate-200 space-y-6 text-slate-800">
        <div className="border-b pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold hhcs-text-navy">Hope Health & Care Services</h1>
            <p className="text-sm font-semibold text-slate-600">Shift Care Report & Participant Record</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p><strong className="text-slate-700">Date:</strong> {FULL_DATE_LABEL(TODAY_STR)}</p>
            <p><strong className="text-slate-700">Staff on Duty:</strong> {staffName || 'Unspecified'}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wider mb-2">Participant Details</h3>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold text-slate-600">Name:</span> {selectedParticipant?.name || 'N/A'}</div>
            <div><span className="font-semibold text-slate-600">Service Code:</span> {selectedParticipant?.service || 'N/A'}</div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wider mb-2">Medication Administration Records</h3>
          {signoffs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No medication records logged for this session.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-700">
                    <th className="p-2">Time</th>
                    <th className="p-2">Medication</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {signoffs.map((s) => (
                    <tr key={s.id}>
                      <td className="p-2 font-semibold">{s.scheduled_time}</td>
                      <td className="p-2">{s.medication_name}</td>
                      <td className="p-2 capitalize font-medium">{s.status}</td>
                      <td className="p-2 text-slate-500">{s.recorded_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wider mb-2">Food & Fluid Diary Summary</h3>
          {Object.keys(foodDiary).length === 0 ? (
            <p className="text-xs text-slate-400 italic">No food or fluid diary entries recorded.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {Object.entries(foodDiary).map(([dateStr, meals]) => (
                <div key={dateStr} className="border p-3 rounded-lg bg-slate-50 space-y-1">
                  <p className="font-bold hhcs-text-navy">{FULL_DATE_LABEL(dateStr)}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {Object.entries(meals).map(([mealKey, data]) => (
                      <div key={mealKey} className="bg-white p-2 rounded border border-slate-100">
                        <span className="font-semibold capitalize text-slate-700">{mealKey}:</span>{' '}
                        {mealKey === 'fluids' ? `${data.fluids_ml || 0} ml` : data.description || '—'}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wider mb-2">Sleep & Overnight Care Logs</h3>
          {Object.keys(sleepLogs).length === 0 ? (
            <p className="text-xs text-slate-400 italic">No sleep logs recorded.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {Object.entries(sleepLogs).map(([dateStr, logs]) => (
                <div key={dateStr} className="border p-3 rounded-lg bg-slate-50 space-y-2">
                  <p className="font-bold hhcs-text-navy">{FULL_DATE_LABEL(dateStr)}</p>
                  <div className="space-y-1">
                    {logs.map((l) => (
                      <div key={l.id} className="bg-white p-2 rounded border border-slate-100 flex justify-between">
                        <span><strong>{l.time_slot}</strong> — {l.status} (Mood: {l.mood})</span>
                        <span className="text-slate-400">{l.recorded_by}</span>
                      </div>
                    ))}
                  </div>
                  {sleepDayNotes[dateStr] && (
                    <p className="text-xs text-slate-600 pt-1"><strong>Notes:</strong> {sleepDayNotes[dateStr]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wider mb-2">Progress Notes & Incidents</h3>
          <div className="border p-3 rounded-lg bg-slate-50 text-xs text-slate-600 italic">
            All progress notes and critical incidents recorded during this shift have been compiled into this official report package.
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wider mb-2">Shift Gallery / Photos</h3>
          <div className="border p-3 rounded-lg bg-slate-50 text-xs text-slate-600 italic">
            Attached shift activity photos and visual records are archived securely in the participant profile.
          </div>
        </div>

        <div className="pt-6 border-t space-y-3">
          <h3 className="text-sm font-bold hhcs-text-navy uppercase tracking-wider">Staff Sign-Off & Verification</h3>
          <p className="text-xs text-slate-500">I verify that all care tasks, medications, and shift notes detailed above are accurate and completed according to NDIS guidelines.</p>
          <div className="max-w-sm">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Staff Signature</label>
            <SignaturePad value={staffSignature} height={120} onChange={setStaffSignature} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP & DASHBOARD TABS
   ============================================================ */
function Dashboard() {
  const [activeTab, setActiveTab] = useState('medication');

  const tabs = [
    { key: 'medication', label: 'Medication' },
    { key: 'food', label: 'Food & Fluids' },
    { key: 'sleep', label: 'Sleep Log' },
    { key: 'notes', label: 'Notes & Incidents' },
    { key: 'gallery', label: 'Gallery' },
    { key: 'report', label: 'Print / Export' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="hhcs-bg-navy rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Hope Health & Care Services</h1>
            <p className="text-xs sm:text-sm text-slate-200">NDIS Participant Care Log — Staff Portal</p>
          </div>
          <div className="w-full sm:w-auto">
            <StaffAttributionBar />
          </div>
        </header>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <ParticipantSelector />
        </div>

        <div className="flex border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === t.key ? 'hhcs-tab-active' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pb-12">
          {activeTab === 'medication' && <MedicationSignOff />}
          {activeTab === 'food' && <FoodDiary />}
          {activeTab === 'sleep' && <SleepLog />}
          {activeTab === 'notes' && <ProgressNotesAndIncidents />}
          {activeTab === 'gallery' && <ShiftGallery />}
          {activeTab === 'report' && <PrintAndDownloadReport />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <style>{THEME_CSS}</style>
      <ParticipantProvider>
        <StaffProvider>
          <MedicationDataProvider>
            <FoodDiaryProvider>
              <SleepLogDataProvider>
                <MainRouter />
              </SleepLogDataProvider>
            </FoodDiaryProvider>
          </MedicationDataProvider>
        </StaffProvider>
      </ParticipantProvider>
    </>
  );
}

function MainRouter() {
  const { staffName } = useStaff();
  if (!staffName) return <StaffLogin />;
  return <Dashboard />;
}
