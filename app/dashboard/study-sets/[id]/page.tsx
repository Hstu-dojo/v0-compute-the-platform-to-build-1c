"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertCircle,
  BookOpen,
  Brain,
  ChevronLeft,
  Loader2,
  MessageCircle,
  Mic,
  PenSquare,
  Trash2,
  Video,
} from "lucide-react";
import {
  SourcesApi,
  StudySetsApi,
  type SourceMaterial,
  type StudySetPodcast,
} from "@/lib/api-v2";
import {
  fetchFillBlanksCompat,
  fetchFlashcardsCompat,
  fetchMcqCompat,
  fetchNotesCompat,
  fetchPodcastCompat,
  fetchTutorCompat,
  fetchWrittenCompat,
  filterCardsByTopic,
  jobsByType,
  mapTranscriptSegments,
  nextMasteryState,
  normalizeSourceMaterial,
  streamNotesCompat,
  summarizeMastery,
  toLegacyType,
  type NormalizedNotes,
  type NormalizedSourceMaterial,
  type NormalizedTutorLesson,
  type StudySetFillBlankItem,
  type StudySetFlashcardItem,
  type StudySetMcqItem,
  type StudySetWorkspaceTab,
  type StudySetWrittenItem,
  uniqueTopics,
} from "@/lib/study-set-adapter";

const MAIN_TABS: StudySetWorkspaceTab[] = [
  "notes",
  "tutor_lesson",
  "flashcards",
  "multiple_choice",
  "fill_in_blanks",
  "written_test",
  "podcast",
  "content",
];

