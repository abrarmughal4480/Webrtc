import React, { useState, useEffect } from "react";
import { X as XIcon, FileText, ChevronDown, ChevronDownCircle } from "lucide-react";
import { toast } from "sonner";

export const sections = [
  {
    key: "preferences",
    title: "RESIDENT COMMUNICATION PREFERENCES:",
    options: [
      { key: "default", label: "Default: None specified/See Job Ticket" },
      { key: "callMobile", label: "Best way to contact: Call Mobile first" },
      { key: "callLandline", label: "Best way to contact: Call Landline first" },
      { key: "sms", label: "Resident prefers SMS communication" },
      { key: "email", label: "Resident prefers EMAIL communication" },
      { key: "other", label: "Other: Please state:", isOther: true },
    ],
  },
  {
    key: "access",
    title: "BEST ACCESS STEPS:",
    options: [
      { key: "default", label: "Default: None specified/See Job Ticket" },
      { key: "callOnWay", label: "Call when on way" },
      { key: "avoidSchoolRun", label: "Avoid School run" },
      {
        key: "preferredTime",
        label: "Preferred appmnt time between x - x times",
        isTimeRange: true,
      },
      {
        key: "preferredDays",
        label: "Preferred Appmnt days are:",
        isDays: true,
      },
      { key: "knockLoudly", label: "Knock loudly and wait longer as resident has vulnerability" },
      { key: "other", label: "Other: Please state:", isOther: true },
    ],
  },
  {
    key: "repair",
    title: "REPAIR/COMPLETION REQUESTS:",
    options: [
      { key: "default", label: "Default: None specified/Follow your local policy" },
      { key: "beforeAfterPhotos", label: "Take before and after photos/videos" },
      { key: "uploadToVideodesk", label: "Upload completion photos to Videodesk" },
      { key: "residentSignature", label: "Obtain resident signature on work sheet while on site" },
      { key: "withOfficer", label: "Attend with Repairs Officer" },
      { key: "withSupervisor", label: "Attend with Repair Supervisor" },
      { key: "other", label: "Other: Please state:", isOther: true },
    ],
  },
  {
    key: "safety",
    title: "SAFETY:",
    options: [
      { key: "default", label: "Default: None specified/Follow your local policy" },
      { key: "violenceFlag", label: "Resident/household have alert flag for violence" },
      { key: "twoPerson", label: "2 Person Visit only" },
      { key: "daylightOnly", label: "Daylight Visit only" },
      { key: "localRiskAssessment", label: "Undertake your company local risk assessment before attending" },
      { key: "dynamicRiskAssessment", label: "Dynamic risk assessment required on visit" },
      { key: "withHousingOfficer", label: "Attend with Housing Officer/Housing Team" },
      { key: "withSecurity", label: "Attend with Security presence" },
      { key: "animalsPresent", label: "Animals/dogs known to be present at property" },
      { key: "spoc", label: "Resident has Single Point of Contact (SPOC)" },
      { key: "dryHoarded", label: "Property reported/suspected as DRY HOARDED" },
      { key: "wetHoarded", label: "Property reported/suspected as WET HOARDED" },
      { key: "needles", label: "Report of possible needles- NEEDLE PROOF PPE required" },
      { key: "eviction", label: "Eviction - attend with Housing Team presence" },
      { key: "other", label: "Other: Please state:", isOther: true },
    ],
  },
  {
    key: "vulnerability",
    title: "HOUSEHOLD VULNERABILITY:",
    options: [
      { key: "default", label: "Default: None specified/Follow your local policy" },
      { key: "vulnerableOccupier", label: "Household with vulnerable occupier(s)" },
      { key: "baby", label: "Baby in property" },
      { key: "youngChildren", label: "Young children in property" },
      { key: "elderly", label: "Elderly in property" },
      { key: "other", label: "Other: Please state:", isOther: true },
    ],
  },
  {
    key: "legal",
    title: "LEGAL CLAIM:",
    options: [
      { key: "default", label: "Default: None specified/Follow your local policy" },
      { key: "awaabsLaw", label: "Awaabs Law priority required" },
      { key: "potentialDisrepair", label: "Potential legal disrepair claim" },
      { key: "currentDisrepair", label: "Current legal disrepair claim" },
      { key: "scottSchedule", label: "Repair(s) part of Scott Schedule (Legal Disrepair case)" },
      { key: "other", label: "Other: Please state:", isOther: true },
    ],
  },
  {
    key: "property",
    title: "SPECIAL PROPERTY REQUESTS:",
    options: [
      { key: "default", label: "Default: None specified/Follow your local policy" },
      { key: "heaters", label: "Provide temporary heaters" },
      { key: "dehumidifiers", label: "Provide dehumidifiers x", isDehumidifier: true },
      { key: "water", label: "Provide temporary/bottled water" },
      { key: "keySafe", label: "Install Key Safe outside property" },
      { key: "other", label: "Other: Please state:", isOther: true },
    ],
  },
  {
    key: "noAccess",
    title: "NO ACCESS STEPS:",
    options: [
      { key: "default", label: "Default: None specified/Follow your local policy" },
      { key: "callResident", label: "Call resident if no answer after knocking" },
      { key: "photoDoor", label: "Take photo of front door if no access" },
      { key: "videoDoor", label: "Take video of front door if no access" },
      { key: "callOffice", label: "Call office while onsite if no access" },
      { key: "leaveCard", label: "Leave 'While you were out' card/letter" },
      { key: "sticker", label: "Sticker front door with provided sticker label" },
      { key: "wait", label: "Wait for extended time:", isWait: true },
      { key: "other", label: "Other: Please state:", isOther: true },
    ],
  },
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Section({ title, options, state, setState, singleSelect }) {
  if (singleSelect) {
    // Only one can be selected at a time (single-select)
    return (
      <div className="mb-6">
        <div className="font-bold text-gray-800 mb-2 text-base">{title}</div>
        <div className="flex flex-col gap-2 text-sm">
          {options.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!state[opt.key]}
                onChange={() => {
                  // Uncheck all, then check this one
                  const newState = {};
                  options.forEach(o => { newState[o.key] = false; });
                  newState[opt.key] = !state[opt.key];
                  setState(newState);
                }}
              />
              {opt.isOther ? 'Other:' : opt.label}
              {opt.isOther && (
                <input
                  type="text"
                  className="ml-2 px-2 py-1 border border-gray-300 rounded"
                  value={state.otherText || ""}
                  onChange={e => setState({ ...state, otherText: e.target.value })}
                  disabled={!state[opt.key]}
                  placeholder="Please specify"
                  style={{ minWidth: 240, maxWidth: '100%' }}
                />
              )}
            </label>
          ))}
        </div>
      </div>
    );
  }
  // Multi-select with default logic for all other sections
  const defaultKey = options.find(opt => opt.key === 'default') ? 'default' : null;
  return (
    <div className="mb-6">
      <div className="font-bold text-gray-800 mb-2 text-base">{title}</div>
      <div className="flex flex-col gap-2 text-sm">
        {options.map((opt) => {
          if (opt.key === defaultKey) {
            return (
              <label key={opt.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!state[defaultKey] || (!Object.entries(state).some(([k, v]) => k !== defaultKey && v))}
                  onChange={() => {
                    // If checking default, uncheck all others
                    const newState = { [defaultKey]: true };
                    setState(newState);
                  }}
                />
                {opt.label}
              </label>
            );
          }
          if (opt.isOther) {
            return (
              <label key={opt.key} className="flex items-start gap-2 w-full">
                <input
                  type="checkbox"
                  checked={!!state.other}
                  onChange={() => {
                    if (!state.other) {
                      // Uncheck default, check other
                      setState({ ...state, [defaultKey]: false, other: true });
                    } else {
                      // Uncheck other, if nothing else checked, check default
                      const newState = { ...state, other: false };
                      const anyChecked = Object.entries(newState).some(([k, v]) => k !== defaultKey && k !== 'otherText' && v);
                      if (!anyChecked) newState[defaultKey] = true;
                      setState(newState);
                    }
                  }}
                  style={{ marginTop: 4 }}
                />
                <span style={{ marginTop: 2 }}>{'Other' + (state.other ? ':' : '')}</span>
                {state.other && (
                  <textarea
                    className="ml-2 px-2 py-1 border border-gray-300 rounded resize-vertical"
                    value={state.otherText || ""}
                    onChange={e => setState({ ...state, otherText: e.target.value })}
                    disabled={!state.other}
                    placeholder="Please specify"
                    style={{ minWidth: 240, maxWidth: '100%', minHeight: 48, maxHeight: 120, marginTop: 0 }}
                    rows={3}
                  />
                )}
              </label>
            );
          }
          if (opt.isDays) {
            // Show main checkbox, and only show day checkboxes if checked
            return (
              <div key={opt.key} className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2 font-medium text-gray-700 mb-1">
                  <input
                    type="checkbox"
                    checked={!!state.preferredDaysEnabled}
                    onChange={() => {
                      const enabled = !state.preferredDaysEnabled;
                      setState({
                        ...state,
                        preferredDaysEnabled: enabled,
                        preferredDays: enabled
                          ? state.preferredDays || { anyDay: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false }
                          : { anyDay: false, mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false }
                      });
                    }}
                  />
                  Preferred Appmnt days are:
                  <span className="ml-2 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-red-500 pointer-events-none" style={{ lineHeight: 0, paddingTop: '1px' }}>
                    <ChevronDown className="w-[14px] h-[14px] text-red-500 pointer-events-none" aria-hidden="true" strokeWidth={3} />
                  </span>
                </label>
                {state.preferredDaysEnabled && (
                  <div className="flex flex-row flex-wrap gap-4 items-center pl-6">
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!state.preferredDays?.anyDay}
                        onChange={() => {
                          const newDays = { anyDay: !state.preferredDays?.anyDay };
                          if (newDays.anyDay) {
                            ['mon','tue','wed','thu','fri','sat','sun'].forEach(k => newDays[k] = false);
                          } else {
                            ['mon','tue','wed','thu','fri','sat','sun'].forEach(k => newDays[k] = state.preferredDays?.[k] || false);
                          }
                          setState({ ...state, preferredDays: newDays });
                        }}
                      />
                      Any day
                      <span className="text-s text-gray-500 ml-2">or</span>
                    </label>
                    {['mon','tue','wed','thu','fri','sat','sun'].map(day => (
                      <label key={day} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={!!state.preferredDays?.[day]}
                          onChange={() => {
                            const newDays = { ...state.preferredDays, [day]: !state.preferredDays?.[day], anyDay: false };
                            setState({ ...state, preferredDays: newDays });
                          }}
                          disabled={!!state.preferredDays?.anyDay}
                        />
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          if (opt.isTimeRange) {
            return (
              <div key={opt.key} className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!state.preferredTime}
                    onChange={() => {
                      setState({
                        ...state,
                        preferredTime: !state.preferredTime,
                        preferredTimeFrom: '',
                        preferredTimeTo: '',
                      });
                    }}
                  />
                  Preferred appmnt time between
                  <input
                    type="time"
                    value={state.preferredTimeFrom || ''}
                    onChange={e => setState({ ...state, preferredTimeFrom: e.target.value })}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded"
                    style={{ minWidth: 90 }}
                    disabled={!state.preferredTime}
                  />
                  <span className="mx-1">to</span>
                  <input
                    type="time"
                    value={state.preferredTimeTo || ''}
                    onChange={e => setState({ ...state, preferredTimeTo: e.target.value })}
                    className="px-2 py-1 border border-gray-300 rounded"
                    style={{ minWidth: 90 }}
                    disabled={!state.preferredTime}
                  />
                  times
                </label>
              </div>
            );
          }
          if (opt.isDehumidifier) {
            return (
              <label key={opt.key} className="flex items-center gap-3 w-full">
                <input
                  type="checkbox"
                  checked={!!state.dehumidifiers}
                  onChange={() => {
                    setState({
                      ...state,
                      dehumidifiers: !state.dehumidifiers,
                      dehumidifierCount: !state.dehumidifiers ? 1 : state.dehumidifierCount,
                    });
                  }}
                />
                <span>Provide dehumidifiers</span>
                <div className="relative mr-2">
                  <select
                    className="ml-2 pr-8 py-1 pl-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all duration-150 shadow-sm appearance-none"
                    value={state.dehumidifierCount || 1}
                    onChange={e => setState({ ...state, dehumidifierCount: Number(e.target.value) })}
                    style={{ minWidth: 56 }}
                    disabled={!state.dehumidifiers}
                  >
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                <span className="text-gray-500 text-sm">unit(s)</span>
              </label>
            );
          }
          // For all other options
          return (
            <label key={opt.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!state[opt.key]}
                onChange={() => {
                  if (!state[opt.key]) {
                    // If checking, uncheck default and check this
                    setState({ ...state, [defaultKey]: false, [opt.key]: true });
                  } else {
                    // If unchecking, just uncheck this; if nothing else checked, check default
                    const newState = { ...state, [opt.key]: false };
                    const anyChecked = Object.entries(newState).some(([k, v]) => k !== defaultKey && k !== 'otherText' && v);
                    if (!anyChecked) newState[defaultKey] = true;
                    setState(newState);
                  }
                }}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function SpecialNotesDialog({ open, onClose, initialData, onSave }) {
  // Initialize state from initialData when dialog opens
  const [dialogState, setDialogState] = useState(initialData || {});
  useEffect(() => {
    if (open) {
      setDialogState(initialData || {});
    }
  }, [open, initialData]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div
        className="bg-white rounded-2xl border border-purple-200 shadow-2xl min-w-[320px] min-h-[220px] relative max-h-[90vh] overflow-hidden"
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f3e8ff 100%)',
          boxShadow: '0 8px 32px 0 rgba(80, 0, 120, 0.18), 0 1.5px 8px 0 rgba(80,0,120,0.08)',
          border: '1.5px solid #e9d5ff',
        }}
      >
        {/* Header - matches DialogProvider style */}
        <div className="flex items-center justify-center bg-purple-500 text-white p-4 m-0 relative rounded-t-xl">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold">Special Notes</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 text-white hover:text-gray-200"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6 sm:p-8 bg-transparent rounded-b-xl max-h-[calc(90vh-4rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {sections.map((section, idx) => (
            <div key={section.key} className="mb-8 last:mb-0">
              <Section
                title={`${idx + 1}. ${section.title}`}
                options={section.options}
                state={dialogState[section.key] || { default: true }}
                setState={newState => setDialogState(ds => ({ ...ds, [section.key]: newState }))}
                singleSelect={idx === 0}
              />
            </div>
          ))}
          <div className="flex flex-row justify-end gap-4 mt-6 px-6 pt-6">
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg shadow transition-all duration-200"
              onClick={() => {
                // Reset all sections to default state
                setDialogState({});
                if (onClose) onClose();
              }}
            >
              Clear & Close
            </button>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-all duration-200"
              onClick={() => {
                if (onSave) onSave(dialogState);
                if (onClose) onClose();
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}   