"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { useOthers, useSelf } from "@liveblocks/react";
import * as Y from "yjs";
import Toolbar from "./Toolbar";

interface CollaborativeEditorProps {
  documentId: string;
  initialContent: object;
  editable?: boolean;
  onSave?: (status: "saving" | "saved" | "error") => void;
}

export default function CollaborativeEditor({
  documentId,
  initialContent,
  editable = true,
  onSave,
}: CollaborativeEditorProps) {
  // Stable Y.Doc per component instance — Liveblocks syncs it via WebSocket
  const ydocRef = useRef<Y.Doc>(new Y.Doc());

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const liveblocks = useLiveblocksExtension({
    field: "default",
    initialContent,
  });

  const save = useCallback(
    async (content: object) => {
      onSaveRef.current?.("saving");
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error("Save failed");
        onSaveRef.current?.("saved");
      } catch {
        onSaveRef.current?.("error");
      }
    },
    [documentId],
  );

  const editor = useEditor({
    extensions: [
      // Disable built-in undo/redo — Y.js handles that
      StarterKit.configure({ undoRedo: false, heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: "Start typing…" }),
      Collaboration.configure({ document: ydocRef.current }),
      liveblocks,
    ],
    editable,
    onUpdate: ({ editor }) => {
      if (!editable) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        save(editor.getJSON());
      }, 1000);
    },
    immediatelyRender: false,
  });

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const others = useOthers();
  const self = useSelf();

  if (!editor) return null;

  const onlineUsers = [
    ...(self
      ? [{ name: (self.info?.name as string) ?? "You", color: (self.info?.color as string) ?? "#6366f1" }]
      : []),
    ...others.map((o) => ({
      name: (o.info?.name as string) ?? "Anonymous",
      color: (o.info?.color as string) ?? "#6366f1",
    })),
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* Toolbar + presence bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white">
        {editable ? (
          <Toolbar editor={editor} />
        ) : (
          <div className="flex-1 px-4 py-2 text-xs text-gray-400">
            View only
          </div>
        )}

        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 shrink-0">
            <div className="flex -space-x-1.5">
              {onlineUsers.slice(0, 6).map((u, i) => (
                <div
                  key={i}
                  title={u.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white"
                  style={{ backgroundColor: u.color }}
                >
                  {(u.name?.[0] ?? "?").toUpperCase()}
                </div>
              ))}
            </div>
            <span>{onlineUsers.length} online</span>
          </div>
        )}
      </div>

      <EditorContent
        editor={editor}
        className="flex-1 px-12 py-8 prose prose-gray max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[500px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left"
      />
    </div>
  );
}

