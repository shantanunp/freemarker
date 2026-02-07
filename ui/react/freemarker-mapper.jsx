import { useState, useCallback, useRef } from "react";
import { Upload, FileCode, ArrowRight, ArrowLeft, Plus, Trash2, Zap, Download, ChevronDown, ChevronRight, Link2, Unlink, CheckCircle2, PenLine, Copy, X, Search } from "lucide-react";

// ─── Sample Data ────────────────────────────────────────────────────────────
const sampleInputSchema = {
  customer: {
    id: "string",
    firstName: "string",
    lastName: "string",
    email: "string",
    phoneNumber: "string",
    dateOfBirth: "date",
    address: {
      street: "string",
      city: "string",
      state: "string",
      zipCode: "string",
      country: "string",
    },
    accountType: "string",
    status: "string",
    createdDate: "datetime",
    lastModifiedDate: "datetime",
  },
};

const sampleOutputSchema = {
  customerId: "string",
  fullName: "string",
  contactEmail: "string",
  phone: "string",
  mailingAddress: {
    street: "string",
    city: "string",
    state: "string",
    zip: "string",
  },
  accountType: "string",
  accountStatus: "string",
  registrationDate: "datetime",
};

const sampleTemplate = `{
  "customerId": "\${customer.id}",
  "fullName": "\${customer.firstName} \${customer.lastName}",
  "contactEmail": "\${customer.email}",
  "phone": "\${customer.phoneNumber}",
  "mailingAddress": {
    "street": "\${customer.address.street}",
    "city": "\${customer.address.city}",
    "state": "\${customer.address.state}",
    "zip": "\${customer.address.zipCode}"
  },
  "accountType": "\${customer.accountType}",
  "accountStatus": "\${customer.status}",
  "registrationDate": "\${customer.createdDate}"
}`;

// ─── Utilities ──────────────────────────────────────────────────────────────
const extractFields = (obj, prefix = "") => {
  const fields = [];
  const traverse = (current, path) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return;
    Object.keys(current).forEach((key) => {
      const newPath = path ? `${path}.${key}` : key;
      const value = current[key];
      if (typeof value === "object" && !Array.isArray(value) && !["string","number","boolean","date","datetime","integer","long","float","double","array"].includes(value)) {
        fields.push({ path: newPath, type: "object", depth: newPath.split(".").length - 1 });
        traverse(value, newPath);
      } else {
        fields.push({ path: newPath, type: typeof value === "string" ? value : typeof value, depth: newPath.split(".").length - 1 });
      }
    });
  };
  traverse(obj, prefix);
  return fields;
};

const parseTemplate = (content) => {
  const mappings = [];
  const lines = content.split("\n");
  const pathStack = [];
  lines.forEach((line) => {
    const trimmed = line.trim();
    const keyObjMatch = trimmed.match(/^"([^"]+)"\s*:\s*\{/);
    if (keyObjMatch) { pathStack.push(keyObjMatch[1]); return; }
    if (trimmed === "}" || trimmed === "},") { pathStack.pop(); return; }
    const fieldMatch = trimmed.match(/^"([^"]+)"\s*:\s*"([^"]*\$\{[^}]+\}[^"]*)"/);
    if (fieldMatch) {
      const targetField = [...pathStack, fieldMatch[1]].join(".");
      const fullValue = fieldMatch[2];
      const sourceRegex = /\$\{([^}]+)\}/g;
      const sources = [];
      let m;
      while ((m = sourceRegex.exec(fullValue)) !== null) sources.push(m[1]);
      if (sources.length > 0) {
        mappings.push({ id: uid(), target: targetField, source: sources.length === 1 ? sources[0] : sources.join(" + "), sources, transformation: sources.length > 1 ? "concatenate" : "direct", condition: "", isNew: false });
      }
    }
  });
  return mappings;
};

