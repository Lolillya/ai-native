"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, Share2, Check, AlertCircle, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import ShareDialog from "@/components/documents/ShareDialog";
import DocumentRoom from "@/components/documents/DocumentRoom";

const CollaborativeEditor = dynamic(
  () => import("@/components/editor/CollaborativeEditor"),
  { ssr: false },
);

interface ShareUser {
  id: string;
  name: string | null;
  email: string;
  imageUrl?: string | null;
}

interface Share {
  id: string;
  permission: string;
  user: ShareUser;
}

interface DocumentViewProps {
  id: string;
  title: string;
  content: object;
  isOwner: boolean;
  permission: string;
  shares: Share[];
  ownerName?: string | null;
}

export default function DocumentView({
  id,
  title: initialTitle,
  content,
  isOwner,
  permission,
  shares: initialShares,
}: DocumentViewProps) {
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [showShare, setShowShare] = useState(false);
  const [shares, setShares] = useState<Share[]>(initialShares);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const editable = permission === "edit";

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(initialTitle);
      setEditingTitle(false);
      return;
    }
    if (trimmed === initialTitle) {
      setEditingTitle(false);
      return;
    }
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaveStatus("saved");
      router.refresh();
    } catch {
      setSaveStatus("error");
    }
    setEditingTitle(false);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-3">
        <Link
          href="/documents"
          className="rounded p-1 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={18} />
        </Link>

        {/* Document title */}
        <div className="flex-1 min-w-0">
          {editingTitle && editable ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setTitle(initialTitle);
                  setEditingTitle(false);
                }
              }}
              className="w-full max-w-sm rounded border border-blue-400 px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => editable && setEditingTitle(true)}
              className="truncate text-sm font-medium text-gray-900 hover:text-blue-600 disabled:cursor-default"
              disabled={!editable}
              title={editable ? "Click to rename" : undefined}
            >
              {title}
            </button>
          )}
        </div>

        {/* Save status */}
        <div className="shrink-0 text-xs text-gray-400 flex items-center gap-1">
          {saveStatus === "saving" && (
            <>
              <Loader2 size={12} className="animate-spin" /> Saving…
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check size={12} className="text-green-500" /> Saved
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle size={12} className="text-red-500" /> Error saving
            </>
          )}
        </div>

        {/* Share button — owner only */}
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Share2 size={13} />
            Share
            {shares.length > 0 && (
              <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-blue-700">
                {shares.length}
              </span>
            )}
          </button>
        )}

        {!isOwner && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600">
            Shared with you
          </span>
        )}

        <UserButton />
      </header>

      {/* Editor wrapped in Liveblocks room */}
      <div className="flex-1 overflow-y-auto">
        <DocumentRoom documentId={id}>
          <CollaborativeEditor
            documentId={id}
            initialContent={content}
            editable={editable}
            onSave={setSaveStatus}
          />
        </DocumentRoom>
      </div>

      {/* Share modal */}
      {showShare && (
        <ShareDialog
          documentId={id}
          documentTitle={title}
          shares={shares}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
