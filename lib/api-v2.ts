import {
  apiGet,
  apiPost,
  apiPostFormData,
  getAccessToken,
  getOutputContent,
} from "./api";

// ── V2 Types (Mapped from api-1(8).json) ──────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tutor-ai.up.railway.app";

export type SourceMaterialType = "pdf" | "text" | "youtube_url";
export type ProcessingStatus = "pending_embedding" | "processing" | "ready" | "failed";

export interface SourceMaterialTranscriptSegment {
  timestamp_seconds: number;
  end_seconds: number;
  text: string;
}

export interface SourceMaterialTranscript {
  id: string;
  source_material_id: string;
  transcript_source: "youtube_auto" | "youtube_manual" | "pdf_extracted" | "audio_transcribed";
  language: string;
  segments: SourceMaterialTranscriptSegment[];
  total_segments: number;
  is_auto_generated: boolean;
  created_at: string;
}

export interface SourceMaterial {
  id: string;
  user_id?: string;
  userId?: string;
  title: string;
  source_type?: SourceMaterialType;
  sourceType?: SourceMaterialType;
  original_filename?: string | null;
  filename?: string;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
  youtube_channel?: string | null;
  youtube_thumbnail_url?: string | null;
  youtube_duration_seconds?: number | null;
  content_hash?: string;
  contentHash?: string;
  char_count?: number | null;
  characterCount?: number | null;
  page_count?: number | null;
  processing_status?: ProcessingStatus;
  status?: ProcessingStatus;
  virus_scan_passed?: boolean;
  virus_scanned_at?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

// Upload Responses
export interface UploadResponse {
  source_material: SourceMaterial;
  embedding_job_id: string;
}
export interface UploadYoutubeResponse {
  source_material: SourceMaterial;
  embedding_job_id: string;
}

// Core Study Set Models
export type StudySetStatus = "processing" | "partial" | "completed" | "failed";
export type StudySetTypeJobType =
  | "notes"
  | "multiple_choice"
  | "flashcards"
  | "podcast"
  | "fill_in_blanks"
  | "written_test"
  | "tutor_lesson";
export type StudySetViewType = StudySetTypeJobType | "content";

export interface StudySetTypeJob {
  id?: string;
  job_id?: string;
  study_set_id?: string;
  user_id?: string;
  type: StudySetTypeJobType;
  status: "queued" | "processing" | "completed" | "failed";
  output_id?: string | null;
  error?: string | null;
  error_message?: string | null;
  estimated_credits?: number | null;
  credits_consumed?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface StudySet {
  id: string;
  user_id?: string;
  source_material_id?: string;
  document_id?: string;
  title: string;
  status: StudySetStatus;
  selected_types?: StudySetTypeJobType[];
  completed_types?: StudySetTypeJobType[];
  failed_types?: StudySetTypeJobType[];
  total_jobs?: number;
  completed_jobs?: number;
  failed_jobs?: number;
  total_credits_reserved?: number;
  total_credits_consumed?: number;
  estimated_credits?: number;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Mastery states
export type MasteryState = "unfamiliar" | "learning" | "familiar" | "mastered";

// Notes Type
export interface StudySetNotes {
  id: string;
  study_set_id?: string;
  rich_text_content?: unknown; // Tiptap JSON
  markdown_content?: string | null;
  plain_text_content?: string | null;
  is_user_edited?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Tutor Lesson
export type TutorSectionType = "explanation" | "worked_example" | "comprehension_check";
export interface TutorLessonSection {
  id: string;
  position: number;
  section_type: TutorSectionType;
  heading: string;
  body?: string;
  solution_steps?: string[];
  problem_statement?: string;
  answer?: string;
  comprehension_questions?: { question: string; answer: string }[];
}
export interface StudySetTutorLesson {
  id: string;
  study_set_id?: string;
  title: string;
  sections: TutorLessonSection[];
  created_at?: string;
}

// Flashcards
export interface StudySetFlashcard {
  id: string;
  study_set_id?: string;
  term: string;
  definition: string;
  topic?: string;
  position?: number;
  is_deleted?: boolean;
  is_user_edited?: boolean;
  mastery_state?: MasteryState; // merged from user_item_mastery
}

// MCQ
export interface StudySetMCQ {
  id: string;
  study_set_id?: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_option_id: string;
  explanation?: string;
  topic?: string;
  position?: number;
  is_deleted?: boolean;
  is_user_edited?: boolean;
  mastery_state?: MasteryState;
}

// Fill in Blanks
export interface StudySetFillBlank {
  id: string;
  study_set_id?: string;
  full_sentence?: string;
  display_sentence: string; // contains ______
  blanks: { position: number; answer: string; hint?: string }[];
  topic?: string;
  position?: number;
  is_deleted?: boolean;
  is_user_edited?: boolean;
  mastery_state?: MasteryState;
}

// Written Test
export interface StudySetWrittenTest {
  id: string;
  study_set_id?: string;
  question_text: string;
  model_answer: string;
  key_points: string[];
  topic?: string;
  position?: number;
  is_deleted?: boolean;
  is_user_edited?: boolean;
  mastery_state?: MasteryState;
}

// Podcast
export interface PodcastTranscriptSegment {
  speaker: string;
  text: string;
  timestamp_seconds: number;
}
export interface StudySetPodcast {
  id: string;
  study_set_id?: string;
  title: string;
  audio_signed_url?: string | null;
  script_text?: string;
  duration_seconds?: number;
  voice_a_name?: string;
  voice_b_name?: string;
  transcript_segments?: PodcastTranscriptSegment[];
}

// Mastery Summary
export interface StudySetMasterySummary {
  item_type: "mcq" | "flashcard" | "fill_blank" | "written_test";
  total_items: number;
  unfamiliar_count: number;
  learning_count: number;
  familiar_count: number;
  mastered_count: number;
  overall_accuracy: number;
}

// Unified Content View Model (Adapter Output)
export interface StudySetContentView {
  sourceMaterial: SourceMaterial;
  studySet: StudySet;
  transcript?: SourceMaterialTranscript;
  masterySummaries: StudySetMasterySummary[];
}

export interface StudySetGenerateEnvelope {
  batch: StudySet;
  jobs: StudySetTypeJob[];
  websocket?: {
    url: string;
    token: string;
    expires_in?: number;
  };
}

export interface BatchStatusEnvelope {
  batch: StudySet;
  jobs: StudySetTypeJob[];
}

export type StreamEvent =
  | { type: "metadata"; data: unknown }
  | { type: "delta"; data: { delta: string } }
  | { type: "section"; data: unknown }
  | { type: "done"; data: unknown }
  | { type: "error"; data: { message: string } };

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSourceMaterialShape(raw: SourceMaterial): SourceMaterial {
  return {
    ...raw,
    source_type: raw.source_type ?? raw.sourceType,
    processing_status: raw.processing_status ?? raw.status,
    content_hash: raw.content_hash ?? raw.contentHash,
    char_count: raw.char_count ?? raw.characterCount,
    created_at: raw.created_at ?? raw.createdAt,
    updated_at: raw.updated_at ?? raw.updatedAt,
  };
}

function pickSourceMaterial(payload: Record<string, unknown>): SourceMaterial | null {
  const source = (payload.source_material ?? payload.document) as SourceMaterial | undefined;
  return source ? normalizeSourceMaterialShape(source) : null;
}

async function sseFetch(path: string, onEvent: (event: StreamEvent) => void): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok || !res.body) {
    onEvent({
      type: "error",
      data: { message: `SSE failed with status ${res.status}` },
    });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEventName = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const e of events) {
      const lines = e.split("\n");
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEventName = line.replace("event:", "").trim();
        }
        if (line.startsWith("data:")) {
          data += line.replace("data:", "").trim();
        }
      }

