"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { sendToDesignDesk } from "../lib/exportToDesignDesk";
import { geometryToSceneGraph } from "../lib/geometryToScene";
import { fetchSessionGeometry, uploadPlanForGeometry } from "../lib/importGeometry";

// The Pascal editor is a heavy R3F/WebGPU client shell — never SSR it.
const Editor = dynamic(
  () => import("@pascal-app/editor").then((m: any) => m.Editor),
  { ssr: false, loading: () => <Splash label="Loading 3D Layout Studio…" /> }
);

function Splash({ label }: { label: string }) {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", color: "#d98b6a" }}>
      {label}
    </div>
  );
}

export default function Page() {
  const [token, setToken] = useState("");
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Params captured before we strip the URL, so <Editor onLoad> (which fires
  // after this component's effect) can read them.
  const params = useRef<{ token: string; sessionId: string | null; returnUrl: string | null }>({
    token: "",
    sessionId: null,
    returnUrl: null,
  });

  // DesignDesk opens this editor with ?token=<supabase token>&return=<app url>
  // and, for the import flow, &session_id=<id>. Read them, then strip from the
  // address bar so the token isn't left in history.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("token") ?? "";
    const r = p.get("return");
    const sid = p.get("session_id");
    params.current = { token: t, sessionId: sid, returnUrl: r };
    if (t) setToken(t);
    if (r) setReturnUrl(r);
    if (t || r || sid) window.history.replaceState({}, "", window.location.pathname);
    setReady(true);
  }, []);

  // Dev-only: seed a scene from geometry via the console (window.__seed(geo)),
  // so the converter + rendering can be verified without the backend. Stripped
  // from production builds by dead-code elimination.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as any).__seed = async (geo: any) => {
      const g = geometryToSceneGraph(geo, geo?.__imageUrl ? { imageUrl: geo.__imageUrl } : {});
      if (g) {
        const { applySceneGraphToEditor } = await import("@pascal-app/editor");
        applySceneGraphToEditor(g);
      }
      return g;
    };
  }, []);

  // If launched with ?session_id=, hydrate the scene from that session's geometry.
  async function handleLoad() {
    const { sessionId, token: tk } = params.current;
    if (!sessionId || !tk) return null;
    try {
      const imported = await fetchSessionGeometry(sessionId, tk);
      if (!imported) return null;
      return geometryToSceneGraph(imported.geometry, { imageUrl: imported.floorPlanUrl });
    } catch (e) {
      console.error("Failed to load floor-plan geometry:", e);
      return null;
    }
  }

  // Editor-first: upload a plan → extract geometry → seed the live scene.
  async function handleImport(file: File) {
    if (!token) {
      setStatus("Paste your Supabase token first.");
      return;
    }
    setImporting(true);
    setStatus("Reading floor plan…");
    try {
      const imported = await uploadPlanForGeometry(file, token);
      const graph = geometryToSceneGraph(imported.geometry, { imageUrl: imported.floorPlanUrl });
      if (!graph) {
        setStatus("No rooms detected in that image.");
        return;
      }
      // Client-only: @pascal-app/editor can't SSR, so import it on demand.
      const { applySceneGraphToEditor } = await import("@pascal-app/editor");
      applySceneGraphToEditor(graph);
      setStatus(`✓ Generated ${imported.geometry.rooms.length} rooms — edit, then Send.`);
    } catch (e: any) {
      setStatus(`✗ ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleSend() {
    setBusy(true);
    setStatus("Sending…");
    try {
      const { session_id } = await sendToDesignDesk({ token, projectType: "condo" });
      if (returnUrl) {
        setStatus("✓ Sent — returning to DesignDesk…");
        const sep = returnUrl.includes("?") ? "&" : "?";
        window.location.href = `${returnUrl}${sep}session_id=${encodeURIComponent(session_id)}`;
        return;
      }
      setStatus(`✓ Created session ${session_id.slice(0, 8)}…`);
    } catch (e: any) {
      setStatus(`✗ ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const chip: React.CSSProperties = {
    background: "rgba(22,19,16,0.92)",
    border: "1px solid rgba(253,252,248,0.15)",
    padding: 10,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {ready ? (
        // @ts-expect-error — Editor ships loose TS source; props verified at runtime.
        <Editor layoutVersion="v2" projectId="designdesk-spike" onLoad={handleLoad} onSave={async () => {}} />
      ) : (
        <Splash label="Preparing 3D Layout Studio…" />
      )}

      {/* Top-left: import a floor-plan image → auto-generate the 3D layout */}
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 1000, ...chip }}>
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
          disabled={importing || !token}
          title={!token ? "Paste your Supabase token (right) first" : "Upload a floor-plan image to generate the 3D layout"}
          style={{
            background: importing || !token ? "rgba(253,252,248,0.1)" : "#3f6f52",
            color: "#fdfcf8",
            border: 0,
            borderRadius: 999,
            padding: "8px 14px",
            fontWeight: 600,
            fontSize: 13,
            cursor: importing || !token ? "default" : "pointer",
          }}
        >
          {importing ? "Reading…" : "⬆ Import floor plan"}
        </button>
      </div>

      {/* Top-right: auth token + send the (edited) layout back to DesignDesk */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1000, ...chip }}>
        <input
          placeholder="Supabase token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{
            width: 150,
            background: "rgba(253,252,248,0.08)",
            color: "#fdfcf8",
            border: "1px solid rgba(253,252,248,0.15)",
            borderRadius: 8,
            padding: "6px 8px",
            fontSize: 12,
          }}
        />
        <button
          onClick={handleSend}
          disabled={busy || !token}
          style={{
            background: busy || !token ? "rgba(253,252,248,0.1)" : "#b85c38",
            color: "#fdfcf8",
            border: 0,
            borderRadius: 999,
            padding: "8px 14px",
            fontWeight: 600,
            fontSize: 13,
            cursor: busy || !token ? "default" : "pointer",
          }}
        >
          Send to DesignDesk
        </button>
      </div>

      {/* Shared status line */}
      {status ? (
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 12,
            zIndex: 1000,
            maxWidth: 300,
            color: "#fdfcf8",
            fontSize: 12,
            background: "rgba(22,19,16,0.92)",
            border: "1px solid rgba(253,252,248,0.15)",
            padding: "6px 10px",
            borderRadius: 10,
          }}
        >
          {status}
        </div>
      ) : null}
    </div>
  );
}
