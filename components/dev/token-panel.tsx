"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function DevTokenPanel() {
  if (process.env.NODE_ENV !== "development") return null;

  return <DevTokenPanelInner />;
}

function DevTokenPanelInner() {
  const { idToken, refreshIdToken } = useAuth();
  const [serverResponse, setServerResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!idToken) return;
    await navigator.clipboard.writeText(idToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    await refreshIdToken();
  };

  const handleSendToServer = async () => {
    if (!idToken) return;
    setSending(true);
    setServerResponse(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "https://tutor-ai.up.railway.app"}/api/v1/auth/session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ device_type: "web", device_name: "PilotAI Dev Panel" }),
        }
      );
      const data = await res.json();
      setServerResponse(JSON.stringify(data, null, 2));
      console.log("[DevPanel] Server response:", data);
    } catch (err) {
      setServerResponse(String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[420px] max-h-[80vh] overflow-y-auto bg-black border border-yellow-500/40 rounded-xl p-4 shadow-2xl text-xs font-mono">
      <div className="flex items-center justify-between mb-3">
        <span className="text-yellow-400 font-semibold">DEV — Token Panel</span>
        <span className="text-white/30 text-[10px]">NODE_ENV=development</span>
      </div>

      <label className="block text-white/40 mb-1">Firebase ID Token</label>
      <textarea
        readOnly
        value={idToken ?? "(no token — sign in first)"}
        rows={4}
        className="w-full bg-white/5 border border-white/10 rounded p-2 text-white/80 resize-none text-[10px] leading-relaxed mb-2 select-all"
        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
      />

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleCopy}
          disabled={!idToken}
          className="flex-1 h-8 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white transition-colors"
        >
          {copied ? "Copied!" : "Copy Token"}
        </button>
        <button
          onClick={handleRefresh}
          className="flex-1 h-8 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          Refresh Token
        </button>
        <button
          onClick={handleSendToServer}
          disabled={!idToken || sending}
          className="flex-1 h-8 rounded bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-30 text-yellow-300 transition-colors"
        >
          {sending ? "Sending…" : "Send to Server"}
        </button>
      </div>

      {serverResponse && (
        <>
          <label className="block text-white/40 mb-1">Server Response</label>
          <pre className="w-full bg-white/5 border border-white/10 rounded p-2 text-green-300 text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
            {serverResponse}
          </pre>
        </>
      )}
    </div>
  );
}
