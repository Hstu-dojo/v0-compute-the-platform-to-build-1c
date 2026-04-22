"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getDocument,
  getDocumentBatches,
  generateStudySet,
  getBatchStatus,
  getOutputContent,
  type DocumentBatchesResponse,
  type Document,
  type BatchJob,
  type StudySetBatchStatusResponse,
  type StudySetGenerateResponse,
  type StudySetType,
  type Flashcard,
  type MCQQuestion,
  type FillBlankItem,
} from "@/lib/api";
import { FlashcardViewer } from "@/components/dashboard/flashcard-viewer";
import { MCQViewer } from "@/components/dashboard/mcq-viewer";
import { FillBlanksViewer } from "@/components/dashboard/fill-blanks-viewer";
import { ChevronLeft, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const OUTPUT_TYPES = [
  { id: "notes", label: "Notes" },
  { id: "flashcards", label: "Flashcards" },
  { id: "multiple_choice", label: "Multiple Choice" },
  { id: "fill_in_blanks", label: "Fill in Blanks" },
  { id: "written_test", label: "Written Test" },
  { id: "tutor_lesson", label: "Tutor Lesson" },
  { id: "content", label: "Study Guide" },
  { id: "podcast", label: "Podcast" },
] as const;

type OutputTypeId = (typeof OUTPUT_TYPES)[number]["id"];

const MARKDOWN_TYPES: OutputTypeId[] = ["notes", "tutor_lesson", "content", "written_test"];

function JobStatusBadge({ status }: { status: BatchJob["status"] }) {
  if (status === "queued") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        Queued
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-yellow-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Processing
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        Done
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-red-400">
      <XCircle className="w-3 h-3" />
      Failed
    </span>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_code]:text-foreground/80 [&_code]:bg-foreground/10 [&_code]:rounded [&_code]:px-1 [&_blockquote]:border-foreground/20 [&_a]:text-foreground/80">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function extractContent(data: unknown, type: OutputTypeId): string | Flashcard[] | MCQQuestion[] | FillBlankItem[] | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const c = d.content as Record<string, unknown> | undefined;

  if (!c) {
    if (MARKDOWN_TYPES.includes(type)) return (d.content ?? d.text ?? d.notes ?? "") as string;
    if (type === "flashcards") return (d.flashcards ?? d.cards ?? []) as Flashcard[];
    if (type === "multiple_choice") return (d.questions ?? d.multiple_choice ?? []) as MCQQuestion[];
    if (type === "fill_in_blanks") return (d.exercises ?? d.items ?? d.fill_in_blanks ?? []) as FillBlankItem[];
    return null;
  }

  if (MARKDOWN_TYPES.includes(type)) {
    return (c.markdown ?? "") as string;
  }
  if (type === "flashcards") {
    return (c.cards ?? []) as Flashcard[];
  }
  if (type === "multiple_choice") {
    return (c.questions ?? []) as MCQQuestion[];
  }
  if (type === "fill_in_blanks") {
    return (c.questions ?? []) as FillBlankItem[];
  }
  return null;
}

