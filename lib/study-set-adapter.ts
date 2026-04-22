import {
  StudySetsApi,
  type MasteryState,
  type StudySetFlashcard,
  type StudySetMCQ,
  type StudySetFillBlank,
  type StudySetWrittenTest,
  type StudySetPodcast,
  type StudySetTypeJob,
  type StudySetTypeJobType,
  type StudySetViewType,
  type StudySetNotes,
  type StudySetTutorLesson,
  type SourceMaterial,
  type SourceMaterialTranscriptSegment,
} from "./api-v2";

export interface NormalizedNotes {
  markdown: string;
  richText: unknown;
  plainText: string;
  isUserEdited: boolean;
}

export interface NormalizedTutorLessonSection {
  id: string;
  type: "explanation" | "worked_example" | "comprehension_check";
  heading: string;
  body?: string;
  solutionSteps?: string[];
  problemStatement?: string;
  answer?: string;
  comprehensionQuestions?: Array<{ question: string; answer: string }>;
  position: number;
}

export interface NormalizedTutorLesson {
  title: string;
  sections: NormalizedTutorLessonSection[];
}

export interface NormalizedSourceMaterial {
  id: string;
  title: string;
  sourceType: "pdf" | "text" | "youtube_url";
  status: "pending_embedding" | "processing" | "ready" | "failed";
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeChannel?: string;
  youtubeThumbnailUrl?: string;
  youtubeDurationSeconds?: number;
  pageCount?: number;
  characterCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterySummary {
  unfamiliar: number;
  learning: number;
  familiar: number;
  mastered: number;
  total: number;
}

export interface CardItemBase {
  id: string;
  topic: string;
  masteryState: MasteryState;
  isDeleted: boolean;
  isUserEdited: boolean;
  position?: number;
}

export interface StudySetFlashcardItem extends CardItemBase {
  term: string;
  definition: string;
}

export interface StudySetMcqItem extends CardItemBase {
  questionText: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation?: string;
}

export interface StudySetFillBlankItem extends CardItemBase {
  displaySentence: string;
  blanks: Array<{ position: number; answer: string; hint?: string }>;
}

export interface StudySetWrittenItem extends CardItemBase {
  questionText: string;
  modelAnswer: string;
  keyPoints: string[];
}

function asObject(value: unknown): Record<string, unknown> {
  return (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function richTextToPlainText(node: unknown): string {
  const n = asObject(node);
  const text = safeString(n.text);
  const children = asArray(n.content).map(richTextToPlainText).join(" ");
  return [text, children].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function richTextToMarkdown(node: unknown): string {
  const n = asObject(node);
  const type = safeString(n.type);
  const text = safeString(n.text);
  const children = asArray(n.content).map(richTextToMarkdown).join("");

  if (type === "heading") {
    const level = Number(n.attrs && asObject(n.attrs).level) || 2;
    const hashes = "#".repeat(Math.max(1, Math.min(level, 6)));
    return `${hashes} ${children || text}\n\n`;
  }
  if (type === "paragraph") {
    return `${children || text}\n\n`;
  }
  if (type === "bulletList") {
    return `${children}`;
  }
  if (type === "orderedList") {
    return `${children}`;
  }
  if (type === "listItem") {
    return `- ${children || text}\n`;
  }
  if (type === "blockquote") {
    return `> ${(children || text).trim()}\n\n`;
  }
  if (type === "hardBreak") {
    return "\n";
  }

  return children || text;
}

export function normalizeSourceMaterial(source: SourceMaterial): NormalizedSourceMaterial {
  return {
    id: source.id,
    title: source.title,
    sourceType: (source.source_type ?? source.sourceType ?? "pdf") as "pdf" | "text" | "youtube_url",
    status: (source.processing_status ?? source.status ?? "processing") as
      | "pending_embedding"
      | "processing"
      | "ready"
      | "failed",
    youtubeUrl: source.youtube_url ?? undefined,
    youtubeVideoId: source.youtube_video_id ?? undefined,
    youtubeChannel: source.youtube_channel ?? undefined,
    youtubeThumbnailUrl: source.youtube_thumbnail_url ?? undefined,
    youtubeDurationSeconds: source.youtube_duration_seconds ?? undefined,
    pageCount: source.page_count ?? undefined,
    characterCount: source.char_count ?? source.characterCount ?? undefined,
    createdAt: source.created_at ?? source.createdAt,
    updatedAt: source.updated_at ?? source.updatedAt,
  };
}

export function normalizeNotes(payload: unknown): NormalizedNotes {
  const root = asObject(payload);
  const notesNode = asObject(root.notes ?? root.content ?? root);

  const rich = notesNode.rich_text_content ?? root.rich_text_content ?? null;
  const markdown = safeString(notesNode.markdown_content ?? notesNode.markdown ?? root.markdown, "");
  const richMarkdown = rich ? richTextToMarkdown(rich) : "";
  const plainText = safeString(notesNode.plain_text_content, "") || (rich ? richTextToPlainText(rich) : "");

  return {
    markdown: markdown || richMarkdown,
    richText: rich,
    plainText,
    isUserEdited: Boolean(notesNode.is_user_edited),
  };
}

export function normalizeTutorLesson(payload: unknown): NormalizedTutorLesson {
  const root = asObject(payload);
  const lesson = asObject(root.tutor_lesson ?? root.content ?? root);
  const sectionRaw = asArray(lesson.sections ?? root.sections);

  const sections: NormalizedTutorLessonSection[] = sectionRaw.map((s, idx) => {
    const section = asObject(s);
    const solutionSteps = asArray<string>(section.solution_steps);
    const comprehension = asArray<{ question: string; answer: string }>(section.comprehension_questions);
    return {
      id: safeString(section.id, `section-${idx + 1}`),
      type: (safeString(section.section_type ?? section.type, "explanation") as
        | "explanation"
        | "worked_example"
        | "comprehension_check"),
      heading: safeString(section.heading, `Section ${idx + 1}`),
      body: safeString(section.body, ""),
      solutionSteps,
      problemStatement: safeString(section.problem_statement, ""),
      answer: safeString(section.answer, ""),
      comprehensionQuestions: comprehension,
      position: Number(section.position) || idx,
    };
  });

  sections.sort((a, b) => a.position - b.position);

  return {
    title: safeString(lesson.title, "Tutor Lesson"),
    sections,
  };
}

function normalizeMastery(state: unknown): MasteryState {
  const s = safeString(state, "unfamiliar").toLowerCase();
  if (s === "learning" || s === "familiar" || s === "mastered") return s;
  return "unfamiliar";
}

export function summarizeMastery<T extends CardItemBase>(items: T[]): MasterySummary {
  return items.reduce<MasterySummary>(
    (acc, item) => {
      if (item.isDeleted) return acc;
      acc.total += 1;
      if (item.masteryState === "learning") acc.learning += 1;
      else if (item.masteryState === "familiar") acc.familiar += 1;
      else if (item.masteryState === "mastered") acc.mastered += 1;
      else acc.unfamiliar += 1;
      return acc;
    },
    { unfamiliar: 0, learning: 0, familiar: 0, mastered: 0, total: 0 }
  );
}

export function uniqueTopics<T extends { topic: string }>(items: T[]): string[] {
  return Array.from(new Set(items.map((i) => i.topic).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function nextMasteryState(current: MasteryState, wasCorrect: boolean): MasteryState {
  const order: MasteryState[] = ["unfamiliar", "learning", "familiar", "mastered"];
  const idx = order.indexOf(current);
  if (wasCorrect) return order[Math.min(idx + 1, order.length - 1)];
  return order[Math.max(idx - 1, 0)];
}

function normalizeFlashcardArray(input: StudySetFlashcard[]): StudySetFlashcardItem[] {
  return input
    .map((card, idx) => ({
      id: card.id,
      term: safeString(card.term),
      definition: safeString(card.definition),
      topic: safeString(card.topic, "General"),
      masteryState: normalizeMastery(card.mastery_state),
      isDeleted: Boolean(card.is_deleted),
      isUserEdited: Boolean(card.is_user_edited),
      position: card.position ?? idx,
    }))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function normalizeMcqArray(input: StudySetMCQ[]): StudySetMcqItem[] {
  return input
    .map((q, idx) => ({
      id: q.id,
      questionText: safeString(q.question_text),
      options: asArray<{ id: string; text: string }>(q.options),
      correctOptionId: safeString(q.correct_option_id),
      explanation: safeString(q.explanation, ""),
      topic: safeString(q.topic, "General"),
      masteryState: normalizeMastery(q.mastery_state),
      isDeleted: Boolean(q.is_deleted),
      isUserEdited: Boolean(q.is_user_edited),
      position: q.position ?? idx,
    }))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function normalizeFillBlankArray(input: StudySetFillBlank[]): StudySetFillBlankItem[] {
  return input
    .map((q, idx) => ({
      id: q.id,
      displaySentence: safeString(q.display_sentence || q.full_sentence || ""),
      blanks: asArray<{ position: number; answer: string; hint?: string }>(q.blanks),
      topic: safeString(q.topic, "General"),
      masteryState: normalizeMastery(q.mastery_state),
      isDeleted: Boolean(q.is_deleted),
      isUserEdited: Boolean(q.is_user_edited),
      position: q.position ?? idx,
    }))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function normalizeWrittenArray(input: StudySetWrittenTest[]): StudySetWrittenItem[] {
  return input
    .map((q, idx) => ({
      id: q.id,
      questionText: safeString(q.question_text),
      modelAnswer: safeString(q.model_answer),
      keyPoints: asArray<string>(q.key_points),
      topic: safeString(q.topic, "General"),
      masteryState: normalizeMastery(q.mastery_state),
      isDeleted: Boolean(q.is_deleted),
      isUserEdited: Boolean(q.is_user_edited),
      position: q.position ?? idx,
    }))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function normalizeFlashcards(payload: unknown): StudySetFlashcardItem[] {
  const root = asObject(payload);
  const cards = asArray<StudySetFlashcard>(root.cards ?? asObject(root.content).cards ?? root.flashcards ?? []);
  return normalizeFlashcardArray(cards);
}

export function normalizeMcqs(payload: unknown): StudySetMcqItem[] {
  const root = asObject(payload);
  const questions = asArray<StudySetMCQ>(
    root.questions ?? asObject(root.content).questions ?? root.multiple_choice ?? []
  );
  return normalizeMcqArray(questions);
}

export function normalizeFillBlanks(payload: unknown): StudySetFillBlankItem[] {
  const root = asObject(payload);
  const questions = asArray<StudySetFillBlank>(
    root.questions ?? asObject(root.content).questions ?? root.items ?? root.fill_in_blanks ?? []
  );
  return normalizeFillBlankArray(questions);
}

export function normalizeWritten(payload: unknown): StudySetWrittenItem[] {
  const root = asObject(payload);
  const questions = asArray<StudySetWrittenTest>(
    root.questions ?? asObject(root.content).questions ?? root.written_test ?? []
  );
  return normalizeWrittenArray(questions);
}

export function normalizePodcast(payload: unknown): StudySetPodcast {
  const root = asObject(payload);
  const podcast = asObject(root.podcast ?? root.content ?? root);
  return {
    id: safeString(podcast.id),
    study_set_id: safeString(podcast.study_set_id),
    title: safeString(podcast.title, "Podcast"),
    audio_signed_url: safeString(podcast.audio_signed_url, "") || null,
    script_text: safeString(podcast.script_text, ""),
    duration_seconds: Number(podcast.duration_seconds) || 0,
    voice_a_name: safeString(podcast.voice_a_name, "Voice A"),
    voice_b_name: safeString(podcast.voice_b_name, "Voice B"),
    transcript_segments: asArray(podcast.transcript_segments),
  };
}

export function jobsByType(jobs: StudySetTypeJob[]): Partial<Record<StudySetTypeJobType, StudySetTypeJob>> {
  const map: Partial<Record<StudySetTypeJobType, StudySetTypeJob>> = {};
  for (const job of jobs) {
    map[job.type] = job;
  }
  return map;
}

async function fallbackByLegacyOutput(
  type: StudySetTypeJobType,
  legacyOutputId?: string | null
): Promise<unknown> {
  if (!legacyOutputId) {
    throw new Error(`No fallback output id available for ${type}`);
  }
  return StudySetsApi.getLegacyOutput(legacyOutputId, type);
}

export async function fetchNotesCompat(studySetId: string, legacyOutputId?: string | null): Promise<NormalizedNotes> {
  try {
    const res = await StudySetsApi.getNotes(studySetId);
    return normalizeNotes(res);
  } catch {
    const fallback = await fallbackByLegacyOutput("notes", legacyOutputId);
    return normalizeNotes(fallback);
  }
}

export async function fetchTutorCompat(studySetId: string, legacyOutputId?: string | null): Promise<NormalizedTutorLesson> {
  try {
    const res = await StudySetsApi.getTutorLesson(studySetId);
    return normalizeTutorLesson(res);
  } catch {
    const fallback = await fallbackByLegacyOutput("tutor_lesson", legacyOutputId);
    return normalizeTutorLesson(fallback);
  }
}

export async function fetchFlashcardsCompat(
  studySetId: string,
  legacyOutputId?: string | null
): Promise<StudySetFlashcardItem[]> {
  try {
    const res = await StudySetsApi.getFlashcards(studySetId);
    return normalizeFlashcards(res);
  } catch {
    const fallback = await fallbackByLegacyOutput("flashcards", legacyOutputId);
    return normalizeFlashcards(fallback);
  }
}

export async function fetchMcqCompat(studySetId: string, legacyOutputId?: string | null): Promise<StudySetMcqItem[]> {
  try {
    const res = await StudySetsApi.getMcqs(studySetId);
    return normalizeMcqs(res);
  } catch {
    const fallback = await fallbackByLegacyOutput("multiple_choice", legacyOutputId);
    return normalizeMcqs(fallback);
  }
}

export async function fetchFillBlanksCompat(
  studySetId: string,
  legacyOutputId?: string | null
): Promise<StudySetFillBlankItem[]> {
  try {
    const res = await StudySetsApi.getFillInBlanks(studySetId);
    return normalizeFillBlanks(res);
  } catch {
    const fallback = await fallbackByLegacyOutput("fill_in_blanks", legacyOutputId);
    return normalizeFillBlanks(fallback);
  }
}

export async function fetchWrittenCompat(
  studySetId: string,
  legacyOutputId?: string | null
): Promise<StudySetWrittenItem[]> {
  try {
    const res = await StudySetsApi.getWrittenTests(studySetId);
    return normalizeWritten(res);
  } catch {
    const fallback = await fallbackByLegacyOutput("written_test", legacyOutputId);
    return normalizeWritten(fallback);
  }
}

export async function fetchPodcastCompat(studySetId: string, legacyOutputId?: string | null): Promise<StudySetPodcast> {
  try {
    const res = await StudySetsApi.getPodcast(studySetId);
    return normalizePodcast(res);
  } catch {
    const fallback = await fallbackByLegacyOutput("podcast", legacyOutputId);
    return normalizePodcast(fallback);
  }
}

export async function streamNotesCompat(
  studySetId: string,
  onDelta: (chunk: string) => void,
  onDone?: () => void
): Promise<void> {
  try {
    await StudySetsApi.streamNotes(studySetId, (evt) => {
      if (evt.type === "delta") {
        onDelta(evt.data.delta ?? "");
      }
      if (evt.type === "done") {
        onDone?.();
      }
    });
  } catch {
    // fallback is no-op; caller still has non-streamed content
  }
}

export async function streamTutorCompat(
  studySetId: string,
  onSection: (section: unknown) => void,
  onDone?: () => void
): Promise<void> {
  try {
    await StudySetsApi.streamTutorLesson(studySetId, (evt) => {
      if (evt.type === "section") {
        onSection(evt.data);
      }
      if (evt.type === "done") {
        onDone?.();
      }
    });
  } catch {
    // fallback is no-op; caller still has non-streamed content
  }
}

export type StudySetWorkspaceTab = StudySetViewType;

export function filterCardsByTopic<T extends { topic: string; isDeleted: boolean }>(
  items: T[],
  topic: string
): T[] {
  return items.filter((item) => {
    if (item.isDeleted) return false;
    if (!topic || topic === "All topics") return true;
    return item.topic === topic;
  });
}

export function mapTranscriptSegments(payload: { segments?: SourceMaterialTranscriptSegment[] }): SourceMaterialTranscriptSegment[] {
  return asArray<SourceMaterialTranscriptSegment>(payload.segments);
}

export function toLegacyType(tab: StudySetWorkspaceTab): StudySetTypeJobType | null {
  if (tab === "content") return null;
  return tab;
}

export function inferSafeItemType(tab: StudySetWorkspaceTab): "mcq" | "flashcard" | "fill_blank" | "written_test" {
  if (tab === "multiple_choice") return "mcq";
  if (tab === "flashcards") return "flashcard";
  if (tab === "fill_in_blanks") return "fill_blank";
  return "written_test";
}
