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
    [pendingStatus, signature, notes, selectedId, staffName]
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
      [selectedId]: [...(prev[selectedId] || []), entry].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
    }));
    setNewDose({ medication_name: '', scheduled_time: '08:00' });
    setAddOpen(false);
  }

  function removeDose(signoffId) {
    setSignoffsByParticipant((prev) => ({
      ...prev,
      [selectedId]: (prev[selectedId] || []).filter((s) => s.id !== signoffId),
    }));
  }

  if (!selectedParticipant) {
    return <p className="text-slate-400 text-sm">Select a participant to view medication sign-offs.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">
          Medication Sign-Off — {selectedParticipant.name}
        </h2>
      </div>

      <div className="flex items-center justify-between rounded-lg hhcs-bg-navy-tint px-2 py-1.5">
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, -1))}
          className="px-2 py-1 hhcs-text-navy font-bold"
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold hhcs-text-navy">
            {FULL_DATE_LABEL(date)}{date === TODAY_STR ? ' (Today)' : ''}
          </p>
          {date !== TODAY_STR && (
            <button
              type="button"
              onClick={() => setDate(TODAY_STR)}
              className="text-xs hhcs-text-teal font-medium underline"
            >
              Back to today
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, 1))}
          className="px-2 py-1 hhcs-text-navy font-bold"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      <div className="space-y-2">
        {signoffs.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => openRow(s)}
              disabled={s.status !== 'pending'}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white disabled:cursor-default"
            >
              <div className="text-left min-w-0">
                <p className="font-medium text-slate-800 truncate">{s.medication_name}</p>
                <p className="text-xs text-slate-400">
                  {s.scheduled_date} · {s.scheduled_time}
                  {s.recorded_by
                    ? ` · signed by ${s.recorded_by}`
                    : s.added_by ? ` · added by ${s.added_by}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.signature && (
                  <img
                    src={s.signature}
                    alt="Signature"
                    className="h-7 w-14 object-contain border border-slate-200 rounded bg-white"
                  />
                )}
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[s.status]}`}>
                  {s.status}
                </span>
                {s.status === 'pending' && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); removeDose(s.id); }}
                    className="text-xs text-slate-300 hover:text-red-500"
                    title="Remove this scheduled dose"
                  >
                    ✕
                  </span>
                )}
              </div>
            </button>

            {activeRow === s.id && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
                <div className="flex gap-2">
                  {['given', 'refused', 'missed'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPendingStatus(opt)}
                      className={`flex-1 text-sm font-medium py-2 rounded-lg border
                        ${pendingStatus === opt ? 'hhcs-chip-active' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Notes (optional, required for refused/missed)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                />

                {pendingStatus === 'given' && (
                  <SignaturePad onChange={setSignature} value={signature} />
                )}
                {pendingStatus === 'given' && signature && (
                  <p className="text-xs text-emerald-600 font-medium">Signature captured ✓</p>
                )}

                <button
                  type="button"
                  disabled={submitting || !staffName.trim()}
                  onClick={() => submitSignOff(s.id)}
                  className="hhcs-btn-primary w-full font-semibold py-3 rounded-lg disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Confirm Sign-Off'}
                </button>
                {!staffName.trim() && (
                  <p className="text-xs text-red-600 font-medium">
                    Enter your name or initials at the top of the page to save.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {signoffs.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No medications scheduled yet.</p>
        )}
      </div>

      {/* Dynamic dose-time entry — support workers add doses on the fly rather than
          being limited to hardcoded schedule rows. */}
      {addOpen ? (
        <div className="rounded-xl border hhcs-border-teal bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Add medication time</p>
          <input
            type="text"
            placeholder="Medication name and dose, e.g. Panadol 500mg"
            value={newDose.medication_name}
            onChange={(e) => setNewDose((d) => ({ ...d, medication_name: e.target.value }))}
            className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-2 items-center">
            <label className="text-xs font-medium text-slate-500 shrink-0">Time</label>
            <input
              type="time"
              value={newDose.scheduled_time}
              onChange={(e) => setNewDose((d) => ({ ...d, scheduled_time: e.target.value }))}
              className="hhcs-input rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addDose}
              className="hhcs-btn-primary flex-1 py-2 rounded-lg text-sm font-semibold"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full py-2.5 rounded-lg border-2 border-dashed hhcs-border-teal hhcs-text-teal text-sm font-semibold"
        >
          + Add medication time
        </button>
      )}
    </div>
  );
}
/* ============================================================
   FOOD DIARY — weekly grid, staff attribution on save.
   ============================================================ */
function FoodDiaryGrid() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const { diaryByParticipant, setDiaryByParticipant } = useFoodDiary();
  const [activeCell, setActiveCell] = useState(null);
  const [draft, setDraft] = useState({ description: '', fluids_ml: '', notes: '' });
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week, +1 = next week...

  const weekStartDate = useMemo(() => addDays(CURRENT_WEEK_START, weekOffset * 7), [weekOffset]);
  const weekDates = useMemo(() => generateWeekDates(weekStartDate), [weekStartDate]);
  const participantDiary = diaryByParticipant[selectedId] || {};

  // Only reset the open cell when the participant changes — the tab now
  // stays mounted across navigation, so we don't want to blow away an
  // in-progress entry just because the worker paged the week forward/back.
  useEffect(() => { setActiveCell(null); }, [selectedId]);

  function openCell(date, mealKey) {
    const existing = participantDiary[date]?.[mealKey] || { description: '', fluids_ml: '', notes: '' };
    setDraft({
      description: existing.description || '',
      fluids_ml: existing.fluids_ml ?? '',
      notes: existing.notes || '',
    });
    setActiveCell({ date, mealKey });
  }

  function saveCell() {
    if (!requireStaffName(staffName)) return;
    const { date, mealKey } = activeCell;
    setDiaryByParticipant((prev) => {
      const participantData = { ...(prev[selectedId] || {}) };
      const dayData = { ...(participantData[date] || {}) };
      dayData[mealKey] = {
        description: draft.description,
        fluids_ml: mealKey === 'fluids' ? Number(draft.fluids_ml) || 0 : undefined,
        notes: draft.notes,
        recorded_by: staffName.trim(),
      };
      participantData[date] = dayData;
      return { ...prev, [selectedId]: participantData };
    });
    setActiveCell(null);
  }

  function cellSummary(date, mealKey) {
    const entry = participantDiary[date]?.[mealKey];
    if (!entry) return null;
    const text = mealKey === 'fluids' ? (entry.fluids_ml ? `${entry.fluids_ml}ml` : null) : (entry.description || null);
    return text ? { text, recordedBy: entry.recorded_by } : null;
  }

  if (!selectedParticipant) {
    return <p className="text-slate-400 text-sm">Select a participant to view their food diary.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Food Diary — {selectedParticipant.name}</h2>
      </div>

      <div className="flex items-center justify-between rounded-lg hhcs-bg-navy-tint px-2 py-1.5">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          className="px-2 py-1 hhcs-text-navy font-bold"
          aria-label="Previous week"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold hhcs-text-navy">
            Week of {FULL_DATE_LABEL(weekStartDate)}
          </p>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="text-xs hhcs-text-teal font-medium underline"
            >
              Back to this week
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="px-2 py-1 hhcs-text-navy font-bold"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 text-left px-3 py-2 text-xs font-semibold hhcs-text-navy border-b border-r border-slate-100 w-24">
                  &nbsp;
                </th>
                {weekDates.map((d) => (
                  <th key={d} className="px-3 py-2 text-xs font-semibold hhcs-text-navy border-b border-slate-100 whitespace-nowrap">
                    {DAY_LABEL(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPES.map((meal) => (
                <tr key={meal.key}>
                  <td className="sticky left-0 bg-white z-10 px-3 py-2 text-xs font-semibold text-slate-600 border-r border-b border-slate-100 whitespace-nowrap">
                    {meal.label}
                  </td>
                  {weekDates.map((d) => {
                    const summary = cellSummary(d, meal.key);
                    const isActive = activeCell?.date === d && activeCell?.mealKey === meal.key;
                    return (
                      <td key={d} className="border-b border-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => openCell(d, meal.key)}
                          className={`w-24 h-14 rounded-lg px-2 py-1 text-left text-xs border
                            ${isActive ? 'hhcs-border-teal hhcs-bg-teal-tint' : 'border-transparent hover:bg-slate-50'}
                            ${summary ? 'text-slate-700' : 'text-slate-300'}`}
                        >
                          <span className="block truncate">{summary ? summary.text : 'Tap to log'}</span>
                          {summary?.recordedBy && (
                            <span className="block text-xs hhcs-text-teal truncate">— {summary.recordedBy}</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeCell && (
        <div className="rounded-xl border hhcs-border-teal hhcs-bg-teal-tint p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">
            {MEAL_TYPES.find((m) => m.key === activeCell.mealKey)?.label} · {DAY_LABEL(activeCell.date)}
          </p>

          {activeCell.mealKey === 'fluids' ? (
            <div>
              <label className="text-xs font-medium text-slate-500">Fluids (ml)</label>
              <input
                type="number"
                inputMode="numeric"
                value={draft.fluids_ml}
                onChange={(e) => setDraft((d) => ({ ...d, fluids_ml: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                placeholder="e.g. 750"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-500">What was offered / eaten</label>
              <input
                type="text"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                placeholder="e.g. Toast with eggs, ate all"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-500">Notes</label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
              placeholder="Optional notes"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveCell(null)}
              className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveCell}
              disabled={!staffName.trim()}
              className="hhcs-btn-primary flex-1 py-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
          {!staffName.trim() && (
            <p className="text-xs text-red-600 font-medium">
              Enter your name or initials at the top of the page to save.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
/* ============================================================
   SLEEP LOG — 24-hour horizontal timeline grid (AM row + PM row)
   plus a dedicated persistent Notes section for the day.
   Redesigned per spec while reusing all existing style tokens
   (hhcs-bg-navy-tint, hhcs-chip-active, SLEEP_STATUS_STYLES,
   hhcs-input, etc.) so nothing about the visual language changes.
   ============================================================ */
const SLEEP_STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-400 border-slate-200',
  asleep: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  awake: 'bg-amber-100 text-amber-700 border-amber-200',
  checked: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

function formatSlot(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

// Builds the 24 hour-cell definitions used by the AM/PM grid rows.
// Each cell carries its 24h key (e.g. "13:00") so it can be matched
// against saved slots, plus a friendly AM/PM label for display.
function buildHourCells(startHour) {
  return Array.from({ length: 12 }, (_, i) => {
    const h = startHour + i;
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const period = h >= 12 ? 'PM' : 'AM';
    return { hour: h, key: `${pad2(h)}:00`, label: `${hour12}${i === 0 ? ' ' + period : ''}` };
  });
}
const AM_CELLS = buildHourCells(0);
const PM_CELLS = buildHourCells(12);

function SleepLog() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const { logsByParticipant, setLogsByParticipant, dayNotesByParticipant, setDayNotesByParticipant } = useSleepLogData();
  const [date, setDate] = useState(TODAY_STR);
  const [activeHour, setActiveHour] = useState(null); // "HH:00" key currently being edited
  const [draft, setDraft] = useState({ time_slot: '', status: 'asleep', how_awoken: AWOKEN_OPTIONS[0], mood: MOOD_OPTIONS[0], sleep_time: '', wake_time: '' });
  const [dayNotesDraft, setDayNotesDraft] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState('');

  const dayLogs = logsByParticipant[selectedId]?.[date] || [];
  const savedDayNotes = dayNotesByParticipant[selectedId]?.[date] || '';

  // Tab stays mounted across navigation now, so we only reset the open
  // editor when participant changes — paging days shouldn't nuke an
  // in-progress edit for a different date the worker is mid-way through.
  useEffect(() => {
    setActiveHour(null);
  }, [selectedId]);

  // Load the persisted note for this participant + date from the
  // `sleep_notes` table (participant_id, date, notes, updated_by,
  // updated_at). Falls back to the locally cached value (e.g. if offline
  // or the row doesn't exist yet) so the field never appears to "lose"
  // a note that just hasn't round-tripped through the network yet.
  useEffect(() => {
    let cancelled = false;
    async function loadSleepNotes() {
      if (!selectedId) return;
      setNotesLoading(true);
      setNotesError('');
      const { data, error } = await supabase
        .from('sleep_notes')
        .select('notes')
        .eq('participant_id', selectedId)
        .eq('date', date)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // Keep whatever is cached locally and surface the error rather
        // than blanking the textarea out.
        setNotesError(error.message);
        setDayNotesDraft(savedDayNotes);
      } else {
        const loaded = data?.notes ?? '';
        setDayNotesDraft(loaded);
        // Mirror into the shared context so ShiftReport and other
        // consumers stay in sync with what's actually in the database.
        setDayNotesByParticipant((prev) => {
          const participantNotes = { ...(prev[selectedId] || {}) };
          participantNotes[date] = loaded;
          return { ...prev, [selectedId]: participantNotes };
        });
      }
      setNotesSaved(true);
      setNotesLoading(false);
    }
    loadSleepNotes();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, date]);

  function findSlotForHour(hourKey) {
    return dayLogs.find((s) => s.time_slot.slice(0, 2) === hourKey.slice(0, 2));
  }

  function openHour(hourKey) {
    if (activeHour === hourKey) {
      setActiveHour(null);
      return;
    }
    const existing = findSlotForHour(hourKey);
    setDraft({
      time_slot: existing?.time_slot || hourKey,
      status: existing?.status || 'asleep',
      how_awoken: existing?.how_awoken || AWOKEN_OPTIONS[0],
      mood: existing?.mood || MOOD_OPTIONS[0],
      sleep_time: existing?.sleep_time || '',
      wake_time: existing?.wake_time || '',
    });
    setActiveHour(hourKey);
  }

  function saveHour(hourKey) {
    if (!requireStaffName(staffName)) return;
    setLogsByParticipant((prev) => {
      const participantLogs = { ...(prev[selectedId] || {}) };
      const existingDay = participantLogs[date] || [];
      const existing = existingDay.find((s) => s.time_slot.slice(0, 2) === hourKey.slice(0, 2));
      // Sleep Time / Wake Time only apply to the "Asleep" status — for
      // Awake/Checked (untouched per spec) we simply carry forward
      // whatever was previously recorded rather than clearing it.
      const sleepFields = draft.status === 'asleep'
        ? { sleep_time: draft.sleep_time || '', wake_time: draft.wake_time || '' }
        : { sleep_time: existing?.sleep_time || '', wake_time: existing?.wake_time || '' };
      let updatedDay;
      if (existing) {
        updatedDay = existingDay.map((s) =>
          s.id === existing.id ? { ...s, ...draft, ...sleepFields, recorded_by: staffName.trim() } : s
        );
      } else {
        updatedDay = [
          ...existingDay,
          { id: `sl-${Date.now()}`, ...draft, ...sleepFields, recorded_by: staffName.trim() },
        ];
      }
      updatedDay.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
      participantLogs[date] = updatedDay;
      return { ...prev, [selectedId]: participantLogs };
    });
    setActiveHour(null);
  }

  function removeHour(hourKey) {
    setLogsByParticipant((prev) => {
      const participantLogs = { ...(prev[selectedId] || {}) };
      const existingDay = participantLogs[date] || [];
      participantLogs[date] = existingDay.filter((s) => s.time_slot.slice(0, 2) !== hourKey.slice(0, 2));
      return { ...prev, [selectedId]: participantLogs };
    });
    setActiveHour(null);
  }

  async function saveDayNotes() {
    if (!requireStaffName(staffName)) return;
    setNotesSaving(true);
    setNotesError('');
    // Upsert against the existing sleep_notes table structure
    // (participant_id, date, notes, updated_by, updated_at). onConflict
    // targets the natural key so a second save on the same day updates
    // the same row instead of erroring on a duplicate insert.
    const { error } = await supabase
      .from('sleep_notes')
      .upsert(
        {
          participant_id: selectedId,
          date,
          notes: dayNotesDraft,
          updated_by: staffName.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'participant_id,date' }
      );
    if (error) {
      setNotesError('Could not save notes: ' + error.message);
    } else {
      setDayNotesByParticipant((prev) => {
        const participantNotes = { ...(prev[selectedId] || {}) };
        participantNotes[date] = dayNotesDraft;
        return { ...prev, [selectedId]: participantNotes };
      });
      setNotesSaved(true);
    }
    setNotesSaving(false);
  }

  if (!selectedParticipant) {
    return <p className="text-slate-400 text-sm">Select a participant to view their sleep log.</p>;
  }

  const renderRow = (cells, rowLabel) => (
    <div>
      <p className="text-xs font-semibold hhcs-text-navy mb-1">{rowLabel}</p>
      <div className="grid grid-cols-12 gap-1">
        {cells.map((cell) => {
          const slot = findSlotForHour(cell.key);
          const status = slot?.status || 'pending';
          const isActive = activeHour === cell.key;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => openHour(cell.key)}
              title={
                slot
                  ? `${formatSlot(slot.time_slot)} · ${slot.status}` +
                    (slot.status === 'asleep' && (slot.sleep_time || slot.wake_time)
                      ? ` · Sleep ${slot.sleep_time ? formatSlot(slot.sleep_time) : '—'} → Wake ${slot.wake_time ? formatSlot(slot.wake_time) : '—'}`
                      : '')
                  : `${cell.label} ${rowLabel} — tap to log`
              }
              className={`h-12 rounded-md border text-[11px] font-semibold flex flex-col items-center justify-center leading-tight
                ${SLEEP_STATUS_STYLES[status]}
                ${isActive ? 'ring-2 ring-offset-1' : ''}`}
              style={isActive ? { boxShadow: '0 0 0 2px var(--hhcs-teal)' } : undefined}
            >
              <span>{cell.label}</span>
              {slot && <span className="text-[9px] normal-case">{slot.time_slot.slice(3, 5)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Sleep Log — {selectedParticipant.name}</h2>
      </div>

      <div className="flex items-center justify-between rounded-lg hhcs-bg-navy-tint px-2 py-1.5">
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, -1))}
          className="px-2 py-1 hhcs-text-navy font-bold"
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold hhcs-text-navy">
            {FULL_DATE_LABEL(date)}{date === TODAY_STR ? ' (Today)' : ''}
          </p>
          {date !== TODAY_STR && (
            <button
              type="button"
              onClick={() => setDate(TODAY_STR)}
              className="text-xs hhcs-text-teal font-medium underline"
            >
              Back to today
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, 1))}
          className="px-2 py-1 hhcs-text-navy font-bold"
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
        {renderRow(AM_CELLS, 'AM')}
        {renderRow(PM_CELLS, 'PM')}
        <div className="flex flex-wrap gap-3 pt-1">
          {Object.entries(SLEEP_STATUS_STYLES)
            .filter(([key]) => key !== 'checked')
            .map(([key, cls]) => (
              <span key={key} className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className={`inline-block w-3 h-3 rounded border ${cls}`} />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
            ))}
        </div>
      </div>

      {activeHour && (
        <div className="rounded-xl border hhcs-border-teal hhcs-bg-teal-tint p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Editing {formatSlot(draft.time_slot || activeHour)}
            </p>
            {findSlotForHour(activeHour) && (
              <button
                type="button"
                onClick={() => removeHour(activeHour)}
                className="text-xs text-red-500 font-medium"
              >
                Remove entry
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {['asleep', 'awake'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, status: opt }))}
                className={`flex-1 text-sm font-medium py-2 rounded-lg border
                  ${draft.status === opt ? 'hhcs-chip-active' : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>

          {/* Sleep Time / Wake Time — the two fields that actually matter
              here. Only shown for the "Asleep" status; "Awake" is left
              completely untouched. */}
          {draft.status === 'asleep' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-500">Sleep Time</label>
                <input
                  type="time"
                  value={draft.sleep_time}
                  onChange={(e) => setDraft((d) => ({ ...d, sleep_time: e.target.value }))}
                  className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                />
                {draft.sleep_time && (
                  <span className="text-xs text-slate-400">{formatSlot(draft.sleep_time)}</span>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Wake Time</label>
                <input
                  type="time"
                  value={draft.wake_time}
                  onChange={(e) => setDraft((d) => ({ ...d, wake_time: e.target.value }))}
                  className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
                />
                {draft.wake_time && (
                  <span className="text-xs text-slate-400">{formatSlot(draft.wake_time)}</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-500">How awoken</label>
              <select
                value={draft.how_awoken}
                onChange={(e) => setDraft((d) => ({ ...d, how_awoken: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-2 py-2 text-sm mt-1"
              >
                {AWOKEN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Mood</label>
              <select
                value={draft.mood}
                onChange={(e) => setDraft((d) => ({ ...d, mood: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-2 py-2 text-sm mt-1"
              >
                {MOOD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveHour(activeHour)}
            disabled={!staffName.trim()}
            className="hhcs-btn-primary w-full font-semibold py-2.5 rounded-lg disabled:cursor-not-allowed"
          >
            Save Check
          </button>
          {!staffName.trim() && (
            <p className="text-xs text-red-600 font-medium">
              Enter your name or initials at the top of the page to save.
            </p>
          )}
        </div>
      )}

      {/* Dedicated day-level notes — separate from per-hour check notes,
          persisted to the sleep_notes table (participant_id, date, notes,
          updated_by, updated_at) per participant + date. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-700">Sleep Notes — {FULL_DATE_LABEL(date)}</p>
        <textarea
          value={dayNotesDraft}
          onChange={(e) => { setDayNotesDraft(e.target.value); setNotesSaved(e.target.value === savedDayNotes); }}
          rows={4}
          placeholder="Overall observations about the participant's sleep for the day/night..."
          className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          disabled={notesLoading}
        />
        {notesError && <p className="text-xs text-red-600 font-medium">{notesError}</p>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {notesLoading ? 'Loading...' : notesSaving ? 'Saving...' : notesSaved ? 'Saved' : 'Unsaved changes'}
          </span>
          <button
            type="button"
            onClick={saveDayNotes}
            disabled={notesSaved || notesSaving || notesLoading || !staffName.trim()}
            className="hhcs-btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
          >
            {notesSaving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
        {!staffName.trim() && (
          <p className="text-xs text-red-600 font-medium">
            Enter your name or initials at the top of the page to save.
          </p>
        )}
      </div>
    </div>
  );
}
/* ============================================================
   PROGRESS NOTES — free-text shift notes per participant,
   categorized, staff attribution, newest first. Saved notes can
   now be edited in place via an Edit button on each note.
   ============================================================ */
const PROGRESS_CATEGORIES = ['General', 'Behaviour', 'Health', 'Community Access', 'Goals & Skill Building', 'Social/Emotional'];

function ProgressNotes() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState({ date: TODAY_STR, category: PROGRESS_CATEGORIES[0], note: '' });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ category: PROGRESS_CATEGORIES[0], note: '' });
  const [savingEditId, setSavingEditId] = useState(null);

  const loadNotes = useCallback(async () => {
    if (!selectedId) return;
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from('progress_notes')
      .select('*')
      .eq('participant_id', selectedId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });
    if (!error) setNotes(data || []);
    setLoadingNotes(false);
  }, [selectedId]);

  // Only refetch/reset when the participant changes — this tab now stays
  // mounted across tab switches, so an in-progress "write a note" draft
  // (or an open edit) isn't wiped just by tapping another tab and back.
  useEffect(() => {
    setFormOpen(false);
    setEditingId(null);
    setDraft({ date: TODAY_STR, category: PROGRESS_CATEGORIES[0], note: '' });
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function saveNote() {
    if (!requireStaffName(staffName)) return;
    if (!draft.note.trim()) {
      alert('Please write a note before saving.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('progress_notes').insert({
      participant_id: selectedId,
      date: draft.date,
      time: new Date().toTimeString().slice(0, 8),
      category: draft.category,
      note: draft.note.trim(),
      recorded_by: staffName.trim(),
    });
    if (error) {
      alert('Could not save note: ' + error.message);
    } else {
      await loadNotes();
      setDraft({ date: TODAY_STR, category: PROGRESS_CATEGORIES[0], note: '' });
      setFormOpen(false);
    }
    setSubmitting(false);
  }

  async function removeNote(id) {
    const { error } = await supabase.from('progress_notes').delete().eq('id', id);
    if (!error) setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function startEdit(n) {
    setEditingId(n.id);
    setEditDraft({ category: n.category, note: n.note });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id) {
    if (!editDraft.note.trim()) {
      alert('Note text cannot be empty.');
      return;
    }
    setSavingEditId(id);
    const { error } = await supabase
      .from('progress_notes')
      .update({
        category: editDraft.category,
        note: editDraft.note.trim(),
        edited_by: staffName.trim() || undefined,
        edited_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      alert('Could not save changes: ' + error.message);
    } else {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, category: editDraft.category, note: editDraft.note.trim(), edited_by: staffName.trim(), edited_at: new Date().toISOString() }
            : n
        )
      );
      setEditingId(null);
    }
    setSavingEditId(null);
  }

  if (!selectedParticipant) {
    return <p className="text-slate-400 text-sm">Select a participant to view progress notes.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Progress Notes — {selectedParticipant.name}</h2>
      </div>

      {formOpen ? (
        <div className="rounded-xl border hhcs-border-teal bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Date</label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Category</label>
              <select
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-2 py-2 text-sm mt-1"
              >
                {PROGRESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Note</label>
            <textarea
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              rows={5}
              placeholder="What happened during the shift, how the participant engaged, any observations..."
              className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveNote}
              disabled={submitting || !staffName.trim()}
              className="hhcs-btn-primary flex-1 py-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Note'}
            </button>
          </div>
          {!staffName.trim() && (
            <p className="text-xs text-red-600 font-medium">
              Enter your name or initials at the top of the page to save.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="w-full py-2.5 rounded-lg border-2 border-dashed hhcs-border-teal hhcs-text-teal text-sm font-semibold"
        >
          + Write a progress note
        </button>
      )}

      <div className="space-y-2">
        {notes.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No progress notes recorded yet.</p>
        )}
        {notes.map((n) => (
          <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              {editingId === n.id ? (
                <select
                  value={editDraft.category}
                  onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value }))}
                  className="hhcs-input text-xs font-semibold rounded-full hhcs-bg-navy-tint hhcs-text-navy border-0 px-2 py-1"
                >
                  {PROGRESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <span className="text-xs font-semibold px-2 py-1 rounded-full hhcs-bg-navy-tint hhcs-text-navy">
                  {n.category}
                </span>
              )}
              <div className="flex items-center gap-3 shrink-0">
                {editingId !== n.id && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => startEdit(n)}
                    className="text-xs hhcs-text-teal font-medium underline"
                  >
                    Edit
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => removeNote(n.id)}
                  className="text-xs text-slate-300 hover:text-red-500"
                  title="Remove this note"
                >
                  ✕
                </span>
              </div>
            </div>

            {editingId === n.id ? (
              <div className="space-y-2">
                <textarea
                  value={editDraft.note}
                  onChange={(e) => setEditDraft((d) => ({ ...d, note: e.target.value }))}
                  rows={4}
                  className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(n.id)}
                    disabled={savingEditId === n.id}
                    className="hhcs-btn-primary flex-1 py-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
                  >
                    {savingEditId === n.id ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.note}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {FULL_DATE_LABEL(n.date)} · {n.time?.slice(0, 5)} · by {n.recorded_by}
                  {n.edited_at ? ` · edited by ${n.edited_by || n.recorded_by}` : ''}
                </p>
              </>
            )}
          </div>
        ))}
        {loadingNotes && <p className="text-xs text-slate-400 text-center">Loading...</p>}
      </div>
    </div>
  );
}
/* ============================================================
   INCIDENT REPORT — structured incident capture per participant,
   severity-tagged, staff attribution.
   ============================================================ */
const INCIDENT_TYPES = ['Behavioural', 'Medical', 'Injury', 'Medication Error', 'Property Damage', 'Environmental/Safety', 'Complaint', 'Other'];
const INCIDENT_SEVERITY = ['Low', 'Medium', 'High', 'Critical'];
const SEVERITY_STYLES = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

function blankIncidentDraft() {
  return {
    date: TODAY_STR,
    time: new Date().toTimeString().slice(0, 5),
    type: INCIDENT_TYPES[0],
    severity: 'Low',
    description: '',
    action_taken: '',
    witnesses: '',
    reported_to: '',
    follow_up_required: false,
  };
}

function IncidentReport() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(blankIncidentDraft());

  const loadIncidents = useCallback(async () => {
    if (!selectedId) return;
    setLoadingIncidents(true);
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('participant_id', selectedId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });
    if (!error) setIncidents(data || []);
    setLoadingIncidents(false);
  }, [selectedId]);

  useEffect(() => {
    setFormOpen(false);
    setDraft(blankIncidentDraft());
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function saveIncident() {
    if (!requireStaffName(staffName)) return;
    if (!draft.description.trim()) {
      alert('Please describe what happened before saving.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('incidents').insert({
      participant_id: selectedId,
      date: draft.date,
      time: draft.time,
      type: draft.type,
      severity: draft.severity,
      description: draft.description.trim(),
      action_taken: draft.action_taken.trim(),
      witnesses: draft.witnesses.trim(),
      reported_to: draft.reported_to.trim(),
      follow_up_required: draft.follow_up_required,
      recorded_by: staffName.trim(),
    });
    if (error) {
      alert('Could not save incident: ' + error.message);
    } else {
      await loadIncidents();
      setDraft(blankIncidentDraft());
      setFormOpen(false);
    }
    setSubmitting(false);
  }

  async function removeIncident(id) {
    const { error } = await supabase.from('incidents').delete().eq('id', id);
    if (!error) setIncidents((prev) => prev.filter((i) => i.id !== id));
  }

  if (!selectedParticipant) {
    return <p className="text-slate-400 text-sm">Select a participant to view or report incidents.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Incident Report — {selectedParticipant.name}</h2>
      </div>

      {formOpen ? (
        <div className="rounded-xl border-2 hhcs-border-teal bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Date</label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Time</label>
              <input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-500">Incident type</label>
              <select
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-2 py-2 text-sm mt-1"
              >
                {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Severity</label>
              <select
                value={draft.severity}
                onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}
                className="hhcs-input w-full rounded-lg border border-slate-200 px-2 py-2 text-sm mt-1"
              >
                {INCIDENT_SEVERITY.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">What happened</label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              rows={4}
              placeholder="Describe the incident factually: what happened, where, who was involved..."
              className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Action taken</label>
            <textarea
              value={draft.action_taken}
              onChange={(e) => setDraft((d) => ({ ...d, action_taken: e.target.value }))}
              rows={3}
              placeholder="Immediate action taken, first aid given, who was contacted..."
              className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Witnesses (if any)</label>
            <input
              type="text"
              value={draft.witnesses}
              onChange={(e) => setDraft((d) => ({ ...d, witnesses: e.target.value }))}
              placeholder="Names of anyone who witnessed the incident"
              className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Reported to</label>
            <input
              type="text"
              value={draft.reported_to}
              onChange={(e) => setDraft((d) => ({ ...d, reported_to: e.target.value }))}
              placeholder="e.g. Team Leader, CEO, NDIS Commission"
              className="hhcs-input w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mt-1"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={draft.follow_up_required}
              onChange={(e) => setDraft((d) => ({ ...d, follow_up_required: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Follow-up required
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setFormOpen(false); setDraft(blankIncidentDraft()); }}
              className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveIncident}
              disabled={submitting || !staffName.trim()}
              className="hhcs-btn-primary flex-1 py-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Submit Incident Report'}
            </button>
          </div>
          {!staffName.trim() && (
            <p className="text-xs text-red-600 font-medium">
              Enter your name or initials at the top of the page to save.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="w-full py-2.5 rounded-lg border-2 border-dashed border-red-300 text-red-600 text-sm font-semibold"
        >
          + Report an incident
        </button>
      )}

      <div className="space-y-2">
        {incidents.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No incidents recorded.</p>
        )}
        {incidents.map((inc) => (
          <div key={inc.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${SEVERITY_STYLES[inc.severity]}`}>
                  {inc.severity}
                </span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full hhcs-bg-navy-tint hhcs-text-navy">
                  {inc.type}
                </span>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={() => removeIncident(inc.id)}
                className="text-xs text-slate-300 hover:text-red-500 shrink-0"
                title="Remove this incident report"
              >
                ✕
              </span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{inc.description}</p>
            {inc.action_taken && (
              <p className="text-xs text-slate-500 mt-2"><span className="font-semibold">Action taken:</span> {inc.action_taken}</p>
            )}
            {inc.witnesses && (
              <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Witnesses:</span> {inc.witnesses}</p>
            )}
            {inc.reported_to && (
              <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Reported to:</span> {inc.reported_to}</p>
            )}
            {inc.follow_up_required && (
              <p className="text-xs font-semibold text-amber-600 mt-1">⚠ Follow-up required</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              {FULL_DATE_LABEL(inc.date)} · {inc.time?.slice(0, 5)} · by {inc.recorded_by}
            </p>
          </div>
        ))}
        {loadingIncidents && <p className="text-xs text-slate-400 text-center">Loading...</p>}
      </div>
    </div>
  );
}
/* ============================================================
   PHOTO GALLERY — upload photos from device, permanently stored
   in Supabase Storage (bucket: "gallery-photos") with metadata
   (who uploaded, participant, timestamp) in a "gallery_photos"
   table. Requires those two objects to exist in your Supabase
   project — see the setup note at the bottom of this file.
   ============================================================ */
function GalleryTab() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { staffName } = useStaff();
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const loadPhotos = useCallback(async () => {
    if (!selectedId) return;
    setLoadingPhotos(true);
    const { data, error } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('participant_id', selectedId)
      .order('uploaded_at', { ascending: false });
    if (!error) setPhotos(data || []);
    setLoadingPhotos(false);
  }, [selectedId]);

  useEffect(() => {
    loadPhotos();
  }, [selectedId, loadPhotos]);

  async function handleFiles(fileList) {
    if (!requireStaffName(staffName)) return;
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setUploading(true);
    setUploadError('');
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `${selectedId}/${Date.now()}-${safeName}`;
      const { error: uploadErr } = await supabase.storage.from('gallery-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadErr) {
        setUploadError(uploadErr.message);
        continue;
      }
      const { data: publicUrlData } = supabase.storage.from('gallery-photos').getPublicUrl(path);
      const { error: insertErr } = await supabase.from('gallery_photos').insert({
        participant_id: selectedId,
        storage_path: path,
        url: publicUrlData?.publicUrl || null,
        uploaded_by: staffName.trim(),
        uploaded_at: new Date().toISOString(),
      });
      if (insertErr) setUploadError(insertErr.message);
    }
    await loadPhotos();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function removePhoto(photo) {
    await supabase.storage.from('gallery-photos').remove([photo.storage_path]);
    const { error } = await supabase.from('gallery_photos').delete().eq('id', photo.id);
    if (!error) setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  if (!selectedParticipant) {
    return <p className="text-slate-400 text-sm">Select a participant to view their photo gallery.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Gallery — {selectedParticipant.name}</h2>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full py-2.5 rounded-lg border-2 border-dashed hhcs-border-teal hhcs-text-teal text-sm font-semibold disabled:opacity-60"
      >
        {uploading ? 'Uploading...' : '+ Upload photo(s) from device'}
      </button>
      {uploadError && (
        <p className="text-xs text-red-600 font-medium">{uploadError}</p>
      )}
      {!staffName.trim() && (
        <p className="text-xs text-red-600 font-medium">
          Enter your name or initials at the top of the page before uploading.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <img src={p.url} alt="Uploaded" className="w-full h-32 object-cover" />
            <div className="p-2">
              <p className="text-xs font-medium text-slate-700 truncate">{p.uploaded_by}</p>
              <p className="text-[10px] text-slate-400">
                {new Date(p.uploaded_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <span
                role="button"
                tabIndex={0}
                onClick={() => removePhoto(p)}
                className="text-[10px] text-slate-300 hover:text-red-500"
              >
                Remove
              </span>
            </div>
          </div>
        ))}
      </div>
      {photos.length === 0 && !loadingPhotos && (
        <p className="text-sm text-slate-400 text-center py-4">No photos uploaded yet.</p>
      )}
      {loadingPhotos && <p className="text-xs text-slate-400 text-center">Loading...</p>}
    </div>
  );
}

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
const TABS = [
  { key: 'medication', label: 'Medication' },
  { key: 'food', label: 'Food Diary' },
  { key: 'sleep', label: 'Sleep Log' },
  { key: 'progress', label: 'Progress Notes' },
  { key: 'incident', label: 'Incident Report' },
  { key: 'gallery', label: 'Gallery' },
];

function TabNav({ active, onChange }) {
  return (
    <div className="flex gap-1 p-1 hhcs-bg-navy-tint rounded-xl overflow-x-auto lg:overflow-visible lg:flex-wrap">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`flex-1 text-sm font-semibold py-2 px-2 rounded-lg transition-colors whitespace-nowrap
            ${active === t.key ? 'hhcs-tab-active' : 'text-slate-500'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
/* ============================================================
   SHIFT REPORT — aggregates today's Medication, Food Diary,
   Sleep Log, Progress Notes, Incident Reports and Gallery
   photos for the selected participant into one printable view.
   "Download" uses the browser's native print-to-PDF via
   window.print(), scoped with an @media print rule (see
   THEME_CSS) so only the report itself is printed.
   ============================================================ */
function ShiftReportButton() {
  const { selectedParticipant, selectedId } = useParticipant();
  const { signoffsByParticipant } = useMedicationData();
  const { diaryByParticipant } = useFoodDiary();
  const { logsByParticipant, dayNotesByParticipant } = useSleepLogData();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressNotes, setProgressNotes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [photos, setPhotos] = useState([]);

  async function generateReport() {
    if (!selectedId) return;
    setLoading(true);
    const [{ data: notesData }, { data: incidentsData }, { data: photosData }] = await Promise.all([
      supabase.from('progress_notes').select('*').eq('participant_id', selectedId).eq('date', TODAY_STR),
      supabase.from('incidents').select('*').eq('participant_id', selectedId).eq('date', TODAY_STR),
      supabase.from('gallery_photos').select('*').eq('participant_id', selectedId),
    ]);
    setProgressNotes(notesData || []);
    setIncidents(incidentsData || []);
    setPhotos(photosData || []);
    setLoading(false);
    setOpen(true);
  }

  if (!selectedParticipant) return null;

  const todaysMeds = (signoffsByParticipant[selectedId] || []).filter((s) => s.scheduled_date === TODAY_STR);
  const foodToday = diaryByParticipant[selectedId]?.[TODAY_STR] || {};
  const sleepToday = logsByParticipant[selectedId]?.[TODAY_STR] || [];
  const sleepNotesToday = dayNotesByParticipant[selectedId]?.[TODAY_STR] || '';

  return (
    <>
      <button
        type="button"
        onClick={generateReport}
        disabled={loading}
        className="w-full py-2.5 rounded-lg hhcs-btn-primary text-sm font-semibold disabled:cursor-not-allowed"
      >
        {loading ? 'Preparing report...' : 'Download & Print Shift Report'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full my-8 p-6" id="hhcs-print-report">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <h2 className="font-bold hhcs-text-navy text-lg">Shift Report</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="hhcs-btn-primary px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>

            <header className="mb-4 border-b border-slate-200 pb-3">
              <h1 className="text-xl font-bold hhcs-text-navy">Hope Health & Care Services</h1>
              <p className="text-sm text-slate-500">NDIS Shift Report — {selectedParticipant.name}</p>
              <p className="text-xs text-slate-400">{FULL_DATE_LABEL(TODAY_STR)}</p>
            </header>

            <section className="mb-4">
              <h3 className="font-semibold hhcs-text-navy mb-1">Medication Sign-Off</h3>
              {todaysMeds.length === 0 && <p className="text-xs text-slate-400">No medication scheduled today.</p>}
              {todaysMeds.map((m) => (
                <p key={m.id} className="text-sm text-slate-700">
                  {m.scheduled_time} — {m.medication_name}: <strong>{m.status}</strong>
                  {m.recorded_by ? ` (${m.recorded_by})` : ''}
                </p>
              ))}
            </section>

            <section className="mb-4">
              <h3 className="font-semibold hhcs-text-navy mb-1">Food Diary</h3>
              {MEAL_TYPES.map((meal) => {
                const entry = foodToday[meal.key];
                if (!entry) return null;
                const text = meal.key === 'fluids' ? `${entry.fluids_ml || 0}ml` : entry.description;
                if (!text) return null;
                return (
                  <p key={meal.key} className="text-sm text-slate-700">
                    {meal.label}: {text} {entry.recorded_by ? `(${entry.recorded_by})` : ''}
                  </p>
                );
              })}
            </section>

            <section className="mb-4">
              <h3 className="font-semibold hhcs-text-navy mb-1">Sleep Log</h3>
              {sleepToday.length === 0 && <p className="text-xs text-slate-400">No sleep checks logged today.</p>}
              {sleepToday.map((s) => (
                <p key={s.id} className="text-sm text-slate-700">
                  {formatSlot(s.time_slot)} — {s.status}, mood: {s.mood || 'n/a'} {s.recorded_by ? `(${s.recorded_by})` : ''}
                </p>
              ))}
              {sleepNotesToday && (
                <p className="text-sm text-slate-700 mt-1"><em>Notes: {sleepNotesToday}</em></p>
              )}
            </section>

            <section className="mb-4">
              <h3 className="font-semibold hhcs-text-navy mb-1">Progress Notes</h3>
              {progressNotes.length === 0 && <p className="text-xs text-slate-400">No progress notes today.</p>}
              {progressNotes.map((n) => (
                <p key={n.id} className="text-sm text-slate-700">
                  [{n.category}] {n.note} — {n.recorded_by}
                </p>
              ))}
            </section>

            <section className="mb-4">
              <h3 className="font-semibold hhcs-text-navy mb-1">Incident Reports</h3>
              {incidents.length === 0 && <p className="text-xs text-slate-400">No incidents today.</p>}
              {incidents.map((inc) => (
                <p key={inc.id} className="text-sm text-slate-700">
                  [{inc.severity}/{inc.type}] {inc.description} — {inc.recorded_by}
                </p>
              ))}
            </section>

            <section>
              <h3 className="font-semibold hhcs-text-navy mb-1">Gallery</h3>
              {photos.length === 0 && <p className="text-xs text-slate-400">No photos on file.</p>}
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <div key={p.id}>
                    <img src={p.url} alt="" className="w-full h-20 object-cover rounded" />
                    <p className="text-[10px] text-slate-400 truncate">{p.uploaded_by}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
/* ============================================================
   APP
   Layout note: the same components now render at any width — on
   phones it's the original single-column stack; from a tablet /
   laptop screen upward the whole panel simply gets wider (and
   padding grows) so nothing looks stretched-thin on a monitor.
   No data, contexts, or component logic were changed for this.

   Persistence note: all five tabs are now mounted at once and
   simply shown/hidden with a CSS class instead of being
   conditionally rendered (which unmounted — and therefore reset
   — whichever tab wasn't active). Combined with lifting the
   Medication/Food/Sleep data into contexts above, nothing typed
   or logged disappears when switching tabs.
   ============================================================ */
function Dashboard() {
  const [tab, setTab] = useState('medication');

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-10">
      <div className="max-w-md sm:max-w-xl lg:max-w-6xl mx-auto lg:grid lg:grid-cols-[300px_1fr] lg:gap-6 lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-10">
          <header className="hhcs-bg-navy rounded-xl p-4 lg:p-6">
            <h1 className="text-lg lg:text-xl font-bold text-white">Hope Health & Care Services</h1>
            <p className="text-xs lg:text-sm text-slate-200">NDIS Participant Care Log — Staff Portal</p>
          </header>

          <StaffAttributionBar />
          <ParticipantSelector />
          <TabNav active={tab} onChange={setTab} />
          <ShiftReportButton />
        </div>

        <div className="mt-4 lg:mt-0 lg:bg-white lg:rounded-xl lg:border lg:border-slate-200 lg:p-6">
          <div className={tab === 'medication' ? '' : 'hidden'}><MedicationSignOff /></div>
          <div className={tab === 'food' ? '' : 'hidden'}><FoodDiaryGrid /></div>
          <div className={tab === 'sleep' ? '' : 'hidden'}><SleepLog /></div>
          <div className={tab === 'progress' ? '' : 'hidden'}><ProgressNotes /></div>
          <div className={tab === 'incident' ? '' : 'hidden'}><IncidentReport /></div>
          <div className={tab === 'gallery' ? '' : 'hidden'}><GalleryTab /></div>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { staffName } = useStaff();
  if (!staffName) return <StaffLogin />;
  return <Dashboard />;
}

export default function App() {
  return (
    <ParticipantProvider>
      <StaffProvider>
        <MedicationDataProvider>
          <FoodDiaryProvider>
            <SleepLogDataProvider>
              <style>{THEME_CSS}</style>
              <AppShell />
            </SleepLogDataProvider>
          </FoodDiaryProvider>
        </MedicationDataProvider>
      </StaffProvider>
    </ParticipantProvider>
  );
}