export default function DocumentPage() {
  const params = useParams();
  const docId = params.id as string;

  const [doc, setDoc] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);

  const [selectedTypes, setSelectedTypes] = useState<Set<OutputTypeId>>(new Set(["notes", "flashcards"]));
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [batch, setBatch] = useState<StudySetBatchStatusResponse | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [outputCache, setOutputCache] = useState<Record<string, unknown>>({});
  const [outputLoading, setOutputLoading] = useState<Record<string, boolean>>({});
  const [outputError, setOutputError] = useState<Record<string, string>>({});

  useEffect(() => {
    getDocument(docId)
      .then((res) => {
        setDoc(res.document);
        getDocumentBatches(docId).then((batchesRes) => {
          if (batchesRes.batches && batchesRes.batches.length > 0) {
            // Merge all historical jobs onto the latest batch envelope, so all past tasks appear 
            const sortedBatches = batchesRes.batches;
            const mergedJobs = new Map<StudySetType, BatchJob>();
            
            // Iterate from oldest to newest so newest overwrites older jobs of the same type
            // Assuming [0] is newest from the API, we reverse:
            [...sortedBatches].reverse().forEach(b => {
              b.jobs.forEach(j => mergedJobs.set(j.type, j));
            });

            setBatch({
              batch: sortedBatches[0].batch,
              jobs: Array.from(mergedJobs.values())
            });
          }
        }).catch(err => {
          console.error("Failed to load document batches:", err);
        });
      })
      .catch((e) => setDocError(e.message))
      .finally(() => setDocLoading(false));
  }, [docId]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startWebsocket = useCallback((payload?: { url: string; token: string }) => {
    if (!payload?.url || !payload.token) return;
    try {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const ws = new WebSocket(payload.url);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token: payload.token }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            task_type?: StudySetType;
            job_id?: string;
            output_id?: string;
            credits_consumed?: number;
            error?: string;
          };

          if (!msg.type || !msg.task_type) return;
          if (!["job_started", "job_completed", "job_failed"].includes(msg.type)) return;

          setBatch((prev) => {
            if (!prev) return prev;
            const nextJobs = prev.jobs.map((job) => {
              const sameType = job.type === msg.task_type || job.job_id === msg.job_id;
              if (!sameType) return job;

              if (msg.type === "job_started") {
                return { ...job, status: "processing" as const };
              }
              if (msg.type === "job_completed") {
                return {
                  ...job,
                  status: "completed" as const,
                  output_id: msg.output_id ?? job.output_id,
                  credits_consumed: msg.credits_consumed ?? job.credits_consumed,
                };
              }
              return {
                ...job,
                status: "failed" as const,
                error: msg.error ?? job.error,
              };
            });
            return { ...prev, jobs: nextJobs };
          });
        } catch {
          // ignore malformed websocket messages
        }
      };

      ws.onerror = () => {
        // polling fallback stays active
      };
    } catch {
      // polling fallback stays active
    }
  }, []);

  const pollBatch = useCallback(async (batchId: string) => {
    try {
      const status = await getBatchStatus(batchId);
      setBatch(prev => {
        if (!prev) return status;
        
        // Merge jobs: newly fetched status jobs overwrite existing ones of the same type.
        // This ensures the visual list acts as a unified history pane for this document.
        const existingJobsMap = new Map(prev.jobs.map(j => [j.type, j]));
        status.jobs.forEach(j => existingJobsMap.set(j.type, j));

        return {
          batch: status.batch,
          jobs: Array.from(existingJobsMap.values())
        };
      });
      const allDone = ["completed", "failed", "partial"].includes(status.batch.status);
      if (allDone) stopPolling();
    } catch (e) {
      console.error("Poll error:", e);
    }
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleRetryJob = async (type: StudySetType) => {
    setGenError(null);
    setGenerating(true);
    // Notice we do NOT clear the activeTab or output cache for other jobs
    try {
      const res = await generateStudySet({ document_id: docId, types: [type] });
      const batchId = res.batch.id;
      startWebsocket(res.websocket);
      // Start polling the new batch
      pollRef.current = setInterval(() => pollBatch(batchId), 3000);
      await pollBatch(batchId);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Retry failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    setGenError(null);
    setGenerating(true);
    // Don't fully clear `setBatch(null)` so previously generated items remain visible!
    // But we do clear activeTab/cache for fresh view if we wanted, or just strictly clear the items being re-generated.
    // For now we can keep cache unless a specific type is re-generated. Let's just clear active tab so user sees the new progress grids
    setActiveTab(null);
    try {
      const types = [...selectedTypes] as StudySetType[];
      
      // Wipe only the outputs being actively regenerated from old cache
      setOutputCache(prev => {
        const next = { ...prev };
        types.forEach(t => delete next[t]);
        return next;
      });

      const res = await generateStudySet({ document_id: docId, types });
      const batchId = res.batch.id;
      startWebsocket(res.websocket);
      // Fetch immediately to overlay the new pending jobs over the historical list
      await pollBatch(batchId);
      pollRef.current = setInterval(() => pollBatch(batchId), 3000);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const loadOutput = useCallback(async (job: BatchJob) => {
    const type = job.type;
    if (!job.output_id || outputCache[type] !== undefined) return;

    setOutputLoading((l) => ({ ...l, [type]: true }));
    setOutputError((e) => ({ ...e, [type]: "" }));
    try {
      const data = await getOutputContent(job.output_id!, type);
      setOutputCache((c) => ({ ...c, [type]: data }));
    } catch (e) {
      setOutputError((err) => ({ ...err, [type]: e instanceof Error ? e.message : "Failed to load" }));
    } finally {
      setOutputLoading((l) => ({ ...l, [type]: false }));
    }
  }, [outputCache]);

  const handleTabClick = useCallback((job: BatchJob) => {
    setActiveTab(job.type);
    loadOutput(job);
  }, [loadOutput]);

  const toggleType = (id: OutputTypeId) => {
    setSelectedTypes((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const completedJobs = batch?.jobs.filter((j) => j.status === "completed") ?? [];

  const renderOutput = (type: string) => {
    const data = outputCache[type];
    if (outputLoading[type]) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      );
    }
    if (outputError[type]) {
      return (
        <div className="flex items-center gap-2 text-red-400 py-4">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{outputError[type]}</span>
        </div>
      );
    }
    if (!data) return null;

    const typeId = type as OutputTypeId;
    const content = extractContent(data, typeId);

    if (MARKDOWN_TYPES.includes(typeId)) {
      return <MarkdownContent content={(content as string) || ""} />;
    }
    if (typeId === "flashcards") {
      return <FlashcardViewer flashcards={(content as Flashcard[]) || []} />;
    }
    if (typeId === "multiple_choice") {
      return <MCQViewer questions={(content as MCQQuestion[]) || []} />;
    }
    if (typeId === "fill_in_blanks") {
      return <FillBlanksViewer items={(content as FillBlankItem[]) || []} />;
    }
    return (
      <pre className="text-xs text-muted-foreground overflow-auto whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  if (docLoading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="h-8 w-48 rounded-lg bg-foreground/5 animate-pulse mb-8" />
        <div className="h-24 rounded-xl bg-foreground/5 animate-pulse" />
      </main>
    );
  }

  if (docError) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{docError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to documents
      </Link>

      {/* Document header */}
      <div className="mb-8 pb-6 border-b border-foreground/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display text-foreground mb-1">{doc?.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              {doc?.createdAt && (
                <span>
                  {new Date(doc.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              )}
              {doc?.pageCount && <span>· {doc.pageCount} pages</span>}
              {doc?.characterCount && <span>· {doc.characterCount.toLocaleString()} chars</span>}
            </div>
          </div>
          <span className={`shrink-0 text-[11px] font-mono px-2.5 py-1 rounded-full border ${
            doc?.status === "ready" ? "text-green-400 bg-green-500/10 border-green-500/20" :
            doc?.status === "pending_embedding" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
            "text-red-400 bg-red-500/10 border-red-500/20"
          }`}>
            {doc?.status === "pending_embedding" ? "Processing" : doc?.status}
          </span>
        </div>
      </div>

      {doc?.status !== "ready" && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 mb-8">
          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
          <p className="text-sm text-yellow-400">Document is still being processed. Please check back in a moment.</p>
        </div>
      )}

      {doc?.status === "ready" && (
        <>
          {/* Generate section */}
          {!batch && (
            <section className="mb-8">
              <h2 className="text-lg font-display text-foreground mb-4">Generate study materials</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {OUTPUT_TYPES.map(({ id, label, comingSoon }) => {
                  const isSelected = selectedTypes.has(id);
                  return (
                    <button
                      key={id}
                      onClick={() => !comingSoon && toggleType(id)}
                      disabled={!!comingSoon}
                      className={`relative px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                        comingSoon
                          ? "border-foreground/5 text-muted-foreground/30 cursor-not-allowed"
                          : isSelected
                          ? "border-foreground/40 bg-foreground/8 text-foreground"
                          : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                      }`}
                    >
                      {label}
                      {comingSoon && (
                        <span className="absolute top-1 right-1 text-[8px] font-mono text-muted-foreground/40 leading-none">
                          soon
                        </span>
                      )}
                      {isSelected && !comingSoon && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-foreground/60" />
                      )}
                    </button>
                  );
                })}
              </div>

              {genError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{genError}</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || selectedTypes.size === 0}
                className="h-11 px-8 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  "Generate"
                )}
              </button>
            </section>
          )}

          {/* Batch progress */}
          {batch && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display text-foreground">Generation progress</h2>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/study-sets/${batch.batch.id}`}
                    className="text-xs text-foreground border border-foreground/20 rounded-md px-2 py-1 hover:border-foreground/40 transition-colors"
                  >
                    Open workspace
                  </Link>
                  <button
                    onClick={() => { setBatch(null); setActiveTab(null); setOutputCache({}); stopPolling(); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    New batch
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {batch.jobs.map((job) => (
                  <div key={job.job_id} className="flex flex-col gap-2 px-4 py-3 rounded-xl border border-foreground/10 bg-foreground/2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {OUTPUT_TYPES.find((t) => t.id === job.type)?.label ?? job.type}
                      </span>
                      <JobStatusBadge status={job.status} />
                    </div>
                    
                    {(job.estimated_credits != null || job.credits_consumed != null) && (
                      <div className="flex items-center text-[11px] font-mono text-muted-foreground gap-4 bg-foreground/5 py-1 px-2 rounded-md w-fit">
                        {job.estimated_credits != null && (
                          <span title="Estimated credits before run">Est: {job.estimated_credits}</span>
                        )}
                        {job.credits_consumed != null && (
                          <span title="Actual credits consumed">Used: {job.credits_consumed}</span>
                        )}
                      </div>
                    )}
                    
                    {job.status === "failed" && (
                      <button
                        onClick={() => handleRetryJob(job.type)}
                        disabled={generating}
                        className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-background bg-foreground rounded-lg hover:bg-foreground/90 disabled:opacity-50 transition-colors w-full sm:w-auto self-start"
                      >
                        {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Retry generation"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-muted-foreground/70 mb-8 border border-foreground/10 rounded-lg p-3 bg-foreground/5">
                <p className="font-medium text-foreground/80 mb-1">Pricing & Tokens Info</p>
                <p>Generation consumes credits based on token usage. A higher token multiplier might apply depending on the AI model chosen. 1 credit covers approximately 1,000 baseline tokens. Unused text will not consume extra credits, and failed jobs generally refund their estimated credits automatically.</p>
              </div>

              {/* Output tabs */}
              {completedJobs.length > 0 && (
                <div>
                  <div className="flex gap-1 flex-wrap mb-4">
                    {completedJobs.map((job) => {
                      const label = OUTPUT_TYPES.find((t) => t.id === job.type)?.label ?? job.type;
                      const isActive = activeTab === job.type;
                      return (
                        <button
                          key={job.job_id}
                          onClick={() => handleTabClick(job)}
                          className={`h-8 px-3.5 rounded-lg text-sm transition-all ${
                            isActive
                              ? "bg-foreground text-background"
                              : "border border-foreground/10 text-muted-foreground hover:text-foreground hover:border-foreground/20"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {activeTab && (
                    <div className="p-6 rounded-2xl border border-foreground/10 bg-foreground/2 min-h-32">
                      {renderOutput(activeTab)}
                    </div>
                  )}

                  {!activeTab && (
                    <p className="text-sm text-muted-foreground">
                      Select an output above to view it.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
