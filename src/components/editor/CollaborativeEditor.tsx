"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { Users } from "lucide-react";
import Toolbar from "./Toolbar";

interface OnlineUser {
  name: string;
  color: string;
}

interface CollaborativeEditorProps {
  documentId: string;
  initialContent: object;
  editable?: boolean;
  onSave?: (status: "saving" | "saved" | "error") => void;
  userName?: string | null;
  userColor?: string;
}

/** Deterministic color from a string (userId) */
function deriveColor(seed: string): string {
  const COLORS = [
    "#4f46e5",
    "#0891b2",
    "#059669",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#c026d3",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export default function CollaborativeEditor({
  documentId,
  initialContent,
  editable = true,
  onSave,
  userName,
  userColor,
}: CollaborativeEditorProps) {
  // Stable Y.Doc per component instance
  const ydocRef = useRef<Y.Doc | null>(null);
  if (!ydocRef.current) ydocRef.current = new Y.Doc();

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

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

  // Seed Y.Doc from DB content on first load (if no peer has synced content yet)
  useEffect(() => {
    if (!editor) return;
    const fragment = ydocRef.current!.getXmlFragment("default");
    if (fragment.length === 0) {
      editor.commands.setContent(initialContent);
    }
    // Run once after editor is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Set up WebRTC provider (dynamic import keeps y-webrtc out of SSR bundle)
  useEffect(() => {
    const ydoc = ydocRef.current!;
    const color =
      userColor ?? deriveColor(userName ?? Math.random().toString());
    let destroyed = false;
    let providerCleanup: (() => void) | null = null;

    import("y-webrtc").then(({ WebrtcProvider }) => {
      if (destroyed) return;

      const provider = new WebrtcProvider(`docflow-${documentId}`, ydoc, {
        signaling: ["wss://signaling.yjs.dev", "wss://signaling2.yjs.dev"],
      });

      // Announce this user in the room
      provider.awareness.setLocalStateField("user", {
        name: userName ?? "Anonymous",
        color,
      });

      const updateUsers = () => {
        const users: OnlineUser[] = [];
        provider.awareness.getStates().forEach((state) => {
          if (state.user) users.push(state.user as OnlineUser);
        });
        setOnlineUsers(users);
      };

      provider.awareness.on("change", updateUsers);
      updateUsers();

      providerCleanup = () => {
        provider.awareness.off("change", updateUsers);
        provider.destroy();
      };
    });

    return () => {
      destroyed = true;
      providerCleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // Cleanup save timer
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (!editor) return null;

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
            <Users size={13} />
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
