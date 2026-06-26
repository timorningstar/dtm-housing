import { useState, useEffect } from "react";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

const AIRTABLE_TOKEN = "patGpUSXE9DpLa1lc.a1f186163cd47cdc77cd52a3c11b26c2bcedcd2baa42b0e0fe4aa48a50b2459f";
const BASE_ID = "appTT0dGIUwigWKxB";
const FALLBACK_ADMIN = "t1@downtownmin.org";

const C = {
  blue: "#1a3a5c", gold: "#c8952a", light: "#f0f4f8", white: "#ffffff",
  green: "#2e7d52", border: "#d0dae6", text: "#2d3a4a", muted: "#5a6a7e", danger: "#c0392b",
};

const atFetch = async (table, method = "GET", body = null, recordId = "") => {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}${recordId ? "/" + recordId : ""}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Airtable error: ${res.status}`);
  return res.json();
};

const fetchAll = async (table) => {
  let records = [], offset = null;
  do {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}${offset ? "?offset=" + offset : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    const data = await res.json();
    records = [...records, ...(data.records || [])];
    offset = data.offset;
  } while (offset);
  return records;
};

const Input = ({ label, value, onChange, type = "text", placeholder, required }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</div>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 15, color: C.text, background: C.light, outline: "none", boxSizing: "border-box" }} />
  </div>
);

const Textarea = ({ label, value, onChange, placeholder }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>}
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 15, color: C.text, background: C.light, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
  </div>
);

const SelectField = ({ label, value, onChange, options, placeholder, required }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ fontSize: 13, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</div>}
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 15, color: value ? C.text : C.muted, background: C.light, outline: "none", boxSizing: "border-box" }}>
      <option value="">{placeholder || "Select…"}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const CheckItem = ({ label, checked, onChange, children, required }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <div onClick={onChange} style={{ width: 22, height: 22, minWidth: 22, border: `2px solid ${checked ? C.gold : C.border}`, borderRadius: 4, background: checked ? C.gold : C.white, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, cursor: "pointer" }}>
        {checked && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span style={{ fontSize: 15, color: C.text, lineHeight: 1.4 }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</span>
    </label>
    {children && checked && <div style={{ marginLeft: 32, marginTop: 6 }}>{children}</div>}
  </div>
);

const YesNo = ({ label, value, onChange, children, required }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 14, color: C.text, marginBottom: 6, fontWeight: 500 }}>
      {label}{required && <span style={{ color: C.danger }}> *</span>}
    </div>
    <div style={{ display: "flex", gap: 10 }}>
      <button onClick={() => onChange(true)} style={{
        flex: 1, padding: "8px 0", borderRadius: 7, border: `2px solid ${value === true ? C.green : C.border}`,
        background: value === true ? C.green : C.white, color: value === true ? C.white : C.muted,
        fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}>Yes</button>
      <button onClick={() => onChange(false)} style={{
        flex: 1, padding: "8px 0", borderRadius: 7, border: `2px solid ${value === false ? C.danger : C.border}`,
        background: value === false ? C.danger : C.white, color: value === false ? C.white : C.muted,
        fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}>No</button>
    </div>
    {value === true && children && <div style={{ marginTop: 8 }}>{children}</div>}
  </div>
);

const Card = ({ title, icon, children }) => (
  <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 18, overflow: "hidden", boxShadow: "0 1px 4px rgba(26,58,92,0.07)" }}>
    <div style={{ background: C.blue, padding: "12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>{title}</span>
    </div>
    <div style={{ padding: "16px 18px" }}>{children}</div>
  </div>
);

const Btn = ({ children, onClick, color = C.gold, disabled, full, small, outline, danger }) => {
  const bg = danger ? C.danger : color;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: outline ? "transparent" : (disabled ? "#aaa" : bg),
      color: outline ? bg : C.white,
      border: outline ? `2px solid ${bg}` : "none",
      borderRadius: 8, padding: small ? "7px 14px" : full ? "14px 0" : "10px 20px",
      fontSize: small ? 13 : 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      width: full ? "100%" : "auto", transition: "all 0.15s", marginRight: 6,
    }}>{children}</button>
  );
};

const ErrorBox = ({ msg }) => msg ? (
  <div style={{ background: "#fdecea", border: `1px solid ${C.danger}`, borderRadius: 8, padding: "10px 14px", color: C.danger, marginBottom: 16, fontSize: 14 }}>{msg}</div>
) : null;

const SuccessBox = ({ msg }) => msg ? (
  <div style={{ background: "#d4edda", border: `1px solid ${C.green}`, borderRadius: 8, padding: "10px 14px", color: C.green, marginBottom: 16, fontSize: 14 }}>{msg}</div>
) : null;

const PageHeader = ({ title, subtitle, userName, onSignOut, isAdmin, onAdminClick }) => (
  <div style={{ background: C.blue, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `4px solid ${C.gold}` }}>
    <div>
      <div style={{ fontSize: 10, color: C.gold, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>Downtown Ministries of Goshen</div>
      <div style={{ color: C.white, fontWeight: 700, fontSize: 17 }}>{title}</div>
      {subtitle && <div style={{ color: "#a0b8d0", fontSize: 12 }}>{subtitle}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {isAdmin && onAdminClick && (
        <button onClick={onAdminClick} style={{ background: "rgba(255,255,255,0.12)", color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "5px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Admin</button>
      )}
      <div style={{ textAlign: "right" }}>
        <div style={{ color: "#a0b8d0", fontSize: 11 }}>{userName}</div>
        <button onClick={onSignOut} style={{ background: "none", border: "none", color: C.gold, fontSize: 12, cursor: "pointer", fontWeight: 700, padding: 0 }}>Sign Out</button>
      </div>
    </div>
  </div>
);

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) { setError("Incorrect email or password. Please try again."); }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email) { setError("Enter your email address above to reset your password."); return; }
    try { await sendPasswordResetEmail(auth, email); setResetSent(true); }
    catch (e) { setError("Could not send reset email. Check your email address."); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 36, maxWidth: 380, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: C.gold, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Downtown Ministries of Goshen</div>
          <h1 style={{ color: C.blue, margin: "0 0 4px", fontSize: 24, fontWeight: 700 }}>DTM Housing</h1>
          <div style={{ color: C.muted, fontSize: 14 }}>Care Coordinator Portal</div>
        </div>
        <ErrorBox msg={error} />
        {resetSent && <SuccessBox msg="Password reset email sent! Check your inbox." />}
        <Input label="Email Address" value={email} onChange={setEmail} type="email" placeholder="your@email.com" required />
        <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="Your password" required />
        <div style={{ marginBottom: 16 }}><Btn full onClick={handleLogin} disabled={loading} color={C.blue}>{loading ? "Signing in…" : "Sign In"}</Btn></div>
        <div style={{ textAlign: "center" }}>
          <button onClick={handleReset} style={{ background: "none", border: "none", color: C.gold, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Forgot your password?</button>
        </div>
        <div style={{ marginTop: 24, padding: "14px", background: C.light, borderRadius: 8, fontSize: 12, color: C.muted, textAlign: "center" }}>
          Contact your housing director if you need help accessing your account.
        </div>
      </div>
    </div>
  );
}

function HistoryPage({ coordinatorRecord, isAdmin, allCoordinators, allProperties, allResidents }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterCoordinator, setFilterCoordinator] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const records = await fetchAll("Visit Reports");
      records.sort((a, b) => new Date(b.fields.Date || 0) - new Date(a.fields.Date || 0));
      setReports(records);
    } catch (e) { setError("Could not load visit history."); }
    setLoading(false);
  };

  const propName = id => allProperties.find(p => p.id === id)?.fields?.Name || "—";
  const coordName = id => allCoordinators.find(c => c.id === id)?.fields?.Name || "—";
  const residentName = id => allResidents.find(r => r.id === id)?.fields?.Name || "—";

  const filtered = reports.filter(r => {
    if (!isAdmin) {
      const coordIds = r.fields.Coordinator || [];
      return coordinatorRecord && coordIds.includes(coordinatorRecord.id);
    }
    if (filterProperty) {
      const coordIds = r.fields.Coordinator || [];
      const coord = allCoordinators.find(c => coordIds.includes(c.id));
      const propIds = coord?.fields?.Properties || [];
      if (!propIds.includes(filterProperty)) return false;
    }
    if (filterCoordinator) {
      const coordIds = r.fields.Coordinator || [];
      if (!coordIds.includes(filterCoordinator)) return false;
    }
    return true;
  });

  const yn = val => val === true ? "✅ Yes" : val === false ? "❌ No" : "—";
  const txt = val => val || "—";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 14px 40px" }}>
      <ErrorBox msg={error} />
      {isAdmin && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <SelectField label="Filter by Property" value={filterProperty} onChange={setFilterProperty}
              options={allProperties.filter(p => p.fields?.Status !== "Archived").map(p => ({ value: p.id, label: p.fields.Name }))}
              placeholder="All properties" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <SelectField label="Filter by Coordinator" value={filterCoordinator} onChange={setFilterCoordinator}
              options={allCoordinators.map(c => ({ value: c.id, label: c.fields.Name }))}
              placeholder="All coordinators" />
          </div>
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>Loading history…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: C.muted, padding: 40, background: C.white, borderRadius: 12, border: `1px solid ${C.border}` }}>No visit reports found.</div>
      ) : filtered.map(r => {
        const isOpen = expanded === r.id;
        const coordIds = r.fields.Coordinator || [];
        const cName = coordIds.length ? coordName(coordIds[0]) : "—";
        const coord = allCoordinators.find(c => coordIds.includes(c.id));
        const propIds = coord?.fields?.Properties || [];
        const pName = propIds.length ? propName(propIds[0]) : "—";
        const residentIds = r.fields.Resident || [];
        const rName = residentIds.length ? residentName(residentIds[0]) : "—";
        const f = r.fields;
        return (
          <div key={r.id} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(26,58,92,0.07)" }}>
            <div onClick={() => setExpanded(isOpen ? null : r.id)}
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: isOpen ? "#e8f0f8" : C.white }}>
              <div>
                <div style={{ fontWeight: 700, color: C.blue, fontSize: 15 }}>{f.Date || "No date"} &nbsp;·&nbsp; {rName}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{pName}{isAdmin ? ` · ${cName}` : ""}</div>
              </div>
              <div style={{ color: C.gold, fontWeight: 700, fontSize: 18 }}>{isOpen ? "▲" : "▼"}</div>
            </div>
            {isOpen && (
              <div style={{ padding: "16px 18px", borderTop: `1px solid ${C.border}`, fontSize: 14 }}>
                <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8 }}>✝️ Spiritual Growth</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 8 }}>
                  <div>Church Attendance: {yn(f["Church Attendance"])}</div>
                  {f["Church Name"] && <div>Church: {f["Church Name"]}</div>}
                  <div>Bible Reading Plan: {yn(f["Bible Reading Plan"])}</div>
                  <div>Prayer Requests: {yn(f["Prayer Requests"])}</div>
                </div>
                {f["Prayer Request Notes"] && <div style={{ color: C.muted, marginBottom: 4 }}>Prayer: {f["Prayer Request Notes"]}</div>}
                {f["Spiritual Growth Notes"] && <div style={{ color: C.muted, marginBottom: 8 }}>Notes: {f["Spiritual Growth Notes"]}</div>}

                <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8, marginTop: 12 }}>🤝 Weekly Participation</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 8 }}>
                  <div>Work Schedule: {yn(f["Work Schedule"])}</div>
                  <div>Attending Therapy: {yn(f["Therapy Sessions"])}</div>
                  <div>Attending Classes: {yn(f["Attending Classes"])}</div>
                  <div>Recovery Meeting: {yn(f["Attending Recovery Meeting"])}</div>
                </div>
                {f["Current Class and Mentor"] && <div style={{ color: C.muted, marginBottom: 4 }}>Class/Mentor: {f["Current Class and Mentor"]}</div>}
                {f["Work Concerns Notes"] && <div style={{ color: C.muted, marginBottom: 8 }}>Work notes: {f["Work Concerns Notes"]}</div>}

                <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8, marginTop: 12 }}>🏠 House Maintenance</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 16px", marginBottom: 8 }}>
                  <div>Kitchen: {yn(f["Kitchen Clean"])}</div>
                  <div>Bathrooms: {yn(f["Bathrooms Clean"])}</div>
                  <div>Floors: {yn(f["Floors Clean"])}</div>
                  <div>Laundry: {yn(f["Laundry"])}</div>
                  <div>Trash: {yn(f["Trash Removed"])}</div>
                  <div>Repairs: {yn(f["Repairs Needed"])}</div>
                  <div>Meal Prep: {yn(f["Meal Prep Concerns"])}</div>
                </div>
                {f["Repair Notes"] && <div style={{ color: C.muted, marginBottom: 4 }}>Repair notes: {f["Repair Notes"]}</div>}
                {f["Meal Prep Notes"] && <div style={{ color: C.muted, marginBottom: 8 }}>Meal prep: {f["Meal Prep Notes"]}</div>}

                <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8, marginTop: 12 }}>📄 Agreement Compliance</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 8 }}>
                  <div>Alcohol/Drugs/Nicotine: {yn(f["Alcohol Drugs Nicotine"])}</div>
                  <div>Visitors Policy: {yn(f["Visitors Policy Discussed"])}</div>
                  <div>Program Fee Paid: {yn(f["Program Fee Paid"])}</div>
                </div>
                {f["Non Compliance Notes"] && <div style={{ color: C.muted, marginBottom: 8 }}>Non-compliance: {f["Non Compliance Notes"]}</div>}

                <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8, marginTop: 12 }}>💰 Financial Goals</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 8 }}>
                  {f["Employer Name"] && <div>Employer: {f["Employer Name"]}</div>}
                  {f["Pay Rate"] && <div>Pay Rate: {f["Pay Rate"]}</div>}
                  {f["Checking Balance"] && <div>Checking: {f["Checking Balance"]}</div>}
                  {f["Savings Balance"] && <div>Savings: {f["Savings Balance"]}</div>}
                  <div>Income Goals Reviewed: {yn(f["Income Goals Reviewed"])}</div>
                  <div>Setbacks: {yn(f["Financial Setbacks"])}</div>
                </div>
                {f["Financial Setback Notes"] && <div style={{ color: C.muted, marginBottom: 8 }}>Setback notes: {f["Financial Setback Notes"]}</div>}

                {(f["School Attendance"] !== undefined || f["Behavioral Support Needs"] !== undefined) && (
                  <>
                    <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8, marginTop: 12 }}>👶 Single Parenting</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 8 }}>
                      <div>School Attendance: {yn(f["School Attendance"])}</div>
                      <div>Behavioral Support: {yn(f["Behavioral Support Needs"])}</div>
                      <div>Childcare Concerns: {yn(f["Childcare Concerns"])}</div>
                    </div>
                    {f["Childcare Notes"] && <div style={{ color: C.muted, marginBottom: 8 }}>Childcare: {f["Childcare Notes"]}</div>}
                  </>
                )}

                <div style={{ fontWeight: 700, color: C.blue, marginBottom: 8, marginTop: 12 }}>🚗 Transportation</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 8 }}>
                  <div>Oil Change Needed: {yn(f["Oil Change Needed"])}</div>
                  <div>Car Insurance Current: {yn(f["Car Insurance Current"])}</div>
                  <div>Vehicle Concerns: {yn(f["Vehicle Concerns"])}</div>
                </div>
                {f["Vehicle Notes"] && <div style={{ color: C.muted, marginBottom: 8 }}>Vehicle: {f["Vehicle Notes"]}</div>}

                {f["Other Concerns"] && (
                  <div style={{ marginTop: 8, background: "#fff8ec", borderRadius: 7, padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 4 }}>OTHER CONCERNS</div>
                    <div>{f["Other Concerns Notes"] || "—"}</div>
                  </div>
                )}

                {(f["Drug Test Results"] || f["Breathalyzer Results"]) && (
                  <div style={{ marginTop: 8, fontSize: 13, color: C.muted }}>
                    Drug Test: {f["Drug Test Results"] || "—"} | Breathalyzer: {f["Breathalyzer Results"] || "—"}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptyForm = {
  date: "", residentId: "",
  // Spiritual Growth
  churchAttendance: null, churchName: "", bibleReadingPlan: null,
  prayerRequests: null, prayerRequestNotes: "", spiritualGrowthOther: null, spiritualGrowthNotes: "",
  // Weekly Participation
  workSchedule: null, workConcernsNotes: "", attendingTherapy: null,
  attendingClasses: null, currentClassMentor: "", attendingRecoveryMeeting: null,
  // House Maintenance
  kitchenClean: null, bathroomsClean: null, floorsClean: null,
  laundry: null, trashRemoved: null, repairsNeeded: null, repairNotes: "",
  mealPrepConcerns: null, mealPrepNotes: "",
  // Agreement Compliance
  alcoholDrugsNicotine: null, visitorsPolicy: null, programFeePaid: null, nonCompliance: null, nonComplianceNotes: "",
  // Financial Goals
  employerName: "", payRate: "", checkingBalance: "", savingsBalance: "",
  incomeGoalsReviewed: null, financialSetbacks: null, financialSetbackNotes: "",
  // Single Parenting
  schoolAttendance: null, behavioralSupport: null, childcareConcerns: null, childcareNotes: "",
  // Transportation
  oilChangeNeeded: null, carInsuranceCurrent: null, vehicleConcerns: null, vehicleNotes: "",
  // Other
  otherConcerns: null, otherConcernsNotes: "",
  // Monthly
  drugTestResults: "", breathalyzerResults: "",
};

function CareForm({ coordinatorRecord, properties }) {
  const [form, setForm] = useState(emptyForm);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const coordPropertyIds = coordinatorRecord?.fields?.Properties || [];
  const coordPropId = coordPropertyIds[0];
  const propertyName = coordPropId ? (properties.find(p => p.id === coordPropId)?.fields?.Name || "") : "";

  useEffect(() => {
    (async () => {
      try {
        const resis = await fetchAll("Residents");
        const active = resis.filter(r => r.fields?.Name && r.fields?.Status === "Active"
          && (r.fields?.Property || []).some(id => coordPropertyIds.includes(id)));
        setResidents(active);
      } catch (e) { setError("Could not load residents."); }
      setLoading(false);
    })();
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const selectedResident = residents.find(r => r.id === form.residentId);
  const hasChildren = selectedResident?.fields?.["Has Children"] || false;

  const requiredFields = [
    "churchAttendance", "bibleReadingPlan", "prayerRequests", "spiritualGrowthOther",
    "workSchedule", "attendingTherapy", "attendingClasses", "attendingRecoveryMeeting",
    "kitchenClean", "bathroomsClean", "floorsClean", "laundry", "trashRemoved", "repairsNeeded", "mealPrepConcerns",
    "alcoholDrugsNicotine", "visitorsPolicy", "programFeePaid", "nonCompliance",
    "incomeGoalsReviewed", "financialSetbacks",
    "oilChangeNeeded", "carInsuranceCurrent", "vehicleConcerns",
    "otherConcerns",
  ];

  const handleSubmit = async () => {
    if (!form.date || !form.residentId) { setError("Please fill in Date and Resident before submitting."); return; }
    const missing = requiredFields.filter(f => form[f] === null);
    if (hasChildren) {
      ["schoolAttendance", "behavioralSupport", "childcareConcerns"].forEach(f => { if (form[f] === null) missing.push(f); });
    }
    if (missing.length > 0) { setError("Please answer all Yes/No questions before submitting."); return; }
    setError(""); setSubmitting(true);
    try {
      const fields = {
        "Date": form.date,
        "Coordinator": [coordinatorRecord.id],
        "Resident": [form.residentId],
        "Church Attendance": form.churchAttendance,
        "Church Name": form.churchName,
        "Bible Reading Plan": form.bibleReadingPlan,
        "Prayer Requests": form.prayerRequests,
        "Prayer Request Notes": form.prayerRequestNotes,
        "Spiritual Growth Notes": form.spiritualGrowthNotes,
        "Work Schedule": form.workSchedule,
        "Work Concerns Notes": form.workConcernsNotes,
        "Therapy Sessions": form.attendingTherapy,
        "Attending Classes": form.attendingClasses,
        "Current Class and Mentor": form.currentClassMentor,
        "Attending Recovery Meeting": form.attendingRecoveryMeeting,
        "Kitchen Clean": form.kitchenClean,
        "Bathrooms Clean": form.bathroomsClean,
        "Floors Clean": form.floorsClean,
        "Laundry": form.laundry,
        "Trash Removed": form.trashRemoved,
        "Repairs Needed": form.repairsNeeded,
        "Repair Notes": form.repairNotes,
        "Meal Prep Concerns": form.mealPrepConcerns,
        "Meal Prep Notes": form.mealPrepNotes,
        "Alcohol Drugs Nicotine": form.alcoholDrugsNicotine,
        "Visitors Policy Discussed": form.visitorsPolicy,
        "Program Fee Paid": form.programFeePaid,
        "Non Compliance Notes": form.nonComplianceNotes,
        "Employer Name": form.employerName,
        "Pay Rate": form.payRate,
        "Checking Balance": form.checkingBalance,
        "Savings Balance": form.savingsBalance,
        "Income Goals Reviewed": form.incomeGoalsReviewed,
        "Financial Setbacks": form.financialSetbacks,
        "Financial Setback Notes": form.financialSetbackNotes,
        "Oil Change Needed": form.oilChangeNeeded,
        "Car Insurance Current": form.carInsuranceCurrent,
        "Vehicle Concerns": form.vehicleConcerns,
        "Vehicle Notes": form.vehicleNotes,
        "Other Concerns": form.otherConcerns,
        "Other Concerns Notes": form.otherConcernsNotes,
        "Drug Test Results": form.drugTestResults,
        "Breathalyzer Results": form.breathalyzerResults,
      };
      if (hasChildren) {
        fields["School Attendance"] = form.schoolAttendance;
        fields["Behavioral Support Needs"] = form.behavioralSupport;
        fields["Childcare Concerns"] = form.childcareConcerns;
        fields["Childcare Notes"] = form.childcareNotes;
      }
      await atFetch("Visit Reports", "POST", { records: [{ fields }] });
      setSubmitted(true);
    } catch (e) { setError("Submission failed. Please check your connection and try again."); }
    setSubmitting(false);
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading…</div>;

  if (submitted) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ background: C.white, borderRadius: 16, padding: 36, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(26,58,92,0.12)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="30" height="24" viewBox="0 0 30 24" fill="none"><path d="M2 12L11 21L28 2" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 style={{ color: C.blue, margin: "0 0 10px", fontSize: 22 }}>Visit Recorded</h2>
        <p style={{ color: C.muted, fontSize: 15, margin: "0 0 28px" }}>
          Weekly care visit for <strong>{selectedResident?.fields?.Name}</strong> on <strong>{form.date}</strong> has been saved.
        </p>
        <Btn full onClick={() => { setForm(emptyForm); setSubmitted(false); }}>Submit Another Visit</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "18px 14px 36px" }}>
      <ErrorBox msg={error} />

      <Card title="Visit Information" icon="📋">
        <Input label="Date of Visit" value={form.date} onChange={v => set("date", v)} type="date" required />
        <div style={{ background: "#e8f0f8", borderRadius: 7, padding: "8px 12px", fontSize: 13, color: C.blue, fontWeight: 600, marginBottom: 12 }}>
          👤 {coordinatorRecord?.fields?.Name} &nbsp;·&nbsp; 🏠 {propertyName}
        </div>
        <SelectField label="Resident" value={form.residentId} onChange={v => set("residentId", v)}
          options={residents.map(r => ({ value: r.id, label: r.fields.Name }))}
          placeholder={residents.length ? "Select resident…" : "No active residents at your property"} required />
      </Card>

      <Card title="Spiritual Growth" icon="✝️">
        <YesNo label="Church Attendance?" value={form.churchAttendance} onChange={v => set("churchAttendance", v)} required>
          <Input label="Where?" value={form.churchName} onChange={v => set("churchName", v)} placeholder="Church name" />
        </YesNo>
        <YesNo label="Has a Bible reading plan?" value={form.bibleReadingPlan} onChange={v => set("bibleReadingPlan", v)} required />
        <YesNo label="Prayer requests?" value={form.prayerRequests} onChange={v => set("prayerRequests", v)} required>
          <Textarea label="Prayer request details" value={form.prayerRequestNotes} onChange={v => set("prayerRequestNotes", v)} placeholder="List prayer requests…" />
        </YesNo>
        <YesNo label="Other needs to encourage spiritual growth?" value={form.spiritualGrowthOther} onChange={v => set("spiritualGrowthOther", v)} required>
          <Textarea label="Notes" value={form.spiritualGrowthNotes} onChange={v => set("spiritualGrowthNotes", v)} placeholder="Describe other spiritual needs…" />
        </YesNo>
      </Card>

      <Card title="Weekly Participation" icon="🤝">
        <YesNo label="Work schedule, attendance or concerns?" value={form.workSchedule} onChange={v => set("workSchedule", v)} required>
          <Textarea label="Notes" value={form.workConcernsNotes} onChange={v => set("workConcernsNotes", v)} placeholder="Describe work concerns…" />
        </YesNo>
        <YesNo label="Attending therapy?" value={form.attendingTherapy} onChange={v => set("attendingTherapy", v)} required />
        <YesNo label="Attending classes? (Jobs for Life, Faith and Finances, Mastering Debt)" value={form.attendingClasses} onChange={v => set("attendingClasses", v)} required>
          <Input label="Current class and mentor" value={form.currentClassMentor} onChange={v => set("currentClassMentor", v)} placeholder="Class name and mentor" />
        </YesNo>
        <YesNo label="Attending recovery meeting?" value={form.attendingRecoveryMeeting} onChange={v => set("attendingRecoveryMeeting", v)} required />
      </Card>

      <Card title="House Maintenance" icon="🏠">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 600 }}>Cleanliness Checks <span style={{ color: C.danger }}>*</span></div>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "12px", background: C.light }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[["kitchenClean", "Kitchen"], ["bathroomsClean", "Bathrooms"], ["floorsClean", "Floors"]].map(([k, l]) => (
                <div key={k}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600, textAlign: "center" }}>{l}</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => set(k, true)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `2px solid ${form[k] === true ? C.green : C.border}`, background: form[k] === true ? C.green : C.white, color: form[k] === true ? C.white : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Y</button>
                    <button onClick={() => set(k, false)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: `2px solid ${form[k] === false ? C.danger : C.border}`, background: form[k] === false ? C.danger : C.white, color: form[k] === false ? C.white : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>N</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <YesNo label="Laundry?" value={form.laundry} onChange={v => set("laundry", v)} required />
        <YesNo label="Trash removed and to curb?" value={form.trashRemoved} onChange={v => set("trashRemoved", v)} required />
        <YesNo label="Repair or house concerns?" value={form.repairsNeeded} onChange={v => set("repairsNeeded", v)} required>
          <Textarea label="Repair notes" value={form.repairNotes} onChange={v => set("repairNotes", v)} placeholder="Describe repairs needed…" />
        </YesNo>
        <YesNo label="Meal prep / fast food concerns?" value={form.mealPrepConcerns} onChange={v => set("mealPrepConcerns", v)} required>
          <Textarea label="Notes" value={form.mealPrepNotes} onChange={v => set("mealPrepNotes", v)} placeholder="Describe meal prep concerns…" />
        </YesNo>
      </Card>

      <Card title="Agreement Compliance" icon="📄">
        <YesNo label="Alcohol, drug and nicotine compliance?" value={form.alcoholDrugsNicotine} onChange={v => set("alcoholDrugsNicotine", v)} required />
        <YesNo label="Discussed visitors policy?" value={form.visitorsPolicy} onChange={v => set("visitorsPolicy", v)} required />
        <YesNo label="Program fee of $300 paid by 1st of month?" value={form.programFeePaid} onChange={v => set("programFeePaid", v)} required />
        <YesNo label="Any non-compliance issues?" value={form.nonCompliance} onChange={v => set("nonCompliance", v)} required>
          <Textarea label="Non-compliance notes" value={form.nonComplianceNotes} onChange={v => set("nonComplianceNotes", v)} placeholder="Describe non-compliance…" />
        </YesNo>
      </Card>

      <Card title="Financial Goals" icon="💰">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <Input label="Employer Name" value={form.employerName} onChange={v => set("employerName", v)} placeholder="Employer" />
          <Input label="Pay Rate" value={form.payRate} onChange={v => set("payRate", v)} placeholder="$/hr or salary" />
          <Input label="Checking Account Balance" value={form.checkingBalance} onChange={v => set("checkingBalance", v)} placeholder="$0.00" />
          <Input label="Savings Account Balance" value={form.savingsBalance} onChange={v => set("savingsBalance", v)} placeholder="$0.00" />
        </div>
        <YesNo label="Reviewed income goals (3, 6, 9, 12 months)?" value={form.incomeGoalsReviewed} onChange={v => set("incomeGoalsReviewed", v)} required />
        <YesNo label="Any setbacks?" value={form.financialSetbacks} onChange={v => set("financialSetbacks", v)} required>
          <Textarea label="Setback notes" value={form.financialSetbackNotes} onChange={v => set("financialSetbackNotes", v)} placeholder="Describe setbacks…" />
        </YesNo>
      </Card>

      {hasChildren && (
        <Card title="Single Parenting Concerns" icon="👶">
          <YesNo label="School attendance concerns?" value={form.schoolAttendance} onChange={v => set("schoolAttendance", v)} required />
          <YesNo label="Behavioral support needs?" value={form.behavioralSupport} onChange={v => set("behavioralSupport", v)} required />
          <YesNo label="Childcare concerns?" value={form.childcareConcerns} onChange={v => set("childcareConcerns", v)} required>
            <Textarea label="Childcare notes" value={form.childcareNotes} onChange={v => set("childcareNotes", v)} placeholder="Describe childcare concerns…" />
          </YesNo>
        </Card>
      )}

      <Card title="Transportation / DriveWise" icon="🚗">
        <YesNo label="Oil change needed?" value={form.oilChangeNeeded} onChange={v => set("oilChangeNeeded", v)} required />
        <YesNo label="Car insurance up to date and paid?" value={form.carInsuranceCurrent} onChange={v => set("carInsuranceCurrent", v)} required />
        <YesNo label="Other vehicle concerns?" value={form.vehicleConcerns} onChange={v => set("vehicleConcerns", v)} required>
          <Textarea label="Vehicle notes" value={form.vehicleNotes} onChange={v => set("vehicleNotes", v)} placeholder="Describe vehicle concerns…" />
        </YesNo>
      </Card>

      <Card title="Any Other Concerns?" icon="💬">
        <YesNo label="Any other concerns?" value={form.otherConcerns} onChange={v => set("otherConcerns", v)} required>
          <Textarea label="Notes" value={form.otherConcernsNotes} onChange={v => set("otherConcernsNotes", v)} placeholder="Describe any other concerns…" />
        </YesNo>
      </Card>

      <Card title="Monthly Tests (if applicable)" icon="🧪">
        <div style={{ background: "#fff8ec", border: `1px solid ${C.gold}`, borderRadius: 7, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#7a5a10" }}>
          Complete only during months when testing occurs. Not required.
        </div>
        <Input label="Drug Test Results" value={form.drugTestResults} onChange={v => set("drugTestResults", v)} placeholder="Results" />
        <Input label="Breathalyzer Test Results" value={form.breathalyzerResults} onChange={v => set("breathalyzerResults", v)} placeholder="Results" />
      </Card>

      <Btn full onClick={handleSubmit} disabled={submitting} color={C.gold}>
        {submitting ? "Submitting…" : "Submit Weekly Visit Report"}
      </Btn>
      <p style={{ textAlign: "center", color: "#8a9bac", fontSize: 13, marginTop: 12 }}>
        This report will be saved to the DTM Housing system.
      </p>
    </div>
  );
}

function AdminPage({ onBack, allCoordinators, allProperties, allResidents, allAdmins, reload }) {
  const [tab, setTab] = useState("coordinators");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCoord, setNewCoord] = useState({ name: "", propertyId: "", phone: "", email: "", password: "" });
  const [newResident, setNewResident] = useState({ name: "", propertyId: "", moveIn: "", hasChildren: false });
  const [newProperty, setNewProperty] = useState({ name: "" });
  const [newAdminEmail, setNewAdminEmail] = useState("");

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 4000); };
  const activeProperties = allProperties.filter(p => p.fields?.Status !== "Archived");
  const archivedProperties = allProperties.filter(p => p.fields?.Status === "Archived");
  const propOptions = activeProperties.map(p => ({ value: p.id, label: p.fields.Name }));
  const propName = id => allProperties.find(p => p.id === id)?.fields?.Name || "—";

  const addCoordinator = async () => {
    if (!newCoord.name || !newCoord.propertyId || !newCoord.email || !newCoord.password) {
      setError("Name, property, email and password are all required."); return;
    }
    setSaving(true); setError("");
    try {
      await createUserWithEmailAndPassword(auth, newCoord.email, newCoord.password);
      await atFetch("Coordinators", "POST", { records: [{ fields: { Name: newCoord.name, Properties: [newCoord.propertyId], Phone: newCoord.phone, Email: newCoord.email } }] });
      setNewCoord({ name: "", propertyId: "", phone: "", email: "", password: "" });
      flash("Coordinator added and login created successfully.");
      await reload();
    } catch (e) {
      setError(e.code === "auth/email-already-in-use" ? "That email already has a login account." : "Could not add coordinator: " + e.message);
    }
    setSaving(false);
  };

  const resetPassword = async (email) => {
    try { await sendPasswordResetEmail(auth, email); flash(`Password reset email sent to ${email}`); }
    catch (e) { setError("Could not send reset email."); }
  };

  const deleteCoordinator = async (id) => {
    if (!window.confirm("Remove this coordinator? Their visit history will be preserved.")) return;
    setSaving(true);
    try { await atFetch("Coordinators", "DELETE", null, id); flash("Coordinator removed."); await reload(); }
    catch (e) { setError("Could not remove coordinator."); }
    setSaving(false);
  };

  const addResident = async () => {
    if (!newResident.name || !newResident.propertyId) { setError("Resident name and property are required."); return; }
    setSaving(true); setError("");
    try {
      await atFetch("Residents", "POST", { records: [{ fields: { Name: newResident.name, Property: [newResident.propertyId], "Move In Date": newResident.moveIn || null, Status: "Active", "Has Children": newResident.hasChildren } }] });
      setNewResident({ name: "", propertyId: "", moveIn: "", hasChildren: false });
      flash("Resident added successfully."); await reload();
    } catch (e) { setError("Could not add resident."); }
    setSaving(false);
  };

  const updateResidentStatus = async (id, status) => {
    setSaving(true);
    try { await atFetch("Residents", "PATCH", { records: [{ id, fields: { Status: status } }] }); flash(status === "Active" ? "Resident reactivated." : "Resident transitioned out."); await reload(); }
    catch (e) { setError("Could not update status."); }
    setSaving(false);
  };

  const deleteResident = async (id) => {
    if (!window.confirm("Permanently remove this resident?")) return;
    setSaving(true);
    try { await atFetch("Residents", "DELETE", null, id); flash("Resident removed."); await reload(); }
    catch (e) { setError("Could not remove resident."); }
    setSaving(false);
  };

  const addProperty = async () => {
    if (!newProperty.name) { setError("Property name is required."); return; }
    setSaving(true); setError("");
    try { await atFetch("Properties", "POST", { records: [{ fields: { Name: newProperty.name, Status: "Active" } }] }); setNewProperty({ name: "" }); flash("Property added."); await reload(); }
    catch (e) { setError("Could not add property."); }
    setSaving(false);
  };

  const archiveProperty = async (id) => {
    if (!window.confirm("Archive this property?")) return;
    setSaving(true);
    try { await atFetch("Properties", "PATCH", { records: [{ id, fields: { Status: "Archived" } }] }); flash("Property archived."); await reload(); }
    catch (e) { setError("Could not archive property."); }
    setSaving(false);
  };

  const restoreProperty = async (id) => {
    setSaving(true);
    try { await atFetch("Properties", "PATCH", { records: [{ id, fields: { Status: "Active" } }] }); flash("Property restored."); await reload(); }
    catch (e) { setError("Could not restore property."); }
    setSaving(false);
  };

  const addAdmin = async () => {
    if (!newAdminEmail) { setError("Email is required."); return; }
    setSaving(true); setError("");
    try {
      await atFetch("Admins", "POST", { records: [{ fields: { Email: newAdminEmail.toLowerCase() } }] });
      setNewAdminEmail("");
      flash("Admin added! Remember to also add them in Firebase Authentication at console.firebase.google.com so they can log in.");
      await reload();
    } catch (e) { setError("Could not add admin."); }
    setSaving(false);
  };

  const removeAdmin = async (id, email) => {
    if (email === FALLBACK_ADMIN) { setError("Cannot remove the primary admin account."); return; }
    if (!window.confirm("Remove admin access for " + email + "?")) return;
    setSaving(true);
    try { await atFetch("Admins", "DELETE", null, id); flash("Admin removed."); await reload(); }
    catch (e) { setError("Could not remove admin."); }
    setSaving(false);
  };

  const tabStyle = active => ({
    padding: "10px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", border: "none",
    background: active ? C.gold : "transparent", color: active ? C.white : C.muted,
    borderBottom: active ? `3px solid ${C.gold}` : "3px solid transparent",
    borderRadius: active ? "6px 6px 0 0" : 0,
  });

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 14px 40px" }}>
      <div style={{ marginBottom: 16 }}><Btn small outline onClick={onBack} color={C.blue}>← Back</Btn></div>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />
      <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={tabStyle(tab === "coordinators")} onClick={() => setTab("coordinators")}>👤 Coordinators</button>
        <button style={tabStyle(tab === "residents")} onClick={() => setTab("residents")}>🏠 Residents</button>
        <button style={tabStyle(tab === "properties")} onClick={() => setTab("properties")}>📍 Properties</button>
        <button style={tabStyle(tab === "admins")} onClick={() => setTab("admins")}>👑 Admins</button>
      </div>

      {tab === "coordinators" ? (
        <>
          <Card title="Add New Coordinator" icon="➕">
            <Input label="Full Name" value={newCoord.name} onChange={v => setNewCoord(p => ({ ...p, name: v }))} placeholder="Coordinator's full name" required />
            <SelectField label="Assigned Property" value={newCoord.propertyId} onChange={v => setNewCoord(p => ({ ...p, propertyId: v }))} options={propOptions} placeholder="Select property…" required />
            <Input label="Phone Number" value={newCoord.phone} onChange={v => setNewCoord(p => ({ ...p, phone: v }))} placeholder="(555) 000-0000" />
            <Input label="Email Address (login)" value={newCoord.email} onChange={v => setNewCoord(p => ({ ...p, email: v }))} type="email" placeholder="coordinator@email.com" required />
            <Input label="Temporary Password" value={newCoord.password} onChange={v => setNewCoord(p => ({ ...p, password: v }))} type="password" placeholder="Minimum 6 characters" required />
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>The coordinator will use this email and password to log in. They can reset their password anytime.</div>
            <Btn onClick={addCoordinator} disabled={saving} color={C.green}>{saving ? "Saving…" : "Add Coordinator & Create Login"}</Btn>
          </Card>
          <Card title={`Current Coordinators (${allCoordinators.length})`} icon="👤">
            {allCoordinators.length === 0 ? (
              <div style={{ color: C.muted, textAlign: "center", padding: "20px 0" }}>No coordinators added yet.</div>
            ) : allCoordinators.map(c => (
              <div key={c.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{c.fields.Name}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>{c.fields.Properties ? propName(c.fields.Properties[0]) : "No property"}{c.fields.Phone ? ` · ${c.fields.Phone}` : ""}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>{c.fields.Email || "No email on file"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {c.fields.Email && <Btn small outline color={C.blue} onClick={() => resetPassword(c.fields.Email)} disabled={saving}>Reset PW</Btn>}
                    <Btn small danger onClick={() => deleteCoordinator(c.id)} disabled={saving}>Remove</Btn>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </>
      ) : tab === "residents" ? (
        <>
          <Card title="Add New Resident" icon="➕">
            <Input label="Full Name" value={newResident.name} onChange={v => setNewResident(p => ({ ...p, name: v }))} placeholder="Resident's full name" required />
            <SelectField label="Property" value={newResident.propertyId} onChange={v => setNewResident(p => ({ ...p, propertyId: v }))} options={propOptions} placeholder="Select property…" required />
            <Input label="Move In Date" value={newResident.moveIn} onChange={v => setNewResident(p => ({ ...p, moveIn: v }))} type="date" />
            <CheckItem label="Has Children" checked={newResident.hasChildren} onChange={() => setNewResident(p => ({ ...p, hasChildren: !p.hasChildren }))} />
            <Btn onClick={addResident} disabled={saving} color={C.green}>{saving ? "Saving…" : "Add Resident"}</Btn>
          </Card>
          <Card title={`Residents (${allResidents.filter(r => r.fields.Status === "Active").length} active)`} icon="🏠">
            {allResidents.length === 0 ? (
              <div style={{ color: C.muted, textAlign: "center", padding: "20px 0" }}>No residents added yet.</div>
            ) : allResidents.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{r.fields.Name}
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: r.fields.Status === "Active" ? "#d4edda" : "#f8d7da", color: r.fields.Status === "Active" ? C.green : C.danger }}>
                      {r.fields.Status || "Active"}
                    </span>
                    {r.fields["Has Children"] && <span style={{ marginLeft: 6, fontSize: 11 }}>👶</span>}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted }}>{r.fields.Property ? propName(r.fields.Property[0]) : "No property"}{r.fields["Move In Date"] ? ` · Moved in ${r.fields["Move In Date"]}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {r.fields.Status === "Active"
                    ? <Btn small outline color={C.muted} onClick={() => updateResidentStatus(r.id, "Transitioned Out")} disabled={saving}>Transition Out</Btn>
                    : <Btn small outline color={C.green} onClick={() => updateResidentStatus(r.id, "Active")} disabled={saving}>Reactivate</Btn>}
                  <Btn small danger onClick={() => deleteResident(r.id)} disabled={saving}>Remove</Btn>
                </div>
              </div>
            ))}
          </Card>
        </>
      ) : tab === "properties" ? (
        <>
          <Card title="Add New Property" icon="➕">
            <Input label="Property Name" value={newProperty.name} onChange={v => setNewProperty({ name: v })} placeholder="e.g. Elm Street House" required />
            <Btn onClick={addProperty} disabled={saving} color={C.green}>{saving ? "Saving…" : "Add Property"}</Btn>
          </Card>
          <Card title={`Active Properties (${activeProperties.length})`} icon="📍">
            {activeProperties.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, color: C.text }}>🏠 {p.fields.Name}</div>
                <Btn small outline color={C.muted} onClick={() => archiveProperty(p.id)} disabled={saving}>Archive</Btn>
              </div>
            ))}
          </Card>
          {archivedProperties.length > 0 && (
            <Card title={`Archived Properties (${archivedProperties.length})`} icon="🗄️">
              {archivedProperties.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 600, color: C.muted }}>🏠 {p.fields.Name} <span style={{ fontSize: 11, color: C.danger, fontWeight: 700 }}>ARCHIVED</span></div>
                  <Btn small outline color={C.green} onClick={() => restoreProperty(p.id)} disabled={saving}>Restore</Btn>
                </div>
              ))}
            </Card>
          )}
        </>
      ) : (
        <>
          <Card title="Current Admins" icon="👑">
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Admins have full access to all visit reports and can manage coordinators, residents, and properties. Each admin must also have a Firebase Authentication account to log in.
            </div>
            {allAdmins.length === 0 ? (
              <div style={{ color: C.muted, textAlign: "center", padding: "20px 0" }}>No admins found.</div>
            ) : allAdmins.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, color: C.text }}>👑 {a.fields.Email}</div>
                {a.fields.Email !== FALLBACK_ADMIN && (
                  <Btn small danger onClick={() => removeAdmin(a.id, a.fields.Email)} disabled={saving}>Remove</Btn>
                )}
              </div>
            ))}
          </Card>
          <Card title="Add New Admin" icon="➕">
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
              After adding an admin here, you must also add them in Firebase Authentication at console.firebase.google.com so they can log in.
            </div>
            <Input label="Admin Email Address" value={newAdminEmail} onChange={setNewAdminEmail} type="email" placeholder="admin@email.com" required />
            <Btn onClick={addAdmin} disabled={saving} color={C.green}>{saving ? "Saving…" : "Add Admin"}</Btn>
          </Card>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [coordinatorRecord, setCoordinatorRecord] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [residents, setResidents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [tab, setTab] = useState("form");

  const isAdmin = admins.some(a => a.fields?.Email?.toLowerCase() === user?.email?.toLowerCase());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  useEffect(() => { if (user) loadData(); }, [user]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [coords, resis, props, adms] = await Promise.all([
        fetchAll("Coordinators"), fetchAll("Residents"), fetchAll("Properties"), fetchAll("Admins")
      ]);
      setCoordinators(coords.filter(c => c.fields?.Name));
      setResidents(resis.filter(r => r.fields?.Name));
      setProperties(props.filter(p => p.fields?.Name));
      setAdmins(adms.filter(a => a.fields?.Email));
      if (user) {
        const coord = coords.find(c => c.fields?.Email?.toLowerCase() === user.email?.toLowerCase());
        setCoordinatorRecord(coord || null);
      }
    } catch (e) { console.error("Data load error", e); }
    setDataLoading(false);
  };

  const handleSignOut = async () => { await signOut(auth); setCoordinatorRecord(null); setTab("form"); };

  if (authLoading || dataLoading) return (
    <div style={{ minHeight: "100vh", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: C.white }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Loading DTM Housing…</div>
      </div>
    </div>
  );

  if (!user) return <LoginPage />;

  const userName = isAdmin ? "Admin" : (coordinatorRecord?.fields?.Name || user.email);

  const tabStyle = active => ({
    flex: 1, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none",
    background: active ? C.white : "transparent", color: active ? C.blue : "#a0b8d0",
    borderBottom: active ? `3px solid ${C.gold}` : "3px solid transparent",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.light, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <PageHeader title="DTM Housing" subtitle={isAdmin ? "Housing Director View" : "Care Coordinator Portal"}
        userName={userName} onSignOut={handleSignOut} isAdmin={isAdmin} onAdminClick={() => setTab("admin")} />
      <div style={{ background: C.blue, display: "flex", borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
        <button style={tabStyle(tab === "form")} onClick={() => setTab("form")}>📋 Visit Form</button>
        <button style={tabStyle(tab === "history")} onClick={() => setTab("history")}>📅 History</button>
        {isAdmin && <button style={tabStyle(tab === "admin")} onClick={() => setTab("admin")}>⚙️ Admin</button>}
      </div>
      {tab === "form" && (
        isAdmin ? (
          <div style={{ maxWidth: 540, margin: "40px auto", padding: "0 14px", textAlign: "center" }}>
            <div style={{ background: C.white, borderRadius: 12, padding: 32, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>👑</div>
              <h2 style={{ color: C.blue, margin: "0 0 8px" }}>Admin Account</h2>
              <p style={{ color: C.muted }}>Use the History tab to view all visit reports, or Admin to manage coordinators, residents, properties, and admins.</p>
            </div>
          </div>
        ) : !coordinatorRecord ? (
          <div style={{ maxWidth: 540, margin: "40px auto", padding: "0 14px", textAlign: "center" }}>
            <div style={{ background: C.white, borderRadius: 12, padding: 32, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ color: C.blue, margin: "0 0 8px" }}>Account Not Linked</h2>
              <p style={{ color: C.muted }}>Your login ({user.email}) is not linked to a coordinator record. Please contact your housing director.</p>
            </div>
          </div>
        ) : (
          <CareForm coordinatorRecord={coordinatorRecord} properties={properties} />
        )
      )}
      {tab === "history" && (
        <HistoryPage coordinatorRecord={coordinatorRecord} isAdmin={isAdmin} allCoordinators={coordinators} allProperties={properties} allResidents={residents} />
      )}
      {tab === "admin" && isAdmin && (
        <AdminPage onBack={() => setTab("form")} allCoordinators={coordinators} allProperties={properties} allResidents={residents} allAdmins={admins} reload={loadData} />
      )}
    </div>
  );
}
