"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Upload, Trash2, FileText, File } from "lucide-react";

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: string;
  created_at: string;
}

interface Props {
  botId: string;
  plan: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type === "pdf") return <FileText size={16} className="text-red-400" />;
  if (type === "docx") return <File size={16} className="text-blue-400" />;
  return <FileText size={16} className="text-white/40" />;
}

export default function FileUploadTab({ botId, plan }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = plan === "pro" || plan === "max";

  async function loadFiles() {
    try {
      const res = await fetch(`/api/upload?bot_id=${botId}`);
      const data = await res.json();
      if (data.files) setFiles(data.files);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (canUpload) loadFiles();
  }, [botId, canUpload]);

  async function handleUpload(file: File) {
    if (!canUpload) return;

    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type. Use PDF, DOCX, or TXT.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`/api/upload?bot_id=${botId}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success(`"${file.name}" uploaded and indexed`);
      await loadFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string, fileName: string) {
    if (!confirm(`Delete "${fileName}"? This will remove it from the knowledge base.`)) return;
    setDeleting(fileId);
    try {
      const res = await fetch(`/api/upload?file_id=${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("File deleted");
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  if (!canUpload) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-2 p-8 text-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-3 border border-border-subtle mx-auto">
          <Upload size={22} className="text-white/20" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">File Uploads — Pro Feature</h3>
          <p className="text-xs text-white/40 mt-1">
            Upload PDF, DOCX, and TXT files to give your chatbot additional knowledge.
          </p>
        </div>
        <a
          href="/account"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all"
        >
          Upgrade to Pro →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? "border-brand-500/60 bg-brand-500/8"
            : "border-border-subtle hover:border-border-default bg-surface-2"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-3 border border-border-subtle mx-auto mb-3">
          {uploading ? (
            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-brand-400" />
            </svg>
          ) : (
            <Upload size={20} className="text-white/30" />
          )}
        </div>
        <p className="text-sm font-medium text-white">
          {uploading ? "Uploading & indexing…" : "Drop a file here, or click to browse"}
        </p>
        <p className="text-xs text-white/35 mt-1">PDF, DOCX, TXT · up to 10MB</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-surface-2 divide-y divide-border-subtle overflow-hidden">
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Uploaded Files ({files.length})
            </p>
          </div>
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-3 transition-colors">
              <FileIcon type={file.file_type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{file.file_name}</p>
                <p className="text-xs text-white/35">
                  {file.file_type.toUpperCase()} · {formatBytes(file.file_size)} ·{" "}
                  {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Indexed
              </span>
              <button
                onClick={() => handleDelete(file.id, file.file_name)}
                disabled={deleting === file.id}
                className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                {deleting === file.id ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && !uploading && (
        <p className="text-center text-xs text-white/25 py-2">
          No files uploaded yet. Documents you upload will be used as additional knowledge for this bot.
        </p>
      )}
    </div>
  );
}
