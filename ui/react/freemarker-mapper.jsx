import { useState, useCallback, useRef } from "react";
import { Upload, FileCode, ArrowRight, ArrowLeft, Plus, Trash2, Zap, Download, ChevronDown, ChevronRight, Link2, Unlink, CheckCircle2, PenLine, Copy, X, Search, GripVertical } from "lucide-react";

// ─── PLUGIN DEFINITIONS (MODULAR SYSTEM) ────────────────────────────────────

/**
 * PLUGIN INTERFACE:
 * - id: unique key
 * - label: display name
 * - description: helper text
 * - Editor: React component for the expanded config view
 * - generate: Function (mapping) => string (FreeMarker code)
 */

const DirectEditor = ({ mapping, onChange, onOpenSidebar }) => (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Source Field</label>
      <div className="flex items-center gap-2">
        <input
            value={mapping.source}
            onChange={(e) => onChange({ source: e.target.value })}
            onFocus={() => onOpenSidebar("source")}
            className="flex-1 px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="input.field"
        />
        <button onClick={() => onOpenSidebar("source")} className="p-1.5 bg-slate-100 rounded text-slate-500 hover:text-blue-600">📋</button>
      </div>
    </div>
);

const ConcatEditor = ({ mapping, onChange, onOpenSidebar }) => {
  const sources = mapping.sources || [];

  const updateSource = (idx, val) => {
    const newSources = [...sources];
    newSources[idx] = val;
    // Auto-update the 'source' preview string for the table view
    onChange({ sources: newSources, source: newSources.join(" + ") });
  };

  const addSource = () => {
    const newSources = [...sources, ""];
    onChange({ sources: newSources, source: newSources.join(" + ") });
  };

  const removeSource = (idx) => {
    const newSources = sources.filter((_, i) => i !== idx);
    onChange({ sources: newSources, source: newSources.join(" + ") });
  };

  return (
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Fields to Join</label>
          <button onClick={addSource} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 font-medium">+ Add Field</button>
        </div>
        <div className="space-y-2">
          {sources.map((src, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                      value={src}
                      onChange={(e) => updateSource(idx, e.target.value)}
                      onFocus={() => onOpenSidebar("source", idx)} // Pass idx to target specific input
                      className="flex-1 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder="Select field..."
                  />
                  <button onClick={() => onOpenSidebar("source", idx)} className="p-1.5 bg-slate-100 rounded text-slate-500 hover:text-blue-600">📋</button>
                </div>
                <button onClick={() => removeSource(idx)} className="text-slate-300 hover:text-rose-500 p-1"><X size={14} /></button>
              </div>
          ))}
          {sources.length === 0 && <p className="text-xs text-slate-400 italic py-1">No fields added. Click "+ Add Field" to start.</p>}
        </div>

        <div className="pt-2 border-t border-slate-200/50">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Separator (Optional)</label>
          <input
              type="text"
              placeholder="e.g. ' ' (space) or - "
              className="w-full mt-1 px-2 py-1 text-xs border border-slate-200 rounded"
              // In a real app, you'd save this to mapping.config.separator
          />
        </div>
      </div>
  );
};

