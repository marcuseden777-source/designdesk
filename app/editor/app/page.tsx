"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendToDesignDesk } from "../lib/exportToDesignDesk";
import { geometryToSceneGraph, type SceneGraph } from "../lib/geometryToScene";
import {
  fetchSessionScene,
  listSessions,
  saveSessionScene,
  uploadPlanForGeometry,
  type SessionSummary,
} from "../lib/importGeometry";
import { supabase } from "../lib/supabase";

// The Pascal editor is a heavy R3F/WebGPU client shell — never SSR it.
const Editor = dynamic(
  () => import("@pascal-app/editor").then((m: any) => m.Editor),
  { ssr: false, loading: () => <Splash label="Loading 3D Layout Studio…" /> }
);

// ─── Shared palette (DesignDesk dark glass) ──────────────────────────────────
const INK = "rgba(22,19,16,0.92)";
const INK_SOFT = "rgba(22,19,16,0.72)";
const LINE = "1px solid rgba(253,252,248,0.15)";
const OFF_WHITE = "#fdfcf8";
const TERRACOTTA = "#b85c38";
const GREEN = "#3f6f52";

function Splash({ label }: { label: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "#161310", color: "#d98b6a", fontSize: 14 }}>
      {label}
    </div>
  );
}

// The vendored editor gates its loading overlay on the viewer signalling
// `isViewerSceneReady`, which doesn't re-fire when a full scene is applied
// programmatically (as our import does) — so the spinner can stick even though
// the 3D has rendered behind it. Dismiss it for a few seconds after an apply.
function dismissSceneLoader() {
  let ticks = 0;
  const iv = setInterval(() => {
    document.querySelectorAll('[class*="pascal-loader"]').forEach((el) => {
      const overlay = (el.closest(".fixed") ?? el.parentElement) as HTMLElement | null;
      if (overlay) overlay.style.display = "none";
    });
    if (++ticks > 40) clearInterval(iv); // ~8s
  }, 200);
}

// Apply a scene to the live editor. The viewer's pipeline (geometry builds,
// ready signal, drawing) is rAF-driven, so with the tab visible the scene
// appears within a few seconds; hidden tabs pause rAF (browser throttling),
// which is expected, not a hang.
async function applyImportedGraph(graph: unknown): Promise<void> {
  const { applySceneGraphToEditor } = await import("@pascal-app/editor");
  applySceneGraphToEditor(graph as any);
  dismissSceneLoader();
}

// Draw-from-scratch continuity: unsaved scratch scenes live in localStorage
// until a session exists to autosave into.
const SCRATCH_KEY = "designdesk-studio-scratch";

function stashScratchScene(scene: SceneGraph) {
  try {
    const json = JSON.stringify(scene);
    if (json.length < 2_000_000) localStorage.setItem(SCRATCH_KEY, json);
  } catch {
    // Quota/serialisation issues never block editing.
  }
}

