"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { AlignCenter, AlignLeft, AlignRight, Bold, Eraser, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react";
import { useEffect } from "react";

const COLORS = ["var(--fp-primary)", "var(--fp-secondary)", "var(--fp-accent)", "#1f2a24", "#6b7280", "#ffffff"];

function Btn({ on, active, title, children }: { on: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onMouseDown={(e) => e.preventDefault()} onClick={on} className={`rounded p-1.5 ${active ? "bg-brand-100 text-brand-700" : "text-zinc-600 hover:bg-zinc-100"}`}>
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && !editor.isFocused && editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return <div className="h-40 rounded-lg border border-zinc-300 bg-zinc-50" />;

  const c = () => editor.chain().focus();

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 p-1">
        <Btn title="Negrito" on={() => c().toggleBold().run()} active={editor.isActive("bold")}><Bold size={15} /></Btn>
        <Btn title="Itálico" on={() => c().toggleItalic().run()} active={editor.isActive("italic")}><Italic size={15} /></Btn>
        <Btn title="Sublinhado" on={() => c().toggleUnderline().run()} active={editor.isActive("underline")}><Underline size={15} /></Btn>
        <Btn title="Riscado" on={() => c().toggleStrike().run()} active={editor.isActive("strike")}><Strikethrough size={15} /></Btn>
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <Btn title="Subtítulo" on={() => c().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 size={15} /></Btn>
        <Btn title="Subtítulo menor" on={() => c().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}><Heading3 size={15} /></Btn>
        <Btn title="Lista" on={() => c().toggleBulletList().run()} active={editor.isActive("bulletList")}><List size={15} /></Btn>
        <Btn title="Lista numerada" on={() => c().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered size={15} /></Btn>
        <Btn title="Citação" on={() => c().toggleBlockquote().run()} active={editor.isActive("blockquote")}><Quote size={15} /></Btn>
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <Btn title="Alinhar à esquerda" on={() => c().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })}><AlignLeft size={15} /></Btn>
        <Btn title="Centralizar" on={() => c().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })}><AlignCenter size={15} /></Btn>
        <Btn title="Alinhar à direita" on={() => c().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })}><AlignRight size={15} /></Btn>
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <Btn
          title="Link"
          active={editor.isActive("link")}
          on={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Endereço do link (deixe vazio para remover):", prev ?? "https://");
            if (url === null) return;
            if (!url) c().extendMarkRange("link").unsetLink().run();
            else c().extendMarkRange("link").setLink({ href: url, target: /^https?:/.test(url) ? "_blank" : null }).run();
          }}
        >
          <Link2 size={15} />
        </Btn>
        <span className="flex items-center gap-0.5 px-1">
          {COLORS.map((col) => (
            <button type="button" key={col} title="Cor do texto" onMouseDown={(e) => e.preventDefault()} onClick={() => c().setColor(col).run()} className="h-4 w-4 rounded-full border border-zinc-300" style={{ background: col }} />
          ))}
        </span>
        <Btn title="Limpar formatação" on={() => c().unsetAllMarks().clearNodes().run()}><Eraser size={15} /></Btn>
        <span className="ml-auto flex">
          <Btn title="Desfazer" on={() => c().undo().run()}><Undo2 size={15} /></Btn>
          <Btn title="Refazer" on={() => c().redo().run()}><Redo2 size={15} /></Btn>
        </span>
      </div>
      <div className="fp-scope max-h-96 overflow-y-auto text-sm">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