const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Badge ──────────────────────────────────────────────────────────────────
const Badge = ({ children, color = "slate" }) => {
  const c = { slate: "bg-slate-100 text-slate-600 border-slate-200", blue: "bg-blue-50 text-blue-700 border-blue-200", emerald: "bg-emerald-50 text-emerald-700 border-emerald-200", amber: "bg-amber-50 text-amber-700 border-amber-200", rose: "bg-rose-50 text-rose-600 border-rose-200", violet: "bg-violet-50 text-violet-700 border-violet-200" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase border ${c[color]}`}>{children}</span>;
};

// ─── Upload Zone ────────────────────────────────────────────────────────────
const UploadZone = ({ label, icon: Icon, loaded, detail, accepted, onFile }) => {
  const ref = useRef();
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); e.dataTransfer?.files?.[0] && onFile(e.dataTransfer.files[0]); }}
      onClick={() => ref.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 ${loaded ? "border-emerald-300 bg-emerald-50/40" : over ? "border-blue-400 bg-blue-50/50 scale-[1.01]" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
    >
      <input ref={ref} type="file" accept={accepted} className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <div className="flex flex-col items-center gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${loaded ? "bg-emerald-100" : "bg-slate-100"}`}>
          {loaded ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Icon size={20} className="text-slate-400" />}
        </div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{loaded ? detail : `Drop or click · ${accepted}`}</p>
      </div>
    </div>
  );
};

