import { useState, useCallback, useRef } from "react";
import { Upload, FileCode, ArrowRight, ArrowLeft, Plus, Trash2, Zap, Download, ChevronDown, ChevronRight, CheckCircle2, Copy, X, Search, Database, Type } from "lucide-react";

// ─── 1. PARSING & UTILITIES ─────────────────────────────────────────────────

const uid = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const extractFields = (obj, prefix = "") => {
  const fields = [];
  const traverse = (current, path) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return;
    Object.keys(current).forEach((key) => {
      const newPath = path ? `${path}.${key}` : key;
      const value = current[key];
      if (typeof value === "object" && !Array.isArray(value)) {
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

// ★ RESTORED: Smart Template Parser (Adapted for Plugin System)
const parseTemplate = (content) => {
  const mappings = [];
  const lines = content.split("\n");
  const pathStack = [];

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Track JSON structure depth
    const keyObjMatch = trimmed.match(/^"([^"]+)"\s*:\s*\{/);
    if (keyObjMatch) { pathStack.push(keyObjMatch[1]); return; }
    if (trimmed === "}" || trimmed === "},") { pathStack.pop(); return; }

    // Match "key": "value"
    const fieldMatch = trimmed.match(/^"([^"]+)"\s*:\s*"(.*)"/);
    if (fieldMatch) {
      const key = fieldMatch[1];
      let rawValue = fieldMatch[2];

      // Cleanup trailing commas/quotes from regex capture
      if (rawValue.endsWith(',')) rawValue = rawValue.slice(0, -1);
      if (rawValue.endsWith('"')) rawValue = rawValue.slice(0, -1);

      const targetPath = [...pathStack, key].join(".");

      // Detect Transformation Type
      if (trimmed.includes("<#if")) {
        // Conditional logic detection
        const condMatch = trimmed.match(/<#if\s+([^>]+)>/);
        const contentMatch = trimmed.match(/\$\{([^}]+)\}/);
        mappings.push({
          id: uid(),
          target: targetPath,
          source: contentMatch ? contentMatch[1] : "",
          condition: condMatch ? condMatch[1] : "",
          transformation: "conditional",
          segments: [],
          isNew: false
        });
      } else {
        // Parse Segments for Concat/Direct
        const segments = [];
        const regex = /(\$\{[^}]+\})/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(rawValue)) !== null) {
          // Capture text before the variable
          if (match.index > lastIndex) {
            segments.push({ type: 'text', value: rawValue.substring(lastIndex, match.index) });
          }
          // Capture variable
          segments.push({ type: 'field', value: match[1].slice(2, -1) });
          lastIndex = regex.lastIndex;
        }
        // Capture remaining text
        if (lastIndex < rawValue.length) {
          segments.push({ type: 'text', value: rawValue.substring(lastIndex) });
        }

        // Decide type based on segments
        const type = segments.length > 1 || (segments.length === 1 && segments[0].type === 'text')
            ? "concatenate"
            : "direct";

        mappings.push({
          id: uid(),
          target: targetPath,
          source: segments.find(s => s.type === 'field')?.value || "",
          segments: segments, // Store segments for the Editor
          transformation: type,
          isNew: false
        });
      }
    }
  });
  return mappings;
};

// ─── 2. PLUGINS (The Logic) ─────────────────────────────────────────────────

const DirectEditor = ({ mapping, onChange, onOpenSidebar }) => (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Source Field</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Database size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
              value={mapping.source}
              onChange={(e) => onChange({ source: e.target.value })}
              onFocus={() => onOpenSidebar("source")}
              className="w-full pl-8 pr-2.5 py-2 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Select a field..."
          />
        </div>
        <button onClick={() => onOpenSidebar("source")} className="p-2 bg-slate-100 rounded-md text-slate-500 hover:text-blue-600 border border-slate-200">📋</button>
      </div>
    </div>
);

