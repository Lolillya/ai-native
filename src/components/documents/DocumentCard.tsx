"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FileText, Trash2, MoreHorizontal, Share2, Users } from "lucide-react";

interface Document {
  id: string;
  title: string;
  updatedAt: string;
  isOwner: boolean;
  permission?: string;
  owner?: { id: string; name: string | null; email: string } | null;
}

interface DocumentCardProps {
  doc: Document;
  onDelete?: (id: string) => void;
}

export default function DocumentCard({ doc, onDelete }: DocumentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const updatedAt = new Date(doc.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === doc.title) {
      setTitle(doc.title);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      router.refresh();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    onDelete?.(doc.id);
  }

  return (
    <div className="group relative flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <FileText size={20} className="shrink-0 text-blue-500" />

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitle();
              if (e.key === "Escape") {
                setTitle(doc.title);
                setEditing(false);
              }
            }}
            disabled={saving}
            className="w-full rounded border border-blue-400 px-1 py-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <Link
            href={`/documents/${doc.id}`}
            className="block truncate text-sm font-medium text-gray-900 hover:text-blue-600"
          >
            {doc.title}
          </Link>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
          <span>{updatedAt}</span>
          {!doc.isOwner && doc.owner && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users size={11} />
                {doc.owner.name ?? doc.owner.email}
              </span>
            </>
          )}
          {!doc.isOwner && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
              Shared
            </span>
          )}
        </div>
      </div>

      {/* Actions menu — owner only */}
      {doc.isOwner && (
        <div className="relative shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Share2 size={14} />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
