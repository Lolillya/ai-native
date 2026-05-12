"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { FilePlus, Loader2 } from "lucide-react";
import DocumentCard from "@/components/documents/DocumentCard";
import UploadButton from "@/components/documents/UploadButton";

interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: string;
  isOwner: boolean;
  permission?: string;
  owner?: { id: string; name: string | null; email: string } | null;
}

interface DocumentListProps {
  owned: DocumentSummary[];
  shared: DocumentSummary[];
}

export default function DocumentList({
  owned: initialOwned,
  shared: initialShared,
}: DocumentListProps) {
  const [owned, setOwned] = useState(initialOwned);
  const [shared] = useState(initialShared);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  async function createDocument() {
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document" }),
      });
      const doc = await res.json();
      router.push(`/documents/${doc.id}`);
    } finally {
      setCreating(false);
    }
  }

  function handleDelete(id: string) {
    setOwned((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Docflow</h1>
          <div className="flex items-center gap-3">
            <UploadButton />
            <button
              type="button"
              onClick={createDocument}
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FilePlus size={16} />
              )}
              New document
            </button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* My Documents */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            My Documents ({owned.length})
          </h2>
          {owned.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-400">No documents yet.</p>
              <button
                type="button"
                onClick={createDocument}
                disabled={creating}
                className="mt-3 text-sm font-medium text-blue-600 hover:underline"
              >
                Create your first document →
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              {owned.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>

        {/* Shared with Me */}
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Shared with Me ({shared.length})
          </h2>
          {shared.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-400">
                Nothing shared with you yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {shared.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