const ConcatEditor = ({ mapping, onChange, onOpenSidebar }) => {
  const segments = mapping.segments || [];

  const updateSegment = (idx, updates) => {
    const newSegments = [...segments];
    newSegments[idx] = { ...newSegments[idx], ...updates };
    onChange({ segments: newSegments });
  };

  const addSegment = (type) => {
    const newSegments = [...segments, { type, value: type === 'text' ? ' ' : '' }];
    onChange({ segments: newSegments });
  };

  const removeSegment = (idx) => {
    const newSegments = segments.filter((_, i) => i !== idx);
    onChange({ segments: newSegments });
  };

  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Construction Chain</label>
          <div className="flex gap-2">
            <button onClick={() => addSegment('text')} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 flex items-center gap-1">+ Text</button>
            <button onClick={() => addSegment('field')} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">+ Field</button>
          </div>
        </div>

        <div className="space-y-2">
          {segments.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-2 group">
                <span className="text-[10px] font-mono text-slate-300 w-4">{idx + 1}</span>
                <div className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md border ${seg.type === 'field' ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-slate-300'}`}>
                  {seg.type === 'field' ? <Database size={13} className="text-blue-400 shrink-0"/> : <Type size={13} className="text-slate-400 shrink-0"/>}
                  <input
                      value={seg.value}
                      onChange={(e) => updateSegment(idx, { value: e.target.value })}
                      onFocus={() => seg.type === 'field' && onOpenSidebar("source", idx)}
                      className={`flex-1 text-xs font-mono bg-transparent focus:outline-none ${seg.type === 'field' ? 'text-slate-700' : 'text-slate-500 italic'}`}
                      placeholder={seg.type === 'field' ? "Select source field..." : "Enter separator text..."}
                  />
                  {seg.type === 'field' && <button onClick={() => onOpenSidebar("source", idx)} className="text-slate-400 hover:text-blue-600">📋</button>}
                </div>
                <button onClick={() => removeSegment(idx)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
              </div>
          ))}
          {segments.length === 0 && (
              <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-lg">
                <p className="text-xs text-slate-400">Chain is empty.</p>
                <button onClick={() => addSegment('field')} className="text-xs text-blue-500 font-medium hover:underline mt-1">Start by adding a field</button>
              </div>
          )}
        </div>
        <div className="bg-slate-900 rounded p-2 text-[10px] font-mono text-emerald-400 overflow-x-auto">
          <span className="opacity-50 text-slate-400 mr-2 select-none">Preview:</span>
          {TRANSFORMATION_PLUGINS.concatenate.generate(mapping)}
        </div>
      </div>
  );
};

const ConditionalEditor = ({ mapping, onChange, onOpenSidebar }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Source Field</label>
        <div className="flex gap-1 relative">
          <Database size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
              value={mapping.source}
              onChange={(e) => onChange({ source: e.target.value })}
              onFocus={() => onOpenSidebar("source")}
              className="w-full pl-8 pr-2 py-1.5 text-xs font-mono border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <button onClick={() => onOpenSidebar("source")} className="px-2 bg-slate-100 rounded border border-slate-200 text-slate-500 hover:text-blue-600">📋</button>
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

const TRANSFORMATION_PLUGINS = {
  direct: {
    id: "direct",
    label: "Direct Map",
    Editor: DirectEditor,
    generate: (m) => `\${${m.source}}`
  },
  concatenate: {
    id: "concatenate",
    label: "Concatenate (Chain)",
    Editor: ConcatEditor,
    generate: (m) => {
      if (m.segments && m.segments.length > 0) {
        return m.segments.map(seg => seg.type === 'field' ? `\${${seg.value}}` : seg.value).join("");
      }
      return `\${${m.source}}`; // Fallback
    }
  },
  conditional: {
    id: "conditional",
    label: "Conditional",
    Editor: ConditionalEditor,
    generate: (m) => `<#if ${m.condition || m.source + "??"}>\${${m.source}}<#else>N/A</#if>`
  },
  custom: {
    id: "custom",
    label: "Custom Script",
    Editor: CustomEditor,
    generate: (m) => `\${${m.source}}`
  }
};

// ─── 3. UI COMPONENTS (Restored FieldTree) ──────────────────────────────────

const UploadZone = ({ label, icon: Icon, loaded, detail, accepted, onFile }) => {
  const ref = useRef();
  return (
      <div onClick={() => ref.current?.click()} className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${loaded ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}>
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

// ★ RESTORED: Indented Field Tree Component for Step 1
const FieldTree = ({ fields, title, accent = "blue" }) => {
  const [search, setSearch] = useState("");
  const leafs = fields.filter((f) => f.type !== "object");
  const filtered = search ? leafs.filter((f) => f.path.toLowerCase().includes(search.toLowerCase())) : leafs;

  const colors = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700"
  };

  return (
      <div className="flex flex-col h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[accent]}`}>{leafs.length} fields</span>
        </div>
        <div className="px-2 py-2 border-b border-slate-200/50 bg-white">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter fields..." className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 focus:outline-none focus:border-blue-300" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 max-h-[300px]">
          {filtered.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-white hover:shadow-sm transition-all" style={{ paddingLeft: 10 + f.depth * 14 }}>
                <span className="font-mono font-medium text-slate-700 truncate">{f.path}</span>
                <span className="ml-auto text-[10px] text-slate-400 font-mono opacity-50">{f.type}</span>
              </div>
          ))}
          {filtered.length === 0 && <p className="text-xs text-slate-300 text-center py-4">No match</p>}
        </div>
      </div>
  );
};