      if (!data) continue;
      let parsed: unknown = data;
      try {
        parsed = JSON.parse(data);
      } catch {
        // keep string payload when not JSON
      }

      if (currentEventName === "metadata") {
        onEvent({ type: "metadata", data: parsed });
      } else if (currentEventName === "delta") {
        onEvent({ type: "delta", data: parsed as { delta: string } });
      } else if (currentEventName === "section") {
        onEvent({ type: "section", data: parsed });
      } else if (currentEventName === "done") {
        onEvent({ type: "done", data: parsed });
      }
    }
  }
}

// ── API Wrappers ─────────────────────────────────────────────────────────────

export const SourcesApi = {
  list: async () => {
    const res = await apiGet<{ data?: SourceMaterial[]; documents?: SourceMaterial[]; next_cursor?: string | null }>("/api/v1/documents");
    const rawItems = res.data ?? res.documents ?? [];
    return {
      data: rawItems.map(normalizeSourceMaterialShape),
      next_cursor: res.next_cursor ?? null,
    };
  },

  get: async (id: string) => {
    const res = await apiGet<{ document?: SourceMaterial; source_material?: SourceMaterial }>(`/api/v1/documents/${id}`);
    const source = pickSourceMaterial(res as unknown as Record<string, unknown>);
    if (!source) {
      throw new Error("Source material not found in response");
    }
    return { source_material: source };
  },

  getTranscript: async (id: string) =>
    apiGet<{ segments: SourceMaterialTranscriptSegment[] }>(`/api/v1/documents/${id}/transcript`),

  uploadPdf: async (formData: FormData, onProgress?: (percent: number) => void) => {
    const res = await apiPostFormData<{ document?: SourceMaterial; source_material?: SourceMaterial; embedding_job_id?: string }>(
      "/api/v1/upload/pdf",
      formData,
      onProgress
    );
    const source = pickSourceMaterial(res as unknown as Record<string, unknown>);
    if (!source) throw new Error("Upload response did not include source material");
    return {
      source_material: source,
      embedding_job_id: res.embedding_job_id ?? "",
    };
  },

  uploadText: async (body: { text: string; title?: string }) => {
    const res = await apiPost<{ document?: SourceMaterial; source_material?: SourceMaterial; embedding_job_id?: string }>(
      "/api/v1/upload/text",
      body
    );
    const source = pickSourceMaterial(res as unknown as Record<string, unknown>);
    if (!source) throw new Error("Upload response did not include source material");
    return {
      source_material: source,
      embedding_job_id: res.embedding_job_id ?? "",
    };
  },

  uploadYoutube: async (url: string, title?: string) => {
    const res = await apiPost<{ source_material?: SourceMaterial; document?: SourceMaterial; embedding_job_id?: string }>(
      "/api/v1/upload/youtube-url",
      { youtube_url: url, title }
    );
    const source = pickSourceMaterial(res as unknown as Record<string, unknown>);
    if (!source) throw new Error("Upload response did not include source material");
    return {
      source_material: source,
      embedding_job_id: res.embedding_job_id ?? "",
    };
  },
};

