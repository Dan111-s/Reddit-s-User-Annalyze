import { useState, useRef } from "react";

const STAGES = [
  { id: "subreddits", label: "Finding subreddits" },
  { id: "habits", label: "Analyzing user habits" },
  { id: "sentiment", label: "Gauging sentiment" },
  { id: "trending", label: "Spotting trends" },
  { id: "content", label: "Generating content strategy" },
];

const TABS = ["Overview", "User Habits", "Sentiment", "Trending", "Content Strategy", "Raw Data"];

function ProgressBar({ stages, currentStage, done }) {
  return (
    <div style={{ margin: "1.5rem 0" }}>
      {stages.map((s, i) => {
        const idx = stages.findIndex((x) => x.id === currentStage);
        const state = done ? "done" : i < idx ? "done" : i === idx ? "active" : "pending";
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, flexShrink: 0,
              background: state === "done" ? "var(--color-background-success)" : state === "active" ? "var(--color-background-info)" : "var(--color-background-secondary)",
              color: state === "done" ? "var(--color-text-success)" : state === "active" ? "var(--color-text-info)" : "var(--color-text-tertiary)",
              border: state === "active" ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
            }}>
              {state === "done" ? <i className="ti ti-check" style={{ fontSize: 12 }} /> : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2, transition: "width 0.6s ease",
                  background: state === "done" ? "var(--color-background-success)" : state === "active" ? "var(--color-background-info)" : "transparent",
                  width: state === "done" ? "100%" : state === "active" ? "60%" : "0%",
                }} />
              </div>
            </div>
            <span style={{ fontSize: 13, color: state === "active" ? "var(--color-text-info)" : state === "done" ? "var(--color-text-success)" : "var(--color-text-tertiary)", minWidth: 160 }}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Badge({ text, color = "gray" }) {
  const colors = {
    blue: { bg: "#E6F1FB", color: "#0C447C" },
    green: { bg: "#EAF3DE", color: "#27500A" },
    amber: { bg: "#FAEEDA", color: "#633806" },
    red: { bg: "#FCEBEB", color: "#791F1F" },
    purple: { bg: "#EEEDFE", color: "#3C3489" },
    teal: { bg: "#E1F5EE", color: "#085041" },
    gray: { bg: "var(--color-background-secondary)", color: "var(--color-text-secondary)" },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px", borderRadius: 6, background: c.bg, color: c.color, display: "inline-block" }}>
      {text}
    </span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem", ...style }}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, color = "blue" }) {
  const colors = { blue: "#0C447C", green: "#27500A", amber: "#633806", purple: "#3C3489", teal: "#085041" };
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "0.75rem 1rem" }}>
      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: colors[color] || colors.blue }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ fontSize: 15, fontWeight: 500, margin: "0 0 12px", color: "var(--color-text-primary)" }}>{children}</h3>;
}

function parseJSON(text) {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  return data.content?.map((b) => b.text || "").join("\n") || "";
}

