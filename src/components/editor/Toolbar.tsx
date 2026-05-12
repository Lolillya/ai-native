"use client";

import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Strikethrough,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor blur
        onClick();
      }}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded text-sm transition-colors",
        isActive
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      {children}
    </button>
  );
}

export default function Toolbar({ editor }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-4 py-2 bg-white">
      <ToolbarButton
        title="Bold (Ctrl+B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
      >
        <Bold size={16} />
      </ToolbarButton>

      <ToolbarButton
        title="Italic (Ctrl+I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
      >
        <Italic size={16} />
      </ToolbarButton>

      <ToolbarButton
        title="Underline (Ctrl+U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
      >
        <Underline size={16} />
      </ToolbarButton>

      <ToolbarButton
        title="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
      >
        <Strikethrough size={16} />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-gray-200" />

      <ToolbarButton
        title="Heading 1"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
      >
        <Heading1 size={16} />
      </ToolbarButton>

      <ToolbarButton
        title="Heading 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 size={16} />
      </ToolbarButton>

      <ToolbarButton
        title="Heading 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 size={16} />
      </ToolbarButton>

      <div className="mx-1 h-6 w-px bg-gray-200" />

      <ToolbarButton
        title="Bullet List"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
      >
        <List size={16} />
      </ToolbarButton>

      <ToolbarButton
        title="Numbered List"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
      >
        <ListOrdered size={16} />
      </ToolbarButton>
    </div>
  );
}
