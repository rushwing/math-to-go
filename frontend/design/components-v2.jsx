// ─────────────────────────────────────────────────────────────────────────────
// math-to-go v2 — new workflow components
// State machine: idle → generating → preview → answering → grading → results
// ─────────────────────────────────────────────────────────────────────────────

// ── ProblemSetPreview ─────────────────────────────────────────────────────────
// Tab-card grid shown after generation. Shows problem + difficulty.
// After grading, shows correct/incorrect overlay per card.
function ProblemSetPreview({ problems, gradingResults, onStartAnswering, mode }) {
  const [expandedId, setExpandedId] = React.useState(null);
  const diffColor  = { easy: "#16A34A", medium: "#D97706", hard: "#DC2626" };
  const diffLabel  = { easy: "基础", medium: "中等", hard: "难" };
  const diffBg     = { easy: "#F0FDF4", medium: "#FFFBEB", hard: "#FFF5F5" };
  const modeLabel  = { generate: "练习题", drill: "错题练习" };
  const modeIcon   = { generate: "📝", drill: "💪" };

  // grading results keyed by problem id
  const resultMap = React.useMemo(() => {
    if (!gradingResults) return {};
    return Object.fromEntries(gradingResults.map(r => [r.id, r]));
  }, [gradingResults]);

  const isGraded = gradingResults && gradingResults.length > 0;

  return (
    <div style={pspStyles.wrap}>
      {/* Header */}
      <div style={pspStyles.header}>
        <div style={pspStyles.headerLeft}>
          <span style={pspStyles.modeIcon}>{modeIcon[mode] || "📝"}</span>
          <div>
            <div style={pspStyles.title}>{modeLabel[mode] || "题目预览"}</div>
            <div style={pspStyles.subtitle}>共 {problems.length} 道题目{isGraded ? " · 批改完成" : " · 点击可预览题目"}</div>
          </div>
        </div>
        {!isGraded && (
          <button style={pspStyles.startBtn} onClick={onStartAnswering}>
            开始作答 →
          </button>
        )}
        {isGraded && (
          <div style={pspStyles.scoreBox}>
            <span style={pspStyles.scoreNum}>
              {gradingResults.filter(r => r.correct).length}
            </span>
            <span style={pspStyles.scoreDen}>/ {problems.length}</span>
            <span style={pspStyles.scoreLabel}>正确</span>
          </div>
        )}
      </div>

      {/* Stats bar when graded */}
      {isGraded && (
        <div style={pspStyles.statsBar}>
          <div style={{ ...pspStyles.statChip, background: "#F0FDF4", color: "#16A34A" }}>
            ✓ 正确 {gradingResults.filter(r => r.correct).length} 题
          </div>
          <div style={{ ...pspStyles.statChip, background: "#FFF5F5", color: "#DC2626" }}>
            ✗ 错误 {gradingResults.filter(r => !r.correct).length} 题
          </div>
          <div style={{ ...pspStyles.statChip, background: "#F5F3EF", color: "#7A7167" }}>
            正确率 {Math.round(gradingResults.filter(r => r.correct).length / problems.length * 100)}%
          </div>
        </div>
      )}

      {/* Problem cards grid */}
      <div style={pspStyles.grid}>
        {problems.map((p, idx) => {
          const result = resultMap[p.id];
          const isCorrect = result?.correct;
          const isExpanded = expandedId === p.id;

          let borderColor = "#EDE8DF";
          let bgColor = "#fff";
          if (result) {
            borderColor = isCorrect ? "#86EFAC" : "#FCA5A5";
            bgColor = isCorrect ? "#F0FDF4" : "#FFF5F5";
          }

          return (
            <div key={p.id} style={{ ...pspStyles.card, borderColor, background: bgColor }}>
              {/* Card top row */}
              <div style={pspStyles.cardTop}>
                <div style={pspStyles.cardNum}>
                  {result ? (
                    <span style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: isCorrect ? "#16A34A" : "#DC2626",
                      color: "#fff", display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 14, fontWeight: 700,
                    }}>
                      {isCorrect ? "✓" : "✗"}
                    </span>
                  ) : (
                    <span style={pspStyles.numBadge}>{idx + 1}</span>
                  )}
                </div>
                <span style={{
                  ...pspStyles.diffBadge,
                  color: diffColor[p.difficulty],
                  background: diffBg[p.difficulty],
                }}>
                  {diffLabel[p.difficulty]}
                </span>
                {p.subtopic && (
                  <span style={pspStyles.subtopicBadge}>{p.subtopic}</span>
                )}
                <button
                  style={pspStyles.expandBtn}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  {isExpanded ? "收起 ▲" : "预览 ▼"}
                </button>
              </div>

              {/* Question preview (always show truncated) */}
              <div style={{
                ...pspStyles.questionPreview,
                WebkitLineClamp: isExpanded ? "unset" : 2,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                overflow: isExpanded ? "visible" : "hidden",
              }}>
                {p.question}
              </div>

              {/* Expanded: answer + explanation */}
              {isExpanded && result && (
                <div style={pspStyles.expandedSection}>
                  <div style={pspStyles.expandDivider} />
                  {/* Student answer */}
                  <div style={pspStyles.expandRow}>
                    <span style={pspStyles.expandLabel}>你的答案：</span>
                    <span style={{ color: isCorrect ? "#16A34A" : "#DC2626", fontWeight: 600 }}>
                      {result.studentAnswer || "（未作答）"}
                    </span>
                  </div>
                  {!isCorrect && (
                    <>
                      <div style={pspStyles.expandRow}>
                        <span style={pspStyles.expandLabel}>正确答案：</span>
                        <span style={{ color: "#16A34A", fontWeight: 700 }}>{p.answer}</span>
                      </div>
                      <div style={pspStyles.solutionBox}>
                        <div style={pspStyles.solutionLabel}>解题过程</div>
                        <div style={pspStyles.solutionText}>{p.solution}</div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Expand when not yet graded */}
              {isExpanded && !result && (
                <div style={pspStyles.expandedSection}>
                  <div style={pspStyles.expandDivider} />
                  <div style={{ fontSize: 14, color: "#7A7167", fontStyle: "italic" }}>
                    作答后可查看解析
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA when graded */}
      {isGraded && (
        <div style={pspStyles.bottomBar}>
          <button style={pspStyles.retryBtn} onClick={onStartAnswering}>
            再做一遍
          </button>
        </div>
      )}
    </div>
  );
}

const pspStyles = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#fff", borderRadius: 12, border: "1.5px solid #EDE8DF",
    padding: "16px 20px", gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  modeIcon: { fontSize: 28 },
  title: { fontSize: 17, fontWeight: 700, color: "#1A1A1A" },
  subtitle: { fontSize: 13, color: "#7A7167", marginTop: 2 },
  startBtn: {
    padding: "10px 24px", height: 44, minWidth: 120,
    background: "#1865F2", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  scoreBox: {
    display: "flex", alignItems: "baseline", gap: 4,
    background: "#F0FDF4", borderRadius: 10, padding: "8px 16px",
  },
  scoreNum: { fontSize: 28, fontWeight: 800, color: "#16A34A", lineHeight: 1 },
  scoreDen: { fontSize: 18, color: "#7A7167" },
  scoreLabel: { fontSize: 13, color: "#7A7167", marginLeft: 4 },
  statsBar: { display: "flex", gap: 8, flexWrap: "wrap" },
  statChip: { fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "5px 12px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 10,
  },
  card: {
    borderRadius: 10, border: "1.5px solid",
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
    transition: "all .15s",
  },
  cardTop: { display: "flex", alignItems: "center", gap: 8 },
  cardNum: { flexShrink: 0 },
  numBadge: {
    width: 28, height: 28, borderRadius: "50%",
    background: "#1865F2", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700,
  },
  diffBadge: {
    fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "2px 8px",
  },
  subtopicBadge: {
    fontSize: 11, color: "#1865F2", background: "#EEF3FF",
    borderRadius: 6, padding: "2px 8px",
  },
  expandBtn: {
    marginLeft: "auto", padding: "4px 10px", height: 28,
    border: "1.5px solid #DDD8CE", borderRadius: 6,
    background: "#fff", fontSize: 12, cursor: "pointer",
    color: "#1865F2", fontWeight: 600, fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  questionPreview: {
    fontSize: 15, color: "#1A1A1A", lineHeight: 1.6,
    textOverflow: "ellipsis",
  },
  expandedSection: { display: "flex", flexDirection: "column", gap: 8 },
  expandDivider: { height: 1, background: "#EDE8DF" },
  expandRow: { display: "flex", gap: 8, fontSize: 14, alignItems: "center" },
  expandLabel: { color: "#7A7167", whiteSpace: "nowrap" },
  solutionBox: {
    background: "#F8F5F0", borderRadius: 8, padding: "10px 14px",
  },
  solutionLabel: { fontSize: 12, fontWeight: 700, color: "#7A7167", marginBottom: 4 },
  solutionText: { fontSize: 14, color: "#1A1A1A", lineHeight: 1.75, whiteSpace: "pre-line" },
  bottomBar: {
    display: "flex", justifyContent: "center",
    paddingTop: 4,
  },
  retryBtn: {
    padding: "10px 32px", height: 44,
    border: "1.5px solid #1865F2", borderRadius: 10,
    background: "#fff", color: "#1865F2",
    fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
};

// ── AnswerSession ─────────────────────────────────────────────────────────────
// Full-screen answering UI: left nav + right Q&A
function AnswerSession({ problems, answers, onAnswerChange, onSubmit, onBack }) {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const textareaRef = React.useRef();

  const current = problems[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast  = currentIdx === problems.length - 1;
  const allAnswered = problems.every((_, i) => (answers[i] || "").trim().length > 0);

  function goTo(idx) {
    setCurrentIdx(idx);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // Persist on every answer change
  React.useEffect(() => {
    try { localStorage.setItem("mtt_answers", JSON.stringify(answers)); } catch(e) {}
  }, [answers]);

  return (
    <div style={asStyles.shell}>
      {/* ── Left nav panel ── */}
      <div style={asStyles.leftNav}>
        <div style={asStyles.navHeader}>
          <button style={asStyles.backBtn} onClick={onBack}>← 返回预览</button>
          <div style={asStyles.navTitle}>答题进度</div>
          <div style={asStyles.navProgress}>
            {problems.filter((_, i) => (answers[i] || "").trim()).length} / {problems.length} 已答
          </div>
        </div>
        <div style={asStyles.navGrid}>
          {problems.map((p, i) => {
            const answered = (answers[i] || "").trim().length > 0;
            const isCurrent = i === currentIdx;
            return (
              <button
                key={i}
                style={{
                  ...asStyles.navPip,
                  ...(isCurrent ? asStyles.navPipCurrent : {}),
                  ...(answered && !isCurrent ? asStyles.navPipAnswered : {}),
                  ...(!answered && !isCurrent ? asStyles.navPipEmpty : {}),
                }}
                onClick={() => goTo(i)}
                title={`第 ${i + 1} 题`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        {/* Legend */}
        <div style={asStyles.legend}>
          {[
            { style: asStyles.navPipCurrent,  label: "当前" },
            { style: asStyles.navPipAnswered, label: "已答" },
            { style: asStyles.navPipEmpty,    label: "未答" },
          ].map(({ style, label }) => (
            <div key={label} style={asStyles.legendRow}>
              <div style={{ ...asStyles.navPip, ...style, width: 20, height: 20, fontSize: 10, pointerEvents: "none" }} />
              <span style={asStyles.legendLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right answer area ── */}
      <div style={asStyles.rightArea}>
        {/* Question header */}
        <div style={asStyles.qHeader}>
          <span style={asStyles.qNum}>第 {currentIdx + 1} 题</span>
          <span style={{
            fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "2px 8px",
            color: ({ easy: "#16A34A", medium: "#D97706", hard: "#DC2626" })[current.difficulty],
            background: ({ easy: "#F0FDF4", medium: "#FFFBEB", hard: "#FFF5F5" })[current.difficulty],
          }}>
            {{ easy: "基础", medium: "中等", hard: "难" }[current.difficulty]}
          </span>
          {current.subtopic && (
            <span style={{ fontSize: 12, color: "#1865F2", background: "#EEF3FF", borderRadius: 6, padding: "2px 8px" }}>
              {current.subtopic}
            </span>
          )}
        </div>

        {/* Question box */}
        <div style={asStyles.qBox}>
          <div style={asStyles.qText}>{current.question}</div>
        </div>

        {/* Answer input */}
        <div style={asStyles.answerSection}>
          <label style={asStyles.answerLabel}>解题过程与答案</label>
          <textarea
            ref={textareaRef}
            value={answers[currentIdx] || ""}
            onChange={e => onAnswerChange(currentIdx, e.target.value)}
            placeholder={"一行一个解题步骤，例如：\n第一步：……\n第二步：……\n答：x = ……"}
            style={asStyles.textarea}
            rows={7}
          />
        </div>

        {/* Navigation buttons */}
        <div style={asStyles.navBtns}>
          {!isFirst && (
            <button style={asStyles.prevBtn} onClick={() => goTo(currentIdx - 1)}>
              ← 上一题
            </button>
          )}
          <div style={{ flex: 1 }} />
          {!isLast ? (
            <button
              style={asStyles.nextBtn}
              onClick={() => goTo(currentIdx + 1)}
            >
              下一题 →
            </button>
          ) : (
            <button
              style={{
                ...asStyles.submitBtn,
                ...(allAnswered ? {} : asStyles.submitBtnWarn),
              }}
              onClick={onSubmit}
            >
              {allAnswered ? "交卷 ✓" : `交卷（还有 ${problems.filter((_, i) => !(answers[i] || "").trim()).length} 题未答）`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const asStyles = {
  shell: {
    display: "flex", gap: 0,
    background: "#fff", borderRadius: 12,
    border: "1.5px solid #EDE8DF",
    overflow: "hidden",
    minHeight: 540,
  },
  leftNav: {
    width: 160, flexShrink: 0,
    background: "#F8F5F0", borderRight: "1px solid #EDE8DF",
    display: "flex", flexDirection: "column", gap: 0,
    padding: "16px 12px",
  },
  navHeader: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  backBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 13, color: "#1865F2", fontFamily: "inherit",
    textAlign: "left", padding: 0, fontWeight: 600,
  },
  navTitle: { fontSize: 14, fontWeight: 700, color: "#1A1A1A" },
  navProgress: { fontSize: 12, color: "#7A7167" },
  navGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6,
    marginBottom: 16,
  },
  navPip: {
    width: 28, height: 28, borderRadius: 6,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    border: "none", fontFamily: "inherit", transition: "all .15s",
  },
  navPipCurrent: { background: "#1865F2", color: "#fff", boxShadow: "0 2px 8px rgba(24,101,242,0.3)" },
  navPipAnswered: { background: "#DCFCE7", color: "#16A34A", border: "1.5px solid #86EFAC" },
  navPipEmpty:    { background: "#fff", color: "#9E9589", border: "1.5px solid #DDD8CE" },
  legend: { display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" },
  legendRow: { display: "flex", alignItems: "center", gap: 6 },
  legendLabel: { fontSize: 11, color: "#9E9589" },
  rightArea: {
    flex: 1, display: "flex", flexDirection: "column", gap: 16,
    padding: "20px 24px", overflow: "auto",
  },
  qHeader: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  qNum: { fontSize: 15, fontWeight: 700, color: "#1A1A1A" },
  qBox: {
    background: "#F8F5F0", borderRadius: 10,
    border: "1.5px solid #EDE8DF", padding: "16px 20px",
  },
  qText: { fontSize: 17, color: "#1A1A1A", lineHeight: 1.7, fontWeight: 500 },
  answerSection: { display: "flex", flexDirection: "column", gap: 8 },
  answerLabel: { fontSize: 14, fontWeight: 600, color: "#5A5248" },
  textarea: {
    width: "100%", borderRadius: 10,
    border: "1.5px solid #DDD8CE",
    padding: "12px 14px", fontSize: 16, fontFamily: "inherit",
    resize: "vertical", boxSizing: "border-box",
    lineHeight: 1.75, color: "#1A1A1A",
    outline: "none",
    transition: "border-color .15s",
  },
  navBtns: {
    display: "flex", alignItems: "center", gap: 10,
    marginTop: "auto", paddingTop: 8,
    borderTop: "1px solid #EDE8DF",
  },
  prevBtn: {
    padding: "10px 20px", height: 44,
    border: "1.5px solid #DDD8CE", borderRadius: 10,
    background: "#fff", color: "#5A5248",
    fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  nextBtn: {
    padding: "10px 24px", height: 44,
    background: "#1865F2", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
  submitBtn: {
    padding: "10px 28px", height: 44,
    background: "#16A34A", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
  submitBtnWarn: { background: "#D97706" },
};

// ── GradeConfirmPreview ───────────────────────────────────────────────────────
// Shown after Vision OCR, before actual grading.
// Let user confirm the OCR read correctly before spending tokens on grading.
function GradeConfirmPreview({ ocrResults, onConfirm, onCancel }) {
  const [expandedId, setExpandedId] = React.useState(null);

  return (
    <div style={gcpStyles.wrap}>
      <div style={gcpStyles.header}>
        <span style={{ fontSize: 24 }}>📷</span>
        <div>
          <div style={gcpStyles.title}>识图结果确认</div>
          <div style={gcpStyles.subtitle}>请确认 AI 识别的题目和学生答案是否准确，再开始批改</div>
        </div>
      </div>

      <div style={gcpStyles.warningBox}>
        <span>💡</span>
        <span>若识别有误，请点击「重新上传」更换图片，避免消耗批改额度。</span>
      </div>

      <div style={gcpStyles.grid}>
        {ocrResults.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          return (
            <div key={item.id} style={gcpStyles.card}>
              <div style={gcpStyles.cardTop}>
                <span style={gcpStyles.numBadge}>{idx + 1}</span>
                <span style={gcpStyles.confidence}>
                  识别置信度 {item.confidence >= 0.85 ? "高" : item.confidence >= 0.65 ? "中" : "低"}
                  <span style={{
                    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                    marginLeft: 5,
                    background: item.confidence >= 0.85 ? "#16A34A" : item.confidence >= 0.65 ? "#D97706" : "#DC2626",
                  }} />
                </span>
                <button
                  style={gcpStyles.expandBtn}
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  {isExpanded ? "收起 ▲" : "查看详情 ▼"}
                </button>
              </div>
              <div style={gcpStyles.questionText}>{item.question}</div>
              {isExpanded && (
                <div style={gcpStyles.detailSection}>
                  <div style={gcpStyles.detailDivider} />
                  <div style={gcpStyles.detailRow}>
                    <span style={gcpStyles.detailLabel}>识别到的学生答案：</span>
                    <span style={gcpStyles.detailAnswer}>{item.studentAnswer}</span>
                  </div>
                  {item.confidence < 0.7 && (
                    <div style={gcpStyles.lowConfWarn}>
                      ⚠️ 置信度较低，图片可能模糊或倾斜，建议重新拍照
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={gcpStyles.footer}>
        <button style={gcpStyles.cancelBtn} onClick={onCancel}>
          重新上传
        </button>
        <button style={gcpStyles.confirmBtn} onClick={onConfirm}>
          识别正确，开始批改 →
        </button>
      </div>
    </div>
  );
}

const gcpStyles = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  header: {
    display: "flex", alignItems: "center", gap: 14,
    background: "#fff", borderRadius: 12, border: "1.5px solid #EDE8DF",
    padding: "16px 20px",
  },
  title: { fontSize: 17, fontWeight: 700, color: "#1A1A1A" },
  subtitle: { fontSize: 13, color: "#7A7167", marginTop: 2 },
  warningBox: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#FFFBEB", border: "1px solid #FDE68A",
    borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#7A5C00",
  },
  grid: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    background: "#fff", borderRadius: 10, border: "1.5px solid #EDE8DF",
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
  },
  cardTop: { display: "flex", alignItems: "center", gap: 8 },
  numBadge: {
    width: 28, height: 28, borderRadius: "50%",
    background: "#1865F2", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  confidence: { fontSize: 12, color: "#7A7167", display: "flex", alignItems: "center" },
  expandBtn: {
    marginLeft: "auto", padding: "4px 10px", height: 28,
    border: "1.5px solid #DDD8CE", borderRadius: 6,
    background: "#fff", fontSize: 12, cursor: "pointer",
    color: "#1865F2", fontWeight: 600, fontFamily: "inherit",
  },
  questionText: { fontSize: 15, color: "#1A1A1A", lineHeight: 1.6 },
  detailSection: { display: "flex", flexDirection: "column", gap: 8 },
  detailDivider: { height: 1, background: "#EDE8DF" },
  detailRow: { display: "flex", gap: 8, fontSize: 14, alignItems: "center", flexWrap: "wrap" },
  detailLabel: { color: "#7A7167" },
  detailAnswer: { fontWeight: 700, color: "#1A1A1A", background: "#F5F3EF", borderRadius: 6, padding: "2px 10px" },
  lowConfWarn: {
    fontSize: 13, color: "#DC2626", background: "#FFF5F5",
    borderRadius: 6, padding: "8px 12px",
  },
  footer: {
    display: "flex", gap: 10, justifyContent: "flex-end",
    paddingTop: 4,
  },
  cancelBtn: {
    padding: "10px 20px", height: 44,
    border: "1.5px solid #DDD8CE", borderRadius: 10,
    background: "#fff", color: "#5A5248",
    fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  confirmBtn: {
    padding: "10px 28px", height: 44,
    background: "#1865F2", color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
};

// ── GradingProgress ────────────────────────────────────────────────────────────
// Shared grading animation — pipeline + per-problem progress
function GradingProgress({ problems, gradedCount, pipelineSteps, currentPipelineStep }) {
  return (
    <div style={gpStyles.wrap}>
      <AgentPipeline steps={pipelineSteps} currentStep={currentPipelineStep} />
      <div style={gpStyles.progressSection}>
        <div style={gpStyles.progressHeader}>
          <span style={gpStyles.progressLabel}>批改进度</span>
          <span style={gpStyles.progressFrac}>{gradedCount} / {problems.length}</span>
        </div>
        <div style={gpStyles.bar}>
          <div style={{ ...gpStyles.barFill, width: `${(gradedCount / problems.length) * 100}%` }} />
        </div>
        <div style={gpStyles.problemList}>
          {problems.map((p, i) => {
            const state = i < gradedCount ? "done" : i === gradedCount ? "grading" : "pending";
            return (
              <div key={p.id} style={{ ...gpStyles.problemRow, opacity: state === "pending" ? 0.4 : 1 }}>
                <div style={{
                  ...gpStyles.problemDot,
                  background: state === "done" ? "#16A34A" : state === "grading" ? "#1865F2" : "#DDD8CE",
                  animation: state === "grading" ? "pulse 1s infinite" : "none",
                }} />
                <span style={gpStyles.problemLabel}>第 {i + 1} 题</span>
                <span style={gpStyles.problemStatus}>
                  {state === "done" ? "✓ 完成" : state === "grading" ? "批改中…" : "等待中"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const gpStyles = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },
  progressSection: {
    background: "#fff", borderRadius: 12, border: "1.5px solid #EDE8DF",
    padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10,
  },
  progressHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  progressLabel: { fontSize: 14, fontWeight: 700, color: "#1A1A1A" },
  progressFrac: { fontSize: 14, color: "#7A7167" },
  bar: { height: 6, background: "#EDE8DF", borderRadius: 3, overflow: "hidden" },
  barFill: {
    height: "100%", background: "#1865F2",
    borderRadius: 3, transition: "width 0.5s ease",
  },
  problemList: { display: "flex", flexDirection: "column", gap: 6 },
  problemRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, transition: "opacity .3s" },
  problemDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0, transition: "background .3s" },
  problemLabel: { color: "#1A1A1A" },
  problemStatus: { marginLeft: "auto", color: "#7A7167", fontSize: 13 },
};

// ── Extended GradingReport ─────────────────────────────────────────────────────
function GradingReportV2({ results, problems }) {
  const [expandedId, setExpandedId] = React.useState(null);

  // Merge grading results with original problem data for solutions
  const merged = results.map(r => ({
    ...r,
    solution: problems?.find(p => p.id === r.id)?.solution || null,
  }));

  const correct = results.filter(r => r.correct).length;

  return (
    <div style={grv2Styles.wrap}>
      {/* Summary header */}
      <div style={grv2Styles.header}>
        <div style={grv2Styles.headerLeft}>
          <span style={{ fontSize: 24 }}>📋</span>
          <div>
            <div style={grv2Styles.title}>批改报告</div>
            <div style={grv2Styles.subtitle}>共 {results.length} 题 · 正确 {correct} 题 · 错误 {results.length - correct} 题</div>
          </div>
        </div>
        <div style={grv2Styles.scoreRing}>
          <span style={grv2Styles.scoreNum}>{Math.round(correct / results.length * 100)}</span>
          <span style={grv2Styles.scorePct}>分</span>
        </div>
      </div>

      {/* Stats chips */}
      <div style={grv2Styles.chips}>
        <div style={{ ...grv2Styles.chip, background: "#F0FDF4", color: "#16A34A" }}>✓ 正确 {correct}</div>
        <div style={{ ...grv2Styles.chip, background: "#FFF5F5", color: "#DC2626" }}>✗ 错误 {results.length - correct}</div>
        <div style={{ ...grv2Styles.chip, background: "#EEF3FF", color: "#1865F2" }}>
          📚 KB匹配 {results.filter(r => r.source === "kb_match").length}
        </div>
        <div style={{ ...grv2Styles.chip, background: "#FFFBEB", color: "#D97706" }}>
          🤖 AI推断 {results.filter(r => r.source === "inferred").length}
        </div>
      </div>

      {/* Per-problem cards */}
      <div style={grv2Styles.list}>
        {merged.map((r, idx) => {
          const isExpanded = expandedId === r.id;
          return (
            <div key={r.id} style={{
              ...grv2Styles.card,
              borderColor: r.correct ? "#86EFAC" : "#FCA5A5",
              background: r.correct ? "#F0FDF4" : "#FFF5F5",
            }}>
              <div style={grv2Styles.cardTop}>
                <span style={{
                  ...grv2Styles.resultBadge,
                  background: r.correct ? "#16A34A" : "#DC2626",
                }}>
                  {r.correct ? "✓" : "✗"}
                </span>
                <span style={grv2Styles.qNum}>第 {idx + 1} 题</span>
                <span style={{
                  ...grv2Styles.sourceTag,
                  color: r.source === "kb_match" ? "#1865F2" : "#D97706",
                  background: r.source === "kb_match" ? "#EEF3FF" : "#FFFBEB",
                }}>
                  {r.source === "kb_match" ? "📚 题库" : "🤖 推断"}
                </span>
                {!r.correct && (
                  <button
                    style={grv2Styles.analysisBtn}
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    {isExpanded ? "收起解析 ▲" : "查看答案与解析 ▼"}
                  </button>
                )}
              </div>

              <div style={grv2Styles.questionText}>{r.question}</div>

              <div style={grv2Styles.answerRow}>
                <span style={grv2Styles.answerLabel}>你的答案：</span>
                <span style={{ color: r.correct ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                  {r.studentAnswer || "（未作答）"}
                </span>
              </div>

              {/* Expanded analysis */}
              {isExpanded && !r.correct && (
                <div style={grv2Styles.analysis}>
                  <div style={{ height: 1, background: "#FCA5A544", margin: "4px 0" }} />
                  <div style={grv2Styles.analysisRow}>
                    <span style={grv2Styles.analysisLabel}>正确答案：</span>
                    <span style={{ color: "#16A34A", fontWeight: 700 }}>{r.correctAnswer}</span>
                  </div>
                  {r.explanation && (
                    <div style={grv2Styles.explanationBox}>
                      <div style={grv2Styles.explanationLabel}>错误分析</div>
                      <div style={grv2Styles.explanationText}>{r.explanation}</div>
                    </div>
                  )}
                  {r.solution && (
                    <div style={grv2Styles.solutionBox}>
                      <div style={grv2Styles.solutionLabel}>完整解题过程</div>
                      <div style={grv2Styles.solutionText}>{r.solution}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const grv2Styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 14 },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#fff", borderRadius: 12, border: "1.5px solid #EDE8DF",
    padding: "16px 20px", gap: 12,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  title: { fontSize: 17, fontWeight: 700, color: "#1A1A1A" },
  subtitle: { fontSize: 13, color: "#7A7167", marginTop: 2 },
  scoreRing: {
    display: "flex", alignItems: "baseline", gap: 2,
    background: "#F0FDF4", borderRadius: 10, padding: "8px 16px",
  },
  scoreNum: { fontSize: 28, fontWeight: 800, color: "#16A34A", lineHeight: 1 },
  scorePct: { fontSize: 14, color: "#7A7167" },
  chips: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: { fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "5px 12px" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    borderRadius: 10, border: "1.5px solid",
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
  },
  cardTop: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  resultBadge: {
    width: 28, height: 28, borderRadius: "50%",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  qNum: { fontSize: 14, fontWeight: 700, color: "#1A1A1A" },
  sourceTag: { fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 8px" },
  analysisBtn: {
    marginLeft: "auto", padding: "4px 10px", height: 28,
    border: "1.5px solid #FCA5A5", borderRadius: 6,
    background: "#fff", fontSize: 12, cursor: "pointer",
    color: "#DC2626", fontWeight: 600, fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  questionText: { fontSize: 15, color: "#1A1A1A", lineHeight: 1.6 },
  answerRow: { display: "flex", gap: 8, fontSize: 14, alignItems: "center" },
  answerLabel: { color: "#7A7167" },
  analysis: { display: "flex", flexDirection: "column", gap: 8 },
  analysisRow: { display: "flex", gap: 8, fontSize: 14, alignItems: "center" },
  analysisLabel: { color: "#7A7167" },
  explanationBox: {
    background: "#FFF9F0", borderRadius: 8, padding: "10px 14px",
    border: "1px solid #FDE68A",
  },
  explanationLabel: { fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 4 },
  explanationText: { fontSize: 14, color: "#1A1A1A", lineHeight: 1.7 },
  solutionBox: {
    background: "#F8F5F0", borderRadius: 8, padding: "10px 14px",
  },
  solutionLabel: { fontSize: 12, fontWeight: 700, color: "#7A7167", marginBottom: 4 },
  solutionText: { fontSize: 14, color: "#1A1A1A", lineHeight: 1.75, whiteSpace: "pre-line" },
};

// Export all new components
Object.assign(window, {
  ProblemSetPreview,
  AnswerSession,
  GradeConfirmPreview,
  GradingProgress,
  GradingReportV2,
});