const ConditionalEditor = ({ mapping, onChange, onOpenSidebar }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Source Field</label>
        <div className="flex gap-1">
          <input
              value={mapping.source}
              onChange={(e) => onChange({ source: e.target.value })}
              onFocus={() => onOpenSidebar("source")}
              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <button onClick={() => onOpenSidebar("source")} className="p-1.5 bg-slate-100 rounded text-slate-500 hover:text-blue-600">📋</button>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Check Condition (If)</label>
        <input
            value={mapping.condition || ""}
            onChange={(e) => onChange({ condition: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-300"
            placeholder={`${mapping.source || 'field'}?? (Exists)`}
        />
      </div>
    </div>
);

const CustomEditor = ({ mapping, onChange }) => (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Raw FreeMarker Expression</label>
      <textarea
          value={mapping.source}
          onChange={(e) => onChange({ source: e.target.value })}
          rows={3}
          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-violet-300"
          placeholder="${myField.value}..."
      />
    </div>
);

// Registry of all available transformation types
const TRANSFORMATION_PLUGINS = {
  direct: {
    id: "direct",
    label: "Direct Map",
    description: "Map one input field directly to output",
    Editor: DirectEditor,
    generate: (m) => `\${${m.source}}`
  },
  concatenate: {
    id: "concatenate",
    label: "Concatenate",
    description: "Join multiple fields into one string",
    Editor: ConcatEditor,
    generate: (m) => (m.sources || []).map(s => `\${${s}}`).join(" ") // Improved logic would go here
  },
  conditional: {
    id: "conditional",
    label: "Conditional (If/Else)",
    description: "Output value only if condition is met",
    Editor: ConditionalEditor,
    generate: (m) => `<#if ${m.condition || m.source + "??"}>\${${m.source}}<#else>N/A</#if>`
  },
  custom: {
    id: "custom",
    label: "Custom Script",
    description: "Write raw FreeMarker syntax",
    Editor: CustomEditor,
    generate: (m) => `\${${m.source}}` // Assumes user types full syntax
  }
};

// ─── UTILITIES & SAMPLE DATA ────────────────────────────────────────────────

const sampleInputSchema = { customer: { id: "123", firstName: "John", lastName: "Doe", email: "j@doe.com", address: { city: "NY" } } };
const sampleOutputSchema = { customerId: "", fullName: "", emailAddress: "", city: "" };

const extractFields = (obj, prefix = "") => {
  const fields = [];
  const traverse = (current, path) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return;
    Object.keys(current).forEach((key) => {
      const newPath = path ? `${path}.${key}` : key;
      const value = current[key];
      if (typeof value === "object" && !Array.isArray(value) && !["string","number","boolean"].includes(value)) {
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

const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── UI COMPONENTS ──────────────────────────────────────────────────────────

const Badge = ({ children, color = "slate" }) => {
  const c = { slate: "bg-slate-100 text-slate-600 border-slate-200", blue: "bg-blue-50 text-blue-700 border-blue-200", emerald: "bg-emerald-50 text-emerald-700 border-emerald-200", amber: "bg-amber-50 text-amber-700 border-amber-200" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase border ${c[color]}`}>{children}</span>;
};

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

const FieldBrowserSidebar = ({ fields, title, onSelect, onClose, activeField }) => {
  const [search, setSearch] = useState("");
  const leafs = fields.filter((f) => f.type !== "object");
  const filtered = search ? leafs.filter((f) => f.path.toLowerCase().includes(search.toLowerCase())) : leafs;

  return (
      <div className="w-72 shrink-0 border-l border-slate-200 flex flex-col bg-white h-full absolute right-0 top-0 bottom-0 z-10 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          <button onClick={onClose}><X size={16} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="p-2 border-b border-slate-100">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search fields..." className="w-full px-3 py-1.5 text-xs border rounded-lg bg-slate-50" autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto p-1.5">
          {filtered.map((f, i) => (
              <button key={i} onClick={() => onSelect(f)} className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 group ${activeField === f.path ? "bg-blue-100 text-blue-800" : "hover:bg-slate-50"}`}>
                <div className="text-xs font-mono font-medium truncate">{f.path}</div>
              </button>
          ))}
        </div>
      </div>
  );
};

// ─── MAIN APP COMPONENT ─────────────────────────────────────────────────────

export default function FreeMarkerMapper() {
  const [step, setStep] = useState(1);
  const [inputSchema, setInputSchema] = useState(null);
  const [outputSchema, setOutputSchema] = useState(null);
  const [inputFields, setInputFields] = useState([]);
  const [outputFields, setOutputFields] = useState([]);
  const [mappings, setMappings] = useState([]);

  // Sidebar State
  const [sidebarState, setSidebarState] = useState({ isOpen: false, mode: null, rowIdx: null, subIdx: null });
  const [expandedRow, setExpandedRow] = useState(null);

  // File Handlers
  const handleFile = useCallback((type, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        const fields = extractFields(json);
        if (type === "input") { setInputSchema(json); setInputFields(fields); }
        else { setOutputSchema(json); setOutputFields(fields); }
      } catch (err) { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
  }, []);

  const loadSample = () => {
    setInputSchema(sampleInputSchema); setInputFields(extractFields(sampleInputSchema));
    setOutputSchema(sampleOutputSchema); setOutputFields(extractFields(sampleOutputSchema));
  };

  // Mapping Logic
  const addMapping = () => {
    setMappings([...mappings, { id: uid(), target: "", source: "", sources: [], transformation: "direct", isNew: true }]);
    setExpandedRow(mappings.length); // Auto expand new row
  };

  const updateMapping = (index, updates) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setMappings(newMappings);
  };

  const deleteMapping = (index) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const autoMap = () => {
    const newMappings = [];
    outputFields.forEach(out => {
      const match = inputFields.find(inp => inp.path.split('.').pop() === out.path.split('.').pop());
      if (match) newMappings.push({ id: uid(), target: out.path, source: match.path, sources: [match.path], transformation: "direct" });
    });
    setMappings(newMappings);
    setStep(2);
  };

  // Sidebar Logic
  const openSidebar = (mode, rowIdx, subIdx = null) => {
    setSidebarState({ isOpen: true, mode, rowIdx, subIdx });
  };

  const handleSidebarSelect = (field) => {
    const { mode, rowIdx, subIdx } = sidebarState;
    const currentMapping = mappings[rowIdx];

    if (mode === "target") {
      updateMapping(rowIdx, { target: field.path });
    } else if (mode === "source") {
      if (subIdx !== null && currentMapping.transformation === "concatenate") {
        // Handle array update for Concat plugin
        const newSources = [...(currentMapping.sources || [])];
        newSources[subIdx] = field.path;
        updateMapping(rowIdx, { sources: newSources, source: newSources.join(" + ") });
      } else {
        // Standard single source update
        updateMapping(rowIdx, { source: field.path, sources: [field.path] });
      }
    }
    setSidebarState({ ...sidebarState, isOpen: false });
  };

  // Generation Logic
  const generateCode = () => {
    const lines = ["{"];
    mappings.forEach((m, i) => {
      const plugin = TRANSFORMATION_PLUGINS[m.transformation];
      const value = plugin ? plugin.generate(m) : "ERROR";
      lines.push(`  "${m.target}": "${value}"${i < mappings.length - 1 ? "," : ""}`);
    });
    lines.push("}");
    return lines.join("\n");
  };

  return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white"><FileCode size={20} /></div>
            <div><h1 className="font-bold text-sm">FreeMarker Mapper</h1><p className="text-[10px] text-slate-400">Modular Plugin Edition</p></div>
          </div>
          <div className="flex gap-2">
            {[1,2,3].map(n => (
                <div key={n} className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold ${step===n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{n}</div>
            ))}
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-6 relative">
          {/* Step 1: Upload */}
          {step === 1 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="grid grid-cols-2 gap-4">
                  <UploadZone label="Input Schema" icon={Upload} loaded={!!inputSchema} detail={`${inputFields.length} fields`} onFile={(f) => handleFile("input", f)} />
                  <UploadZone label="Output Schema" icon={Upload} loaded={!!outputSchema} detail={`${outputFields.length} fields`} onFile={(f) => handleFile("output", f)} />
                </div>
                <div className="flex justify-center gap-4">
                  <button onClick={loadSample} className="text-xs font-bold text-slate-500 hover:text-blue-600">Load Sample Data</button>
                  {inputSchema && outputSchema && (
                      <button onClick={() => setStep(2)} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700">Next: Map Fields</button>
                  )}
                </div>
              </div>
          )}

          {/* Step 2: Mapping Editor */}
          {step === 2 && (
              <div className="flex gap-4 relative items-start">
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Toolbar */}
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-sm text-slate-700">Field Mappings</h2>
                    <div className="flex gap-2">
                      <button onClick={autoMap} className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded hover:bg-violet-100"><Zap size={14} className="inline mr-1"/> Auto</button>
                      <button onClick={addMapping} className="text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700"><Plus size={14} className="inline mr-1"/> Add</button>
                    </div>
                  </div>

                  {/* Table Header */}
                  <div className="grid grid-cols-[30px_1fr_1fr_120px_40px] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                    <div></div>
                    <div>Target Field</div>
                    <div>Source Preview</div>
                    <div>Transformation</div>
                    <div></div>
                  </div>

                  {/* Mappings List */}
                  <div className="divide-y divide-slate-100 min-h-[400px]">
                    {mappings.map((m, idx) => {
                      const Plugin = TRANSFORMATION_PLUGINS[m.transformation];
                      return (
                          <div key={m.id} className={`group ${expandedRow === idx ? "bg-slate-50" : "hover:bg-slate-50/50"}`}>
                            {/* Collapsed Row */}
                            <div className="grid grid-cols-[30px_1fr_1fr_120px_40px] gap-3 px-4 py-3 items-center">
                              <button onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}>
                                {expandedRow === idx ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-300"/>}
                              </button>

                              {/* Target Input */}
                              <div className="relative">
                                <input
                                    value={m.target}
                                    onChange={(e) => updateMapping(idx, { target: e.target.value })}
                                    onFocus={() => openSidebar("target", idx)}
                                    className="w-full text-xs font-mono border-b border-transparent focus:border-blue-500 bg-transparent focus:outline-none"
                                    placeholder="target.field"
                                />
                              </div>

                              {/* Source Preview (Read Only) */}
                              <div className="text-xs font-mono text-slate-500 truncate px-2 py-1 bg-slate-100/50 rounded pointer-events-none">
                                {Plugin ? Plugin.generate(m) : "Invalid"}
                              </div>

                              {/* Plugin Selector */}
                              <select
                                  value={m.transformation}
                                  onChange={(e) => updateMapping(idx, { transformation: e.target.value })}
                                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-300 outline-none"
                              >
                                {Object.values(TRANSFORMATION_PLUGINS).map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                              </select>

                              <button onClick={() => deleteMapping(idx)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                            </div>

                            {/* Expanded Editor Area */}
                            {expandedRow === idx && Plugin && (
                                <div className="px-12 py-4 bg-slate-50 border-t border-slate-200/50 shadow-inner">
                                  <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-2xl">
                                    <div className="mb-3 pb-2 border-b border-slate-100 flex justify-between items-center">
                                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{Plugin.label} Configuration</h4>
                                      <span className="text-[10px] text-slate-400">{Plugin.description}</span>
                                    </div>
                                    {/* Render the specific Plugin Editor */}
                                    <Plugin.Editor
                                        mapping={m}
                                        onChange={(updates) => updateMapping(idx, updates)}
                                        onOpenSidebar={(mode, subIdx) => openSidebar(mode, idx, subIdx)}
                                    />
                                  </div>
                                </div>
                            )}
                          </div>
                      );
                    })}
                  </div>
                </div>

                {/* RHS Sidebar (Overlay) */}
                {sidebarState.isOpen && (
                    <FieldBrowserSidebar
                        fields={sidebarState.mode === "target" ? outputFields : inputFields}
                        title={sidebarState.mode === "target" ? "Select Target" : "Select Source"}
                        onClose={() => setSidebarState({ ...sidebarState, isOpen: false })}
                        onSelect={handleSidebarSelect}
                    />
                )}
              </div>
          )}

          {/* Step 3: Export */}
          {step === 3 && (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-slate-900 rounded-xl p-6 overflow-hidden relative">
                  <button onClick={() => navigator.clipboard.writeText(generateCode())} className="absolute top-4 right-4 text-white/50 hover:text-white flex items-center gap-1 text-xs"><Copy size={12}/> Copy</button>
                  <pre className="font-mono text-emerald-400 text-xs leading-relaxed">{generateCode()}</pre>
                </div>
                <button onClick={() => setStep(2)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={14}/> Back to Edit</button>
              </div>
          )}

          {/* Footer Nav */}
          {step === 2 && (
              <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur border border-slate-200 shadow-xl rounded-full px-6 py-2 flex gap-4 pointer-events-auto">
                  <button onClick={() => setStep(1)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Back</button>
                  <div className="w-px bg-slate-200"></div>
                  <button onClick={() => setStep(3)} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">Review & Export <ArrowRight size={12}/></button>
                </div>
              </div>
          )}
        </main>
      </div>
  );
}