function readScratchScene(): SceneGraph | null {
  try {
    const raw = localStorage.getItem(SCRATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.nodes && Array.isArray(parsed.rootNodeIds) ? parsed : null;
  } catch {
    return null;
  }
}

type SaveState = "idle" | "pending" | "saving" | "saved" | "paused" | "error";

export default function Page() {
  // ── Auth ──
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ── Project binding + activity ──
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [ready, setReady] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // ── Projects panel ──
  const [panelOpen, setPanelOpen] = useState(false);
  const [projects, setProjects] = useState<SessionSummary[] | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  // ── Small-screen guard ──
  const [tooSmall, setTooSmall] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  // Refs mirrored for the autosave closure (subscription outlives renders).
  const sessionIdRef = useRef<string | null>(null);
  const deepTokenRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  // Deep-link token (?token= from the app) beats the Studio's own session.
  const resolveToken = useCallback(async (): Promise<string | null> => {
    if (deepTokenRef.current) return deepTokenRef.current;
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  // ── Boot: params, auth state, small-screen, scratch restore ──
  useEffect(() => {
    const check = () => setTooSmall(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("token");
    const r = p.get("return");
    const sid = p.get("session_id");
    if (t) deepTokenRef.current = t;
    if (r) setReturnUrl(r);
    // Strip auth material from the address bar (history hygiene).
    if (t || r || sid) window.history.replaceState({}, "", window.location.pathname);
    setReady(true);

    // App-first flow (?session_id=): reopen that project once the editor has
    // mounted. A saved Studio scene wins over the vision-extracted geometry.
    if (sid && t) {
      setSessionId(sid);
      (async () => {
        try {
          const s = await fetchSessionScene(sid, t);
          const graph = s.editorScene ?? (s.geometry ? geometryToSceneGraph(s.geometry) : null);
          if (graph) window.setTimeout(() => void applyImportedGraph(graph), 1600);
          else setStatus("This session has no layout yet — import its floor plan or draw one.");
        } catch (e: any) {
          setStatus(`✗ ${e.message ?? "Could not load the session."}`);
        }
      })();
    } else {
      // Scratch continuity: restore an unsent draft from a previous visit.
      const scratch = readScratchScene();
      if (scratch) {
        window.setTimeout(() => void applyImportedGraph(scratch), 1600);
        setStatus("Restored your unsent draft.");
      } else {
        setShowHint(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Debug seeder (dev + prod behind ?__dbg): window.__seed(geo) applies a scene
  // from raw geometry — verifies converter + rendering without the backend.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && !window.location.search.includes("__dbg")) return;
    (window as any).__seed = async (geo: any) => {
      const g = geometryToSceneGraph(geo, geo?.__imageUrl ? { imageUrl: geo.__imageUrl } : {});
      if (g) await applyImportedGraph(g);
      return g;
    };
  }, []);

  // ── Autosave (Editor drives the debounce; we route the write) ──
  const handleAutoSave = useCallback(
    async (scene: SceneGraph, opts?: { keepalive?: boolean }) => {
      const sid = sessionIdRef.current;
      const token = sid ? await resolveToken() : null;
      if (sid && token) {
        await saveSessionScene(sid, token, scene, { keepalive: opts?.keepalive });
      } else {
        stashScratchScene(scene);
      }
    },
    [resolveToken]
  );

  // Mount with an empty scene; imported/reopened scenes are applied post-mount
  // so they don't race the viewer's mount/ready cycle.
  async function handleLoad() {
    return null;
  }

  // ── Actions ──
  async function handleImport(file: File) {
    const token = await resolveToken();
    if (!token) {
      setStatus("Sign in first to import a floor plan.");
      return;
    }
    setImporting(true);
    setShowHint(false);
    setStatus("Reading floor plan… (about a minute)");
    try {
      const imported = await uploadPlanForGeometry(file, token);
      const graph = geometryToSceneGraph(imported.geometry);
      if (!graph) {
        setStatus("No rooms detected in that image — try a clearer plan.");
        return;
      }
      if (imported.sessionId) setSessionId(imported.sessionId);
      await applyImportedGraph(graph);
      setStatus(`✓ Generated ${imported.geometry.rooms.length} rooms — the 3D appears in a few seconds. Adjust, then Send.`);
    } catch (e: any) {
      setStatus(`✗ ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  async function openProjectsPanel() {
    const token = await resolveToken();
    if (!token) {
      setStatus("Sign in first to open your projects.");
      return;
    }
    setPanelOpen(true);
    setPanelError(null);
    setProjects(null);
    try {
      setProjects(await listSessions(token));
    } catch (e: any) {
      setPanelError(e.message ?? "Could not load projects.");
    }
  }

  async function openProject(p: SessionSummary) {
    const token = await resolveToken();
    if (!token) return;
    setPanelOpen(false);
    setShowHint(false);
    setStatus("Opening project…");
    try {
      const s = await fetchSessionScene(p.id, token);
      const graph = s.editorScene ?? (s.geometry ? geometryToSceneGraph(s.geometry) : null);
      if (!graph) {
        setStatus("That session has no 3D layout yet — import its floor plan to generate one.");
        return;
      }
      setSessionId(p.id);
      await applyImportedGraph(graph);
      setStatus(s.editorScene ? "✓ Project reopened." : "✓ Generated from the session's floor plan.");
    } catch (e: any) {
      setStatus(`✗ ${e.message}`);
    }
  }

  async function handleSend() {
    const token = await resolveToken();
    if (!token) {
      setStatus("Sign in first to send the layout.");
      return;
    }
    setBusy(true);
    setStatus("Sending to DesignDesk…");
    try {
      const { session_id } = await sendToDesignDesk({ token, projectType: "condo" });
      // Bind the created session so the scene keeps cloud-saving from here on,
      // and clear the local scratch (it lives in the cloud now).
      setSessionId((prev) => prev ?? session_id);
      try {
        localStorage.removeItem(SCRATCH_KEY);
      } catch {}
      if (returnUrl) {
        setStatus("✓ Sent — returning to DesignDesk…");
        const sep = returnUrl.includes("?") ? "&" : "?";
        window.location.href = `${returnUrl}${sep}session_id=${encodeURIComponent(session_id)}`;
        return;
      }
      setStatus(`✓ Sent to DesignDesk — session ${session_id.slice(0, 8)}… now has this layout.`);
    } catch (e: any) {
      setStatus(`✗ ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setLoginBusy(true);
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) throw error;
    } catch (err: any) {
      setLoginError(err.message ?? "Sign-in failed.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase?.auth.signOut();
    deepTokenRef.current = null;
  }

  const signedIn = Boolean(userEmail) || Boolean(deepTokenRef.current);
  const showLogin = authReady && ready && !signedIn;

  // ── Styles ──
  const btn = (bg: string, disabled: boolean): React.CSSProperties => ({
    background: disabled ? "rgba(253,252,248,0.1)" : bg,
    color: OFF_WHITE,
    border: 0,
    borderRadius: 999,
    padding: "7px 14px",
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? "default" : "pointer",
    whiteSpace: "nowrap",
  });
  const ghostBtn: React.CSSProperties = {
    background: "transparent",
    color: "rgba(253,252,248,0.65)",
    border: LINE,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const saveLabel: Record<SaveState, string> = {
    idle: "",
    pending: "Unsaved changes",
    saving: "Saving…",
    saved: sessionId ? "Saved to cloud" : "Saved on this device",
    paused: "",
    error: "Save failed — retrying on next change",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#161310" }}>
      {ready ? (
        // @ts-expect-error — Editor ships loose TS source; props verified at runtime.
        <Editor
          layoutVersion="v2"
          projectId={sessionId ?? "designdesk-studio"}
          onLoad={handleLoad}
          onSave={handleAutoSave}
          onSaveStatusChange={(s: SaveState) => setSaveState(s)}
        />
      ) : (
        <Splash label="Preparing 3D Layout Studio…" />
      )}

      {/* ── Header bar ── */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "linear-gradient(rgba(13,10,8,0.85), rgba(13,10,8,0.55) 75%, transparent)",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.25em",
            color: "rgba(253,252,248,0.9)",
          }}
        >
          DESIGN<span style={{ color: "#d98b6a" }}>DESK</span>
          <span
            style={{
              marginLeft: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              fontSize: 11,
              color: "rgba(253,252,248,0.5)",
            }}
          >
            3D LAYOUT STUDIO
          </span>
        </p>

        <div style={{ flex: 1 }} />

        {/* Save state chip */}
        {signedIn && saveLabel[saveState] ? (
          <span
            style={{
              pointerEvents: "none",
              fontSize: 11,
              color:
                saveState === "error"
                  ? "#e08f6d"
                  : saveState === "saved"
                    ? "rgba(150,190,160,0.9)"
                    : "rgba(253,252,248,0.5)",
            }}
          >
            {saveLabel[saveState]}
          </span>
        ) : null}

        <div style={{ display: "flex", gap: 8, alignItems: "center", pointerEvents: "auto" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.currentTarget.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing || !signedIn}
            title="Upload a floor-plan image to generate the 3D layout"
            style={btn(GREEN, importing || !signedIn)}
          >
            {importing ? "Reading…" : "⬆ Import floor plan"}
          </button>
          <button onClick={openProjectsPanel} disabled={!signedIn} style={ghostBtn}>
            Open
          </button>
          <button onClick={handleSend} disabled={busy || !signedIn} style={btn(TERRACOTTA, busy || !signedIn)}>
            {busy ? "Sending…" : "Send to DesignDesk"}
          </button>
          {userEmail ? (
            <>
              <span style={{ fontSize: 11, color: "rgba(253,252,248,0.45)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>
                {userEmail}
              </span>
              <button onClick={handleSignOut} style={ghostBtn}>
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </header>

      {/* ── Status toast ── */}
      {status ? (
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 14,
            zIndex: 1100,
            maxWidth: 340,
            color: OFF_WHITE,
            fontSize: 12,
            background: INK,
            border: LINE,
            padding: "8px 12px",
            borderRadius: 10,
          }}
        >
          {status}
          <button
            onClick={() => setStatus("")}
            style={{ marginLeft: 10, background: "none", border: 0, color: "rgba(253,252,248,0.5)", cursor: "pointer", fontSize: 12 }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* ── First-visit hint ── */}
      {showHint && signedIn ? (
        <div
          style={{
            position: "absolute",
            bottom: 96,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1050,
            pointerEvents: "none",
            background: INK_SOFT,
            border: LINE,
            borderRadius: 12,
            padding: "8px 14px",
            color: "rgba(253,252,248,0.75)",
            fontSize: 12.5,
            whiteSpace: "nowrap",
          }}
        >
          Draw walls with the toolbar below — or <b>Import a floor plan</b> to start from a photo.
        </div>
      ) : null}

      {/* ── Projects panel ── */}
      {panelOpen ? (
        <div
          onClick={() => setPanelOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            background: "rgba(10,8,6,0.6)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(680px, 92vw)",
              maxHeight: "78vh",
              overflowY: "auto",
              background: INK,
              border: LINE,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, color: OFF_WHITE, fontWeight: 700 }}>Your projects</h2>
              <div style={{ flex: 1 }} />
              <button onClick={() => setPanelOpen(false)} style={ghostBtn}>
                Close
              </button>
            </div>
            {panelError ? (
              <p style={{ color: "#e08f6d", fontSize: 13 }}>{panelError}</p>
            ) : projects === null ? (
              <p style={{ color: "rgba(253,252,248,0.55)", fontSize: 13 }}>Loading…</p>
            ) : projects.length === 0 ? (
              <p style={{ color: "rgba(253,252,248,0.55)", fontSize: 13 }}>
                No projects yet — import a floor plan or send a layout to create one.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openProject(p)}
                    style={{
                      textAlign: "left",
                      background: "rgba(253,252,248,0.06)",
                      border: LINE,
                      borderRadius: 12,
                      padding: 10,
                      cursor: "pointer",
                      color: OFF_WHITE,
                    }}
                  >
                    {p.floor_plan_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.floor_plan_url}
                        alt=""
                        style={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 8, background: "#0d0a08" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: 96, borderRadius: 8, background: "rgba(253,252,248,0.08)", display: "grid", placeItems: "center", fontSize: 11, color: "rgba(253,252,248,0.4)" }}>
                        No plan image
                      </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600 }}>
                      {new Date(p.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(253,252,248,0.5)" }}>
                      {[p.project_type, p.total_sqft ? `${Math.round(p.total_sqft)} sqft` : null, p.status]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Login overlay ── */}
      {showLogin ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            background: "rgba(13,10,8,0.88)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <form
            onSubmit={handleLogin}
            style={{
              width: "min(360px, 90vw)",
              background: INK,
              border: LINE,
              borderRadius: 18,
              padding: 26,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: "0.25em", color: "rgba(253,252,248,0.9)", textAlign: "center" }}>
              DESIGN<span style={{ color: "#d98b6a" }}>DESK</span>
            </p>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "rgba(253,252,248,0.55)", textAlign: "center" }}>
              Sign in to the 3D Layout Studio with your DesignDesk account.
            </p>
            {!supabase ? (
              <p style={{ color: "#e08f6d", fontSize: 12, textAlign: "center" }}>
                Studio auth isn't configured (missing Supabase environment). Open the Studio from the DesignDesk app instead.
              </p>
            ) : (
              <>
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{
                    background: "rgba(253,252,248,0.08)",
                    color: OFF_WHITE,
                    border: LINE,
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    background: "rgba(253,252,248,0.08)",
                    color: OFF_WHITE,
                    border: LINE,
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 14,
                  }}
                />
                {loginError ? <p style={{ margin: 0, color: "#e08f6d", fontSize: 12 }}>{loginError}</p> : null}
                <button type="submit" disabled={loginBusy} style={{ ...btn(TERRACOTTA, loginBusy), padding: "11px 14px", fontSize: 14 }}>
                  {loginBusy ? "Signing in…" : "Sign in"}
                </button>
              </>
            )}
            <a
              href="https://movarasolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 4, textAlign: "center", fontSize: 11, color: "rgba(253,252,248,0.35)", textDecoration: "none" }}
            >
              Powered by movarasolutions.com
            </a>
          </form>
        </div>
      ) : null}

      {/* ── Small-screen guard ── */}
      {tooSmall ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1500,
            background: "#161310",
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 320 }}>
            <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.25em", color: "rgba(253,252,248,0.9)" }}>
              DESIGN<span style={{ color: "#d98b6a" }}>DESK</span>
            </p>
            <p style={{ color: OFF_WHITE, fontSize: 15, fontWeight: 600, margin: "10px 0 6px" }}>
              The 3D Layout Studio needs a bigger screen.
            </p>
            <p style={{ color: "rgba(253,252,248,0.55)", fontSize: 13, lineHeight: 1.5 }}>
              Open this page on a desktop or laptop to build and edit 3D layouts. The DesignDesk app on your phone handles everything else.
            </p>
          </div>
        </div>
      ) : null}

      {/* Bottom-right: agency credit */}
      <a
        href="https://movarasolutions.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 1000,
          color: "rgba(253,252,248,0.45)",
          fontSize: 11,
          textDecoration: "none",
          background: "rgba(22,19,16,0.6)",
          border: "1px solid rgba(253,252,248,0.1)",
          padding: "4px 10px",
          borderRadius: 999,
        }}
      >
        Powered by movarasolutions.com
      </a>
    </div>
  );
}
