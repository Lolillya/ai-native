"use client";

import { useState, useEffect, useRef } from "react";
import { X, UserPlus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  shares: Share[];
  onClose: () => void;
}

export default function ShareDialog({
  documentId,
  documentTitle,
  shares: initialShares,
  onClose,
}: ShareDialogProps) {
  const [shares, setShares] = useState<Share[]>(initialShares);
  const [email, setEmail] = useState("");
  const [suggestions, setSuggestions] = useState<ShareUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [adding, setAdding] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search users as email is typed
  useEffect(() => {
    if (email.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/users/search?email=${encodeURIComponent(email)}`,
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  }, [email]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAdding(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to share");
        return;
      }
      setShares((prev) => {
        const existing = prev.find((s) => s.user.id === data.user.id);
        if (existing)
          return prev.map((s) => (s.user.id === data.user.id ? data : s));
        return [...prev, data];
      });
      setEmail("");
      setSuggestions([]);
      setSuccess(`Shared with ${data.user.name ?? data.user.email}`);
    } finally {
      setAdding(false);
    }
  }

  async function handleRevoke(userId: string) {
    setRevoking(userId);
    try {
      await fetch(`/api/documents/${documentId}/share/${userId}`, {
        method: "DELETE",
      });
      setShares((prev) => prev.filter((s) => s.user.id !== userId));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Share document
            </h2>
            <p className="mt-0.5 truncate text-xs text-gray-400">
              {documentTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Add person */}
        <form onSubmit={handleShare} className="relative px-5 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {/* Autocomplete dropdown */}
              {suggestions.length > 0 && (
                <ul className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                  {suggestions.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail(u.email);
                          setSuggestions([]);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{u.name ?? u.email}</span>
                        {u.name && (
                          <span className="text-xs text-gray-400">
                            {u.email}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {loadingSuggestions && (
                <div className="absolute right-2 top-2.5">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={adding || !email}
              className={cn(
                "flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors",
                adding || !email
                  ? "cursor-not-allowed opacity-60"
                  : "hover:bg-blue-700",
              )}
            >
              {adding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Share
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          {success && <p className="mt-2 text-xs text-green-600">{success}</p>}
        </form>

        {/* Current shares */}
        <div className="border-t border-gray-100 px-5 pb-4">
          {shares.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              Not shared with anyone yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {shares.map((share) => (
                <li
                  key={share.user.id}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                    {(share.user.name ?? share.user.email)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {share.user.name ?? share.user.email}
                    </p>
                    {share.user.name && (
                      <p className="truncate text-xs text-gray-400">
                        {share.user.email}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 capitalize">
                    {share.permission}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRevoke(share.user.id)}
                    disabled={revoking === share.user.id}
                    className="rounded p-1 text-gray-300 hover:text-red-500 disabled:opacity-50"
                    title="Remove access"
                  >
                    {revoking === share.user.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