export default function App() {
  const [products, setProducts] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(null);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [error, setError] = useState(null);
  const [excelReady, setExcelReady] = useState(false);
  const xlsxRef = useRef(null);

  async function runResearch() {
    if (!products.trim()) return;
    setLoading(true);
    setDone(false);
    setResult(null);
    setError(null);
    setExcelReady(false);
    setActiveTab("Overview");

    try {
      const input = `Products/Topics: ${products}\nAdditional context: ${context || "Korean market focus"}`;

      setStage("subreddits");
      const subredditsRaw = await callClaude(
        `You are a Reddit research analyst for a Korean content marketing team. Return ONLY valid JSON, no extra text.`,
        `Given these products/topics: ${input}
        
Return a JSON object with these fields:
{
  "subreddits": [{"name": "r/...", "members": "1.2M", "relevance": "why relevant"}],
  "targetAudience": "description of who uses these",
  "searchKeywords": ["keyword1", "keyword2"],
  "overview": "2-3 sentence summary of the research scope"
}`
      );
      const subredditsData = parseJSON(subredditsRaw) || { subreddits: [], targetAudience: "", searchKeywords: [], overview: "" };

      setStage("habits");
      const habitsRaw = await callClaude(
        `You are a Reddit user behavior analyst for a Korean content marketing team. Return ONLY valid JSON.`,
        `For these products/topics: ${input}
Subreddits identified: ${JSON.stringify(subredditsData.subreddits)}

Analyze typical Reddit user habits and behaviors. Return JSON:
{
  "peakActivityTimes": [{"time": "...", "note": "..."}],
  "contentFormats": [{"format": "...", "engagement": "high/medium/low", "note": "..."}],
  "topicClusters": [{"topic": "...", "frequency": "...", "sentiment": "positive/neutral/mixed"}],
  "userPersonas": [{"name": "...", "description": "...", "needs": "..."}],
  "communityNorms": ["norm1", "norm2"]
}`
      );
      const habitsData = parseJSON(habitsRaw) || {};

      setStage("sentiment");
      const sentimentRaw = await callClaude(
        `You are a sentiment analysis expert for Reddit communities. Return ONLY valid JSON.`,
        `For these products/topics: ${input}

Analyze sentiment patterns on Reddit. Return JSON:
{
  "overallSentiment": "positive/mixed/negative",
  "sentimentScore": 72,
  "positiveDrivers": ["driver1", "driver2"],
  "negativeDrivers": ["pain1", "pain2"],
  "neutralTopics": ["topic1"],
  "sentimentBySubreddit": [{"subreddit": "r/...", "sentiment": "positive", "score": 80, "note": "..."}],
  "brandMentionOpportunities": ["opportunity1", "opportunity2"]
}`
      );
      const sentimentData = parseJSON(sentimentRaw) || {};

      setStage("trending");
      const trendingRaw = await callClaude(
        `You are a Reddit trend analyst for a Korean content marketing agency. Return ONLY valid JSON.`,
        `For these products/topics: ${input}

Identify current trends and viral patterns. Return JSON:
{
  "hotTopics": [{"topic": "...", "momentum": "rising/stable/declining", "relevance": "high/medium/low"}],
  "viralContentPatterns": ["pattern1", "pattern2"],
  "competitorMentions": [{"brand": "...", "sentiment": "...", "opportunity": "..."}],
  "seasonalTrends": [{"period": "...", "trend": "..."}],
  "emergingNiches": ["niche1", "niche2"],
  "kpiOpportunities": [{"metric": "...", "potential": "high/medium/low"}]
}`
      );
      const trendingData = parseJSON(trendingRaw) || {};

      setStage("content");
      const contentRaw = await callClaude(
        `You are a content marketing strategist specializing in Reddit-driven content for Korean brands. Return ONLY valid JSON.`,
        `For these products/topics: ${input}
User habits: ${JSON.stringify(habitsData.contentFormats)}
Sentiment: ${JSON.stringify(sentimentData.positiveDrivers)}
Trends: ${JSON.stringify(trendingData.hotTopics)}

Create a detailed content marketing strategy. Return JSON:
{
  "contentPillars": [{"pillar": "...", "description": "...", "examplePosts": ["..."]}],
  "postingSchedule": [{"day": "...", "time": "...", "contentType": "...", "subreddit": "r/..."}],
  "contentIdeas": [{"title": "...", "type": "post/video/infographic/ama", "hook": "...", "targetSubreddit": "r/...", "expectedEngagement": "high/medium"}],
  "engagementTactics": ["tactic1", "tactic2"],
  "koreaSpecificAngles": ["angle1", "angle2"],
  "monthlyCalendar": [{"week": 1, "theme": "...", "posts": 3}, {"week": 2, "theme": "...", "posts": 4}],
  "kpis": [{"metric": "...", "target": "...", "timeline": "..."}]
}`
      );
      const contentData = parseJSON(contentRaw) || {};

      const full = {
        products: products.trim(),
        context: context.trim(),
        generatedAt: new Date().toLocaleString(),
        subreddits: subredditsData,
        habits: habitsData,
        sentiment: sentimentData,
        trending: trendingData,
        content: contentData,
      };

      setResult(full);
      setDone(true);
      setStage(null);
    } catch (e) {
      setError("Research failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!result) return;
    const rows = [];
    rows.push(["Reddit Research Report"]);
    rows.push(["Generated", result.generatedAt]);
    rows.push(["Products", result.products]);
    rows.push([]);

    rows.push(["=== SUBREDDITS ==="]);
    rows.push(["Subreddit", "Members", "Relevance"]);
    (result.subreddits.subreddits || []).forEach((s) => rows.push([s.name, s.members, s.relevance]));
    rows.push([]);

    rows.push(["=== USER HABITS ==="]);
    rows.push(["Content Format", "Engagement", "Note"]);
    (result.habits.contentFormats || []).forEach((f) => rows.push([f.format, f.engagement, f.note]));
    rows.push([]);

    rows.push(["=== SENTIMENT ==="]);
    rows.push(["Overall", result.sentiment.overallSentiment, "Score", result.sentiment.sentimentScore + "/100"]);
    rows.push(["Positive Drivers"]);
    (result.sentiment.positiveDrivers || []).forEach((d) => rows.push(["", d]));
    rows.push(["Negative Drivers"]);
    (result.sentiment.negativeDrivers || []).forEach((d) => rows.push(["", d]));
    rows.push([]);

    rows.push(["=== TRENDING TOPICS ==="]);
    rows.push(["Topic", "Momentum", "Relevance"]);
    (result.trending.hotTopics || []).forEach((t) => rows.push([t.topic, t.momentum, t.relevance]));
    rows.push([]);

    rows.push(["=== CONTENT IDEAS ==="]);
    rows.push(["Title", "Type", "Hook", "Subreddit", "Expected Engagement"]);
    (result.content.contentIdeas || []).forEach((c) =>
      rows.push([c.title, c.type, c.hook, c.targetSubreddit, c.expectedEngagement])
    );
    rows.push([]);

    rows.push(["=== POSTING SCHEDULE ==="]);
    rows.push(["Day", "Time", "Content Type", "Subreddit"]);
    (result.content.postingSchedule || []).forEach((p) => rows.push([p.day, p.time, p.contentType, p.subreddit]));

    const csvContent = rows.map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reddit_research_${result.products.replace(/\s+/g, "_").slice(0, 30)}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reddit_research_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabStyle = (t) => ({
    padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
    background: activeTab === t ? "var(--color-background-info)" : "transparent",
    color: activeTab === t ? "var(--color-text-info)" : "var(--color-text-secondary)",
  });

  return (
    <div style={{ padding: "1.5rem 0", fontFamily: "var(--font-sans)" }}>
      <h2 aria-hidden className="sr-only">Reddit Research Automation Tool</h2>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <i className="ti ti-brand-reddit" style={{ fontSize: 22, color: "#E24B4A" }} aria-hidden />
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Reddit Research Automation</h2>
        <Badge text="Korean Market" color="teal" />
      </div>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 1.5rem" }}>
        Enter your products or topics, and get a full Reddit analysis with content strategy, user habits, trending topics, and a ready-to-export report.
      </p>

      {/* Input */}
      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
            <i className="ti ti-package" style={{ marginRight: 6 }} aria-hidden />Products / Topics to research
          </label>
          <input
            value={products}
            onChange={(e) => setProducts(e.target.value)}
            placeholder="e.g. Korean skincare, K-beauty serums, sunscreen SPF50, COSRX brand"
            style={{ width: "100%", boxSizing: "border-box", fontSize: 14 }}
            disabled={loading}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 6 }} aria-hidden />Additional context (optional)
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. targeting US market, competitor is CeraVe, focus on Gen Z users, budget brand positioning"
            rows={2}
            style={{ width: "100%", boxSizing: "border-box", fontSize: 14, resize: "vertical" }}
            disabled={loading}
          />
        </div>
        <button
          onClick={runResearch}
          disabled={loading || !products.trim()}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", cursor: loading || !products.trim() ? "not-allowed" : "pointer", opacity: loading || !products.trim() ? 0.5 : 1 }}
        >
          <i className="ti ti-search" aria-hidden />
          {loading ? "Researching Reddit..." : "Run Research ↗"}
        </button>
      </Card>

      {/* Progress */}
      {loading && (
        <Card style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Analyzing Reddit data...</div>
          <ProgressBar stages={STAGES} currentStage={stage} done={done} />
        </Card>
      )}

      {error && (
        <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: 8, padding: "0.75rem 1rem", fontSize: 13, marginBottom: "1rem" }}>
          <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{error}
        </div>
      )}

      {/* Results */}
      {result && done && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-circle-check" style={{ color: "var(--color-text-success)", fontSize: 18 }} aria-hidden />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Research complete — {result.generatedAt}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 14px" }}>
                <i className="ti ti-table-export" aria-hidden /> Export CSV
              </button>
              <button onClick={exportJSON} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 14px" }}>
                <i className="ti ti-download" aria-hidden /> Export JSON
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
            {TABS.map((t) => <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>{t}</button>)}
          </div>

          {/* Tab: Overview */}
          {activeTab === "Overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                <MetricCard label="Subreddits found" value={result.subreddits.subreddits?.length || 0} color="blue" />
                <MetricCard label="Sentiment score" value={(result.sentiment.sentimentScore || 0) + "/100"} color="green" />
                <MetricCard label="Hot topics" value={result.trending.hotTopics?.length || 0} color="amber" />
                <MetricCard label="Content ideas" value={result.content.contentIdeas?.length || 0} color="purple" />
              </div>
              <Card style={{ marginBottom: 12 }}>
                <SectionTitle>Research scope</SectionTitle>
                <p style={{ fontSize: 14, margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{result.subreddits.overview}</p>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card>
                  <SectionTitle>Target audience</SectionTitle>
                  <p style={{ fontSize: 13, margin: 0, color: "var(--color-text-secondary)" }}>{result.subreddits.targetAudience}</p>
                </Card>
                <Card>
                  <SectionTitle>Key search terms</SectionTitle>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(result.subreddits.searchKeywords || []).map((k, i) => <Badge key={i} text={k} color="blue" />)}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Tab: User Habits */}
          {activeTab === "User Habits" && (
            <div style={{ display: "grid", gap: 12 }}>
              <Card>
                <SectionTitle>Content format performance</SectionTitle>
                <div style={{ display: "grid", gap: 8 }}>
                  {(result.habits.contentFormats || []).map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <Badge text={f.engagement} color={f.engagement === "high" ? "green" : f.engagement === "medium" ? "amber" : "gray"} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{f.format}</span>
                      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{f.note}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card>
                  <SectionTitle>User personas</SectionTitle>
                  {(result.habits.userPersonas || []).map((p, i) => (
                    <div key={i} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{p.description}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 2 }}>Needs: {p.needs}</div>
                    </div>
                  ))}
                </Card>
                <Card>
                  <SectionTitle>Peak activity times</SectionTitle>
                  {(result.habits.peakActivityTimes || []).map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                      <i className="ti ti-clock" style={{ color: "var(--color-text-info)", marginTop: 2 }} aria-hidden />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{t.time}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{t.note}</div>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
              <Card>
                <SectionTitle>Community norms</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(result.habits.communityNorms || []).map((n, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <i className="ti ti-point-filled" style={{ color: "var(--color-text-teal)", fontSize: 16, marginTop: 2 }} aria-hidden />
                      <span style={{ fontSize: 13 }}>{n}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Tab: Sentiment */}
          {activeTab === "Sentiment" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card style={{ borderLeft: "3px solid var(--color-border-success)" }}>
                  <SectionTitle>Positive drivers</SectionTitle>
                  {(result.sentiment.positiveDrivers || []).map((d, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <i className="ti ti-thumb-up" style={{ color: "var(--color-text-success)" }} aria-hidden />
                      <span style={{ fontSize: 13 }}>{d}</span>
                    </div>
                  ))}
                </Card>
                <Card style={{ borderLeft: "3px solid var(--color-border-danger)" }}>
                  <SectionTitle>Negative drivers</SectionTitle>
                  {(result.sentiment.negativeDrivers || []).map((d, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <i className="ti ti-thumb-down" style={{ color: "var(--color-text-danger)" }} aria-hidden />
                      <span style={{ fontSize: 13 }}>{d}</span>
                    </div>
                  ))}
                </Card>
              </div>
              <Card>
                <SectionTitle>Sentiment by subreddit</SectionTitle>
                {(result.sentiment.sentimentBySubreddit || []).map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 120 }}>{s.subreddit}</span>
                    <div style={{ flex: 1, height: 6, background: "var(--color-background-secondary)", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${s.score}%`, background: s.score > 60 ? "#639922" : s.score > 40 ? "#BA7517" : "#E24B4A", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, minWidth: 32, textAlign: "right", color: "var(--color-text-secondary)" }}>{s.score}</span>
                    <Badge text={s.sentiment} color={s.sentiment === "positive" ? "green" : s.sentiment === "mixed" ? "amber" : "red"} />
                  </div>
                ))}
              </Card>
              <Card>
                <SectionTitle>Brand mention opportunities</SectionTitle>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(result.sentiment.brandMentionOpportunities || []).map((o, i) => (
                    <div key={i} style={{ fontSize: 13, padding: "6px 12px", background: "var(--color-background-info)", color: "var(--color-text-info)", borderRadius: 6 }}>
                      <i className="ti ti-bulb" style={{ marginRight: 6 }} aria-hidden />{o}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Tab: Trending */}
          {activeTab === "Trending" && (
            <div style={{ display: "grid", gap: 12 }}>
              <Card>
                <SectionTitle>Hot topics</SectionTitle>
                <div style={{ display: "grid", gap: 8 }}>
                  {(result.trending.hotTopics || []).map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <Badge text={t.momentum} color={t.momentum === "rising" ? "green" : t.momentum === "stable" ? "blue" : "gray"} />
                      <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{t.topic}</span>
                      <Badge text={t.relevance} color={t.relevance === "high" ? "purple" : t.relevance === "medium" ? "amber" : "gray"} />
                    </div>
                  ))}
                </div>
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card>
                  <SectionTitle>Emerging niches</SectionTitle>
                  {(result.trending.emergingNiches || []).map((n, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <i className="ti ti-trending-up" style={{ color: "var(--color-text-success)" }} aria-hidden />
                      <span style={{ fontSize: 13 }}>{n}</span>
                    </div>
                  ))}
                </Card>
                <Card>
                  <SectionTitle>Viral content patterns</SectionTitle>
                  {(result.trending.viralContentPatterns || []).map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <i className="ti ti-flame" style={{ color: "#D85A30" }} aria-hidden />
                      <span style={{ fontSize: 13 }}>{p}</span>
                    </div>
                  ))}
                </Card>
              </div>
            </div>
          )}

          {/* Tab: Content Strategy */}
          {activeTab === "Content Strategy" && (
            <div style={{ display: "grid", gap: 12 }}>
              <Card>
                <SectionTitle>Content ideas</SectionTitle>
                {(result.content.contentIdeas || []).map((c, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      <Badge text={c.type} color="purple" />
                      <Badge text={c.expectedEngagement} color={c.expectedEngagement === "high" ? "green" : "amber"} />
                      <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{c.targetSubreddit}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{c.hook}</div>
                  </div>
                ))}
              </Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card>
                  <SectionTitle>Posting schedule</SectionTitle>
                  {(result.content.postingSchedule || []).map((p, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                      <Badge text={p.day} color="blue" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.time}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.contentType} · {p.subreddit}</div>
                      </div>
                    </div>
                  ))}
                </Card>
                <Card>
                  <SectionTitle>Korea-specific angles</SectionTitle>
                  {(result.content.koreaSpecificAngles || []).map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <i className="ti ti-map-pin" style={{ color: "var(--color-text-danger)" }} aria-hidden />
                      <span style={{ fontSize: 13 }}>{a}</span>
                    </div>
                  ))}
                </Card>
              </div>
              <Card>
                <SectionTitle>KPIs to track</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  {(result.content.kpis || []).map((k, i) => (
                    <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "0.75rem" }}>
                      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 2 }}>{k.timeline}</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{k.metric}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Target: {k.target}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Tab: Raw Data */}
          {activeTab === "Raw Data" && (
            <Card>
              <SectionTitle>Raw JSON output</SectionTitle>
              <pre style={{ fontSize: 11, background: "var(--color-background-secondary)", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 400, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
