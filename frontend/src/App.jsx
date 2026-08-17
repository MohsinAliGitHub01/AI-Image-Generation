import React, { useEffect, useState } from "react";

const API = "https://ai-image-generation-3f1x.onrender.com";

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function gradientFor(seed) {
  const palettes = [
    "linear-gradient(135deg,#8B7FFF,#3A2E6B)",
    "linear-gradient(135deg,#FF7A59,#7A3B2E)",
    "linear-gradient(135deg,#5FB9A8,#1F3B36)",
    "linear-gradient(135deg,#8B7FFF,#FF7A59)",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palettes[Math.abs(hash) % palettes.length];
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [view, setView] = useState("app");

  if (!token) {
    return (
      <>
        <GlobalStyles />
        <AuthForm onAuth={(t) => { localStorage.setItem("token", t); setToken(t); }} />
      </>
    );
  }

  return (
    <div className="root">
      <GlobalStyles />
      <div className="topbar">
        <div className="brand"><div className="brand-mark" />Atelier</div>
        <div className="nav">
          <button className={view === "app" ? "active" : ""} onClick={() => setView("app")}>Generate</button>
          <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>History</button>
        </div>
        <button className="logout" onClick={() => { localStorage.removeItem("token"); setToken(""); }}>Sign out</button>
      </div>
      {view === "app" ? <MainApp token={token} /> : <HistoryPage token={token} />}
    </div>
  );
}

// ---------------- Auth ----------------
function AuthForm({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      onAuth(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2 className="auth-title">{mode === "login" ? "Welcome back" : "Create an account"}</h2>
        <p className="auth-sub">{mode === "login" ? "Sign in to your atelier." : "Start conjuring images."}</p>
        <form onSubmit={submit}>
          <input className="auth-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="auth-input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
          </button>
        </form>
        <p className="auth-switch" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
        </p>
      </div>
    </div>
  );
}

// ---------------- Main app: sessions + generation ----------------
function MainApp({ token }) {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [images, setImages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const activeSession = sessions.find((s) => s.id === activeId);

  async function loadSessions() {
    const res = await fetch(`${API}/api/sessions`, { headers: authHeaders(token) });
    const data = await res.json();
    setSessions(data);
    if (!activeId && data.length) setActiveId(data[0].id);
  }

  async function loadImages(sessionId) {
    if (!sessionId) return setImages([]);
    const res = await fetch(`${API}/api/sessions/${sessionId}/images`, { headers: authHeaders(token) });
    setImages(await res.json());
  }

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { loadImages(activeId); }, [activeId]);

  async function createSession() {
    const res = await fetch(`${API}/api/sessions`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ title: "New session" }),
    });
    const data = await res.json();
    setSessions([data, ...sessions]);
    setActiveId(data.id);
  }

  async function renameSession(id, e) {
    e.stopPropagation();
    const title = window.prompt("New session title:");
    if (!title) return;
    await fetch(`${API}/api/sessions/${id}`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ title }),
    });
    loadSessions();
  }

  async function deleteSession(id, e) {
    e.stopPropagation();
    if (!window.confirm("Delete this session?")) return;
    await fetch(`${API}/api/sessions/${id}`, { method: "DELETE", headers: authHeaders(token) });
    setActiveId(null);
    loadSessions();
  }

  async function generate(e) {
    e.preventDefault();
    if (!prompt.trim() || !activeId) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/sessions/${activeId}/generate`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Generation failed");
      setImages([data, ...images]);
      setPrompt("");
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="body">
      <div className="sidebar">
        <button className="new-session" onClick={createSession}>+ New session</button>
        <div className="session-label">Sessions</div>
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`session-item ${s.id === activeId ? "active" : ""}`}
            onClick={() => setActiveId(s.id)}
          >
            <div className="session-dot" />
            <span className="session-title">{s.title}</span>
            <span className="session-actions">
              <button onClick={(e) => renameSession(s.id, e)} title="Rename">✎</button>
              <button onClick={(e) => deleteSession(s.id, e)} title="Delete">🗑</button>
            </span>
          </div>
        ))}
      </div>

      <div className="main">
        {activeId ? (
          <>
            <div className="hero-label">{activeSession?.title || "Session"}</div>
            <h1 className="hero-title">What shall we conjure?</h1>
            <form className={`prompt-bar ${generating ? "generating" : ""}`} onSubmit={generate}>
              <input
                placeholder="a moth made of stained glass, backlit..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button className="generate-btn" type="submit" disabled={generating}>
                {generating ? "Conjuring…" : "Generate"}
              </button>
            </form>
            {error && <p className="inline-error">{error}</p>}
            {images.length === 0 ? (
              <p className="empty-state">Nothing conjured yet — describe an image above to begin.</p>
            ) : (
              <div className="gallery">
                {images.map((img) => (
                  <div key={img.id} className="card">
                    <a href={`${API}${img.image_url}`} target="_blank" rel="noreferrer">
                      <img src={`${API}${img.image_url}`} alt={img.prompt} className="card-img" />
                    </a>
                    <div className="card-caption">
                      {img.prompt}
                      <a className="card-download" href={`${API}${img.image_url}`} download>Download</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="empty-state">Create or select a session to start generating images.</p>
        )}
      </div>
    </div>
  );
}

// ---------------- History page ----------------
function HistoryPage({ token }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  async function load() {
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    const res = await fetch(`${API}/api/history?${params}`, { headers: authHeaders(token) });
    setItems(await res.json());
  }

  useEffect(() => { load(); }, [search]);

  return (
    <div className="main" style={{ width: "100%" }}>
      <div className="hero-label">All generations</div>
      <h1 className="hero-title">History</h1>
      <input
        className="search-bar"
        placeholder="Search prompts…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {items.length === 0 ? (
        <p className="empty-state">No generations found.</p>
      ) : (
        <div className="gallery">
          {items.map((img) => (
            <div key={img.id} className="card">
              <a href={`${API}${img.image_url}`} target="_blank" rel="noreferrer">
                <img src={`${API}${img.image_url}`} alt={img.prompt} className="card-img" />
              </a>
              <div className="card-caption">
                {img.prompt}
                <div className="card-date">{new Date(img.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Styles ----------------
function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body, #root { height: 100%; margin: 0; }
      body {
        font-family: 'Inter', sans-serif;
        background: #0F0E13;
        color: #F2F0EA;
      }
      .root { min-height: 100vh; display: flex; flex-direction: column; }
      .topbar {
        display: flex; align-items: center; justify-content: space-between;
        padding: 18px 28px; border-bottom: 1px solid #211F2B;
      }
      .brand {
        font-family: 'Fraunces', serif; font-size: 20px; font-weight: 500;
        display: flex; align-items: center; gap: 10px;
      }
      .brand-mark {
        width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
        background: linear-gradient(135deg,#8B7FFF,#FF7A59);
      }
      .nav { display: flex; gap: 4px; background: #18171F; padding: 4px; border-radius: 10px; }
      .nav button {
        font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
        padding: 7px 16px; border-radius: 7px; border: none; background: transparent;
        color: #8D8A99; cursor: pointer; transition: all .15s ease;
      }
      .nav button.active { background: #2A2833; color: #F2F0EA; }
      .logout {
        font-size: 13px; color: #8D8A99; background: none; border: 1px solid #2A2833;
        padding: 7px 14px; border-radius: 7px; cursor: pointer;
      }
      .body { display: flex; flex: 1; min-height: 0; }
      .sidebar { width: 240px; border-right: 1px solid #211F2B; padding: 20px 14px; flex-shrink: 0; }
      .new-session {
        width: 100%; font-size: 13px; font-weight: 500; padding: 10px 12px; border-radius: 9px;
        border: 1px dashed #3A374A; background: transparent; color: #B8B4C4; cursor: pointer;
        margin-bottom: 16px; transition: all .15s ease;
      }
      .new-session:hover { border-color: #8B7FFF; color: #F2F0EA; }
      .session-label {
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
        color: #6B6878; padding: 0 8px; margin-bottom: 8px;
      }
      .session-item {
        display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px;
        font-size: 13.5px; color: #B8B4C4; cursor: pointer; margin-bottom: 2px;
      }
      .session-item.active { background: #1E1D26; color: #F2F0EA; }
      .session-dot { width: 6px; height: 6px; border-radius: 50%; background: #3A374A; flex-shrink: 0; }
      .session-item.active .session-dot { background: #8B7FFF; }
      .session-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .session-actions { display: none; gap: 4px; }
      .session-item:hover .session-actions { display: flex; }
      .session-actions button {
        background: none; border: none; color: #8D8A99; cursor: pointer; font-size: 12px; padding: 2px;
      }
      .main { flex: 1; padding: 32px 40px; overflow-y: auto; }
      .hero-label {
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;
        color: #FF7A59; margin-bottom: 8px; font-weight: 500;
      }
      .hero-title { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 500; margin: 0 0 24px 0; }
      .prompt-bar {
        display: flex; gap: 10px; padding: 6px 6px 6px 18px; background: #18171F;
        border: 1px solid #2A2833; border-radius: 14px; margin-bottom: 16px;
        transition: box-shadow .3s ease, border-color .3s ease;
      }
      .prompt-bar.generating {
        border-color: #8B7FFF;
        box-shadow: 0 0 0 3px rgba(139,127,255,0.15), 0 0 24px rgba(139,127,255,0.25);
      }
      .prompt-bar input {
        flex: 1; background: transparent; border: none; outline: none; color: #F2F0EA;
        font-family: 'JetBrains Mono', monospace; font-size: 14px; padding: 10px 0;
      }
      .prompt-bar input::placeholder { color: #5C596A; }
      .generate-btn {
        font-weight: 600; font-size: 13.5px; padding: 0 22px; border-radius: 10px; border: none;
        background: linear-gradient(135deg,#FF7A59,#8B7FFF); color: #0F0E13; cursor: pointer; white-space: nowrap;
      }
      .generate-btn:disabled { opacity: 0.6; cursor: default; }
      .inline-error { color: #FF7A59; font-size: 13px; margin: 0 0 16px 0; }
      .empty-state { color: #6B6878; font-size: 14px; margin-top: 20px; }
      .search-bar {
        width: 100%; max-width: 340px; padding: 10px 14px; margin-bottom: 24px;
        background: #18171F; border: 1px solid #2A2833; border-radius: 10px;
        color: #F2F0EA; font-size: 13.5px; outline: none;
      }
      .gallery {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; margin-top: 24px;
      }
      .card {
        border-radius: 14px; overflow: hidden; background: #18171F; border: 1px solid #211F2B;
        animation: develop 0.6s ease both;
      }
      @keyframes develop {
        from { opacity: 0; transform: translateY(8px) scale(0.98); filter: blur(4px) saturate(0); }
        to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0) saturate(1); }
      }
      .card-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
      .card-caption {
        padding: 12px 14px; font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
        color: #8D8A99; line-height: 1.4;
      }
      .card-date { color: #5C596A; margin-top: 4px; }
      .card-download {
        display: inline-block; margin-top: 6px; color: #8B7FFF; text-decoration: none; font-size: 11px;
      }
      .auth-wrap { flex: 1; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
      .auth-card { width: 340px; background: #18171F; border: 1px solid #211F2B; border-radius: 18px; padding: 32px; }
      .auth-title { font-family: 'Fraunces', serif; font-size: 24px; margin: 0 0 4px 0; }
      .auth-sub { font-size: 13px; color: #8D8A99; margin: 0 0 24px 0; }
      .auth-input {
        width: 100%; padding: 11px 14px; margin-bottom: 10px; background: #0F0E13;
        border: 1px solid #2A2833; border-radius: 9px; color: #F2F0EA; font-size: 13.5px; outline: none;
      }
      .auth-error { color: #FF7A59; font-size: 12.5px; margin: 4px 0 10px 0; }
      .auth-btn {
        width: 100%; padding: 11px; margin-top: 6px; background: linear-gradient(135deg,#FF7A59,#8B7FFF);
        border: none; border-radius: 9px; color: #0F0E13; font-weight: 600; font-size: 13.5px; cursor: pointer;
      }
      .auth-btn:disabled { opacity: 0.7; cursor: default; }
      .auth-switch { text-align: center; font-size: 12.5px; color: #8D8A99; margin-top: 16px; cursor: pointer; }
      @media (max-width: 720px) {
        .body { flex-direction: column; }
        .sidebar { width: 100%; border-right: none; border-bottom: 1px solid #211F2B; }
      }
    `}</style>
  );
}