// ─────────────────────────────────────────────────────────────────────────────
// math-to-go — shared components
// ─────────────────────────────────────────────────────────────────────────────

// ── UserAvatar — Google-account-style avatar + dropdown ───────────────────────
function UserAvatar() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef();

  const user = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem("mtt_user") || "null"); } catch(e) { return null; }
  }, []);

  // Derive initials: first Chinese char or first uppercase Latin letter
  function getInitial(name) {
    if (!name) return "数";
    const firstCJK = name.match(/[\u4e00-\u9fa5]/);
    if (firstCJK) return firstCJK[0];
    return name.trim()[0].toUpperCase();
  }

  // Generate a stable color from the name
  function getColor(name) {
    const palette = ["#1865F2","#16A34A","#D97706","#9333EA","#DC2626","#0891B2"];
    if (!name) return palette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  const initial = getInitial(user?.name);
  const color   = getColor(user?.name);

  // Close on outside click
  React.useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative", flexShrink:0 }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width:36, height:36, borderRadius:10,
          background: color, color:"#fff",
          border: open ? "2px solid "+color : "2px solid transparent",
          boxShadow: open ? "0 0 0 3px "+color+"33" : "none",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:15, fontWeight:800, cursor:"pointer",
          fontFamily:"inherit", transition:"all .15s",
          outline:"none",
        }}
        title={user ? user.name : "登录"}
      >
        {initial}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={uaStyles.panel} className="fade-in">
          {user ? (
            <>
              {/* User card */}
              <div style={uaStyles.userCard}>
                <div style={{ ...uaStyles.bigAvatar, background: color }}>{initial}</div>
                <div style={{ minWidth:0 }}>
                  <div style={uaStyles.userName}>{user.name}</div>
                  <div style={uaStyles.userMeta}>
                    {user.role === "admin" ? `管理员 · ${user.title || ""}` : `学生 · ${user.class || ""}`}
                  </div>
                  <div style={uaStyles.userId}>ID: {user.id}</div>
                </div>
              </div>

              <div style={uaStyles.divider} />

              {/* Menu items */}
              {user.role === "admin" && (
                <a href="Admin Panel.html" style={uaStyles.menuItem} onClick={() => setOpen(false)}>
                  <span style={uaStyles.menuIcon}>⚙️</span>
                  <span>管理后台</span>
                </a>
              )}
              <div style={uaStyles.menuItem} onClick={() => setOpen(false)}>
                <span style={uaStyles.menuIcon}>📊</span>
                <span>我的学习记录</span>
              </div>
              <div style={uaStyles.menuItem} onClick={() => setOpen(false)}>
                <span style={uaStyles.menuIcon}>🔔</span>
                <span>通知设置</span>
              </div>

              <div style={uaStyles.divider} />

              {/* Switch account */}
              <a href="Login.html" style={{ ...uaStyles.menuItem, textDecoration:"none" }}
                onClick={() => { localStorage.removeItem("mtt_user"); }}>
                <span style={uaStyles.menuIcon}>🔄</span>
                <span>切换账户</span>
              </a>
              <a href="Login.html" style={{ ...uaStyles.menuItem, color:"#DC2626", textDecoration:"none" }}
                onClick={() => { localStorage.removeItem("mtt_user"); }}>
                <span style={uaStyles.menuIcon}>🚪</span>
                <span>退出登录</span>
              </a>
            </>
          ) : (
            <>
              <div style={{ padding:"14px 16px 10px", fontSize:14, color:"#7A7167" }}>
                未登录
              </div>
              <div style={uaStyles.divider} />
              <a href="Login.html" style={{ ...uaStyles.menuItem, color:"#1865F2", textDecoration:"none" }}>
                <span style={uaStyles.menuIcon}>🔑</span>
                <span>登录 / 注册</span>
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const uaStyles = {
  panel: {
    position:"absolute", left:0, top:"calc(100% + 8px)",
    width:260, background:"#fff",
    borderRadius:14, border:"1px solid #EDE8DF",
    boxShadow:"0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
    zIndex:500, overflow:"hidden",
  },
  userCard: {
    display:"flex", alignItems:"center", gap:12,
    padding:"16px 16px 12px",
  },
  bigAvatar: {
    width:44, height:44, borderRadius:12,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:20, fontWeight:800, color:"#fff", flexShrink:0,
  },
  userName: { fontSize:15, fontWeight:700, color:"#1A1A1A", lineHeight:1.3 },
  userMeta: { fontSize:12, color:"#7A7167", marginTop:1 },
  userId:   { fontSize:11, color:"#9E9589", fontFamily:"monospace", marginTop:2 },
  divider:  { height:1, background:"#EDE8DF", margin:"0" },
  menuItem: {
    display:"flex", alignItems:"center", gap:10,
    padding:"10px 16px", fontSize:14, color:"#1A1A1A",
    cursor:"pointer", transition:"background .1s", fontWeight:500,
    userSelect:"none",
  },
  menuIcon: { fontSize:16, width:20, textAlign:"center", flexShrink:0 },
};

// ── CurriculumNav ─────────────────────────────────────────────────────────────
function CurriculumNav({ selection, onChange, onStart, disabled }) {
  const { grade, term, unit } = selection;
  const C = window.CURRICULUM;

  const terms = grade ? (C.terms[grade] || []) : [];
  const unitKey = grade && term ? `${grade}.${term}` : null;
  const units = unitKey ? (C.units[unitKey] || []) : [];

  const canStart = grade && term && unit;

  function sel(field, value) {
    const next = { grade, term, unit, [field]: value };
    if (field === "grade") { next.term = ""; next.unit = ""; }
    if (field === "term") { next.unit = ""; }
    onChange(next);
  }

  return (
    <div style={navStyles.wrap}>
      <div style={navStyles.logo}>
        <UserAvatar />
        <span style={navStyles.logoText}>数学助手</span>
      </div>
      <div style={navStyles.dropdowns}>
        <Dropdown
          value={grade}
          placeholder="年级"
          options={C.grades.map(g => ({ value: g.id, label: g.name }))}
          onChange={v => sel("grade", v)}
          disabled={disabled}
        />
        <span style={navStyles.arrow}>›</span>
        <Dropdown
          value={term}
          placeholder="册"
          options={terms.map(t => ({ value: t.id, label: t.name }))}
          onChange={v => sel("term", v)}
          disabled={disabled || !grade}
        />
        <span style={navStyles.arrow}>›</span>
        <Dropdown
          value={unit}
          placeholder="单元"
          options={units.map(u => ({ value: u.id, label: u.name }))}
          onChange={v => sel("unit", v)}
          disabled={disabled || !term}
          wide
        />
      </div>
      <button
        style={{ ...navStyles.startBtn, ...(canStart && !disabled ? navStyles.startBtnActive : navStyles.startBtnDisabled) }}
        onClick={onStart}
        disabled={!canStart || disabled}
      >
        开始
      </button>
    </div>
  );
}

const navStyles = {
  wrap: {
    display: "flex", alignItems: "center", gap: 16,
    background: "#fff", borderBottom: "1px solid #EDE8DF",
    padding: "0 24px", height: 60, position: "sticky", top: 0, zIndex: 100,
    flexShrink: 0,
  },
  logo: { display: "flex", alignItems: "center", gap: 8, marginRight: 8 },
  logoMark: {
    width: 32, height: 32, borderRadius: 8,
    background: "#1865F2", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700,
  },
  logoText: { fontSize: 16, fontWeight: 700, color: "#1A1A1A", whiteSpace: "nowrap" },
  dropdowns: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  arrow: { color: "#C0B8AD", fontSize: 18, lineHeight: 1 },
  startBtn: {
    padding: "0 24px", height: 44, borderRadius: 8,
    border: "none", cursor: "pointer", fontSize: 16, fontWeight: 600,
    transition: "all .15s", whiteSpace: "nowrap",
  },
  startBtnActive: { background: "#1865F2", color: "#fff" },
  startBtnDisabled: { background: "#EDE8DF", color: "#B0A898", cursor: "not-allowed" },
};

// ── Dropdown ──────────────────────────────────────────────────────────────────
function Dropdown({ value, placeholder, options, onChange, disabled, wide }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          appearance: "none", WebkitAppearance: "none",
          background: disabled ? "#F5F3EF" : "#FFF9F0",
          border: "1.5px solid " + (value ? "#1865F2" : "#DDD8CE"),
          borderRadius: 8,
          padding: "0 36px 0 14px",
          height: 44, fontSize: 15, color: value ? "#1A1A1A" : "#9E9589",
          cursor: disabled ? "not-allowed" : "pointer",
          minWidth: wide ? 220 : 100,
          fontFamily: "inherit",
          transition: "border-color .15s",
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span style={{
        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        pointerEvents: "none", color: "#9E9589", fontSize: 12,
      }}>▼</span>
    </div>
  );
}

// ── ActionPanel ───────────────────────────────────────────────────────────────
function ActionPanel({ activeAction, onSelect, selection, subtopic, onSubtopicChange, count, onCountChange, strict, onStrictChange }) {
  const actions = [
    { id: "review",   icon: "📚", title: "请帮我复习",   desc: "生成本单元三色笔记，整理定义、公式与例题" },
    { id: "generate", icon: "📝", title: "请帮我练习",   desc: "按主题生成练习题，可选严格模式" },
    { id: "grade",    icon: "📷", title: "请帮我批改",   desc: "上传作业图片，逐题批改并给出解析" },
    { id: "drill",    icon: "💪", title: "请帮我夯实",   desc: "艾宾浩斯错题复习，今日应复习题目" },
  ];

  const C = window.CURRICULUM;
  const subKey = selection.grade && selection.term && selection.unit
    ? `${selection.grade}.${selection.term}.${selection.unit}` : null;
  const subtopics = subKey ? (C.subtopics[subKey] || []) : [];

  return (
    <div style={apStyles.grid}>
      {actions.map(a => (
        <div
          key={a.id}
          style={{
            ...apStyles.card,
            ...(activeAction === a.id ? apStyles.cardActive : {}),
          }}
          onClick={() => onSelect(a.id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === "Enter" && onSelect(a.id)}
        >
          <div style={apStyles.cardTop}>
            <div style={apStyles.radioWrap}>
              <div style={{
                ...apStyles.radio,
                ...(activeAction === a.id ? apStyles.radioActive : {}),
              }}>
                {activeAction === a.id && <div style={apStyles.radioDot}></div>}
              </div>
            </div>
            <span style={apStyles.icon}>{a.icon}</span>
            <span style={apStyles.title}>{a.title}</span>
          </div>
          <p style={apStyles.desc}>{a.desc}</p>

          {/* Sub-options for generate */}
          {a.id === "generate" && activeAction === "generate" && (
            <div style={apStyles.subOptions} onClick={e => e.stopPropagation()}>
              <div style={apStyles.subRow}>
                <label style={apStyles.subLabel}>题目数量</label>
                <input
                  type="number"
                  min={1} max={30}
                  value={count}
                  onChange={e => onCountChange(Number(e.target.value))}
                  style={apStyles.countInput}
                />
                <span style={apStyles.subLabel}>道</span>
              </div>
              <div style={apStyles.subRow}>
                <label style={apStyles.subLabel}>主题</label>
                <Dropdown
                  value={subtopic}
                  placeholder="全部主题"
                  options={subtopics.map(s => ({ value: s.id, label: s.name }))}
                  onChange={onSubtopicChange}
                  wide
                />
              </div>
              <div style={apStyles.subRow}>
                <label style={{ ...apStyles.subLabel, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={strict}
                    onChange={e => onStrictChange(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  严格模式（仅从题库选题，不推断生成）
                </label>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const apStyles = {
  grid: {
    display: "grid", gridTemplateColumns: "1fr", gap: 10,
  },
  card: {
    background: "#fff", borderRadius: 12,
    border: "2px solid #EDE8DF",
    padding: "16px 18px", cursor: "pointer",
    transition: "all .15s", userSelect: "none",
  },
  cardActive: {
    border: "2px solid #1865F2",
    boxShadow: "0 0 0 3px rgba(24,101,242,0.10)",
    background: "#F5F8FF",
  },
  cardTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  radioWrap: { flexShrink: 0 },
  radio: {
    width: 20, height: 20, borderRadius: "50%",
    border: "2px solid #C0B8AD",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all .15s",
  },
  radioActive: { border: "2px solid #1865F2" },
  radioDot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "#1865F2",
  },
  icon: { fontSize: 20 },
  title: { fontSize: 16, fontWeight: 700, color: "#1A1A1A" },
  desc: { fontSize: 14, color: "#7A7167", margin: 0, lineHeight: 1.5, paddingLeft: 30 },
  subOptions: {
    marginTop: 12, paddingTop: 12,
    borderTop: "1px solid #DDD8CE",
    display: "flex", flexDirection: "column", gap: 10,
  },
  subRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  subLabel: { fontSize: 14, color: "#5A5248", whiteSpace: "nowrap" },
  countInput: {
    width: 64, height: 36, borderRadius: 8,
    border: "1.5px solid #DDD8CE",
    textAlign: "center", fontSize: 16,
    fontFamily: "inherit",
    padding: "0 8px",
  },
};

// ── GradePanel (upload zone) ───────────────────────────────────────────────────
function GradePanel({ onFileSelect, file, warning }) {
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef();

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          ...gpStyles.zone,
          ...(dragging ? gpStyles.zoneDrag : {}),
          ...(file ? gpStyles.zoneHasFile : {}),
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <input
          ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={e => e.target.files[0] && onFileSelect(e.target.files[0])}
        />
        {file ? (
          <div style={gpStyles.preview}>
            <img
              src={URL.createObjectURL(file)}
              style={gpStyles.thumb}
              alt="作业预览"
            />
            <div style={gpStyles.fileInfo}>
              <span style={gpStyles.fileName}>{file.name}</span>
              <span style={gpStyles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        ) : (
          <div style={gpStyles.placeholder}>
            <div style={gpStyles.uploadIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#E8EFFF"/>
                <path d="M16 8v12M10 14l6-6 6 6" stroke="#1865F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 22h16" stroke="#1865F2" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={gpStyles.dropText}>拖拽或点击上传作业图片</p>
            <p style={gpStyles.dropHint}>支持 JPEG / PNG / WEBP · 单张图片</p>
          </div>
        )}
      </div>
      {warning && (
        <div style={gpStyles.warning}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
}

const gpStyles = {
  zone: {
    border: "2px dashed #C0B8AD", borderRadius: 12,
    padding: 32, cursor: "pointer", textAlign: "center",
    transition: "all .15s", background: "#FDFAF6",
    minHeight: 140,
  },
  zoneDrag: { border: "2px dashed #1865F2", background: "#F0F5FF" },
  zoneHasFile: { border: "2px solid #1865F2", background: "#F5F8FF", padding: 16 },
  placeholder: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  uploadIcon: { marginBottom: 4 },
  dropText: { fontSize: 16, fontWeight: 600, color: "#1A1A1A", margin: 0 },
  dropHint: { fontSize: 13, color: "#9E9589", margin: 0 },
  preview: { display: "flex", alignItems: "center", gap: 16, textAlign: "left" },
  thumb: { width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #DDD8CE" },
  fileInfo: { display: "flex", flexDirection: "column", gap: 4 },
  fileName: { fontSize: 14, fontWeight: 600, color: "#1A1A1A" },
  fileSize: { fontSize: 13, color: "#7A7167" },
  warning: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#FFF3CD", border: "1px solid #F5C842",
    borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#7A5C00",
  },
};

// ── AgentPipeline — LangGraph step tracker ────────────────────────────────────
// stepState: "pending" | "running" | "done" | "error"
function AgentPipeline({ steps, currentStep }) {
  return (
    <div style={apipeStyles.wrap}>
      {/* Connecting line behind dots */}
      <div style={apipeStyles.track}>
        <div
          style={{
            ...apipeStyles.trackFill,
            width: currentStep >= steps.length
              ? "100%"
              : `${(currentStep / Math.max(steps.length - 1, 1)) * 100}%`,
          }}
        />
      </div>
      {steps.map((step, i) => {
        const state = i < currentStep ? "done" : i === currentStep ? "running" : "pending";
        return (
          <div key={i} style={apipeStyles.stepCol}>
            {/* Dot */}
            <div style={apipeStyles.dotWrap}>
              {state === "running" && (
                <div style={apipeStyles.ripple} />
              )}
              <div style={{
                ...apipeStyles.dot,
                background: state === "done" ? "#1865F2"
                  : state === "running" ? "#1865F2"
                  : "#DDD8CE",
                boxShadow: state === "running" ? "0 0 0 3px rgba(24,101,242,0.25)" : "none",
              }}>
                {state === "done" && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {state === "running" && (
                  <div style={apipeStyles.dotInnerPulse} />
                )}
              </div>
            </div>
            {/* Label */}
            <div style={{
              ...apipeStyles.stepLabel,
              color: state === "pending" ? "#9E9589" : "#1A1A1A",
              fontWeight: state === "running" ? 700 : 500,
            }}>{step.label}</div>
            {state === "running" && (
              <div style={apipeStyles.stepSub}>{step.sub || "运行中…"}</div>
            )}
            {state === "done" && step.result && (
              <div style={apipeStyles.stepResult}>{step.result}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const apipeStyles = {
  wrap: {
    position: "relative",
    display: "flex", alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "20px 16px 16px",
    background: "#F8F5F0", borderRadius: 12,
    border: "1.5px solid #EDE8DF",
  },
  track: {
    position: "absolute",
    top: 36, left: "calc(16px + 12px)", right: "calc(16px + 12px)",
    height: 2, background: "#DDD8CE", borderRadius: 1, zIndex: 0,
  },
  trackFill: {
    height: "100%", background: "#1865F2",
    borderRadius: 1, transition: "width 0.5s ease",
  },
  stepCol: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 6, flex: 1, position: "relative", zIndex: 1,
    minWidth: 0,
  },
  dotWrap: {
    position: "relative", display: "flex",
    alignItems: "center", justifyContent: "center",
    width: 28, height: 28,
  },
  ripple: {
    position: "absolute", inset: -6,
    borderRadius: "50%", border: "2px solid rgba(24,101,242,0.35)",
    animation: "ripple 1.4s ease-out infinite",
  },
  dot: {
    width: 24, height: 24, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.3s ease", flexShrink: 0,
  },
  dotInnerPulse: {
    width: 8, height: 8, borderRadius: "50%",
    background: "#fff", animation: "pulse 1s infinite",
  },
  stepLabel: {
    fontSize: 12, textAlign: "center", lineHeight: 1.3,
    maxWidth: 80, transition: "color 0.3s",
  },
  stepSub: {
    fontSize: 11, color: "#1865F2", fontWeight: 600,
    animation: "pulse 1.5s infinite",
  },
  stepResult: {
    fontSize: 11, color: "#16A34A", fontWeight: 600,
    textAlign: "center", maxWidth: 80,
  },
};

// ── CoTStream — collapsible chain-of-thought ───────────────────────────────────
function CoTStream({ thoughts, isThinking, expanded, onToggle }) {
  const endRef = React.useRef();

  React.useEffect(() => {
    if (expanded && endRef.current) {
      const el = endRef.current.parentElement;
      el.scrollTop = el.scrollHeight;
    }
  }, [thoughts, expanded]);

  if (!thoughts && !isThinking) return null;

  return (
    <div style={cotStyles.wrap}>
      <button style={cotStyles.toggle} onClick={onToggle}>
        <div style={cotStyles.toggleLeft}>
          {isThinking
            ? <span style={cotStyles.thinkingDots}><ThinkingDots /></span>
            : <span style={{ color: "#16A34A", fontSize: 14 }}>✓</span>
          }
          <span style={cotStyles.toggleLabel}>
            {isThinking ? "思考中…" : "已完成思考"}
          </span>
          {!isThinking && thoughts && (
            <span style={cotStyles.duration}>用时约 3s</span>
          )}
        </div>
        <span style={{ color: "#9E9589", fontSize: 12, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      {expanded && (
        <div style={cotStyles.body}>
          <div style={cotStyles.thoughtText}>
            {thoughts || ""}
            {isThinking && <span style={cotStyles.cursor}>▋</span>}
          </div>
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: "#1865F2",
          display: "inline-block",
          animation: `thinkDot 1.2s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
    </span>
  );
}

const cotStyles = {
  wrap: {
    background: "#fff", borderRadius: 10,
    border: "1.5px solid #EDE8DF", overflow: "hidden",
  },
  toggle: {
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px", background: "none", border: "none",
    cursor: "pointer", fontFamily: "inherit",
    borderBottom: "0px solid #EDE8DF",
  },
  toggleLeft: { display: "flex", alignItems: "center", gap: 8 },
  thinkingDots: { display: "flex", alignItems: "center" },
  toggleLabel: { fontSize: 14, fontWeight: 600, color: "#5A5248" },
  duration: { fontSize: 12, color: "#9E9589", background: "#F5F3EF", borderRadius: 4, padding: "1px 7px" },
  body: {
    maxHeight: 180, overflowY: "auto",
    padding: "12px 16px",
    borderTop: "1px solid #EDE8DF",
    background: "#FAFAF8",
  },
  thoughtText: {
    fontSize: 13, color: "#7A7167", lineHeight: 1.75,
    fontFamily: "ui-monospace, 'Noto Sans Mono', monospace",
    whiteSpace: "pre-wrap",
  },
  cursor: { animation: "pulse 0.8s infinite", color: "#1865F2" },
};

// ── StreamingOutput — full three-layer output ──────────────────────────────────
function StreamingSkeleton() {
  return (
    <div style={soStyles.skeleton}>
      {[80, 60, 90, 55, 75, 40].map((w, i) => (
        <div key={i} style={{ ...soStyles.skeletonLine, width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

function StreamingOutput({ status, content, onReset, pipelineSteps, currentPipelineStep, cotThoughts, cotDone, showCot }) {
  const endRef = React.useRef();
  const [cotExpanded, setCotExpanded] = React.useState(true);

  React.useEffect(() => {
    if (endRef.current) {
      const el = endRef.current.parentElement;
      el.scrollTop = el.scrollHeight;
    }
  }, [content]);

  // Auto-collapse CoT when output starts streaming
  React.useEffect(() => {
    if (content && content.length > 50) setCotExpanded(false);
  }, [content]);

  if (status === "idle") return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Layer 1: LangGraph pipeline steps */}
      {pipelineSteps && (
        <AgentPipeline steps={pipelineSteps} currentStep={currentPipelineStep ?? 0} />
      )}

      {/* Layer 2: CoT thinking stream */}
      {showCot && (
        <CoTStream
          thoughts={cotThoughts}
          isThinking={!cotDone}
          expanded={cotExpanded}
          onToggle={() => setCotExpanded(v => !v)}
        />
      )}

      {/* Layer 3: Final output */}
      <div style={soStyles.wrap}>
        <div style={soStyles.header}>
          <div style={soStyles.headerLeft}>
            {status === "streaming" && content && <div style={soStyles.pulse}></div>}
            {status === "complete" && <span style={{ color: "#16A34A", fontSize: 16 }}>✓</span>}
            {status === "error" && <span style={{ color: "#DC2626", fontSize: 16 }}>✗</span>}
            <span style={soStyles.headerLabel}>
              {status === "streaming" && !content ? "准备中…"
                : status === "streaming" ? "正在生成…"
                : status === "complete" ? "生成完成"
                : "生成失败"}
            </span>
          </div>
          {(status === "complete" || status === "error") && (
            <button style={soStyles.resetBtn} onClick={onReset}>重新开始</button>
          )}
        </div>
        <div style={soStyles.body}>
          {status === "streaming" && !content && <StreamingSkeleton />}
          {content && (
            <div dangerouslySetInnerHTML={{ __html: content }} style={soStyles.content} />
          )}
          {status === "error" && (
            <div style={soStyles.errorBox}>
              <p style={{ margin: 0, fontWeight: 600 }}>生成失败，请重试</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#7A7167" }}>如问题持续，请检查网络连接或重新选择单元</p>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
}

const soStyles = {
  wrap: {
    background: "#fff", borderRadius: 12,
    border: "1.5px solid #EDE8DF", overflow: "hidden",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "11px 18px", background: "#F8F5F0",
    borderBottom: "1px solid #EDE8DF",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerLabel: { fontSize: 14, fontWeight: 600, color: "#1A1A1A" },
  pulse: {
    width: 8, height: 8, borderRadius: "50%", background: "#1865F2",
    animation: "pulse 1.2s infinite", flexShrink: 0,
  },
  body: { padding: "20px 24px", minHeight: 80, maxHeight: 520, overflowY: "auto" },
  content: { fontSize: 16, lineHeight: 1.8, color: "#1A1A1A" },
  skeleton: { display: "flex", flexDirection: "column", gap: 10 },
  skeletonLine: {
    height: 16, borderRadius: 6, background: "#EDE8DF",
    animation: "shimmer 1.4s infinite",
  },
  resetBtn: {
    padding: "5px 14px", borderRadius: 6,
    border: "1.5px solid #DDD8CE", background: "#fff",
    fontSize: 13, cursor: "pointer", color: "#5A5248",
    fontFamily: "inherit",
  },
  errorBox: {
    background: "#FFF5F5", border: "1px solid #FCA5A5",
    borderRadius: 8, padding: "14px 16px", color: "#DC2626",
  },
};

// ── ThreeColorNotes ────────────────────────────────────────────────────────────
// Sub-components for rich note content
function TCNSectionTitle({ color, label, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 4, height: 22, borderRadius: 2, background: color, flexShrink: 0 }}></div>
      <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{label}</span>
      {accent && (
        <span style={{
          fontSize: 12, fontWeight: 700, background: color, color: "#fff",
          borderRadius: 4, padding: "2px 8px", letterSpacing: "0.04em",
        }}>{accent}</span>
      )}
    </div>
  );
}

// Vertical step flow (like waterfall model)
function TCNStepFlow({ steps, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{
            border: `1.5px solid ${color}22`,
            borderRadius: 6, padding: "9px 16px",
            background: "#fff", fontSize: 15,
            textAlign: "center", color: "#1A1A1A", fontWeight: 500,
          }}>
            <span style={{ color: color, fontWeight: 700, marginRight: 6 }}>
              {["①","②","③","④","⑤","⑥","⑦","⑧"][i]}
            </span>
            {s}
          </div>
          {i < steps.length - 1 && (
            <div style={{ textAlign: "center", fontSize: 18, color: color, lineHeight: "22px" }}>↓</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Horizontal process flow (like prototype flow)
function TCNProcessFlow({ steps, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{
            border: `1.5px solid ${color}`,
            borderRadius: 6, padding: "7px 12px",
            background: s.highlight ? color : "#fff",
            color: s.highlight ? "#fff" : "#1A1A1A",
            fontSize: 13, fontWeight: s.highlight ? 700 : 500,
            textAlign: "center", minWidth: 80,
          }}>
            <div style={{ fontWeight: 700 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{s.sub}</div>}
          </div>
          {i < steps.length - 1 && (
            <span style={{ color: "#9E9589", fontSize: 16, fontWeight: 700 }}>→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Quote / callout box
function TCNQuote({ color, bgColor, children }) {
  return (
    <div style={{
      borderLeft: `4px solid ${color}`,
      background: bgColor,
      borderRadius: "0 8px 8px 0",
      padding: "12px 16px",
      fontSize: 15, lineHeight: 1.7, color: "#1A1A1A",
    }}>
      {children}
    </div>
  );
}

// Two-column comparison panel
function TCNTwoCol({ left, right, leftColor, rightColor }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div style={{ background: leftColor + "14", border: `1.5px solid ${leftColor}44`, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: leftColor, marginBottom: 8 }}>{left.title}</div>
        {left.items.map((item, i) => (
          <div key={i} style={{ fontSize: 14, color: "#1A1A1A", lineHeight: 1.65, display: "flex", gap: 6 }}>
            <span style={{ color: leftColor, flexShrink: 0 }}>{"①②③④⑤"[i]}</span>
            <span dangerouslySetInnerHTML={{ __html: item }} />
          </div>
        ))}
      </div>
      <div style={{ background: rightColor + "14", border: `1.5px solid ${rightColor}44`, borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: rightColor, marginBottom: 8 }}>{right.title}</div>
        {right.items.map((item, i) => (
          <div key={i} style={{ fontSize: 14, color: "#1A1A1A", lineHeight: 1.65, display: "flex", gap: 6 }}>
            <span style={{ color: rightColor, flexShrink: 0 }}>{"①②③④⑤"[i]}</span>
            <span dangerouslySetInnerHTML={{ __html: item }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Formula / code block
function TCNFormula({ label, formula, note }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <div style={{ fontSize: 13, fontWeight: 700, color: "#5A5248" }}>{label}</div>}
      <div style={{
        background: "#1A1A2E", color: "#E8F4FD",
        borderRadius: 8, padding: "10px 16px",
        fontFamily: "'Courier New', 'Noto Sans Mono', monospace",
        fontSize: 15, lineHeight: 1.8,
        letterSpacing: "0.03em",
        whiteSpace: "pre-wrap",
      }}>
        {formula}
      </div>
      {note && <div style={{ fontSize: 13, color: "#7A7167", paddingLeft: 4 }}>{note}</div>}
    </div>
  );
}

// Inline highlight span
function Hi({ color, children }) {
  return (
    <span style={{
      background: color + "22", color: color,
      fontWeight: 700, borderRadius: 3,
      padding: "0 4px",
    }}>{children}</span>
  );
}

// Numbered list
function TCNList({ items, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, fontSize: 15, lineHeight: 1.65, color: "#1A1A1A" }}>
          <span style={{ color, fontWeight: 700, flexShrink: 0 }}>{"①②③④⑤⑥⑦⑧"[i]}</span>
          <span dangerouslySetInnerHTML={{ __html: item }} />
        </div>
      ))}
    </div>
  );
}

function ThreeColorNotes({ unit }) {
  const RED   = "#DC2626";
  const BLUE  = "#1865F2";
  const GREEN = "#16A34A";

  return (
    <div style={tcStyles.wrap} className="three-color-notes">
      {/* Header */}
      <div style={tcStyles.header}>
        <h2 style={tcStyles.title}>三色笔记 · {unit || "认识方程"}</h2>
        <span style={tcStyles.badge}>四年级下册 · 第五单元</span>
        <button style={tcStyles.printBtn} onClick={() => window.print()}>🖨 打印</button>
      </div>

      {/* ── 红色区：定义 · 易错 ── */}
      <div style={{ ...tcStyles.section, borderColor: RED + "33" }}>
        <TCNSectionTitle color={RED} label="定义 · 易错点" accent="必背" />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Definitions as quote callouts */}
          <TCNQuote color={RED} bgColor="#FFF5F5">
            <strong>方程：</strong>含有未知数的等式叫做方程。<br />
            <strong>方程的解：</strong>使方程左右两边相等的未知数的值。<br />
            <strong>解方程：</strong>求方程中未知数值的过程。
          </TCNQuote>

          {/* Is / Is not comparison */}
          <TCNTwoCol
            leftColor={GREEN}
            rightColor={RED}
            left={{
              title: "✓ 是方程",
              items: ["2x ＝ 6（含未知数＋等号）", "x ＋ 5 ＝ 12", "3(x－2) ＝ 9"],
            }}
            right={{
              title: "✗ 不是方程",
              items: ["2x（无等号）", "5 ＋ 3 ＝ 8（无未知数）", "x ＋ y（无等号）"],
            }}
          />

          {/* Warning callout */}
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            background: "#FFF5F5", border: `1.5px solid ${RED}44`,
            borderRadius: 8, padding: "11px 14px",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: "#1A1A1A" }}>
              <strong style={{ color: RED }}>高频易错：</strong>含字母不一定是方程！<br />
              必须同时满足：<Hi color={RED}>有未知数</Hi> ＋ <Hi color={RED}>有等号</Hi> ＋ <Hi color={RED}>等号两边相等</Hi>
            </div>
          </div>
        </div>
      </div>

      {/* ── 蓝色区：公式 · 性质 ── */}
      <div style={{ ...tcStyles.section, borderColor: BLUE + "33" }}>
        <TCNSectionTitle color={BLUE} label="公式 · 等式性质" accent="核心" />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Equation properties as formula blocks */}
          <TCNFormula
            label="等式性质 1 ── 加减法"
            formula={"如果 a = b，那么：\n  a + c = b + c\n  a - c = b - c"}
            note="两边同时加减相同的数，等式仍成立"
          />
          <TCNFormula
            label="等式性质 2 ── 乘除法"
            formula={"如果 a = b，c ≠ 0，那么：\n  a × c = b × c\n  a ÷ c = b ÷ c"}
            note="两边同时乘除同一个不为零的数，等式仍成立"
          />

          {/* 去括号 rules side by side */}
          <TCNTwoCol
            leftColor={BLUE}
            rightColor={GREEN}
            left={{
              title: "括号前是 ＋（各项不变）",
              items: [
                "+(x + 3) → x + 3",
                "+(2x - 5) → 2x - 5",
              ],
            }}
            right={{
              title: "括号前是 － （各项变号）",
              items: [
                "-(x + 3) → -x - 3",
                "-(2x - 5) → -2x + 5",
              ],
            }}
          />

          {/* 四则逆运算关系 */}
          <TCNFormula
            label="四则运算逆关系"
            formula={"加数 = 和 - 另一个加数\n减数 = 被减数 - 差\n因数 = 积 ÷ 另一个因数\n除数 = 被除数 ÷ 商"}
          />
        </div>
      </div>

      {/* ── 绿色区：例题 · 口诀 ── */}
      <div style={{ ...tcStyles.section, borderColor: GREEN + "33" }}>
        <TCNSectionTitle color={GREEN} label="例题 · 解题步骤 · 口诀" accent="例题" />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Example 1: step flow */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#5A5248", marginBottom: 8 }}>
              例1 · 基本方程：解方程 x ＋ 23 ＝ 47
            </div>
            <TCNProcessFlow
              color={GREEN}
              steps={[
                { label: "原方程", sub: "x + 23 = 47" },
                { label: "移项", sub: "x = 47 - 23", highlight: true },
                { label: "计算结果", sub: "x = 24" },
                { label: "验证 ✓", sub: "24+23=47" },
              ]}
            />
          </div>

          {/* Example 2: step flow for brackets */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#5A5248", marginBottom: 8 }}>
              例2 · 去括号：解方程 3(x ＋ 4) ＝ 21
            </div>
            <TCNProcessFlow
              color={BLUE}
              steps={[
                { label: "去括号", sub: "3x + 12 = 21" },
                { label: "移项", sub: "3x = 21-12", highlight: true },
                { label: "化简", sub: "3x = 9" },
                { label: "求解 ✓", sub: "x = 3" },
              ]}
            />
          </div>

          {/* Example 3: word problem */}
          <TCNQuote color={GREEN} bgColor="#F0FDF4">
            <strong>例3 · 应用题：</strong>小明有 x 本书，借给同学 8 本后还剩 14 本。<br />
            <Hi color={GREEN}>等量关系</Hi>：原有本数 － 借出本数 ＝ 剩余本数<br />
            <Hi color={BLUE}>列方程</Hi>：x － 8 ＝ 14 &nbsp;→&nbsp; x ＝ 14 ＋ 8 ＝ <Hi color={GREEN}>22</Hi>
          </TCNQuote>

          {/* 口诀 */}
          <div style={{
            background: "#FFFBEB", border: "1.5px solid #FDE68A",
            borderRadius: 8, padding: "12px 16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>📣 记忆口诀</div>
            <div style={{ fontSize: 15, color: "#1A1A1A", lineHeight: 2, fontWeight: 500 }}>
              天平两边保平衡，同加同减要记清；<br />
              同乘同除不为零，等式性质是关键。<br />
              <span style={{ fontSize: 14, color: "#7A7167" }}>去括号时看符号，加号不变减号变。</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const tcStyles = {
  wrap: { display: "flex", flexDirection: "column", gap: 20 },
  header: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  title: { fontSize: 20, fontWeight: 700, color: "#1A1A1A", margin: 0 },
  badge: {
    fontSize: 13, color: "#7A7167",
    background: "#F5F3EF", borderRadius: 6, padding: "3px 10px",
  },
  printBtn: {
    marginLeft: "auto", padding: "6px 16px", borderRadius: 8,
    border: "1.5px solid #DDD8CE", background: "#fff",
    fontSize: 14, cursor: "pointer", fontFamily: "inherit",
    color: "#1A1A1A",
  },
  section: {
    background: "#fff", borderRadius: 12, border: "1.5px solid",
    padding: "18px 20px", breakInside: "avoid",
  },
};

// ── ProblemSet ─────────────────────────────────────────────────────────────────
function ProblemSet({ problems }) {
  const [expanded, setExpanded] = React.useState({});
  const toggle = id => setExpanded(s => ({ ...s, [id]: !s[id] }));

  const diffColors = { easy: "#16A34A", medium: "#D97706", hard: "#DC2626" };
  const diffLabels = { easy: "基础", medium: "中等", hard: "难" };

  return (
    <div style={psStyles.wrap}>
      <div style={psStyles.header}>
        <h3 style={psStyles.title}>练习题 <span style={psStyles.count}>共 {problems.length} 道</span></h3>
        <button
          style={psStyles.toggleAll}
          onClick={() => {
            const allOpen = problems.every(p => expanded[p.id]);
            const next = {};
            problems.forEach(p => { next[p.id] = !allOpen; });
            setExpanded(next);
          }}
        >
          {problems.every(p => expanded[p.id]) ? "收起全部答案" : "展开全部答案"}
        </button>
      </div>
      <div style={psStyles.list}>
        {problems.map((p, idx) => (
          <div key={p.id} style={psStyles.item}>
            <div style={psStyles.itemTop}>
              <span style={psStyles.num}>{idx + 1}</span>
              <span style={psStyles.question}>{p.question}</span>
              <span style={{ ...psStyles.diff, color: diffColors[p.difficulty], background: diffColors[p.difficulty] + "18" }}>
                {diffLabels[p.difficulty]}
              </span>
              <button style={psStyles.answerBtn} onClick={() => toggle(p.id)}>
                {expanded[p.id] ? "收起答案 ▲" : "查看答案 ▼"}
              </button>
            </div>
            {expanded[p.id] && (
              <div style={psStyles.answer}>
                <div style={psStyles.answerLabel}>解答过程</div>
                <div style={psStyles.answerContent}>{p.solution}</div>
                <div style={psStyles.answerResult}>答：x ＝ {p.answer}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const psStyles = {
  wrap: {},
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, color: "#1A1A1A", margin: 0 },
  count: { fontSize: 14, color: "#7A7167", fontWeight: 400, marginLeft: 8 },
  toggleAll: {
    padding: "6px 14px", borderRadius: 8,
    border: "1.5px solid #DDD8CE", background: "#fff",
    fontSize: 14, cursor: "pointer", color: "#5A5248", fontFamily: "inherit",
  },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  item: {
    background: "#fff", borderRadius: 10,
    border: "1.5px solid #EDE8DF", overflow: "hidden",
  },
  itemTop: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 18px", flexWrap: "wrap",
  },
  num: {
    width: 28, height: 28, borderRadius: "50%",
    background: "#1865F2", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  question: { flex: 1, fontSize: 16, color: "#1A1A1A", lineHeight: 1.5 },
  diff: { fontSize: 12, fontWeight: 600, borderRadius: 6, padding: "2px 8px" },
  answerBtn: {
    padding: "6px 14px", height: 36,
    border: "1.5px solid #DDD8CE", borderRadius: 8,
    background: "#fff", fontSize: 14, cursor: "pointer",
    color: "#1865F2", fontWeight: 600, fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  answer: {
    padding: "14px 18px 16px",
    borderTop: "1px solid #EDE8DF", background: "#F8F5F0",
  },
  answerLabel: { fontSize: 13, color: "#7A7167", fontWeight: 600, marginBottom: 8 },
  answerContent: { fontSize: 15, color: "#1A1A1A", lineHeight: 1.8, marginBottom: 8 },
  answerResult: { fontSize: 16, fontWeight: 700, color: "#1865F2" },
};

// ── GradingReport ──────────────────────────────────────────────────────────────
function GradingReport({ results }) {
  return (
    <div style={grStyles.wrap}>
      <div style={grStyles.header}>
        <h3 style={grStyles.title}>批改报告</h3>
        <div style={grStyles.stats}>
          <span style={{ ...grStyles.stat, color: "#16A34A" }}>
            ✓ 正确 {results.filter(r => r.correct).length}
          </span>
          <span style={{ ...grStyles.stat, color: "#DC2626" }}>
            ✗ 错误 {results.filter(r => !r.correct).length}
          </span>
        </div>
      </div>
      <div style={grStyles.list}>
        {results.map((r, idx) => (
          <div key={r.id} style={{ ...grStyles.card, borderColor: r.correct ? "#86EFAC" : "#FCA5A5" }}>
            <div style={grStyles.cardHeader}>
              <span style={{ ...grStyles.badge, background: r.correct ? "#F0FDF4" : "#FFF5F5", color: r.correct ? "#16A34A" : "#DC2626" }}>
                {r.correct ? "✓ 正确" : "✗ 错误"}
              </span>
              <span style={grStyles.questionNum}>第 {idx + 1} 题</span>
              <span style={{ ...grStyles.sourceTag, color: r.source === "kb_match" ? "#1865F2" : "#D97706" }}>
                {r.source === "kb_match" ? "📚 题库匹配" : "🤖 AI 推断"}
              </span>
            </div>
            <p style={grStyles.questionText}>{r.question}</p>
            <div style={grStyles.studentAnswer}>
              <span style={grStyles.label}>学生答案：</span>
              <span style={{ color: r.correct ? "#16A34A" : "#DC2626", fontWeight: 600 }}>{r.studentAnswer}</span>
            </div>
            {!r.correct && (
              <>
                <div style={grStyles.correction}>
                  <span style={grStyles.label}>正确答案：</span>
                  <span style={{ color: "#16A34A", fontWeight: 700 }}>{r.correctAnswer}</span>
                </div>
                <div style={grStyles.explanation}>
                  <span style={grStyles.label}>解析：</span>
                  <span>{r.explanation}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const grStyles = {
  wrap: {},
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, color: "#1A1A1A", margin: 0 },
  stats: { display: "flex", gap: 16 },
  stat: { fontSize: 15, fontWeight: 600 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "#fff", borderRadius: 10,
    border: "1.5px solid",
    padding: "16px 18px",
    display: "flex", flexDirection: "column", gap: 8,
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  badge: {
    fontSize: 13, fontWeight: 700, borderRadius: 6,
    padding: "3px 10px",
  },
  questionNum: { fontSize: 13, color: "#7A7167" },
  sourceTag: { marginLeft: "auto", fontSize: 12, fontWeight: 600 },
  questionText: { fontSize: 15, color: "#1A1A1A", margin: 0, lineHeight: 1.6 },
  studentAnswer: { fontSize: 14, display: "flex", gap: 6, alignItems: "center" },
  correction: { fontSize: 14, display: "flex", gap: 6, alignItems: "center" },
  explanation: {
    fontSize: 14, color: "#5A5248", lineHeight: 1.6,
    background: "#F8F5F0", borderRadius: 8, padding: "10px 14px",
  },
  label: { color: "#7A7167", whiteSpace: "nowrap" },
};

// ── MistakeDrill ───────────────────────────────────────────────────────────────
function MistakeDrill({ problem, onSubmit, onNext, phase, userAnswer, onAnswerChange, feedback }) {
  return (
    <div style={mdStyles.wrap}>
      <div style={mdStyles.meta}>
        <span style={mdStyles.docId}>{problem.docId}</span>
        <span style={mdStyles.subtopic}>{problem.subtopic}</span>
        <div style={mdStyles.ebBadge}>
          <span>⏱</span>
          <span>今日第 {problem.reviewCount + 1} 次复习</span>
          <span style={mdStyles.interval}>间隔 {problem.interval} 天</span>
        </div>
      </div>

      <div style={mdStyles.questionBox}>
        <p style={mdStyles.question}>{problem.question}</p>
      </div>

      {phase === "answer" && (
        <div style={mdStyles.inputSection}>
          <label style={mdStyles.inputLabel}>你的答案</label>
          <input
            type="text"
            value={userAnswer}
            onChange={e => onAnswerChange(e.target.value)}
            placeholder="在这里写出你的解题过程和答案…"
            style={mdStyles.input}
          />
          <button style={mdStyles.submitBtn} onClick={onSubmit} disabled={!userAnswer.trim()}>
            提交答案
          </button>
        </div>
      )}

      {phase === "feedback" && feedback && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...mdStyles.feedbackBox, borderColor: feedback.correct ? "#86EFAC" : "#FCA5A5", background: feedback.correct ? "#F0FDF4" : "#FFF5F5" }}>
            <div style={mdStyles.feedbackHeader}>
              <span style={{ fontSize: 20 }}>{feedback.correct ? "🎉" : "💡"}</span>
              <span style={{ ...mdStyles.feedbackTitle, color: feedback.correct ? "#16A34A" : "#DC2626" }}>
                {feedback.correct ? "回答正确！" : "需要再练习"}
              </span>
            </div>
            {!feedback.correct && (
              <div style={mdStyles.feedbackContent}>
                <div style={mdStyles.feedbackRow}>
                  <span style={mdStyles.fbLabel}>正确答案：</span>
                  <span style={{ fontWeight: 700, color: "#16A34A" }}>{feedback.correctAnswer}</span>
                </div>
                <div style={mdStyles.feedbackRow}>
                  <span style={mdStyles.fbLabel}>错误原因：</span>
                  <span style={{ color: "#5A5248" }}>{feedback.reason}</span>
                </div>
              </div>
            )}
          </div>
          <div style={mdStyles.nextSection}>
            <div style={mdStyles.ebInfo}>
              <span style={mdStyles.ebLabel}>下次复习</span>
              <span style={mdStyles.ebDate}>{feedback.nextReview}</span>
            </div>
            <button style={mdStyles.nextBtn} onClick={onNext}>
              下一题 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const mdStyles = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  meta: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  docId: { fontSize: 12, color: "#9E9589", fontFamily: "monospace", background: "#F5F3EF", padding: "3px 8px", borderRadius: 4 },
  subtopic: { fontSize: 13, color: "#1865F2", fontWeight: 600, background: "#EEF3FF", padding: "3px 10px", borderRadius: 6 },
  ebBadge: { display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", fontSize: 13, color: "#7A7167" },
  interval: { background: "#FFF3E0", color: "#D97706", borderRadius: 6, padding: "2px 8px", fontWeight: 600 },
  questionBox: {
    background: "#fff", borderRadius: 10,
    border: "1.5px solid #EDE8DF",
    padding: "20px 22px",
  },
  question: { fontSize: 18, color: "#1A1A1A", margin: 0, lineHeight: 1.7, fontWeight: 500 },
  inputSection: { display: "flex", flexDirection: "column", gap: 10 },
  inputLabel: { fontSize: 14, fontWeight: 600, color: "#5A5248" },
  input: {
    width: "100%", height: 100, borderRadius: 10,
    border: "1.5px solid #DDD8CE",
    padding: "12px 14px", fontSize: 16, fontFamily: "inherit",
    resize: "vertical", boxSizing: "border-box",
  },
  submitBtn: {
    alignSelf: "flex-end",
    padding: "10px 28px", height: 46,
    background: "#1865F2", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 16, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
  feedbackBox: {
    borderRadius: 10, border: "1.5px solid",
    padding: "16px 20px",
  },
  feedbackHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  feedbackTitle: { fontSize: 17, fontWeight: 700 },
  feedbackContent: { display: "flex", flexDirection: "column", gap: 8 },
  feedbackRow: { display: "flex", gap: 8, fontSize: 15 },
  fbLabel: { color: "#7A7167", whiteSpace: "nowrap" },
  nextSection: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#F8F5F0", borderRadius: 10, padding: "14px 18px",
  },
  ebInfo: { display: "flex", flexDirection: "column", gap: 2 },
  ebLabel: { fontSize: 12, color: "#9E9589" },
  ebDate: { fontSize: 15, fontWeight: 700, color: "#1A1A1A" },
  nextBtn: {
    padding: "10px 24px", height: 44,
    background: "#1865F2", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 15, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
};

// ── SessionSummary ─────────────────────────────────────────────────────────────
function SessionSummary({ stats, onRestart }) {
  const intervals = [1, 2, 4, 7, 15, 30];
  return (
    <div style={ssStyles.wrap}>
      <div style={ssStyles.header}>
        <span style={ssStyles.headerIcon}>🎯</span>
        <h3 style={ssStyles.title}>今日练习完成！</h3>
      </div>
      <div style={ssStyles.statsGrid}>
        {[
          { label: "复习", value: stats.reviewed, unit: "题", color: "#1865F2" },
          { label: "掌握", value: stats.mastered, unit: "题", color: "#16A34A" },
          { label: "明日", value: stats.tomorrow, unit: "题", color: "#D97706" },
        ].map(s => (
          <div key={s.label} style={ssStyles.statCard}>
            <span style={{ ...ssStyles.statValue, color: s.color }}>{s.value}</span>
            <span style={ssStyles.statUnit}>{s.unit}</span>
            <span style={ssStyles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={ssStyles.ebSection}>
        <div style={ssStyles.ebTitle}>艾宾浩斯复习间隔</div>
        <div style={ssStyles.ebLine}>
          {intervals.map((d, i) => (
            <React.Fragment key={i}>
              <div style={{ ...ssStyles.ebDay, ...(i < stats.masteredLevel ? ssStyles.ebDayDone : {}) }}>
                {d}天
              </div>
              {i < intervals.length - 1 && <div style={ssStyles.ebArrow}>→</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
      {stats.nextItems && stats.nextItems.length > 0 && (
        <div style={ssStyles.nextSection}>
          <div style={ssStyles.nextTitle}>明日复习题目预览</div>
          {stats.nextItems.map((item, i) => (
            <div key={i} style={ssStyles.nextItem}>
              <span style={ssStyles.nextDot}></span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
      <button style={ssStyles.restartBtn} onClick={onRestart}>再来一轮</button>
    </div>
  );
}

const ssStyles = {
  wrap: {
    background: "#fff", borderRadius: 12,
    border: "1.5px solid #EDE8DF",
    padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20,
  },
  header: { display: "flex", alignItems: "center", gap: 12 },
  headerIcon: { fontSize: 28 },
  title: { fontSize: 20, fontWeight: 700, color: "#1A1A1A", margin: 0 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  statCard: {
    borderRadius: 10, border: "1.5px solid #EDE8DF",
    padding: "16px", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
  },
  statValue: { fontSize: 36, fontWeight: 800, lineHeight: 1 },
  statUnit: { fontSize: 14, color: "#7A7167" },
  statLabel: { fontSize: 14, fontWeight: 600, color: "#1A1A1A" },
  ebSection: {
    background: "#F8F5F0", borderRadius: 10, padding: "14px 18px",
  },
  ebTitle: { fontSize: 13, color: "#7A7167", marginBottom: 10, fontWeight: 600 },
  ebLine: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
  ebDay: {
    padding: "4px 10px", borderRadius: 6, fontSize: 13,
    background: "#EDE8DF", color: "#9E9589", fontWeight: 600,
  },
  ebDayDone: { background: "#1865F2", color: "#fff" },
  ebArrow: { color: "#C0B8AD", fontSize: 12 },
  nextSection: { display: "flex", flexDirection: "column", gap: 6 },
  nextTitle: { fontSize: 14, fontWeight: 600, color: "#5A5248", marginBottom: 4 },
  nextItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#1A1A1A" },
  nextDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#D97706", flexShrink: 0,
  },
  restartBtn: {
    padding: "12px 28px", height: 48,
    background: "#1865F2", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 16, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    alignSelf: "center", width: "100%",
  },
};

// ── FreeQueryInput ─────────────────────────────────────────────────────────────
function FreeQueryInput({ expanded, onToggle }) {
  const [query, setQuery] = React.useState("");
  return (
    <div style={fqStyles.wrap}>
      <button style={fqStyles.toggle} onClick={onToggle}>
        <span style={fqStyles.toggleIcon}>{expanded ? "▲" : "▼"}</span>
        <span style={fqStyles.toggleLabel}>高级模式（家长 / 教师专用）</span>
        <span style={fqStyles.toggleHint}>可直接输入问题</span>
      </button>
      {expanded && (
        <div style={fqStyles.panel}>
          <p style={fqStyles.warning}>⚠️ 本模式绕过结构化导航，直接发送文本请求。仅适合了解 AI 局限的家长或教师使用。</p>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="例：帮我出5道关于去括号解方程的应用题，难度较高"
            style={fqStyles.textarea}
          />
          <button
            style={{ ...fqStyles.sendBtn, ...(query.trim() ? {} : fqStyles.sendBtnDisabled) }}
            disabled={!query.trim()}
          >
            发送
          </button>
        </div>
      )}
    </div>
  );
}

const fqStyles = {
  wrap: {
    background: "#fff", borderRadius: 10,
    border: "1.5px dashed #C0B8AD",
    overflow: "hidden",
  },
  toggle: {
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px", background: "none", border: "none",
    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
  },
  toggleIcon: { fontSize: 12, color: "#9E9589" },
  toggleLabel: { fontSize: 14, fontWeight: 600, color: "#7A7167" },
  toggleHint: { marginLeft: "auto", fontSize: 12, color: "#C0B8AD" },
  panel: {
    padding: "0 16px 16px",
    display: "flex", flexDirection: "column", gap: 10,
  },
  warning: {
    fontSize: 13, color: "#7A5C00",
    background: "#FFF3CD", borderRadius: 8, padding: "10px 14px",
    margin: 0,
  },
  textarea: {
    width: "100%", minHeight: 80,
    borderRadius: 8, border: "1.5px solid #DDD8CE",
    padding: "10px 12px", fontSize: 15,
    fontFamily: "inherit", resize: "vertical",
    boxSizing: "border-box",
  },
  sendBtn: {
    alignSelf: "flex-end",
    padding: "8px 24px", height: 40,
    background: "#7A7167", color: "#fff",
    border: "none", borderRadius: 8,
    fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
  sendBtnDisabled: { background: "#C0B8AD", cursor: "not-allowed" },
};

// ── Export all to window ───────────────────────────────────────────────────────
Object.assign(window, {
  UserAvatar,
  CurriculumNav,
  Dropdown,
  ActionPanel,
  GradePanel,
  StreamingSkeleton,
  StreamingOutput,
  AgentPipeline,
  CoTStream,
  ThinkingDots,
  ThreeColorNotes,
  TCNSectionTitle,
  TCNStepFlow,
  TCNProcessFlow,
  TCNQuote,
  TCNTwoCol,
  TCNFormula,
  TCNList,
  Hi,
  ProblemSet,
  GradingReport,
  MistakeDrill,
  SessionSummary,
  FreeQueryInput,
});
