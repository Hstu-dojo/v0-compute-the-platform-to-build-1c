"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { uploadPdf, uploadText } from "@/lib/api";
import { Upload, FileText, ChevronLeft, AlertCircle, X } from "lucide-react";

type UploadTab = "pdf" | "text";

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<UploadTab>("pdf");
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.pdf$/i, ""));
    }
  }, [title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) { setError("Please add a title"); return; }
    if (tab === "pdf" && !file) { setError("Please select a PDF file"); return; }
    if (tab === "text" && !textContent.trim()) { setError("Please paste some content"); return; }

    setLoading(true);
    setUploadProgress(null);
    try {
      let doc;
      if (tab === "pdf") {
        const fd = new FormData();
        fd.append("file", file!);
        fd.append("title", title.trim());
        setUploadProgress(0);
        const res = await uploadPdf(fd, (pct) => setUploadProgress(pct));
        doc = res.document;
      } else {
        const res = await uploadText({ title: title.trim(), content: textContent.trim() });
        doc = res.document;
      }
      router.push(`/dashboard/documents/${doc.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back to documents
      </Link>

      <h1 className="text-3xl font-display text-foreground mb-2">Upload document</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Add a PDF or paste text to start generating study materials.
      </p>

      {/* Title */}
      <div className="mb-6">
        <label className="block text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wide">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Biology Chapter 5"
          className="w-full h-11 px-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] text-foreground text-sm focus:outline-none focus:border-foreground/30 placeholder:text-muted-foreground/50 transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-foreground/10 bg-foreground/[0.02] mb-6 w-fit">
        {(["pdf", "text"] as UploadTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 h-8 rounded-lg text-sm transition-colors ${
              tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "pdf" ? "PDF file" : "Paste text"}
          </button>
        ))}
      </div>

      {/* PDF upload */}
      {tab === "pdf" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            dragOver ? "border-foreground/40 bg-foreground/5" : "border-foreground/15 hover:border-foreground/25"
          } ${file ? "border-foreground/30 bg-foreground/[0.03]" : ""}`}
          style={{ minHeight: 220 }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
            {file ? (
              <>
                <div className="w-12 h-12 rounded-xl border border-foreground/10 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-foreground/60" />
                </div>
                <p className="text-sm text-foreground font-medium truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl border border-foreground/10 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground mb-1">Drop a PDF here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF only · max 20 MB</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Text upload */}
      {tab === "text" && (
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Paste your notes, textbook chapter, or any text content here..."
          rows={12}
          className="w-full px-4 py-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] text-foreground text-sm focus:outline-none focus:border-foreground/30 placeholder:text-muted-foreground/50 transition-colors resize-none leading-relaxed"
        />
      )}

      {/* Upload progress bar (PDF only) */}
      {uploadProgress !== null && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>Uploading…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full bg-foreground/50 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 mt-4 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="h-11 px-8 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border border-background/30 border-t-background rounded-full animate-spin" />
              {uploadProgress !== null ? `Uploading ${uploadProgress}%…` : "Processing…"}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload & continue
            </>
          )}
        </button>
        <Link
          href="/dashboard"
          className="h-11 px-5 rounded-xl border border-foreground/10 text-muted-foreground text-sm hover:text-foreground hover:border-foreground/20 transition-colors flex items-center"
        >
          Cancel
        </Link>
      </div>
    </main>
  );
}