// ─── RHS Field Browser Sidebar ──────────────────────────────────────────────
const FieldBrowserSidebar = ({ fields, title, onSelect, onClose, activeField, mode }) => {
  const [search, setSearch] = useState("");
  const leafs = fields.filter((f) => f.type !== "object");
  const filtered = search ? leafs.filter((f) => f.path.toLowerCase().includes(search.toLowerCase())) : leafs;
  const isSource = mode === "source";
  const accentBg = isSource ? "bg-emerald-50/60" : "bg-blue-50/60";
  const accentBorder = isSource ? "border-emerald-100" : "border-blue-100";
  const activeRing = isSource ? "bg-emerald-100 ring-1 ring-emerald-300" : "bg-blue-100 ring-1 ring-blue-300";

  return (
    <div className="w-72 shrink-0 border-l border-slate-200 flex flex-col bg-white">
      <div className={`flex items-center justify-between px-4 py-3 border-b ${accentBg} ${accentBorder}`}>
        <div>
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Click to assign to selected row</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/80 text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fields…" className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/80 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:bg-white" autoFocus />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {filtered.map((f, i) => {
          const parts = f.path.split(".");
          const fieldName = parts.pop();
          const parentPath = parts.join(".");
          const isActive = activeField === f.path;
          return (
            <button key={i} onClick={() => onSelect(f)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-100 group mb-0.5 ${isActive ? activeRing : "hover:bg-slate-50 active:bg-blue-50"}`}
              style={{ paddingLeft: 12 + f.depth * 10 }}>
              <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                {f.depth > 0 && <span className="text-slate-300 font-normal text-xs">{parentPath}.</span>}
                {fieldName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{f.type}</div>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-8">No fields match</p>}
      </div>
    </div>
  );
};

// ─── Field Tree (Step 1 preview) ────────────────────────────────────────────
const FieldTree = ({ fields, title, accent = "blue" }) => {
  const [search, setSearch] = useState("");
  const leafs = fields.filter((f) => f.type !== "object");
  const filtered = search ? leafs.filter((f) => f.path.toLowerCase().includes(search.toLowerCase())) : leafs;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
        <Badge color={accent}>{leafs.length} fields</Badge>
      </div>
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter…" className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-300" />
      </div>
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1" style={{ maxHeight: 320 }}>
        {filtered.map((f, i) => (
          <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-50" style={{ paddingLeft: 10 + f.depth * 14 }}>
            <span className="font-mono font-medium text-slate-700 truncate">{f.path}</span>
            <span className="ml-auto text-[10px] text-slate-400 font-mono">{f.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main App ───────────────────────────────────────────────────────────────
export default function FreeMarkerMapper() {
  const [step, setStep] = useState(1);
  const [inputSchema, setInputSchema] = useState(null);
  const [outputSchema, setOutputSchema] = useState(null);
  const [templateContent, setTemplateContent] = useState("");
  const [inputFields, setInputFields] = useState([]);
  const [outputFields, setOutputFields] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [originalMappings, setOriginalMappings] = useState([]);
  const [copied, setCopied] = useState(false);
  const [sidebarMode, setSidebarMode] = useState(null);
  const [sidebarIdx, setSidebarIdx] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const handleFile = useCallback((type, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      try {
        if (type === "input") { const j = JSON.parse(content); setInputSchema(j); setInputFields(extractFields(j)); }
        else if (type === "output") { const j = JSON.parse(content); setOutputSchema(j); setOutputFields(extractFields(j)); }
        else if (type === "template") { setTemplateContent(content); const p = parseTemplate(content); setMappings(p); setOriginalMappings(JSON.parse(JSON.stringify(p))); }
      } catch (err) { alert(`Error: ${err.message}`); }
    };
    reader.readAsText(file);
  }, []);

  const loadSample = () => {
    setInputSchema(sampleInputSchema); setOutputSchema(sampleOutputSchema);
    setInputFields(extractFields(sampleInputSchema)); setOutputFields(extractFields(sampleOutputSchema));
    setTemplateContent(sampleTemplate);
    const p = parseTemplate(sampleTemplate); setMappings(p); setOriginalMappings(JSON.parse(JSON.stringify(p)));
  };

  const updateMapping = (index, field, value) => {
    setMappings((prev) => {
      const next = [...prev]; next[index] = { ...next[index], [field]: value };
      if (field === "source" && next[index].transformation === "direct") next[index].sources = [value];
      return next;
    });
  };

  const addMapping = () => {
    const len = mappings.length;
    setMappings((prev) => [...prev, { id: uid(), target: "", source: "", sources: [], transformation: "direct", condition: "", isNew: true }]);
    setSidebarIdx(len); setSidebarMode("target");
  };

  const deleteMapping = (index) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
    if (sidebarIdx === index) { setSidebarMode(null); setSidebarIdx(null); }
    else if (sidebarIdx > index) setSidebarIdx((p) => p - 1);
  };

  const autoMap = () => {
    const nm = [];
    outputFields.filter((f) => f.type !== "object").forEach((o) => {
      const on = o.path.split(".").pop().toLowerCase();
      const exact = inputFields.find((f) => f.type !== "object" && f.path.toLowerCase() === o.path.toLowerCase());
      if (exact) { nm.push({ id: uid(), target: o.path, source: exact.path, sources: [exact.path], transformation: "direct", condition: "", isNew: false }); return; }
      const fuzzy = inputFields.find((f) => { if (f.type === "object") return false; const n = f.path.split(".").pop().toLowerCase(); return n.includes(on) || on.includes(n); });
      if (fuzzy) nm.push({ id: uid(), target: o.path, source: fuzzy.path, sources: [fuzzy.path], transformation: "direct", condition: "", isNew: false });
    });
    setMappings(nm); setOriginalMappings(JSON.parse(JSON.stringify(nm))); setSidebarMode(null);
  };

  const openSidebar = (index, mode) => { setSidebarIdx(index); setSidebarMode(mode); };
  const closeSidebar = () => { setSidebarMode(null); setSidebarIdx(null); };

  const handleSidebarSelect = (field) => {
    if (sidebarIdx == null || !sidebarMode) return;
    const next = [...mappings];
    if (sidebarMode === "target") next[sidebarIdx] = { ...next[sidebarIdx], target: field.path };
    else next[sidebarIdx] = { ...next[sidebarIdx], source: field.path, sources: [field.path] };
    setMappings(next);
    if (sidebarMode === "target") setSidebarMode("source"); // auto-switch to source after target selected
  };

  const isModified = (m) => { const o = originalMappings.find((x) => x.id === m.id); return o && (o.target !== m.target || o.source !== m.source || o.transformation !== m.transformation); };

  const getChanges = () => ({
    added: mappings.filter((m) => m.isNew),
    modified: mappings.filter((m) => !m.isNew && isModified(m)),
    deleted: originalMappings.filter((o) => !mappings.find((m) => m.id === o.id)),
  });

  const generateV2 = () => {
    const root = {};
    mappings.forEach((m) => {
      const parts = m.target.split("."); let cur = root;
      parts.forEach((p, i) => {
        if (i === parts.length - 1) {
          if (m.transformation === "concatenate") cur[p] = m.sources.map((s) => `\${${s}}`).join(" ");
          else if (m.transformation === "conditional") cur[p] = `<#if ${m.condition || m.source + "??"}>\${${m.source}}<#else>N/A</#if>`;
          else cur[p] = `\${${m.source}}`;
        } else { if (!cur[p]) cur[p] = {}; cur = cur[p]; }
      });
    });
    const ser = (o, ind = 0) => {
      const pad = "  ".repeat(ind), inner = "  ".repeat(ind + 1), entries = Object.entries(o);
      let lines = ["{"]; entries.forEach(([k, v], i) => { const c = i < entries.length - 1 ? "," : ""; lines.push(typeof v === "object" ? `${inner}"${k}": ${ser(v, ind + 1)}${c}` : `${inner}"${k}": "${v}"${c}`); }); lines.push(`${pad}}`); return lines.join("\n");
    };
    return ser(root);
  };

  const downloadV2 = () => { const b = new Blob([generateV2()], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "transform-v2.ftl"; a.click(); URL.revokeObjectURL(a.href); };
  const copyV2 = () => { navigator.clipboard.writeText(generateV2()); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const stepsInfo = [{ num: 1, label: "Upload" }, { num: 2, label: "Map Fields" }, { num: 3, label: "Review & Export" }];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ─── Header ─── */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center"><FileCode size={18} className="text-white" /></div>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">FreeMarker Mapping Editor</h1>
              <p className="text-[11px] text-slate-400">Visual schema transformation builder</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {stepsInfo.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <button onClick={() => setStep(s.num)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${step === s.num ? "bg-blue-600 text-white shadow-sm" : step > s.num ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                  {step > s.num ? <CheckCircle2 size={13} /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{s.num}</span>}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < stepsInfo.length - 1 && <div className={`w-8 h-px mx-1 ${step > s.num ? "bg-emerald-300" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-6 py-6">
        {/* ═══ STEP 1: UPLOAD ═══ */}
        {step === 1 && (
          <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UploadZone label="Input Schema" icon={Upload} accepted=".json,.xml" loaded={!!inputSchema} detail={`${inputFields.length} fields parsed`} onFile={(f) => handleFile("input", f)} />
              <UploadZone label="Output Schema" icon={Upload} accepted=".json,.xml" loaded={!!outputSchema} detail={`${outputFields.length} fields parsed`} onFile={(f) => handleFile("output", f)} />
              <UploadZone label="Template (.ftl)" icon={FileCode} accepted=".ftl,.ftlh,.json" loaded={!!templateContent} detail={`${mappings.length} mappings parsed`} onFile={(f) => handleFile("template", f)} />
            </div>
            <div className="text-center">
              <button onClick={loadSample} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-all"><Zap size={14} /> Load Sample Data</button>
            </div>
            {inputSchema && outputSchema && (
              <>
                <div className="grid grid-cols-2 gap-6 bg-white rounded-xl border border-slate-200 p-5">
                  <FieldTree fields={inputFields} title="Input Schema" accent="blue" />
                  <FieldTree fields={outputFields} title="Output Schema" accent="emerald" />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => { autoMap(); setStep(2); }} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-200 transition-all"><Zap size={15} /> Auto-Map & Edit</button>
                  <button onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all">Next: Map Fields <ArrowRight size={15} /></button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 2: MAP FIELDS ═══ */}
        {step === 2 && (
          <div className="animate-[fadeIn_0.3s_ease]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Edit Field Mappings</h2>
                <p className="text-xs text-slate-400 mt-0.5">{mappings.length} mapping{mappings.length !== 1 && "s"} · Click 📋 to browse fields on the right panel</p>
              </div>
              <div className="flex gap-2">
                <button onClick={autoMap} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200 transition-all"><Zap size={13} /> Auto-Map</button>
                <button onClick={addMapping} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"><Plus size={15} /> Add Mapping</button>
              </div>
            </div>

            <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ minHeight: 500 }}>
              {/* LEFT: Table */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="grid grid-cols-[1fr_1fr_110px_56px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <div>Target</div><div>Source</div><div>Type</div><div className="text-center">Actions</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {mappings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20"><Unlink size={36} className="text-slate-200 mb-3" /><p className="text-sm text-slate-400">No mappings yet</p><p className="text-xs text-slate-300">Add a mapping or use Auto-Map</p></div>
                  )}
                  {mappings.map((mapping, index) => {
                    const isActive = sidebarIdx === index;
                    const modified = isModified(mapping);
                    const isExpanded = expandedRow === index;
                    return (
                      <div key={mapping.id}>
                        <div className={`grid grid-cols-[1fr_1fr_110px_56px] gap-2 items-center px-4 py-2 border-b border-slate-100 transition-all duration-150 ${isActive ? "bg-blue-50/60 border-l-[3px] border-l-blue-500" : "border-l-[3px] border-l-transparent hover:bg-slate-50/50"} ${mapping.isNew && !isActive ? "bg-emerald-50/20" : ""} ${modified && !mapping.isNew && !isActive ? "bg-amber-50/20" : ""}`}>
                          {/* Target */}
                          <div className="flex items-center gap-1 min-w-0">
                            <button onClick={() => setExpandedRow(isExpanded ? null : index)} className="shrink-0 text-slate-400 hover:text-slate-600 p-0.5">
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                            <input type="text" value={mapping.target} onChange={(e) => updateMapping(index, "target", e.target.value)} onFocus={() => openSidebar(index, "target")}
                              className={`flex-1 min-w-0 px-2 py-1.5 text-xs font-mono border rounded-md bg-white focus:outline-none focus:ring-1 ${isActive && sidebarMode === "target" ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200 focus:ring-blue-300"}`} placeholder="output.field" />
                            <button onClick={() => openSidebar(index, "target")} className={`shrink-0 p-1 rounded-md text-xs transition-colors ${isActive && sidebarMode === "target" ? "bg-blue-200 text-blue-800" : "bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700"}`} title="Browse output fields">📋</button>
                          </div>
                          {/* Source */}
                          <div className="flex items-center gap-1 min-w-0">
                            <input type="text" value={mapping.source} onChange={(e) => updateMapping(index, "source", e.target.value)} onFocus={() => openSidebar(index, "source")}
                              className={`flex-1 min-w-0 px-2 py-1.5 text-xs font-mono border rounded-md bg-white focus:outline-none focus:ring-1 ${isActive && sidebarMode === "source" ? "border-emerald-400 ring-1 ring-emerald-200" : "border-slate-200 focus:ring-emerald-300"}`} placeholder="input.field" />
                            <button onClick={() => openSidebar(index, "source")} className={`shrink-0 p-1 rounded-md text-xs transition-colors ${isActive && sidebarMode === "source" ? "bg-emerald-200 text-emerald-800" : "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700"}`} title="Browse input fields">📋</button>
                          </div>
                          {/* Type */}
                          <select value={mapping.transformation} onChange={(e) => updateMapping(index, "transformation", e.target.value)} className="px-1.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300">
                            <option value="direct">Direct</option><option value="concatenate">Concat</option><option value="conditional">Conditional</option><option value="custom">Custom</option>
                          </select>
                          {/* Actions */}
                          <div className="flex items-center justify-center gap-1">
                            {mapping.isNew && <span className="w-2 h-2 rounded-full bg-emerald-500" title="New" />}
                            {modified && !mapping.isNew && <span className="w-2 h-2 rounded-full bg-amber-500" title="Modified" />}
                            <button onClick={() => deleteMapping(index)} className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-10 py-3 bg-slate-50/70 border-b border-slate-100 space-y-2">
                            {mapping.transformation === "conditional" && (
                              <div><label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Condition</label>
                              <input value={mapping.condition} onChange={(e) => updateMapping(index, "condition", e.target.value)} className="w-full mt-0.5 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-300" placeholder={`${mapping.source}??`} /></div>
                            )}
                            {mapping.transformation === "concatenate" && (
                              <div><label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Sources (space-separated)</label>
                              <input value={mapping.sources.join(" ")} onChange={(e) => { const s = e.target.value.split(/\s+/).filter(Boolean); updateMapping(index, "sources", s); updateMapping(index, "source", s.join(" + ")); }} className="w-full mt-0.5 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300" placeholder="field1 field2" /></div>
                            )}
                            {mapping.transformation === "custom" && (
                              <div><label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Custom FreeMarker</label>
                              <textarea value={mapping.source} onChange={(e) => updateMapping(index, "source", e.target.value)} rows={2} className="w-full mt-0.5 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-violet-300" /></div>
                            )}
                            <p className="text-[10px] text-slate-400">Generates: <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 text-[10px]">
                              {mapping.transformation === "concatenate" ? mapping.sources.map((s) => `\${${s}}`).join(" ") : mapping.transformation === "conditional" ? `<#if ${mapping.condition || mapping.source + "??"}>\${${mapping.source}}<#else>N/A</#if>` : `\${${mapping.source}}`}
                            </code></p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: Field Browser Sidebar */}
              {sidebarMode && (
                <FieldBrowserSidebar
                  fields={sidebarMode === "source" ? inputFields : outputFields}
                  title={sidebarMode === "source" ? "Input Fields" : "Output Fields"}
                  mode={sidebarMode}
                  onSelect={handleSidebarSelect}
                  onClose={closeSidebar}
                  activeField={sidebarIdx != null ? (sidebarMode === "source" ? mappings[sidebarIdx]?.source : mappings[sidebarIdx]?.target) : null}
                />
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => { setStep(1); closeSidebar(); }} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"><ArrowLeft size={15} /> Back</button>
              <button onClick={() => { setStep(3); closeSidebar(); }} disabled={mappings.length === 0} className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl shadow-sm transition-all">Next: Review Changes <ArrowRight size={15} /></button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: REVIEW ═══ */}
        {step === 3 && (
          <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease]">
            <h2 className="text-xl font-bold text-slate-800">Review & Export</h2>
            {(() => { const ch = getChanges(); return (
              <div className="grid grid-cols-4 gap-3">
                {[{ l: "Total", v: mappings.length, bg: "bg-white border-slate-200", t: "text-slate-700", s: "text-slate-400" }, { l: "Added", v: ch.added.length, bg: "bg-emerald-50 border-emerald-200", t: "text-emerald-700", s: "text-emerald-600" }, { l: "Modified", v: ch.modified.length, bg: "bg-amber-50 border-amber-200", t: "text-amber-700", s: "text-amber-600" }, { l: "Deleted", v: ch.deleted.length, bg: "bg-rose-50 border-rose-200", t: "text-rose-600", s: "text-rose-500" }].map((x) => (
                  <div key={x.l} className={`${x.bg} rounded-xl border p-4 text-center`}><p className={`text-2xl font-bold ${x.t}`}>{x.v}</p><p className={`text-[11px] ${x.s} font-semibold uppercase tracking-wide mt-0.5`}>{x.l}</p></div>
                ))}
              </div>
            ); })()}
            {(() => { const ch = getChanges(); const has = ch.added.length + ch.modified.length + ch.deleted.length > 0;
              if (!has) return <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400">No changes from original.</div>;
              return (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {ch.added.map((m) => (<div key={m.id} className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50/30"><Plus size={14} className="text-emerald-600 shrink-0" /><span className="text-xs font-mono text-slate-700 flex-1"><strong>{m.target}</strong> ← {m.source}</span><Badge color="emerald">Added</Badge></div>))}
                  {ch.modified.map((m) => (<div key={m.id} className="flex items-center gap-3 px-4 py-2.5 bg-amber-50/30"><PenLine size={14} className="text-amber-600 shrink-0" /><span className="text-xs font-mono text-slate-700 flex-1"><strong>{m.target}</strong> ← {m.source}</span><Badge color="amber">Modified</Badge></div>))}
                  {ch.deleted.map((m) => (<div key={m.id} className="flex items-center gap-3 px-4 py-2.5 bg-rose-50/30"><Trash2 size={14} className="text-rose-500 shrink-0" /><span className="text-xs font-mono text-slate-500 line-through flex-1"><strong>{m.target}</strong> ← {m.source}</span><Badge color="rose">Deleted</Badge></div>))}
                </div>
              );
            })()}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-700">Generated V2 Template</h3>
                <button onClick={copyV2} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200 transition-all">
                  {copied ? <><CheckCircle2 size={13} className="text-emerald-600" /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-400 rounded-xl p-5 text-xs leading-relaxed overflow-x-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{generateV2()}</pre>
            </div>
            {templateContent && (
              <details className="bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-3 text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700">📄 Original Template (compare)</summary>
                <pre className="px-5 pb-4 text-xs text-slate-500 overflow-x-auto" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{templateContent}</pre>
              </details>
            )}
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"><ArrowLeft size={15} /> Back to Edit</button>
              <button onClick={downloadV2} className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"><Download size={15} /> Download V2 Template</button>
            </div>
          </div>
        )}
      </main>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