// ─── RHS Field Browser Sidebar (Matched to Image Style) ──────────────────────
const FieldBrowserSidebar = ({ fields, title, onSelect, onClose, activeField, mode }) => {
  const [search, setSearch] = useState("");

  // Filter fields (exclude objects, keep only leaves)
  const leafs = fields.filter((f) => f.type !== "object");
  const filtered = search ? leafs.filter((f) => f.path.toLowerCase().includes(search.toLowerCase())) : leafs;

  const isSource = mode === "source";
  // Dynamic styling based on mode (Green for Source, Blue for Target)
  const accentBorder = isSource ? "border-emerald-100" : "border-blue-100";
  const accentBgHeader = isSource ? "bg-emerald-50/50" : "bg-blue-50/50";
  const activeClass = isSource ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200";

  return (
      <div className="w-80 shrink-0 border-l border-slate-200 flex flex-col bg-white h-full shadow-xl z-10">
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${accentBorder} ${accentBgHeader}`}>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Click to assign to selected row</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-slate-100 bg-white">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fields..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                autoFocus
            />
          </div>
        </div>

        {/* Field List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.map((f, i) => {
            // Split path into Parent (prefix) and Name (leaf)
            const parts = f.path.split(".");
            const fieldName = parts.pop();
            const parentPath = parts.join(".");
            const isActive = activeField === f.path;

            return (
                <button
                    key={i}
                    onClick={() => onSelect(f)}
                    className={`w-full text-left px-4 py-3 rounded-lg border border-transparent transition-all duration-200 group flex flex-col gap-0.5
                ${isActive ? activeClass : "hover:bg-slate-50 hover:border-slate-100"}
              `}
                >
                  {/* Main Field Label */}
                  <div className="text-sm truncate leading-tight">
                    {/* Gray Parent Prefix */}
                    {parentPath && (
                        <span className="text-slate-400 font-normal opacity-80 group-hover:opacity-100 transition-opacity">
                    {parentPath}.
                  </span>
                    )}
                    {/* Bold Field Name */}
                    <span className={`font-semibold ${isActive ? "text-slate-900" : "text-slate-700 group-hover:text-blue-700"}`}>
                  {fieldName}
                </span>
                  </div>

                  {/* Type Badge */}
                  <div className="text-[10px] font-mono text-slate-400 group-hover:text-slate-500">
                    {f.type}
                  </div>
                </button>
            );
          })}

          {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 opacity-60">
                <Search size={24} className="mb-2" />
                <p className="text-xs">No fields found</p>
              </div>
          )}
        </div>
      </div>
  );
};

// ─── 4. MAIN APPLICATION ────────────────────────────────────────────────────

export default function FreeMarkerMapper() {
  const [step, setStep] = useState(1);

  // Data State
  const [inputSchema, setInputSchema] = useState(null);
  const [outputSchema, setOutputSchema] = useState(null);
  const [templateContent, setTemplateContent] = useState(""); // Stores uploaded FTL content

  const [inputFields, setInputFields] = useState([]);
  const [outputFields, setOutputFields] = useState([]);
  const [mappings, setMappings] = useState([]);

  // Sidebar State
  const [sidebarState, setSidebarState] = useState({ isOpen: false, mode: null, rowIdx: null, subIdx: null });
  const [expandedRow, setExpandedRow] = useState(null);

  // File Handling
  const handleFile = useCallback((type, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        if (type === "input") {
          const json = JSON.parse(content);
          setInputSchema(json);
          setInputFields(extractFields(json));
        }
        else if (type === "output") {
          const json = JSON.parse(content);
          setOutputSchema(json);
          setOutputFields(extractFields(json));
        }
        else if (type === "template") {
          setTemplateContent(content);
          const parsedMappings = parseTemplate(content); // Use smart V2 parser
          setMappings(parsedMappings);
        }
      } catch (err) { alert("Invalid File: " + err.message); }
    };
    reader.readAsText(file);
  }, []);

  const loadSample = () => {
    const sIn = { user: { first: "John", last: "Doe", age: 30, address: { city: "NY", zip: "10001"} } };
    const sOut = { fullName: "", details: "" };
    setInputSchema(sIn); setInputFields(extractFields(sIn));
    setOutputSchema(sOut); setOutputFields(extractFields(sOut));
  };

  // Mapping Actions
  const addMapping = () => {
    setMappings([...mappings, { id: uid(), target: "", source: "", segments: [], transformation: "direct", isNew: true }]);
    setExpandedRow(mappings.length);
  };

  const updateMapping = (index, updates) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], ...updates };
    setMappings(newMappings);
  };

  const deleteMapping = (index) => {
    setMappings(mappings.filter((_, i) => i !== index));
    if (expandedRow === index) setExpandedRow(null);
  };

  const autoMap = () => {
    const newMappings = [];
    outputFields.forEach(out => {
      const match = inputFields.find(inp => inp.path.split('.').pop() === out.path.split('.').pop());
      if (match) newMappings.push({ id: uid(), target: out.path, source: match.path, transformation: "direct" });
    });
    setMappings(newMappings);
    setStep(2);
  };

  // Sidebar Actions
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
        // Update specific segment in Chain Builder
        const newSegments = [...(currentMapping.segments || [])];
        newSegments[subIdx] = { type: 'field', value: field.path };
        updateMapping(rowIdx, { segments: newSegments });
      } else {
        // Standard direct update
        updateMapping(rowIdx, { source: field.path });
      }
    }
    setSidebarState({ ...sidebarState, isOpen: false });
  };

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
        <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-1.5 rounded-lg text-white"><FileCode size={20} /></div>
            <div><h1 className="font-bold text-sm text-slate-800">FreeMarker Mapper</h1><p className="text-[10px] text-slate-400">Plugin Edition V2</p></div>
          </div>
          <div className="flex gap-2">
            {[1,2,3].map(n => (
                <div key={n} className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold transition-all ${step===n ? 'bg-blue-600 text-white scale-110' : 'bg-slate-100 text-slate-400'}`}>{n}</div>
            ))}
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-6 relative">
          {/* ═══ STEP 1: UPLOAD & PREVIEW (Restored) ═══ */}
          {step === 1 && (
              <div className="space-y-6 max-w-5xl mx-auto mt-6">
                {/* Upload Zones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <UploadZone label="Input Schema" icon={Upload} loaded={!!inputSchema} detail={`${inputFields.length} fields`} accepted=".json" onFile={(f) => handleFile("input", f)} />
                  <UploadZone label="Output Schema" icon={Upload} loaded={!!outputSchema} detail={`${outputFields.length} fields`} accepted=".json" onFile={(f) => handleFile("output", f)} />
                  <UploadZone label="Template (.ftl)" icon={FileCode} loaded={!!templateContent} detail={`${mappings.length} mappings`} accepted=".ftl,.json" onFile={(f) => handleFile("template", f)} />
                </div>

                <div className="flex justify-center">
                  <button onClick={loadSample} className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1"><Zap size={14}/> Load Sample Data</button>
                </div>

                {/* Restored Tree Previews */}
                {inputSchema && outputSchema && (
                    <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <FieldTree fields={inputFields} title="Input Structure" accent="blue" />
                      <FieldTree fields={outputFields} title="Output Structure" accent="emerald" />
                    </div>
                )}

                {inputSchema && outputSchema && (
                    <div className="flex justify-end pt-4">
                      <button onClick={() => setStep(2)} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-blue-700 flex items-center gap-2">Next: Map Fields <ArrowRight size={14}/></button>
                    </div>
                )}
              </div>
          )}

          {/* ═══ STEP 2: MAPPING EDITOR ═══ */}
          {step === 2 && (
              <div className="flex gap-6 relative items-start">
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col" style={{minHeight: "600px"}}>
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-sm text-slate-700">Mapping Configuration</h2>
                    <div className="flex gap-2">
                      <button onClick={autoMap} className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded hover:bg-violet-100 border border-violet-100">Auto-Map</button>
                      <button onClick={addMapping} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1.5 rounded hover:bg-emerald-700 shadow-sm">+ Add Field</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[30px_1fr_1fr_110px_40px] gap-4 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <div></div>
                    <div>Target Field</div>
                    <div>Generated Preview</div>
                    <div>Logic Type</div>
                    <div></div>
                  </div>

                  <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                    {mappings.map((m, idx) => {
                      const Plugin = TRANSFORMATION_PLUGINS[m.transformation];
                      return (
                          <div key={m.id} className={`group transition-colors ${expandedRow === idx ? "bg-slate-50" : "hover:bg-slate-50/40"}`}>
                            {/* Collapsed Row */}
                            <div className="grid grid-cols-[30px_1fr_1fr_110px_40px] gap-4 px-4 py-3 items-center">
                              <button onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}>
                                {expandedRow === idx ? <ChevronDown size={14} className="text-slate-600"/> : <ChevronRight size={14} className="text-slate-300"/>}
                              </button>

                              <input
                                  value={m.target}
                                  onChange={(e) => updateMapping(idx, { target: e.target.value })}
                                  onFocus={() => openSidebar("target", idx)}
                                  className="w-full text-xs font-mono border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-2 py-1 bg-transparent focus:bg-white focus:outline-none transition-all"
                                  placeholder="output.field"
                              />

                              <div className="text-[10px] font-mono text-slate-500 truncate px-2 py-1 bg-slate-100/50 rounded border border-slate-100">
                                {Plugin ? Plugin.generate(m) : "Invalid"}
                              </div>

                              <select
                                  value={m.transformation}
                                  onChange={(e) => updateMapping(idx, { transformation: e.target.value })}
                                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-300 outline-none cursor-pointer"
                              >
                                {Object.values(TRANSFORMATION_PLUGINS).map(p => (
                                    <option key={p.id} value={p.id}>{p.label}</option>
                                ))}
                              </select>

                              <button onClick={() => deleteMapping(idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                            </div>

                            {/* Expanded Editor Area */}
                            {expandedRow === idx && Plugin && (
                                <div className="px-12 py-4 bg-slate-50/80 border-t border-slate-100 shadow-inner">
                                  <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-3xl shadow-sm">
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

                {sidebarState.isOpen && (
                    <FieldBrowserSidebar
                        fields={sidebarState.mode === "target" ? outputFields : inputFields}
                        title={sidebarState.mode === "target" ? "Select Target" : "Select Source"}
                        mode={sidebarState.mode}
                        onClose={() => setSidebarState({ ...sidebarState, isOpen: false })}
                        onSelect={handleSidebarSelect}
                    />
                )}
              </div>
          )}

          {/* ═══ STEP 3: EXPORT ═══ */}
          {step === 3 && (
              <div className="max-w-4xl mx-auto space-y-4 mt-10">
                <div className="bg-slate-900 rounded-xl p-6 relative shadow-2xl">
                  <button onClick={() => navigator.clipboard.writeText(generateCode())} className="absolute top-4 right-4 text-white/50 hover:text-white flex items-center gap-1 text-xs"><Copy size={12}/> Copy</button>
                  <pre className="font-mono text-emerald-400 text-xs leading-relaxed overflow-x-auto">{generateCode()}</pre>
                </div>
                <button onClick={() => setStep(2)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={14}/> Back to Edit</button>
              </div>
          )}

          {/* Footer Nav */}
          {step === 2 && (
              <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-30">
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