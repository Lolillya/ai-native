"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UploadButton() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }

      router.push(`/documents/${data.id}`);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md"
        className="sr-only"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload .txt or .md file to create a new document"
        className={cn(
          "flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors",
          uploading ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50",
        )}
      >
        {uploading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        {uploading ? "Uploading…" : "Import file"}
      </button>
      <p className="text-xs text-gray-400">Supported: .txt, .md (max 5 MB)</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
