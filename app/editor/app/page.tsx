"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { sendToDesignDesk } from "../lib/exportToDesignDesk";

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

  // DesignDesk opens this editor with ?token=<supabase access token>&return=<app url>.
  // Read them, then strip from the address bar so the token isn't left in history.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("token");
    const r = p.get("return");
    if (t) setToken(t);
    if (r) setReturnUrl(r);
    if (t || r) window.history.replaceState({}, "", window.location.pathname);
  }, []);

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

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {/* @ts-expect-error — Editor ships loose TS source; props verified at runtime during the spike */}
      <Editor layoutVersion="v2" projectId="designdesk-spike" onSave={async () => {}} />

      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(22,19,16,0.92)",
          border: "1px solid rgba(253,252,248,0.15)",
          padding: 10,
          borderRadius: 12,
        }}
      >
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
        {status ? <span style={{ color: "#fdfcf8", fontSize: 12, maxWidth: 220 }}>{status}</span> : null}
      </div>
    </div>
  );
}
