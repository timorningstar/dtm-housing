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
const ROLES = { ED: "Executive Director", WOMENS: "Women's Director", MENS: "Men's Director" };
const GENDERS = { WOMENS: "Women's Housing", MENS: "Men's Housing" };

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

// ── Shared UI ──────────────────────────────────────────────────
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

const MultiCheck = ({ label, options, selected, onChange, required }) => {
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
    onChange(next);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</div>}
      <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 7, background: C.light, padding: "8px 12px", maxHeight: 160, overflowY: "auto" }}>
        {options.length === 0 ? <div style={{ color: C.muted, fontSize: 13 }}>No options available</div> : options.map(o => (
          <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", cursor: "pointer" }}>
            <div onClick={() => toggle(o.value)} style={{ width: 18, height: 18, minWidth: 18, border: `2px solid ${selected.includes(o.value) ? C.gold : C.border}`, borderRadius: 3, background: selected.includes(o.value) ? C.gold : C.white, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {selected.includes(o.value) && <svg width="10" height="8" viewBox="0 0 13 10" fill="none"><path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ fontSize: 14, color: C.text }}>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const CheckItem = ({ label, checked, onChange, children }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
      <div onClick={onChange} style={{ width: 22, height: 22, minWidth: 22, border: `2px solid ${checked ? C.gold : C.border}`, borderRadius: 4, background: checked ? C.gold : C.white, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, cursor: "pointer" }}>
        {checked && <svg width="13" height="10" viewBox="0 0 13 10" fill="none"><path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span style={{ fontSize: 15, color: C.text, lineHeight: 1.4 }}>{label}</span>
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
      <button onClick={() => onChange(true)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: `2px solid ${value === true ? C.green : C.border}`, background: value === true ? C.green : C.white, color: value === true ? C.white : C.muted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Yes</button>
      <button onClick={() => onChange(false)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: `2px solid ${value === false ? C.danger : C.border}`, background: value === false ? C.danger : C.white, color: value === false ? C.white : C.muted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>No</button>
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

const ReadOnlyField = ({ label, value }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 13, color: C.muted, marginBottom: 3, fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: 14, color: value ? C.text : C.muted, padding: "8px 12px", background: C.light, borderRadius: 7, border: `1.5px solid ${C.border}` }}>{value || "—"}</div>
  </div>
);

// Airtable returns true for checked, undefined/null for unchecked (not false)
// concern: "yes"=Yes is bad, "no"=No is bad, "yellow_yes"=Yes is informational gold,
//          "yellow_no"=No is informational gold, "info"=neither right nor wrong (show light green for selected)
const ReadOnlyYesNo = ({ label, value, concern, answered = true }) => {
  const normalized = value === true ? true : (answered ? false : null);

  const getStyle = (btnVal) => {
    if (normalized === null) return { bg: C.white, border: C.border, color: C.muted };
    if (normalized !== btnVal) return { bg: C.white, border: C.border, color: C.muted };
    // Information only — light green to show answer was recorded, no judgment
    if (concern === "info") return { bg: "#DAF2D0", border: "#8BC34A", color: "#2d5a1b" };
    if (concern === "no" && normalized === false) return { bg: C.danger, border: C.danger, color: C.white };
    if (concern === "yes" && normalized === true) return { bg: C.danger, border: C.danger, color: C.white };
    if (concern === "yellow_yes" && normalized === true) return { bg: C.gold, border: C.gold, color: C.white };
    if (concern === "yellow_no" && normalized === false) return { bg: C.gold, border: C.gold, color: C.white };
    return { bg: C.green, border: C.green, color: C.white };
  };
  const yesStyle = getStyle(true);
  const noStyle = getStyle(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 14, color: C.text, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, padding: "8px 0", borderRadius: 7, textAlign: "center", border: `2px solid ${yesStyle.border}`, background: yesStyle.bg, color: yesStyle.color, fontWeight: 700, fontSize: 14 }}>Yes</div>
        <div style={{ flex: 1, padding: "8px 0", borderRadius: 7, textAlign: "center", border: `2px solid ${noStyle.border}`, background: noStyle.bg, color: noStyle.color, fontWeight: 700, fontSize: 14 }}>No</div>
      </div>
    </div>
  );
};

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

// ══════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════
function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (e) { setError("Incorrect email or password. Please try again."); }
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

// ══════════════════════════════════════════════════════════════
// HISTORY PAGE — formatted like visit form
// ══════════════════════════════════════════════════════════════
function HistoryPage({ coordinatorRecord, adminRole, allCoordinators, allProperties, allResidents }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterCoordinator, setFilterCoordinator] = useState("");
  const [expanded, setExpanded] = useState(null);
  const isAdmin = !!adminRole;

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

  // Filter properties by role
  const visiblePropertyIds = allProperties
    .filter(p => {
      if (adminRole === ROLES.ED) return true;
      if (adminRole === ROLES.WOMENS) return p.fields?.Gender === GENDERS.WOMENS;
      if (adminRole === ROLES.MENS) return p.fields?.Gender === GENDERS.MENS;
      return false;
    })
    .map(p => p.id);

  const filtered = reports.filter(r => {
    const coordIds = r.fields.Coordinator || [];
    if (!isAdmin) return coordinatorRecord && coordIds.includes(coordinatorRecord.id);
    const coord = allCoordinators.find(c => coordIds.includes(c.id));
    const propIds = coord?.fields?.Properties || [];
    const inScope = propIds.some(id => visiblePropertyIds.includes(id));
    if (!inScope) return false;
    if (filterProperty && !propIds.includes(filterProperty)) return false;
    if (filterCoordinator && !coordIds.includes(filterCoordinator)) return false;
    return true;
  });

  const visibleCoordinators = allCoordinators.filter(c => {
    const propIds = c.fields?.Properties || [];
    return propIds.some(id => visiblePropertyIds.includes(id));
  });

  const visibleProperties = allProperties.filter(p => visiblePropertyIds.includes(p.id) && p.fields?.Status !== "Archived");

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 14px 40px" }}>
      <ErrorBox msg={error} />
      {isAdmin && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <SelectField label="Filter by Property" value={filterProperty} onChange={setFilterProperty}
              options={visibleProperties.map(p => ({ value: p.id, label: p.fields.Name }))}
              placeholder="All properties" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <SelectField label="Filter by Coordinator" value={filterCoordinator} onChange={setFilterCoordinator}
              options={visibleCoordinators.map(c => ({ value: c.id, label: c.fields.Name }))}
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
        const hasChildren = f["School Attendance"] !== undefined || f["Behavioral Support Needs"] !== undefined || f["Childcare Concerns"] !== undefined;

        return (
          <div key={r.id} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(26,58,92,0.07)" }}>
            {/* Header */}
            <div onClick={() => setExpanded(isOpen ? null : r.id)}
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: isOpen ? "#e8f0f8" : C.white }}>
              <div>
                <div style={{ fontWeight: 700, color: C.blue, fontSize: 15 }}>{f.Date || "No date"} · {rName}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{pName} · {cName}</div>
              </div>
              <div style={{ color: C.gold, fontWeight: 700, fontSize: 18 }}>{isOpen ? "▲" : "▼"}</div>
            </div>

            {/* Expanded — formatted like the visit form */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>

                {/* Visit Info */}
                <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Visit Information</span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ background: "#e8f0f8", borderRadius: 7, padding: "8px 12px", fontSize: 13, color: C.blue, fontWeight: 600 }}>
                    👤 {cName} &nbsp;·&nbsp; 🏠 {pName} &nbsp;·&nbsp; 👤 Resident: {rName}
                  </div>
                </div>

                {/* Spiritual Growth */}
                <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>✝️</span>
                  <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Spiritual Growth</span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <ReadOnlyYesNo label="Church Attendance?" value={f["Church Attendance"]} concern="no" />
                  {f["Church Name"] && <ReadOnlyField label="Church Name" value={f["Church Name"]} />}
                  <ReadOnlyYesNo label="Has a Bible reading plan?" value={f["Bible Reading Plan"]} concern="no" />
                  <ReadOnlyYesNo label="Prayer requests?" value={f["Prayer Requests"]} concern="yellow_yes" />
                  {f["Prayer Request Notes"] && <ReadOnlyField label="Prayer Request Details" value={f["Prayer Request Notes"]} />}
                  <ReadOnlyYesNo label="Other spiritual growth needs?" value={f["Spiritual Growth Notes"] ? true : (f["Spiritual Growth Notes"] === "" ? false : null)} concern="yellow_yes" />
                  {f["Spiritual Growth Notes"] && <ReadOnlyField label="Spiritual Growth Notes" value={f["Spiritual Growth Notes"]} />}
                </div>

                {/* Weekly Participation */}
                <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🤝</span>
                  <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Weekly Participation</span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <ReadOnlyYesNo label="Work schedule, attendance or concerns?" value={f["Work Schedule"]} concern="yes" />
                  {f["Work Concerns Notes"] && <ReadOnlyField label="Work Notes" value={f["Work Concerns Notes"]} />}
                  <ReadOnlyYesNo label="Attending therapy?" value={f["Therapy Sessions"]} concern="info" />
                  <ReadOnlyYesNo label="Attending classes?" value={f["Attending Classes"]} concern="no" />
                  {f["Current Class and Mentor"] && <ReadOnlyField label="Class & Mentor" value={f["Current Class and Mentor"]} />}
                  <ReadOnlyYesNo label="Attending recovery meeting?" value={f["Attending Recovery Meeting"]} concern="info" />
                </div>

                {/* House Maintenance */}
                <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🏠</span>
                  <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>House Maintenance</span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 600 }}>Cleanliness Checks</div>
                    <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "12px", background: C.light }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {[["Kitchen Clean", "Kitchen"], ["Bathrooms Clean", "Bathrooms"], ["Floors Clean", "Floors"]].map(([k, l]) => {
                            const val = f[k] === true ? true : false;
                            return (
                              <div key={k}>
                                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600, textAlign: "center" }}>{l}</div>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <div style={{ flex: 1, padding: "6px 0", borderRadius: 6, textAlign: "center", border: `2px solid ${val === true ? C.green : C.border}`, background: val === true ? C.green : C.white, color: val === true ? C.white : C.muted, fontWeight: 700, fontSize: 13 }}>Y</div>
                                  <div style={{ flex: 1, padding: "6px 0", borderRadius: 6, textAlign: "center", border: `2px solid ${val === false ? C.danger : C.border}`, background: val === false ? C.danger : C.white, color: val === false ? C.white : C.muted, fontWeight: 700, fontSize: 13 }}>N</div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                  <ReadOnlyYesNo label="Laundry?" value={f["Laundry"]} concern="no" />
                  <ReadOnlyYesNo label="Trash removed and to curb?" value={f["Trash Removed"]} concern="no" />
                  <ReadOnlyYesNo label="Repair or house concerns?" value={f["Repairs Needed"]} concern="yellow_yes" />
                  {f["Repair Notes"] && <ReadOnlyField label="Repair Notes" value={f["Repair Notes"]} />}
                  <ReadOnlyYesNo label="Meal prep / fast food concerns?" value={f["Meal Prep Concerns"]} concern="yes" />
                  {f["Meal Prep Notes"] && <ReadOnlyField label="Meal Prep Notes" value={f["Meal Prep Notes"]} />}
                </div>

                {/* Agreement Compliance */}
                <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Agreement Compliance</span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <ReadOnlyYesNo label="Alcohol, drug and nicotine compliance?" value={f["Alcohol Drugs Nicotine"]} concern="no" />
                  <ReadOnlyYesNo label="Discussed visitors policy?" value={f["Visitors Policy Discussed"]} concern="no" />
                  <ReadOnlyYesNo label="Program fee of $300 paid by 1st of month?" value={f["Program Fee Paid"]} concern="no" />
                  <ReadOnlyYesNo label="Any non-compliance issues?" value={f["Non Compliance Notes"] ? true : null} concern="yes" />
                  {f["Non Compliance Notes"] && <ReadOnlyField label="Non-Compliance Notes" value={f["Non Compliance Notes"]} />}
                </div>

                {/* Financial Goals */}
                <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>💰</span>
                  <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Financial Goals</span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <ReadOnlyField label="Employer Name" value={f["Employer Name"]} />
                    <ReadOnlyField label="Pay Rate" value={f["Pay Rate"]} />
                    <ReadOnlyField label="Checking Balance" value={f["Checking Balance"]} />
                    <ReadOnlyField label="Savings Balance" value={f["Savings Balance"]} />
                  </div>
                  <ReadOnlyYesNo label="Reviewed income goals?" value={f["Income Goals Reviewed"]} concern="no" />
                  <ReadOnlyYesNo label="Any setbacks?" value={f["Financial Setbacks"]} concern="yes" />
                  {f["Financial Setback Notes"] && <ReadOnlyField label="Setback Notes" value={f["Financial Setback Notes"]} />}
                </div>

                {/* Single Parenting — only if applicable */}
                {hasChildren && (
                  <>
                    <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>👶</span>
                      <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Single Parenting Concerns</span>
                    </div>
                    <div style={{ padding: "14px 18px" }}>
                      <ReadOnlyYesNo label="School attendance concerns?" value={f["School Attendance"]} concern="yes" />
                      <ReadOnlyYesNo label="Behavioral support needs?" value={f["Behavioral Support Needs"]} concern="yes" />
                      <ReadOnlyYesNo label="Childcare concerns?" value={f["Childcare Concerns"]} concern="yes" />
                      {f["Childcare Notes"] && <ReadOnlyField label="Childcare Notes" value={f["Childcare Notes"]} />}
                    </div>
                  </>
                )}

                {/* Transportation */}
                <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🚗</span>
                  <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Transportation / DriveWise</span>
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <ReadOnlyYesNo label="Oil change needed?" value={f["Oil Change Needed"]} concern="yellow_yes" />
                  <ReadOnlyYesNo label="Car insurance up to date and paid?" value={f["Car Insurance Current"]} concern="no" />
                  <ReadOnlyYesNo label="Other vehicle concerns?" value={f["Vehicle Concerns"]} concern="yellow_yes" />
                  {f["Vehicle Notes"] && <ReadOnlyField label="Vehicle Notes" value={f["Vehicle Notes"]} />}
                </div>

                {/* Other Concerns */}
                {f["Other Concerns"] && (
                  <>
                    <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>💬</span>
                      <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Other Concerns</span>
                    </div>
                    <div style={{ padding: "14px 18px" }}>
                      <ReadOnlyField label="Other Concerns Notes" value={f["Other Concerns Notes"]} />
                    </div>
                  </>
                )}

                {/* Monthly Tests */}
                {(f["Drug Test Results"] || f["Breathalyzer Results"]) && (
                  <>
                    <div style={{ background: C.blue, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>🧪</span>
                      <span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>Monthly Tests</span>
                    </div>
                    <div style={{ padding: "14px 18px" }}>
                      <ReadOnlyField label="Drug Test Results" value={f["Drug Test Results"]} />
                      <ReadOnlyField label="Breathalyzer Results" value={f["Breathalyzer Results"]} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CARE FORM
// ══════════════════════════════════════════════════════════════
const emptyForm = {
  date: "", residentId: "",
  churchAttendance: null, churchName: "", bibleReadingPlan: null,
  prayerRequests: null, prayerRequestNotes: "", spiritualGrowthOther: null, spiritualGrowthNotes: "",
  workSchedule: null, workConcernsNotes: "", attendingTherapy: null,
  attendingClasses: null, currentClassMentor: "", attendingRecoveryMeeting: null,
  kitchenClean: null, bathroomsClean: null, floorsClean: null,
  laundry: null, trashRemoved: null, repairsNeeded: null, repairNotes: "",
  mealPrepConcerns: null, mealPrepNotes: "",
  alcoholDrugsNicotine: null, visitorsPolicy: null, programFeePaid: null, nonCompliance: null, nonComplianceNotes: "",
  employerName: "", payRate: "", checkingBalance: "", savingsBalance: "",
  incomeGoalsReviewed: null, financialSetbacks: null, financialSetbackNotes: "",
  schoolAttendance: null, behavioralSupport: null, childcareConcerns: null, childcareNotes: "",
  oilChangeNeeded: null, carInsuranceCurrent: null, vehicleConcerns: null, vehicleNotes: "",
  otherConcerns: null, otherConcernsNotes: "",
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
  const coordResidentIds = coordinatorRecord?.fields?.Residents || [];
  const coordPropId = coordPropertyIds[0];
  const propertyNames = coordPropertyIds.map(id => properties.find(p => p.id === id)?.fields?.Name).filter(Boolean).join(", ");
  const propertyName = propertyNames;

  useEffect(() => {
    (async () => {
      try {
        const resis = await fetchAll("Residents");
        let active;
        if (coordResidentIds.length > 0) {
          // Filter to specifically assigned residents only
          active = resis.filter(r => r.fields?.Name && r.fields?.Status === "Active" && coordResidentIds.includes(r.id));
        } else {
          // Fallback: show all active residents at coordinator's properties
          active = resis.filter(r => r.fields?.Name && r.fields?.Status === "Active"
            && (r.fields?.Property || []).some(id => coordPropertyIds.includes(id)));
        }
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
        "Date": form.date, "Coordinator": [coordinatorRecord.id], "Resident": [form.residentId],
        "Church Attendance": form.churchAttendance, "Church Name": form.churchName,
        "Bible Reading Plan": form.bibleReadingPlan, "Prayer Requests": form.prayerRequests,
        "Prayer Request Notes": form.prayerRequestNotes, "Spiritual Growth Notes": form.spiritualGrowthNotes,
        "Work Schedule": form.workSchedule, "Work Concerns Notes": form.workConcernsNotes,
        "Therapy Sessions": form.attendingTherapy, "Attending Classes": form.attendingClasses,
        "Current Class and Mentor": form.currentClassMentor, "Attending Recovery Meeting": form.attendingRecoveryMeeting,
        "Kitchen Clean": form.kitchenClean, "Bathrooms Clean": form.bathroomsClean, "Floors Clean": form.floorsClean,
        "Laundry": form.laundry, "Trash Removed": form.trashRemoved, "Repairs Needed": form.repairsNeeded,
        "Repair Notes": form.repairNotes, "Meal Prep Concerns": form.mealPrepConcerns, "Meal Prep Notes": form.mealPrepNotes,
        "Alcohol Drugs Nicotine": form.alcoholDrugsNicotine, "Visitors Policy Discussed": form.visitorsPolicy,
        "Program Fee Paid": form.programFeePaid, "Non Compliance Notes": form.nonComplianceNotes,
        "Employer Name": form.employerName, "Pay Rate": form.payRate,
        "Checking Balance": form.checkingBalance, "Savings Balance": form.savingsBalance,
        "Income Goals Reviewed": form.incomeGoalsReviewed, "Financial Setbacks": form.financialSetbacks,
        "Financial Setback Notes": form.financialSetbackNotes,
        "Oil Change Needed": form.oilChangeNeeded, "Car Insurance Current": form.carInsuranceCurrent,
        "Vehicle Concerns": form.vehicleConcerns, "Vehicle Notes": form.vehicleNotes,
        "Other Concerns": form.otherConcerns, "Other Concerns Notes": form.otherConcernsNotes,
        "Drug Test Results": form.drugTestResults, "Breathalyzer Results": form.breathalyzerResults,
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

// ══════════════════════════════════════════════════════════════
// ADMIN PAGE — role-based access
// ══════════════════════════════════════════════════════════════
function AdminPage({ onBack, adminRole, allCoordinators, allProperties, allResidents, allAdmins, reload }) {
  const isED = adminRole === ROLES.ED;
  const genderFilter = adminRole === ROLES.WOMENS ? GENDERS.WOMENS : adminRole === ROLES.MENS ? GENDERS.MENS : null;

  const [tab, setTab] = useState("coordinators");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [newCoord, setNewCoord] = useState({ name: "", propertyIds: [], residentIds: [], phone: "", email: "", password: "" });
  const [editingCoord, setEditingCoord] = useState(null);
  const [newResident, setNewResident] = useState({ name: "", propertyId: "", moveIn: "", hasChildren: false });
  const [editingResident, setEditingResident] = useState(null); // { id, name, propertyId, moveIn, hasChildren }
  const [newProperty, setNewProperty] = useState({ name: "", gender: "" });
  const [editingProperty, setEditingProperty] = useState(null); // { id, name, gender }
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("");

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 4000); };

  // Filter properties by role
  const visibleProperties = allProperties.filter(p => {
    if (!genderFilter) return true;
    return p.fields?.Gender === genderFilter;
  });
  const activeProperties = visibleProperties.filter(p => p.fields?.Status !== "Archived");
  const archivedProperties = visibleProperties.filter(p => p.fields?.Status === "Archived");
  const propOptions = activeProperties.map(p => ({ value: p.id, label: p.fields.Name }));
  const propName = id => allProperties.find(p => p.id === id)?.fields?.Name || "—";

  // Filter coordinators by role
  const allVisibleCoordinators = allCoordinators.filter(c => {
    if (!genderFilter) return true;
    const propIds = c.fields?.Properties || [];
    return propIds.some(id => activeProperties.find(p => p.id === id));
  });
  const visibleCoordinators = allVisibleCoordinators.filter(c => c.fields?.Status !== "Inactive");
  const inactiveCoordinators = allVisibleCoordinators.filter(c => c.fields?.Status === "Inactive");

  // Filter residents by role
  const visibleResidents = allResidents.filter(r => {
    if (!genderFilter) return true;
    const propIds = r.fields?.Property || [];
    return propIds.some(id => activeProperties.find(p => p.id === id));
  });

  const addCoordinator = async () => {
    if (!newCoord.name || newCoord.propertyIds.length === 0 || !newCoord.email || !newCoord.password) { setError("Name, at least one property, email and password are all required."); return; }
    setSaving(true); setError("");
    try {
      await createUserWithEmailAndPassword(auth, newCoord.email, newCoord.password);
      await atFetch("Coordinators", "POST", { records: [{ fields: { Name: newCoord.name, Properties: newCoord.propertyIds, Residents: newCoord.residentIds.length > 0 ? newCoord.residentIds : undefined, Phone: newCoord.phone, Email: newCoord.email } }] });
      setNewCoord({ name: "", propertyIds: [], residentIds: [], phone: "", email: "", password: "" });
      flash("Coordinator added and login created!"); await reload();
    } catch (e) {
      setError(e.code === "auth/email-already-in-use" ? "That email already has a login." : "Could not add coordinator: " + e.message);
    }
    setSaving(false);
  };

  const saveEditCoord = async () => {
    if (!editingCoord.name || editingCoord.propertyIds.length === 0) { setError("Name and at least one property are required."); return; }
    setSaving(true); setError("");
    try {
      await atFetch("Coordinators", "PATCH", { records: [{ id: editingCoord.id, fields: { Name: editingCoord.name, Properties: editingCoord.propertyIds, Residents: editingCoord.residentIds.length > 0 ? editingCoord.residentIds : undefined, Phone: editingCoord.phone } }] });
      setEditingCoord(null);
      flash("Coordinator updated."); await reload();
    } catch (e) { setError("Could not update coordinator."); }
    setSaving(false);
  };

  const resetPassword = async (email) => {
    try { await sendPasswordResetEmail(auth, email); flash(`Password reset email sent to ${email}`); }
    catch (e) { setError("Could not send reset email."); }
  };

  const deactivateCoordinator = async (id) => {
    if (!window.confirm("Deactivate this coordinator? They will no longer be able to submit forms but can be reinstated at any time. Their visit history is preserved.")) return;
    setSaving(true);
    try { await atFetch("Coordinators", "PATCH", { records: [{ id, fields: { Status: "Inactive" } }] }); flash("Coordinator deactivated."); await reload(); }
    catch (e) { setError("Could not deactivate coordinator."); }
    setSaving(false);
  };

  const reinstateCoordinator = async (id) => {
    setSaving(true);
    try { await atFetch("Coordinators", "PATCH", { records: [{ id, fields: { Status: "Active" } }] }); flash("Coordinator reinstated."); await reload(); }
    catch (e) { setError("Could not reinstate coordinator."); }
    setSaving(false);
  };

  const deleteCoordinator = async (id) => {
    if (!window.confirm("PERMANENTLY delete this coordinator? This cannot be undone and will prevent re-adding them with the same email. Deactivate is recommended instead.")) return;
    setSaving(true);
    try { await atFetch("Coordinators", "DELETE", null, id); flash("Coordinator permanently deleted."); await reload(); }
    catch (e) { setError("Could not delete coordinator."); }
    setSaving(false);
  };

  const addResident = async () => {
    if (!newResident.name || !newResident.propertyId) { setError("Name and property are required."); return; }
    setSaving(true); setError("");
    try {
      await atFetch("Residents", "POST", { records: [{ fields: { Name: newResident.name, Property: [newResident.propertyId], "Move In Date": newResident.moveIn || null, Status: "Active", "Has Children": newResident.hasChildren } }] });
      setNewResident({ name: "", propertyId: "", moveIn: "", hasChildren: false });
      flash("Resident added."); await reload();
    } catch (e) { setError("Could not add resident."); }
    setSaving(false);
  };

  const saveEditResident = async () => {
    if (!editingResident.name || !editingResident.propertyId) { setError("Name and property are required."); return; }
    setSaving(true); setError("");
    try {
      await atFetch("Residents", "PATCH", { records: [{ id: editingResident.id, fields: { Name: editingResident.name, Property: [editingResident.propertyId], "Move In Date": editingResident.moveIn || null, "Has Children": editingResident.hasChildren } }] });
      setEditingResident(null);
      flash("Resident updated."); await reload();
    } catch (e) { setError("Could not update resident."); }
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
    const gender = genderFilter || newProperty.gender;
    if (!gender) { setError("Please select a gender category for this property."); return; }
    setSaving(true); setError("");
    try {
      await atFetch("Properties", "POST", { records: [{ fields: { Name: newProperty.name, Status: "Active", Gender: gender } }] });
      setNewProperty({ name: "", gender: "" }); flash("Property added."); await reload();
    } catch (e) { setError("Could not add property."); }
    setSaving(false);
  };

  const saveEditProperty = async () => {
    if (!editingProperty.name) { setError("Property name is required."); return; }
    setSaving(true); setError("");
    try {
      await atFetch("Properties", "PATCH", { records: [{ id: editingProperty.id, fields: { Name: editingProperty.name, Gender: editingProperty.gender } }] });
      setEditingProperty(null); flash("Property updated."); await reload();
    } catch (e) { setError("Could not update property."); }
    setSaving(false);
  };

  const deleteProperty = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    setSaving(true); setError("");
    try {
      // Check for visit history linked to this property via coordinators
      const coords = allCoordinators.filter(c => (c.fields?.Properties || []).includes(id));
      const coordIds = coords.map(c => c.id);
      const visits = await fetchAll("Visit Reports");
      const hasHistory = visits.some(v => (v.fields?.Coordinator || []).some(cid => coordIds.includes(cid)));
      if (hasHistory) {
        setError(`Cannot delete "${name}" — it has visit report history. Archive it instead to hide it from the form while preserving history.`);
        setSaving(false); return;
      }
      await atFetch("Properties", "DELETE", null, id);
      flash("Property deleted."); await reload();
    } catch (e) { setError("Could not delete property."); }
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
    if (!newAdminEmail || !newAdminPassword || !newAdminRole) { setError("Email, password and role are all required."); return; }
    if (newAdminPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSaving(true); setError("");
    try {
      await createUserWithEmailAndPassword(auth, newAdminEmail, newAdminPassword);
      await atFetch("Admins", "POST", { records: [{ fields: { Email: newAdminEmail.toLowerCase(), Role: newAdminRole } }] });
      setNewAdminEmail(""); setNewAdminPassword(""); setNewAdminRole("");
      flash("Admin added and login created! Share their credentials with them."); await reload();
    } catch (e) {
      setError(e.code === "auth/email-already-in-use" ? "That email already has a login." : "Could not add admin: " + e.message);
    }
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

  const roleLabel = adminRole === ROLES.WOMENS ? "Women's Housing" : adminRole === ROLES.MENS ? "Men's Housing" : "All Properties";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 14px 40px" }}>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <Btn small outline onClick={onBack} color={C.blue}>← Back</Btn>
        <div style={{ fontSize: 13, color: C.muted, background: C.light, padding: "5px 12px", borderRadius: 20, border: `1px solid ${C.border}` }}>
          📍 Viewing: <strong>{roleLabel}</strong>
        </div>
      </div>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />
      <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={tabStyle(tab === "coordinators")} onClick={() => setTab("coordinators")}>👤 Coordinators</button>
        <button style={tabStyle(tab === "residents")} onClick={() => setTab("residents")}>🏠 Residents</button>
        <button style={tabStyle(tab === "properties")} onClick={() => setTab("properties")}>📍 Properties</button>
        {isED && <button style={tabStyle(tab === "admins")} onClick={() => setTab("admins")}>👑 Admins</button>}
      </div>

      {tab === "coordinators" ? (
        <>
          <Card title="Add New Coordinator" icon="➕">
            <Input label="Full Name" value={newCoord.name} onChange={v => setNewCoord(p => ({ ...p, name: v }))} placeholder="Coordinator's full name" required />
            <MultiCheck label="Assigned Properties" options={propOptions} selected={newCoord.propertyIds} onChange={v => setNewCoord(p => ({ ...p, propertyIds: v, residentIds: [] }))} required />
            {newCoord.propertyIds.length > 0 && (
              <MultiCheck label="Assigned Residents (leave blank to show all residents at selected properties)"
                options={visibleResidents.filter(r => r.fields.Status === "Active" && (r.fields?.Property || []).some(id => newCoord.propertyIds.includes(id))).map(r => ({ value: r.id, label: r.fields.Name + " · " + (propName(r.fields?.Property?.[0]) || "") }))}
                selected={newCoord.residentIds} onChange={v => setNewCoord(p => ({ ...p, residentIds: v }))} />
            )}
            <Input label="Phone Number" value={newCoord.phone} onChange={v => setNewCoord(p => ({ ...p, phone: v }))} placeholder="(555) 000-0000" />
            <Input label="Email Address (login)" value={newCoord.email} onChange={v => setNewCoord(p => ({ ...p, email: v }))} type="email" placeholder="coordinator@email.com" required />
            <Input label="Temporary Password" value={newCoord.password} onChange={v => setNewCoord(p => ({ ...p, password: v }))} type="password" placeholder="Minimum 6 characters" required />
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>The coordinator will use this email and password to log in. They can reset their password anytime.</div>
            <Btn onClick={addCoordinator} disabled={saving} color={C.green}>{saving ? "Saving…" : "Add Coordinator & Create Login"}</Btn>
          </Card>
          <Card title={`Coordinators (${visibleCoordinators.length})`} icon="👤">
            {visibleCoordinators.length === 0 ? (
              <div style={{ color: C.muted, textAlign: "center", padding: "20px 0" }}>No coordinators yet.</div>
            ) : visibleCoordinators.map(c => (
              <div key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                {editingCoord?.id === c.id ? (
                  <div style={{ padding: "12px 0" }}>
                    <div style={{ fontSize: 13, color: C.blue, fontWeight: 700, marginBottom: 10 }}>Editing: {c.fields.Name}</div>
                    <Input label="Full Name" value={editingCoord.name} onChange={v => setEditingCoord(p => ({ ...p, name: v }))} placeholder="Full name" required />
                    <MultiCheck label="Assigned Properties" options={propOptions} selected={editingCoord.propertyIds} onChange={v => setEditingCoord(p => ({ ...p, propertyIds: v, residentIds: [] }))} required />
                    {editingCoord.propertyIds.length > 0 && (
                      <MultiCheck label="Assigned Residents (leave blank for all residents at selected properties)"
                        options={visibleResidents.filter(r => r.fields.Status === "Active" && (r.fields?.Property || []).some(id => editingCoord.propertyIds.includes(id))).map(r => ({ value: r.id, label: r.fields.Name + " · " + (propName(r.fields?.Property?.[0]) || "") }))}
                        selected={editingCoord.residentIds} onChange={v => setEditingCoord(p => ({ ...p, residentIds: v }))} />
                    )}
                    <Input label="Phone Number" value={editingCoord.phone} onChange={v => setEditingCoord(p => ({ ...p, phone: v }))} placeholder="(555) 000-0000" />
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small onClick={saveEditCoord} disabled={saving} color={C.green}>{saving ? "Saving…" : "Save Changes"}</Btn>
                      <Btn small outline color={C.muted} onClick={() => setEditingCoord(null)}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "12px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{c.fields.Name}</div>
                        <div style={{ fontSize: 13, color: C.muted }}>
                          {(c.fields.Properties || []).map(id => propName(id)).join(", ") || "No property"}{c.fields.Phone ? ` · ${c.fields.Phone}` : ""}
                        </div>
                        {(c.fields.Residents || []).length > 0 && (
                          <div style={{ fontSize: 12, color: C.blue }}>
                            👤 Assigned: {(c.fields.Residents || []).map(id => allResidents.find(r => r.id === id)?.fields?.Name || "").filter(Boolean).join(", ")}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: C.muted }}>{c.fields.Email || "No email"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <Btn small outline color={C.blue} onClick={() => setEditingCoord({ id: c.id, name: c.fields.Name, propertyIds: c.fields.Properties || [], residentIds: c.fields.Residents || [], phone: c.fields.Phone || "" })} disabled={saving}>Edit</Btn>
                        {c.fields.Email && <Btn small outline color={C.blue} onClick={() => resetPassword(c.fields.Email)} disabled={saving}>Reset PW</Btn>}
                        <Btn small outline color={C.muted} onClick={() => deactivateCoordinator(c.id)} disabled={saving}>Deactivate</Btn>
                        <Btn small danger onClick={() => deleteCoordinator(c.id)} disabled={saving}>Delete</Btn>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>
          {inactiveCoordinators.length > 0 && (
            <Card title={`Deactivated Coordinators (${inactiveCoordinators.length})`} icon="🔒">
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>These coordinators cannot log in or submit forms. Reinstate to restore full access.</div>
              {inactiveCoordinators.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontWeight: 700, color: C.muted, fontSize: 15 }}>{c.fields.Name} <span style={{ fontSize: 11, color: C.danger, fontWeight: 700 }}>INACTIVE</span></div>
                    <div style={{ fontSize: 13, color: C.muted }}>{(c.fields.Properties || []).map(id => propName(id)).join(", ") || "No property"}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>{c.fields.Email || "No email"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn small outline color={C.green} onClick={() => reinstateCoordinator(c.id)} disabled={saving}>Reinstate</Btn>
                    <Btn small danger onClick={() => deleteCoordinator(c.id)} disabled={saving}>Delete</Btn>
                  </div>
                </div>
              ))}
            </Card>
          )}
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
          <Card title={`Residents (${visibleResidents.filter(r => r.fields.Status === "Active").length} active)`} icon="🏠">
            {visibleResidents.length === 0 ? (
              <div style={{ color: C.muted, textAlign: "center", padding: "20px 0" }}>No residents yet.</div>
            ) : visibleResidents.map(r => (
              <div key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                {editingResident?.id === r.id ? (
                  // Inline edit form
                  <div style={{ padding: "12px 0" }}>
                    <div style={{ fontSize: 13, color: C.blue, fontWeight: 700, marginBottom: 10 }}>Editing: {r.fields.Name}</div>
                    <Input label="Full Name" value={editingResident.name} onChange={v => setEditingResident(p => ({ ...p, name: v }))} placeholder="Resident's full name" required />
                    <SelectField label="Property" value={editingResident.propertyId} onChange={v => setEditingResident(p => ({ ...p, propertyId: v }))} options={propOptions} placeholder="Select property…" required />
                    <Input label="Move In Date" value={editingResident.moveIn} onChange={v => setEditingResident(p => ({ ...p, moveIn: v }))} type="date" />
                    <CheckItem label="Has Children" checked={editingResident.hasChildren} onChange={() => setEditingResident(p => ({ ...p, hasChildren: !p.hasChildren }))} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small onClick={saveEditResident} disabled={saving} color={C.green}>{saving ? "Saving…" : "Save Changes"}</Btn>
                      <Btn small outline color={C.muted} onClick={() => setEditingResident(null)}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  // Normal row
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{r.fields.Name}
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: r.fields.Status === "Active" ? "#d4edda" : "#f8d7da", color: r.fields.Status === "Active" ? C.green : C.danger }}>{r.fields.Status || "Active"}</span>
                        {r.fields["Has Children"] && <span style={{ marginLeft: 6, fontSize: 11 }}>👶</span>}
                      </div>
                      <div style={{ fontSize: 13, color: C.muted }}>{r.fields.Property ? propName(r.fields.Property[0]) : "No property"}{r.fields["Move In Date"] ? ` · Moved in ${r.fields["Move In Date"]}` : ""}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {r.fields.Status === "Active" && (
                        <Btn small outline color={C.blue} onClick={() => setEditingResident({ id: r.id, name: r.fields.Name, propertyId: r.fields.Property?.[0] || "", moveIn: r.fields["Move In Date"] || "", hasChildren: r.fields["Has Children"] || false })} disabled={saving}>Edit</Btn>
                      )}
                      {r.fields.Status === "Active"
                        ? <Btn small outline color={C.muted} onClick={() => updateResidentStatus(r.id, "Transitioned Out")} disabled={saving}>Transition Out</Btn>
                        : <Btn small outline color={C.green} onClick={() => updateResidentStatus(r.id, "Active")} disabled={saving}>Reactivate</Btn>}
                      <Btn small danger onClick={() => deleteResident(r.id)} disabled={saving}>Remove</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      ) : tab === "properties" ? (
        <>
          <Card title="Add New Property" icon="➕">
            <Input label="Property Name" value={newProperty.name} onChange={v => setNewProperty(p => ({ ...p, name: v }))} placeholder="e.g. Elm Street House" required />
            {isED && (
              <SelectField label="Gender Category" value={newProperty.gender} onChange={v => setNewProperty(p => ({ ...p, gender: v }))}
                options={[{ value: GENDERS.WOMENS, label: GENDERS.WOMENS }, { value: GENDERS.MENS, label: GENDERS.MENS }]}
                placeholder="Select category…" required />
            )}
            <Btn onClick={addProperty} disabled={saving} color={C.green}>{saving ? "Saving…" : "Add Property"}</Btn>
          </Card>
          <Card title={`Active Properties (${activeProperties.length})`} icon="📍">
            {activeProperties.map(p => (
              <div key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                {editingProperty?.id === p.id ? (
                  <div style={{ padding: "12px 0" }}>
                    <div style={{ fontSize: 13, color: C.blue, fontWeight: 700, marginBottom: 10 }}>Editing: {p.fields.Name}</div>
                    <Input label="Property Name" value={editingProperty.name} onChange={v => setEditingProperty(prev => ({ ...prev, name: v }))} placeholder="Property name" required />
                    {isED && (
                      <SelectField label="Gender Category" value={editingProperty.gender} onChange={v => setEditingProperty(prev => ({ ...prev, gender: v }))}
                        options={[{ value: GENDERS.WOMENS, label: GENDERS.WOMENS }, { value: GENDERS.MENS, label: GENDERS.MENS }]}
                        placeholder="Select category…" />
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small onClick={saveEditProperty} disabled={saving} color={C.green}>{saving ? "Saving…" : "Save"}</Btn>
                      <Btn small outline color={C.muted} onClick={() => setEditingProperty(null)}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: C.text }}>🏠 {p.fields.Name}</div>
                      {isED && <div style={{ fontSize: 12, color: C.muted }}>{p.fields.Gender || "No category set"}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn small outline color={C.blue} onClick={() => setEditingProperty({ id: p.id, name: p.fields.Name, gender: p.fields.Gender || "" })} disabled={saving}>Edit</Btn>
                      <Btn small outline color={C.muted} onClick={() => archiveProperty(p.id)} disabled={saving}>Archive</Btn>
                      <Btn small danger onClick={() => deleteProperty(p.id, p.fields.Name)} disabled={saving}>Delete</Btn>
                    </div>
                  </div>
                )}
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
      ) : isED ? (
        <>
          <Card title="Current Admins" icon="👑">
            {allAdmins.filter(a => a.fields.Email !== FALLBACK_ADMIN).map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight: 600, color: C.text }}>👑 {a.fields.Email}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{a.fields.Role || "No role set"}</div>
                </div>
                {a.fields.Email !== FALLBACK_ADMIN && (
                  <Btn small danger onClick={() => removeAdmin(a.id, a.fields.Email)} disabled={saving}>Remove</Btn>
                )}
              </div>
            ))}
          </Card>
          <Card title="Add New Admin" icon="➕">
            <Input label="Email Address" value={newAdminEmail} onChange={setNewAdminEmail} type="email" placeholder="director@email.com" required />
            <Input label="Temporary Password" value={newAdminPassword} onChange={setNewAdminPassword} type="password" placeholder="Minimum 6 characters" required />
            <SelectField label="Role" value={newAdminRole} onChange={setNewAdminRole}
              options={[
                { value: ROLES.WOMENS, label: ROLES.WOMENS },
                { value: ROLES.MENS, label: ROLES.MENS },
                { value: ROLES.ED, label: ROLES.ED },
              ]}
              placeholder="Select role…" required />
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              Women's Director sees only Women's Housing. Men's Director sees only Men's Housing. Executive Director sees everything.
            </div>
            <Btn onClick={addAdmin} disabled={saving} color={C.green}>{saving ? "Saving…" : "Add Admin & Create Login"}</Btn>
          </Card>
        </>
      ) : null}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [coordinatorRecord, setCoordinatorRecord] = useState(null);
  const [adminRecord, setAdminRecord] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [residents, setResidents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [tab, setTab] = useState("history");

  const adminRole = adminRecord?.fields?.Role || null;
  const isAdmin = !!adminRecord;

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
        const admin = adms.find(a => a.fields?.Email?.toLowerCase() === user.email?.toLowerCase());
        setAdminRecord(admin || null);
        if (!admin) {
          const coord = coords.find(c => c.fields?.Email?.toLowerCase() === user.email?.toLowerCase() && c.fields?.Status !== "Inactive");
          setCoordinatorRecord(coord || null);
        }
      }
    } catch (e) { console.error("Data load error", e); }
    setDataLoading(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCoordinatorRecord(null); setAdminRecord(null); setTab("history");
  };

  if (authLoading || dataLoading) return (
    <div style={{ minHeight: "100vh", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: C.white }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>Loading DTM Housing…</div>
      </div>
    </div>
  );

  if (!user) return <LoginPage />;

  const roleLabel = adminRole === ROLES.ED ? "Executive Director" : adminRole === ROLES.WOMENS ? "Women's Director" : adminRole === ROLES.MENS ? "Men's Director" : null;
  const userName = roleLabel || coordinatorRecord?.fields?.Name || user.email;
  const subtitle = roleLabel ? `${roleLabel} View` : "Care Coordinator Portal";

  const tabStyle = active => ({
    flex: 1, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none",
    background: active ? C.white : "transparent", color: active ? C.blue : "#a0b8d0",
    borderBottom: active ? `3px solid ${C.gold}` : "3px solid transparent",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.light, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <PageHeader title="DTM Housing" subtitle={subtitle} userName={userName}
        onSignOut={handleSignOut} isAdmin={isAdmin} onAdminClick={() => setTab("admin")} />
      <div style={{ background: C.blue, display: "flex", borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
        <button style={tabStyle(tab === "form")} onClick={() => setTab("form")}>📋 Visit Form</button>
        <button style={tabStyle(tab === "history")} onClick={() => setTab("history")}>📅 History</button>
        {isAdmin && <button style={tabStyle(tab === "admin")} onClick={() => setTab("admin")}>⚙️ Admin</button>}
      </div>

      {tab === "form" && (
        isAdmin ? (
          <div style={{ maxWidth: 540, margin: "0 auto", padding: "18px 14px 36px" }}>
            <div style={{ background: "#fff8ec", border: `1px solid ${C.gold}`, borderRadius: 10, padding: "14px 18px", marginBottom: 18, fontSize: 14, color: "#7a5a10" }}>
              📋 This is a <strong>reference view</strong> of the care coordinator form. Coordinators fill this out weekly after logging in with their own account.
            </div>
            {[
              ["📋", "Visit Information", "Date · Coordinator name · Property · Resident dropdown"],
              ["✝️", "Spiritual Growth", "Church attendance, Bible reading plan, prayer requests, other spiritual needs"],
              ["🤝", "Weekly Participation", "Work schedule, therapy, classes (Jobs for Life / Faith & Finances / Mastering Debt), recovery meeting"],
              ["🏠", "House Maintenance", "Cleanliness (Kitchen / Bathrooms / Floors), laundry, trash, repairs, meal prep concerns"],
              ["📄", "Agreement Compliance", "Alcohol/drugs/nicotine, visitors policy, program fee ($300 by 1st), non-compliance issues"],
              ["💰", "Financial Goals", "Employer, pay rate, checking/savings balances, income goals, setbacks"],
              ["👶", "Single Parenting Concerns", "Only shown if resident has children — school attendance, behavioral support, childcare"],
              ["🚗", "Transportation / DriveWise", "Oil change, car insurance, vehicle concerns"],
              ["💬", "Other Concerns", "Any other concerns"],
              ["🧪", "Monthly Tests (not required)", "Drug test and breathalyzer results"],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ background: C.blue, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{icon}</span><span style={{ color: C.white, fontWeight: 700, fontSize: 14 }}>{title}</span>
                </div>
                <div style={{ padding: "12px 16px", fontSize: 14, color: C.muted }}>{desc}</div>
              </div>
            ))}
          </div>
        ) : !coordinatorRecord ? (
          <div style={{ maxWidth: 540, margin: "40px auto", padding: "0 14px", textAlign: "center" }}>
            <div style={{ background: C.white, borderRadius: 12, padding: 32, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ color: C.blue, margin: "0 0 8px" }}>Account Not Active</h2>
              <p style={{ color: C.muted }}>Your account ({user.email}) is not currently active. Please contact your housing director to restore access.</p>
            </div>
          </div>
        ) : (
          <CareForm coordinatorRecord={coordinatorRecord} properties={properties} />
        )
      )}

      {tab === "history" && (
        <HistoryPage coordinatorRecord={coordinatorRecord} adminRole={adminRole}
          allCoordinators={coordinators} allProperties={properties} allResidents={residents} />
      )}

      {tab === "admin" && isAdmin && (
        <AdminPage onBack={() => setTab("history")} adminRole={adminRole}
          allCoordinators={coordinators} allProperties={properties}
          allResidents={residents} allAdmins={admins} reload={loadData} />
      )}
    </div>
  );
}