const RIGHT_TABS = ["chat", "content", "notes"] as const;
type RightTab = (typeof RIGHT_TABS)[number];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-9 px-3 rounded-lg text-sm transition-colors ${
        active
          ? "bg-foreground text-background"
          : "border border-foreground/10 text-muted-foreground hover:text-foreground hover:border-foreground/20"
      }`}
    >
      {label}
    </button>
  );
}

function MasteryBadge({
  state,
  onCorrect,
  onIncorrect,
}: {
  state: "unfamiliar" | "learning" | "familiar" | "mastered";
  onCorrect: () => void;
  onIncorrect: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono px-2 py-1 rounded-full border border-foreground/15 text-foreground/85">
        {state}
      </span>
      <button
        onClick={onIncorrect}
        className="text-[11px] text-muted-foreground hover:text-foreground border border-foreground/10 rounded px-2 py-1"
      >
        Incorrect
      </button>
      <button
        onClick={onCorrect}
        className="text-[11px] text-background bg-foreground rounded px-2 py-1 hover:bg-foreground/90"
      >
        Correct
      </button>
    </div>
  );
}

export default function StudySetWorkspacePage() {
  const params = useParams();
  const studySetId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<StudySetWorkspaceTab>("notes");
  const [rightTab, setRightTab] = useState<RightTab>("chat");
  const [topicFilter, setTopicFilter] = useState("All topics");

  const [studySetStatus, setStudySetStatus] = useState("processing");
  const [source, setSource] = useState<NormalizedSourceMaterial | null>(null);
  const [transcript, setTranscript] = useState<
    Array<{ timestamp_seconds: number; end_seconds: number; text: string }>
  >([]);
  const [jobs, setJobs] = useState<ReturnType<typeof jobsByType>>({});

  const [notes, setNotes] = useState<NormalizedNotes | null>(null);
  const [notesStreaming, setNotesStreaming] = useState(false);
  const [streamMarkdown, setStreamMarkdown] = useState("");

  const [tutorLesson, setTutorLesson] = useState<NormalizedTutorLesson | null>(null);
  const [flashcards, setFlashcards] = useState<StudySetFlashcardItem[]>([]);
  const [mcqs, setMcqs] = useState<StudySetMcqItem[]>([]);
  const [fillBlanks, setFillBlanks] = useState<StudySetFillBlankItem[]>([]);
  const [written, setWritten] = useState<StudySetWrittenItem[]>([]);
  const [podcast, setPodcast] = useState<StudySetPodcast | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [loadedTabs, setLoadedTabs] = useState<Partial<Record<StudySetWorkspaceTab, boolean>>>({});
  const [tabLoading, setTabLoading] = useState<Partial<Record<StudySetWorkspaceTab, boolean>>>({});
  const [tabError, setTabError] = useState<Partial<Record<StudySetWorkspaceTab, string>>>({});

  const loadBase = useCallback(async () => {
    const batch = await StudySetsApi.getBatch(studySetId);
    setStudySetStatus(batch.batch.status);
    setJobs(jobsByType(batch.jobs));

    const sourceId = batch.batch.source_material_id ?? batch.batch.document_id;
    if (!sourceId) return;

    const sourceRes = await SourcesApi.get(sourceId);
    setSource(normalizeSourceMaterial(sourceRes.source_material as SourceMaterial));

    try {
      const transcriptRes = await SourcesApi.getTranscript(sourceId);
      setTranscript(mapTranscriptSegments(transcriptRes));
    } catch {
      setTranscript([]);
    }
  }, [studySetId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadBase()
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load study set workspace");
      })
      .finally(() => setLoading(false));
  }, [loadBase]);

  const runTabLoad = useCallback(async (tab: StudySetWorkspaceTab, fn: () => Promise<void>) => {
    setTabLoading((prev) => ({ ...prev, [tab]: true }));
    setTabError((prev) => ({ ...prev, [tab]: "" }));
    try {
      await fn();
      setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    } catch (e) {
      setTabError((prev) => ({
        ...prev,
        [tab]: e instanceof Error ? e.message : `Failed to load ${tab}`,
      }));
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  const loadTab = useCallback(
    async (tab: StudySetWorkspaceTab) => {
      if (loadedTabs[tab]) return;
      if (tab === "content") {
        setLoadedTabs((prev) => ({ ...prev, content: true }));
        return;
      }

      const legacyType = toLegacyType(tab);
      const legacyOutputId = legacyType ? jobs[legacyType]?.output_id : undefined;

      if (tab === "notes") {
        await runTabLoad("notes", async () => {
          const n = await fetchNotesCompat(studySetId, legacyOutputId);
          setNotes(n);
          setStreamMarkdown("");
          setNotesStreaming(true);
          await streamNotesCompat(
            studySetId,
            (delta) => setStreamMarkdown((prev) => prev + delta),
            () => setNotesStreaming(false)
          );
        });
        return;
      }

      if (tab === "tutor_lesson") {
        await runTabLoad("tutor_lesson", async () => {
          setTutorLesson(await fetchTutorCompat(studySetId, legacyOutputId));
        });
        return;
      }

      if (tab === "flashcards") {
        await runTabLoad("flashcards", async () => {
          setFlashcards(await fetchFlashcardsCompat(studySetId, legacyOutputId));
        });
        return;
      }

      if (tab === "multiple_choice") {
        await runTabLoad("multiple_choice", async () => {
          setMcqs(await fetchMcqCompat(studySetId, legacyOutputId));
        });
        return;
      }

      if (tab === "fill_in_blanks") {
        await runTabLoad("fill_in_blanks", async () => {
          setFillBlanks(await fetchFillBlanksCompat(studySetId, legacyOutputId));
        });
        return;
      }

      if (tab === "written_test") {
        await runTabLoad("written_test", async () => {
          setWritten(await fetchWrittenCompat(studySetId, legacyOutputId));
        });
        return;
      }

      if (tab === "podcast") {
        await runTabLoad("podcast", async () => {
          setPodcast(await fetchPodcastCompat(studySetId, legacyOutputId));
        });
      }
    },
    [jobs, loadedTabs, runTabLoad, studySetId]
  );

  useEffect(() => {
    loadTab(activeTab).catch(() => {
      // handled per tab
    });
  }, [activeTab, loadTab]);

  useEffect(() => {
    if (!(["flashcards", "multiple_choice", "fill_in_blanks", "written_test"] as StudySetWorkspaceTab[]).includes(activeTab)) {
      setTopicFilter("All topics");
    }
  }, [activeTab]);

  const filteredFlashcards = useMemo(() => filterCardsByTopic(flashcards, topicFilter), [flashcards, topicFilter]);
  const filteredMcqs = useMemo(() => filterCardsByTopic(mcqs, topicFilter), [mcqs, topicFilter]);
  const filteredFillBlanks = useMemo(() => filterCardsByTopic(fillBlanks, topicFilter), [fillBlanks, topicFilter]);
  const filteredWritten = useMemo(() => filterCardsByTopic(written, topicFilter), [written, topicFilter]);

  const topics = useMemo(() => {
    if (activeTab === "flashcards") return ["All topics", ...uniqueTopics(flashcards)];
    if (activeTab === "multiple_choice") return ["All topics", ...uniqueTopics(mcqs)];
    if (activeTab === "fill_in_blanks") return ["All topics", ...uniqueTopics(fillBlanks)];
    if (activeTab === "written_test") return ["All topics", ...uniqueTopics(written)];
    return ["All topics"];
  }, [activeTab, flashcards, mcqs, fillBlanks, written]);

  const masterySummary = useMemo(() => {
    if (activeTab === "flashcards") return summarizeMastery(filteredFlashcards);
    if (activeTab === "multiple_choice") return summarizeMastery(filteredMcqs);
    if (activeTab === "fill_in_blanks") return summarizeMastery(filteredFillBlanks);
    if (activeTab === "written_test") return summarizeMastery(filteredWritten);
    return null;
  }, [activeTab, filteredFlashcards, filteredMcqs, filteredFillBlanks, filteredWritten]);

  const bumpMcqMastery = useCallback((id: string, wasCorrect: boolean) => {
    setMcqs((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, masteryState: nextMasteryState(item.masteryState, wasCorrect) }
          : item
      )
    );
    StudySetsApi.tryUpsertMastery(studySetId, {
      item_type: "mcq",
      item_id: id,
      was_correct: wasCorrect,
    }).catch(() => {});
  }, [studySetId]);

  const bumpFillMastery = useCallback((id: string, wasCorrect: boolean) => {
    setFillBlanks((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, masteryState: nextMasteryState(item.masteryState, wasCorrect) }
          : item
      )
    );
    StudySetsApi.tryUpsertMastery(studySetId, {
      item_type: "fill_blank",
      item_id: id,
      was_correct: wasCorrect,
    }).catch(() => {});
  }, [studySetId]);

  const bumpWrittenMastery = useCallback((id: string, wasCorrect: boolean, userAnswer?: string) => {
    setWritten((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, masteryState: nextMasteryState(item.masteryState, wasCorrect) }
          : item
      )
    );
    StudySetsApi.tryUpsertMastery(studySetId, {
      item_type: "written_test",
      item_id: id,
      was_correct: wasCorrect,
      user_answer: userAnswer,
    }).catch(() => {});
  }, [studySetId]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: chatInput.trim() },
      {
        id: `a-${Date.now() + 1}`,
        role: "assistant",
        content:
          activeTab === "content"
            ? "You can ask me to explain any transcript segment or source concept."
            : `Ask for a hint, explanation, or walkthrough for ${activeTab.replace(/_/g, " ")}.`,
      },
    ]);
    setChatInput("");
  }, [activeTab, chatInput]);

  if (loading) {
    return (
      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="h-9 w-56 rounded-lg bg-foreground/5 animate-pulse mb-6" />
        <div className="h-96 rounded-2xl bg-foreground/5 animate-pulse" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="px-6 py-10 max-w-4xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-8 max-w-375 mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-1 rounded-full border border-foreground/10 text-muted-foreground">study_set_id: {studySetId}</span>
          <span className="px-2 py-1 rounded-full border border-foreground/10 text-foreground/80">status: {studySetStatus}</span>
          <button onClick={() => loadBase().catch(() => {})} className="px-2 py-1 rounded border border-foreground/10 text-muted-foreground hover:text-foreground">
            refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 xl:col-span-9 min-w-0">
          <div className="p-4 rounded-2xl border border-foreground/10 bg-foreground/2 mb-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {MAIN_TABS.map((tab) => (
                <TabButton key={tab} active={activeTab === tab} label={tab.replace(/_/g, " ")} onClick={() => setActiveTab(tab)} />
              ))}
            </div>

            {(["flashcards", "multiple_choice", "fill_in_blanks", "written_test"] as StudySetWorkspaceTab[]).includes(activeTab) && (
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs font-mono text-muted-foreground">Filter by Topic</label>
                <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="h-8 rounded-lg border border-foreground/10 bg-background px-2.5 text-xs text-foreground">
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
                {masterySummary && (
                  <div className="text-xs text-muted-foreground font-mono">
                    {masterySummary.unfamiliar} Unfamiliar | {masterySummary.learning} Learning | {masterySummary.familiar} Familiar | {masterySummary.mastered} Mastered
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/2 min-h-130">
            {tabLoading[activeTab] && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading {activeTab.replace(/_/g, " ")}...
              </div>
            )}

            {tabError[activeTab] && (
              <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4" /> {tabError[activeTab]}
              </div>
            )}

            {!tabLoading[activeTab] && activeTab === "notes" && notes && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <PenSquare className="w-3.5 h-3.5" /> {notes.isUserEdited ? "User edited" : "Auto-generated"}
                  {notesStreaming ? " · streaming" : ""}
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-foreground/90 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamMarkdown || notes.markdown || "No notes available."}</ReactMarkdown>
                </div>
              </div>
            )}

            {!tabLoading[activeTab] && activeTab === "tutor_lesson" && tutorLesson && (
              <div className="space-y-4">
                <h2 className="text-2xl font-display text-foreground">{tutorLesson.title}</h2>
                {tutorLesson.sections.map((section) => (
                  <article key={section.id} className="rounded-xl border border-foreground/10 p-4 space-y-2 bg-background/40">
                    <div className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">{section.type.replace(/_/g, " ")}</div>
                    <h3 className="text-foreground font-medium">{section.heading}</h3>
                    {section.body && <p className="text-sm text-foreground/90 leading-relaxed">{section.body}</p>}
                  </article>
                ))}
              </div>
            )}

            {!tabLoading[activeTab] && activeTab === "flashcards" && (
              <div className="space-y-3">
                {filteredFlashcards.map((item) => (
                  <article key={item.id} className="rounded-xl border border-foreground/10 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono text-muted-foreground">Topic: {item.topic}</p>
                      <MasteryBadge
                        state={item.masteryState}
                        onCorrect={() => setFlashcards((prev) => prev.map((x) => x.id === item.id ? { ...x, masteryState: nextMasteryState(x.masteryState, true) } : x))}
                        onIncorrect={() => setFlashcards((prev) => prev.map((x) => x.id === item.id ? { ...x, masteryState: nextMasteryState(x.masteryState, false) } : x))}
                      />
                    </div>
                    <h3 className="text-foreground font-medium">{item.term}</h3>
                    <p className="text-sm text-muted-foreground">{item.definition}</p>
                    <button onClick={() => setFlashcards((prev) => prev.map((x) => x.id === item.id ? { ...x, isDeleted: true } : x))} className="text-xs text-red-400 border border-red-500/20 rounded px-2 py-1 inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete card
                    </button>
                  </article>
                ))}
                {filteredFlashcards.length === 0 && <p className="text-sm text-muted-foreground">No flashcards for this topic.</p>}
              </div>
            )}

            {!tabLoading[activeTab] && activeTab === "multiple_choice" && (
              <SimpleMcq items={filteredMcqs} onMastery={bumpMcqMastery} />
            )}

            {!tabLoading[activeTab] && activeTab === "fill_in_blanks" && (
              <SimpleFillBlank items={filteredFillBlanks} onMastery={bumpFillMastery} />
            )}

            {!tabLoading[activeTab] && activeTab === "written_test" && (
              <SimpleWritten items={filteredWritten} onMastery={bumpWrittenMastery} />
            )}

            {!tabLoading[activeTab] && activeTab === "podcast" && (
              <SimplePodcast podcast={podcast} />
            )}

            {!tabLoading[activeTab] && activeTab === "content" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <BookOpen className="w-3.5 h-3.5" /> Source viewer
                </div>
                {source && (
                  <div className="rounded-xl border border-foreground/10 p-4 bg-background/30">
                    <p className="text-foreground font-medium">{source.title}</p>
                    <p className="text-xs text-muted-foreground">{source.sourceType} · {source.status}</p>
                    {source.sourceType === "youtube_url" && source.youtubeUrl && (
                      <a href={source.youtubeUrl} target="_blank" rel="noreferrer" className="text-sm text-foreground underline inline-flex items-center gap-1 mt-2">
                        <Video className="w-4 h-4" /> Open YouTube source
                      </a>
                    )}
                  </div>
                )}
                <div className="rounded-xl border border-foreground/10 p-4 max-h-115 overflow-auto space-y-2">
                  {transcript.map((segment, idx) => (
                    <div key={`seg-${idx}`} className="rounded-lg border border-foreground/10 p-2 text-sm">
                      <span className="text-[11px] font-mono text-muted-foreground">{formatTimestamp(segment.timestamp_seconds)}</span>
                      <p className="text-foreground/90 mt-1">{segment.text}</p>
                    </div>
                  ))}
                  {transcript.length === 0 && <p className="text-sm text-muted-foreground">No transcript available yet.</p>}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="col-span-12 xl:col-span-3">
          <div className="sticky top-6 rounded-2xl border border-foreground/10 bg-foreground/2 p-3">
            <div className="flex items-center gap-1 mb-3">
              {RIGHT_TABS.map((tab) => (
                <button key={tab} onClick={() => setRightTab(tab)} className={`h-8 px-2.5 rounded-lg text-xs transition-colors ${rightTab === tab ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground border border-foreground/10"}`}>
                  {tab}
                </button>
              ))}
            </div>

            {rightTab === "chat" && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" /> Context: {activeTab.replace(/_/g, " ")}
                </div>
                <div className="space-y-2 max-h-105 overflow-auto">
                  {chatMessages.length === 0 && <p className="text-xs text-muted-foreground">Ask about this study set tab.</p>}
                  {chatMessages.map((m) => (
                    <div key={m.id} className={`rounded-lg p-2 text-xs ${m.role === "user" ? "bg-foreground text-background" : "border border-foreground/10 text-foreground/90"}`}>
                      {m.content}
                    </div>
                  ))}
                </div>
                <textarea rows={3} value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask a question" className="w-full rounded-lg border border-foreground/10 bg-background p-2 text-xs" />
                <button onClick={sendChat} className="w-full h-8 rounded-lg bg-foreground text-background text-xs">Send</button>
              </div>
            )}

            {rightTab === "content" && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Source context
                </div>
                {source ? (
                  <div className="rounded-lg border border-foreground/10 p-3">
                    <p className="text-sm text-foreground font-medium">{source.title}</p>
                    <p className="text-xs text-muted-foreground">{source.sourceType} · {source.status}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No source data.</p>
                )}
              </div>
            )}

            {rightTab === "notes" && (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Notes quick view
                </div>
                {notes ? (
                  <div className="rounded-lg border border-foreground/10 p-3 max-h-115 overflow-auto">
                    <p className="text-xs text-muted-foreground mb-2">{notes.isUserEdited ? "User edited" : "Auto-generated"}</p>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap">{(notes.plainText || notes.markdown).slice(0, 1800)}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Open Notes tab to load content.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function SimpleMcq({
  items,
  onMastery,
}: {
  items: StudySetMcqItem[];
  onMastery: (id: string, wasCorrect: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        const selected = answers[item.id];
        const isChecked = checked[item.id];
        const isCorrect = selected === item.correctOptionId;
        return (
          <article key={item.id} className="rounded-xl border border-foreground/10 p-4 space-y-2">
            <p className="text-sm text-foreground font-medium"><span className="text-muted-foreground font-mono mr-2">{idx + 1}.</span>{item.questionText}</p>
            {item.options.map((opt) => (
              <button key={opt.id} onClick={() => !isChecked && setAnswers((prev) => ({ ...prev, [item.id]: opt.id }))} className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${selected === opt.id ? "border-foreground/30 bg-foreground/8 text-foreground" : "border-foreground/10 text-muted-foreground"}`}>
                <span className="font-mono text-xs mr-2">{opt.id.toUpperCase()}.</span>{opt.text}
              </button>
            ))}
            {!isChecked ? (
              <button
                onClick={() => {
                  if (!selected) return;
                  setChecked((prev) => ({ ...prev, [item.id]: true }));
                  onMastery(item.id, isCorrect);
                }}
                disabled={!selected}
                className="h-8 px-3 rounded-lg bg-foreground text-background text-xs disabled:opacity-40"
              >
                Check answer
              </button>
            ) : (
              <p className={`text-xs ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                {isCorrect ? "Correct" : "Incorrect"}
              </p>
            )}
          </article>
        );
      })}
      {items.length === 0 && <p className="text-sm text-muted-foreground">No questions for this topic.</p>}
    </div>
  );
}

function SimpleFillBlank({
  items,
  onMastery,
}: {
  items: StudySetFillBlankItem[];
  onMastery: (id: string, wasCorrect: boolean) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-4">
      {items.map((item, idx) => {
        const answer = answers[item.id] ?? "";
        const isChecked = checked[item.id];
        const expected = item.blanks[0]?.answer ?? "";
        const isCorrect = answer.trim().toLowerCase() === expected.trim().toLowerCase();

        return (
          <article key={item.id} className="rounded-xl border border-foreground/10 p-4 space-y-2">
            <p className="text-sm text-foreground"><span className="text-muted-foreground font-mono mr-2">{idx + 1}.</span>{item.displaySentence}</p>
            <input value={answer} onChange={(e) => setAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))} placeholder="Type your answer" className="w-full h-9 rounded-lg border border-foreground/10 bg-background px-3 text-sm" disabled={isChecked} />
            {!isChecked ? (
              <button
                onClick={() => {
                  setChecked((prev) => ({ ...prev, [item.id]: true }));
                  onMastery(item.id, isCorrect);
                }}
                disabled={!answer.trim()}
                className="h-8 px-3 rounded-lg bg-foreground text-background text-xs disabled:opacity-40"
              >
                Check answer
              </button>
            ) : (
              <p className={`text-xs ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                {isCorrect ? "Correct" : `Incorrect · expected: ${expected}`}
              </p>
            )}
          </article>
        );
      })}
      {items.length === 0 && <p className="text-sm text-muted-foreground">No fill-in-blank items for this topic.</p>}
    </div>
  );
}

function SimpleWritten({
  items,
  onMastery,
}: {
  items: StudySetWrittenItem[];
  onMastery: (id: string, wasCorrect: boolean, userAnswer?: string) => void;
}) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <article key={item.id} className="rounded-xl border border-foreground/10 p-4 space-y-3">
          <p className="text-sm text-foreground font-medium"><span className="text-muted-foreground font-mono mr-2">{idx + 1}.</span>{item.questionText}</p>
          <textarea rows={4} value={responses[item.id] ?? ""} onChange={(e) => setResponses((prev) => ({ ...prev, [item.id]: e.target.value }))} placeholder="Write your answer" className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm" />
          <button
            onClick={() => {
              const answer = (responses[item.id] ?? "").trim();
              if (!answer) return;
              const lower = answer.toLowerCase();
              const hits = item.keyPoints.filter((kp) => lower.includes(kp.toLowerCase())).length;
              const score = item.keyPoints.length ? Math.round((hits / item.keyPoints.length) * 100) : 0;
              setScores((prev) => ({ ...prev, [item.id]: score }));
              onMastery(item.id, score >= 60, answer);
            }}
            className="h-8 px-3 rounded-lg bg-foreground text-background text-xs"
          >
            AI grade response
          </button>
          {typeof scores[item.id] === "number" && (
            <p className="text-xs text-muted-foreground">Score: {scores[item.id]}%</p>
          )}
          <details className="rounded-lg border border-foreground/10 p-3">
            <summary className="text-xs text-muted-foreground cursor-pointer">Show model answer</summary>
            <p className="text-sm text-foreground mt-2">{item.modelAnswer}</p>
          </details>
        </article>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground">No written-test items for this topic.</p>}
    </div>
  );
}

function SimplePodcast({ podcast }: { podcast: StudySetPodcast | null }) {
  if (!podcast) return <p className="text-sm text-muted-foreground">Podcast is not available yet.</p>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-foreground/10 p-4 bg-background/30 space-y-2">
        <h3 className="text-foreground font-medium inline-flex items-center gap-2"><Mic className="w-4 h-4" /> {podcast.title}</h3>
        <p className="text-xs text-muted-foreground">{podcast.voice_a_name ?? "Voice A"} & {podcast.voice_b_name ?? "Voice B"}</p>
        {podcast.audio_signed_url ? <audio controls src={podcast.audio_signed_url} className="w-full" /> : <p className="text-xs text-muted-foreground">Audio not ready yet.</p>}
      </div>
      <div className="rounded-xl border border-foreground/10 p-4 max-h-115 overflow-auto space-y-2">
        {(podcast.transcript_segments ?? []).map((seg, idx) => (
          <div key={`pod-seg-${idx}`} className="rounded-lg border border-foreground/10 p-2 text-sm">
            <div className="text-[10px] font-mono text-muted-foreground">{seg.speaker} · {formatTimestamp(seg.timestamp_seconds)}</div>
            <p className="text-foreground/90 mt-1">{seg.text}</p>
          </div>
        ))}
        {(podcast.transcript_segments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No transcript segments yet.</p>}
      </div>
    </div>
  );
}
