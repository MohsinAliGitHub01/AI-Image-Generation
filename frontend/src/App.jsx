import React, { useEffect, useState } from "react";

const API = "https://ai-image-generation-3f1x.onrender.com";

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [view, setView] = useState("app"); // "app" | "history"

  if (!token) return <AuthForm onAuth={(t) => { localStorage.setItem("token", t); setToken(t); }} />;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <button onClick={() => setView("app")}>Generate</button>{" "}
          <button onClick={() => setView("history")}>History</button>
        </div>
        <button onClick={() => { localStorage.removeItem("token"); setToken(""); }}>Logout</button>
      </div>
      {view === "app" ? <MainApp token={token} /> : <HistoryPage token={token} />}
    </div>
  );
}

// ---------------- Auth ----------------
function AuthForm({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      onAuth(data.access_token);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 300, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h2>{mode === "login" ? "Login" : "Register"}</h2>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", marginBottom: 8 }} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", marginBottom: 8 }} />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" style={{ width: "100%" }}>{mode === "login" ? "Login" : "Register"}</button>
      <p onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ cursor: "pointer", color: "blue" }}>
        {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
      </p>
    </form>
  );
}

// ---------------- Main app: sessions + generation ----------------
function MainApp({ token }) {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [images, setImages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadSessions() {
    const res = await fetch(`${API}/api/sessions`, { headers: authHeaders(token) });
    const data = await res.json();
    setSessions(data);
    if (!activeId && data.length) setActiveId(data[0].id);
  }

  async function loadImages(sessionId) {
    if (!sessionId) return;
    const res = await fetch(`${API}/api/sessions/${sessionId}/images`, { headers: authHeaders(token) });
    setImages(await res.json());
  }

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { loadImages(activeId); }, [activeId]);

  async function createSession() {
    const res = await fetch(`${API}/api/sessions`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ title: "New Chat" }),
    });
    const data = await res.json();
    setSessions([data, ...sessions]);
    setActiveId(data.id);
  }

  async function renameSession(id) {
    const title = window.prompt("New session title:");
    if (!title) return;
    await fetch(`${API}/api/sessions/${id}`, {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ title }),
    });
    loadSessions();
  }

  async function deleteSession(id) {
    if (!window.confirm("Delete this session?")) return;
    await fetch(`${API}/api/sessions/${id}`, { method: "DELETE", headers: authHeaders(token) });
    setActiveId(null);
    loadSessions();
  }

  async function generate() {
    if (!prompt.trim() || !activeId) return;
    setLoading(true);
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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
      {/* Sidebar */}
      <div style={{ width: 220 }}>
        <button onClick={createSession}>+ New Session</button>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {sessions.map((s) => (
            <li key={s.id} style={{ background: s.id === activeId ? "#eee" : "transparent", padding: 4 }}>
              <span onClick={() => setActiveId(s.id)} style={{ cursor: "pointer" }}>{s.title}</span>{" "}
              <button onClick={() => renameSession(s.id)}>✎</button>
              <button onClick={() => deleteSession(s.id)}>🗑</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main panel */}
      <div style={{ flex: 1 }}>
        {activeId ? (
          <>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ flex: 1 }}
                placeholder="Describe the image you want..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
              />
              <button onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate"}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
              {images.map((img) => (
                <div key={img.id}>
                  <img src={`${API}${img.image_url}`} alt={img.prompt} style={{ width: "100%" }} />
                  <p style={{ fontSize: 12 }}>{img.prompt}</p>
                  <a href={`${API}${img.image_url}`} download>Download</a>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>Create or select a session to start generating images.</p>
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
    <div style={{ marginTop: 20 }}>
      <input placeholder="Search prompts..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
        {items.map((img) => (
          <div key={img.id}>
            <img src={`${API}${img.image_url}`} alt={img.prompt} style={{ width: "100%" }} />
            <p style={{ fontSize: 12 }}>{img.prompt}</p>
            <p style={{ fontSize: 10, color: "#666" }}>{new Date(img.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}