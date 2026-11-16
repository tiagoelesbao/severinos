"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontFamily, FontSize, Color } from "@tiptap/extension-text-style";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  IndentIncrease,
  SuperscriptIcon,
  SubscriptIcon,
  Code,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  ImageIcon,
  Palette,
  Undo2,
  Redo2,
} from "lucide-react";

const FONT_FAMILIES = ["Padrão", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"];
const FONT_SIZES = ["12px", "14px", "16px", "18px", "24px", "32px"];

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex size-6 items-center justify-center rounded ${
        active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarSelect({
  value,
  onChange,
  options,
  width = "w-24",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  width?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} rounded border border-transparent bg-transparent py-0.5 text-xs text-muted-foreground outline-none hover:border-input`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-popover text-foreground">
          {opt}
        </option>
      ))}
    </select>
  );
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false, link: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Superscript,
      Subscript,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "min-h-48 max-h-96 overflow-y-auto px-3 py-2 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_p]:my-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_img]:max-w-full [&_img]:rounded",
      },
    },
  });

  if (!editor) return null;

  const styleValue = editor.isActive("heading", { level: 1 })
    ? "Título 1"
    : editor.isActive("heading", { level: 2 })
      ? "Título 2"
      : editor.isActive("heading", { level: 3 })
        ? "Título 3"
        : "Normal";

  return (
    <div className="rounded-lg border border-input">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
        <ToolbarSelect
          value="Padrão"
          onChange={(v) => editor.chain().focus().setFontFamily(v === "Padrão" ? "" : v).run()}
          options={FONT_FAMILIES}
          width="w-28"
        />
        <div className="h-4 w-px bg-border" />
        <ToolbarSelect
          value="16px"
          onChange={(v) => (editor.commands as any).setFontSize(v)}
          options={FONT_SIZES}
          width="w-16"
        />
        <div className="h-4 w-px bg-border" />
        <ToolbarSelect
          value={styleValue}
          onChange={(v) => {
            if (v === "Normal") editor.chain().focus().setParagraph().run();
            else if (v === "Título 1") editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (v === "Título 2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (v === "Título 3") editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          options={["Normal", "Título 1", "Título 2", "Título 3"]}
          width="w-20"
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Sublinhado" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Tachado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Cor do texto"
          onClick={() => {
            const color = window.prompt("Cor (ex: #10b981):");
            if (color) editor.chain().focus().setColor(color).run();
          }}
        >
          <Palette className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Código" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton title="Sobrescrito" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          <SuperscriptIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Subscrito" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
          <SubscriptIcon className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton title="Alinhar à esquerda" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Centralizar" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Alinhar à direita" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Recuar" onClick={() => editor.chain().focus().sinkListItem("listItem").run()}>
          <IndentIncrease className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton
          title="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("URL do link:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          <Link2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Imagem"
          onClick={() => {
            const url = window.prompt("URL da imagem:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
        >
          <ImageIcon className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton title="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Refazer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
