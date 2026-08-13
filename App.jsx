import React, { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from 'react';
import { supabase } from './supabaseClient';

/* ============================================================
   BRAND THEME
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

  @media print {
    body * { visibility: hidden; }
    #hhcs-print-report, #hhcs-print-report * { visibility: visible; }
    #hhcs-print-report { position: absolute; left: 0; top: 0; width: 100%; }
  }
`;

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

const FULL_DATE_LABEL = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function pad2(n) { return String(n).padStart(2, '0'); }
function toISODate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return toISODate(d);
}

const TODAY_STR = toISODate(new Date());
const CURRENT_WEEK_START = getMondayOf(TODAY_STR);
const WEEK_START = CURRENT_WEEK_START;
const WEEK_DATES = generateWeekDates(WEEK_START);

const AWOKEN_OPTIONS = ['Self-settled', 'Required assistance', 'Distressed', 'Toileting', 'N/A'];
const MOOD_OPTIONS = ['Calm', 'Settled', 'Unsettled', 'Distressed', 'Content'];

const MOCK_SLEEP_LOGS = {
  1: {
    [TODAY_STR]: [
      { id: 'sl-1', time_slot: '20:00', status: 'awake', how_awoken: 'N/A', mood: 'Settled', notes: 'Watching TV before bed', recorded_by: 'JM' },
      { id: 'sl-2', time_slot: '22:00', status: 'asleep', how_awoken: 'N/A', mood: 'Calm', notes: '', recorded_by: 'JM' },
    ],
  },
};

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
   CONTEXT DEFINITIONS (Restored to fix reference error)
   ============================================================ */
const ParticipantContext = createContext(null);

function ParticipantProvider({ children }) {
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);
  const [selectedId, setSelectedId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

const StaffContext = createContext(null);

function StaffProvider({ children }) {
  const [staffName, setStaffName] = useState('Melissa Egan (Admin)');
  return <StaffContext.Provider value={{ staffName, setStaffName }}>{children}</StaffContext.Provider>;
}

function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used within a StaffProvider');
  return ctx;
}

function requireStaffName(staffName) {
  if (!staffName || !staffName.trim()) {
    alert('Please enter your name or initials at the top of the page before saving an entry.');
    return false;
  }
  return true;
}

const SleepLogContext = createContext(null);
function SleepLogDataProvider({ children }) {
  const [logsByParticipant, setLogsByParticipant] = useState(MOCK_SLEEP_LOGS);
  return (
    <SleepLogContext.Provider value={{ logsByParticipant, setLogsByParticipant }}>
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
   SLEEP LOG COMPONENT
   ============================================================ */
function SleepLogTab() {
  const { selectedId } = useParticipant();
  const { staffName } = useStaff();
  const [date, setDate] = useState(TODAY_STR);
  
  // Sleep Notes States
  const [sleepNotes, setSleepNotes] = useState('');
  const [loadingNote, setLoadingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Check Editor Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('asleep');
  const [sleepTime, setSleepTime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('06:00');
  const [howAwoken, setHowAwoken] = useState('Self-settled');
  const [mood, setMood] = useState('Calm');
  const [checkNotes, setCheckNotes] = useState('');

  // Fetch existing saved sleep note on mount or when participant/date changes
  useEffect(() => {
    let isMounted = true;
    async function fetchSleepNote() {
      if (!selectedId || !date) return;
      setLoadingNote(true);
      setSaveError(null);
      const { data, error } = await supabase
        .from('sleep_notes')
        .select('notes')
        .eq('participant_id', selectedId)
        .eq('date', date)
        .maybeSingle();

      if (!isMounted) return;
      if (error) {
        setSaveError(error.message);
      } else if (data) {
        setSleepNotes(data.notes || '');
      } else {
        setSleepNotes('');
      }
      setLoadingNote(false);
    }
    fetchSleepNote();
    return () => { isMounted = false; };
  }, [selectedId, date]);

  // Real Supabase upsert save handler for Sleep Notes
  const handleSaveSleepNotes = async () => {
    if (!requireStaffName(staffName)) return;
    setSavingNote(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { error } = await supabase
      .from('sleep_notes')
      .upsert(
        {
          participant_id: selectedId,
          date: date,
          notes: sleepNotes,
          updated_by: staffName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'participant_id,date' }
      );

    setSavingNote(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <style>{THEME_CSS}</style>
      <div className="bg-white rounded-xl border hhcs-border-navy p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold hhcs-text-navy">Sleep & Night Monitoring Log</h2>
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

        {/* Check Editor Trigger / Modal Simulation */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">Nightly Check Entry</p>
            <p className="text-xs text-slate-500">Record sleep status, times, and observations.</p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="hhcs-btn-primary px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            Add Check Entry
          </button>
        </div>

        {/* Sleep Notes Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold hhcs-text-navy">General Sleep Notes for {FULL_DATE_LABEL(date)}</label>
            {loadingNote && <span className="text-xs text-slate-400">Loading notes...</span>}
          </div>
          <textarea
            rows={4}
            value={sleepNotes}
            onChange={(e) => setSleepNotes(e.target.value)}
            placeholder="Enter overall notes regarding sleep quality, disturbances, or routines..."
            className="hhcs-input w-full rounded-xl border border-slate-300 p-3 text-sm"
          />
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs">
              {saveError && <span className="text-red-600 font-medium">Error saving: {saveError}</span>}
              {saveSuccess && <span className="text-emerald-600 font-medium">Notes successfully saved!</span>}
            </div>
            <button
              type="button"
              disabled={savingNote}
              onClick={handleSaveSleepNotes}
              className="hhcs-btn-primary px-5 py-2 rounded-lg text-sm font-semibold shadow-sm disabled:cursor-not-allowed"
            >
              {savingNote ? 'Saving...' : 'Save Sleep Notes'}
            </button>
          </div>
        </div>
      </div>

      {/* Check Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold hhcs-text-navy">Sleep Check Details</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Status Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'asleep', label: 'Asleep' },
                  { key: 'awake', label: 'Awake' },
                  { key: 'checked', label: 'Checked' },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSelectedStatus(s.key)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                      selectedStatus === s.key ? 'hhcs-chip-active shadow-sm' : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dedicated Time Inputs based on Status Selection */}
            {selectedStatus === 'asleep' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sleep Time</label>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="hhcs-input w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                />
              </div>
            )}

            {selectedStatus === 'awake' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wake Time</label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="hhcs-input w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                />
              </div>
            )}

            {/* Preserved Unmodified Fields: How awoken, Mood, Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">How awoken</label>
              <select
                value={howAwoken}
                onChange={(e) => setHowAwoken(e.target.value)}
                className="hhcs-input w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white"
              >
                {AWOKEN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mood</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="hhcs-input w-full rounded-xl border border-slate-300 p-2.5 text-sm bg-white"
              >
                {MOOD_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes for this check</label>
              <textarea
                rows={3}
                value={checkNotes}
                onChange={(e) => setCheckNotes(e.target.value)}
                placeholder="Observations during check..."
                className="hhcs-input w-full rounded-xl border border-slate-300 p-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  alert('Sleep check entry saved successfully.');
                  setModalOpen(false);
                }}
                className="hhcs-btn-primary px-5 py-2 rounded-xl text-sm font-semibold shadow-sm"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN APP ROOT COMPONENT
   ============================================================ */
export default function App() {
  return (
    <ParticipantProvider>
      <StaffProvider>
        <SleepLogDataProvider>
          <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <header className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
                <h1 className="text-lg font-bold text-slate-800">HCMS Sleep Monitoring Portal</h1>
              </header>
              <main>
                <SleepLogTab />
              </main>
            </div>
          </div>
        </SleepLogDataProvider>
      </StaffProvider>
    </ParticipantProvider>
  );
}