export const StudySetsApi = {
  generate: async (document_id: string, types: StudySetTypeJobType[]): Promise<StudySetGenerateEnvelope> =>
    apiPost<StudySetGenerateEnvelope>("/api/v1/study-sets/generate", {
      document_id,
      types,
    }),

  getBatch: async (batch_id: string): Promise<BatchStatusEnvelope> =>
    apiGet<BatchStatusEnvelope>(`/api/v1/study-sets/batch/${batch_id}`),

  getLegacyOutput: async (output_id: string, type: StudySetTypeJobType) =>
    getOutputContent(output_id, type),

  getNotes: async (study_set_id: string) =>
    apiGet<{ notes: StudySetNotes }>(`/api/v1/study-sets/${study_set_id}/notes`),

  streamNotes: async (study_set_id: string, onEvent: (event: StreamEvent) => void) =>
    sseFetch(`/api/v1/study-sets/${study_set_id}/notes/stream`, onEvent),

  getTutorLesson: async (study_set_id: string) =>
    apiGet<{ tutor_lesson: StudySetTutorLesson }>(`/api/v1/study-sets/${study_set_id}/tutor_lesson`),

  streamTutorLesson: async (study_set_id: string, onEvent: (event: StreamEvent) => void) =>
    sseFetch(`/api/v1/study-sets/${study_set_id}/tutor_lesson/stream`, onEvent),

  getFlashcards: async (study_set_id: string) =>
    apiGet<{ cards: StudySetFlashcard[] }>(`/api/v1/study-sets/${study_set_id}/flashcards`),

  getMcqs: async (study_set_id: string) =>
    apiGet<{ questions: StudySetMCQ[] }>(`/api/v1/study-sets/${study_set_id}/multiple_choice`),

  getFillInBlanks: async (study_set_id: string) =>
    apiGet<{ questions: StudySetFillBlank[] }>(`/api/v1/study-sets/${study_set_id}/fill_in_blanks`),

  getWrittenTests: async (study_set_id: string) =>
    apiGet<{ questions: StudySetWrittenTest[] }>(`/api/v1/study-sets/${study_set_id}/written_test`),

  getPodcast: async (study_set_id: string) =>
    apiGet<{ podcast: StudySetPodcast }>(`/api/v1/study-sets/${study_set_id}/podcast`),

  tryReportItem: async (study_set_id: string, item_type: string, item_id: string, reason: string, notes?: string) =>
    apiPost(`/api/v1/study-sets/${study_set_id}/reports`, {
      item_type,
      item_id,
      report_reason: reason,
      notes,
    }),

  tryUpsertMastery: async (study_set_id: string, body: Record<string, unknown>) =>
    apiPost(`/api/v1/study-sets/${study_set_id}/mastery/review`, body),
};
