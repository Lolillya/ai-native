"use client";

import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Toolbar from "./Toolbar";

interface EditorProps {
  documentId: string;
  initialContent: object;
  editable?: boolean;
  onSave?: (status: "saving" | "saved" | "error") => void;
}

export default function DocumentEditor({
  documentId,
  initialContent,
  editable = true,
  onSave,
}: EditorProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

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
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({ placeholder: "Start typing…" }),
    ],
    content: initialContent,
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

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="flex flex-col flex-1">
      {editable && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="flex-1 px-12 py-8 prose prose-gray max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[500px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left"
      />
    </div>
  );
}
