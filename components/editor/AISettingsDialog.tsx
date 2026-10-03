"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, PauseCircle, RefreshCw, X, XCircle } from "lucide-react";
import type { AIProviderStatus, ReferenceDetail } from "@/lib/ai/types";

type Props = {
  open: boolean;
  enabled: boolean;
  status: AIProviderStatus | null;
  onStatus: (status: AIProviderStatus) => void;
  onClose: () => void;
  referenceDetail: ReferenceDetail;
  onReferenceDetail: (detail: ReferenceDetail) => void;
};

export function AISettingsDialog({ open, enabled, status, onStatus, onClose, referenceDetail, onReferenceDetail }: Props) {
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !enabled) return;
    let active = true;
    void fetch("/api/ai/status", { cache: "no-store" })
      .then((response) => response.json() as Promise<AIProviderStatus>)
      .then((value) => { if (active) onStatus(value); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [enabled, open, onStatus]);

  if (!open) return null;

  const test = async () => {
    if (!enabled) return;
    setTesting(true);
    setMessage("");
    try {
      const response = await fetch("/api/ai/status", { method: "POST" });
      const value = await response.json() as AIProviderStatus & { error?: string };
      onStatus(value);
      setMessage(response.ok ? "Responses API connection verified." : value.error ?? value.message);
    } catch {
      setMessage("CreatorMake could not reach its AI status endpoint.");
    } finally {
      setTesting(false);
    }
  };

  return <div className="dialog-overlay" role="presentation">
    <section className="ai-settings-dialog" role="dialog" aria-modal="true" aria-label="CreatorMake settings">
      <header>
        <div><span className="eyebrow">SETTINGS → AI</span><h2>Generation provider</h2><p>Provider architecture is preserved server-side and remains isolated from project files.</p></div>
        <button className="dialog-close" aria-label="Close settings" onClick={onClose}><X size={18}/></button>
      </header>
      <div className="ai-settings-body">
        {!enabled ? <section className="provider-card disabled">
          <div><PauseCircle size={20}/><span><strong>AI Generation</strong><small>TEMPORARILY DISABLED</small></span></div>
          <p>CreatorMake is focused on professional manual editing during this development phase. The provider, tool registry, and multimodal architecture remain available behind the server feature flag.</p>
          <aside><strong>Feature flag</strong><code>CREATORMAKE_AI_ENABLED=false</code><p>No prompt UI is rendered and AI routes reject requests while disabled.</p></aside>
        </section> : <>
          <section className={`provider-card ${status?.connected ? "connected" : "not-configured"}`}>
            <div>{status?.connected ? <CheckCircle2 size={20}/> : <XCircle size={20}/>}<span><strong>OpenAI</strong><small>{status?.configured ? status.connected ? "CONNECTED" : "CONFIGURED · NOT TESTED" : "NOT CONFIGURED"}</small></span></div>
            <dl><dt>Model</dt><dd>{status?.model ?? "Loading…"}</dd><dt>API</dt><dd>Responses API · server-side</dd></dl>
            <p>{status?.message}</p>
            <button onClick={() => void test()} disabled={testing}><RefreshCw className={testing ? "spin" : ""} size={14}/>{testing ? "Testing…" : "Test Connection"}</button>
          </section>
          <label><span>Default generation engine</span><select defaultValue="Precise AI"><option>Local Generator</option><option>Fast AI</option><option>Balanced AI</option><option>Precise AI</option></select></label>
          <label><span>Reference detail</span><select value={referenceDetail} onChange={(event) => onReferenceDetail(event.target.value as ReferenceDetail)}><option value="auto">Auto</option><option value="high">High</option><option value="original">Original</option></select></label>
          <label><span>Research</span><select defaultValue="Ask"><option>Automatic</option><option>Ask</option><option>Off</option></select></label>
          <label><span>Visual repair</span><select defaultValue="2 Passes"><option>Off</option><option>1 Pass</option><option>2 Passes</option></select></label>
          {message && <output>{message}</output>}
          <aside><strong>Server configuration</strong><code>OPENAI_API_KEY</code><code>CREATORMAKE_AI_MODEL={status?.model ?? "gpt-5.6-sol"}</code><p>Set these in the server environment, not in a CreatorMake project file.</p></aside>
        </>}
      </div>
    </section>
  </div>;
}
