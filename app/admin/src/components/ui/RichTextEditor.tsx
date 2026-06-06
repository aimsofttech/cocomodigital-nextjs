import { useRef, useEffect, type ReactNode } from 'react';
import {
  BoldIcon, ItalicIcon, UnderlineIcon, ListBulletIcon, LinkIcon,
  NumberedListIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, TrashIcon,
} from '@heroicons/react/24/outline';

interface Props {
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height of the editing area in pixels (default 160). */
  minHeight?: number;
}

const exec = (command: string, arg?: string) => document.execCommand(command, false, arg);

/**
 * Lightweight rich-text editor built on a contentEditable surface (no external
 * deps). Stores/emits HTML so it drops straight into a react-hook-form field.
 */
export default function RichTextEditor({ value = '', onChange, placeholder = 'Write something…', minHeight = 160 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Push external value (e.g. loaded record) into the DOM without disturbing the
  // caret while the user is actively typing (guarded by the equality check).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const run = (command: string, arg?: string) => {
    ref.current?.focus();
    exec(command, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (url) run('createLink', url);
  };

  const Btn = ({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()} // keep selection/focus in the editor
      onClick={onClick}
      className="h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 text-sm font-medium"
    >
      {children}
    </button>
  );

  const Sep = () => <span className="w-px h-5 bg-gray-200 mx-0.5" />;

  return (
    <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <Btn title="Heading 1" onClick={() => run('formatBlock', '<h1>')}><span className="font-bold">H1</span></Btn>
        <Btn title="Heading 2" onClick={() => run('formatBlock', '<h2>')}><span className="font-bold">H2</span></Btn>
        <Btn title="Heading 3" onClick={() => run('formatBlock', '<h3>')}><span className="font-bold">H3</span></Btn>
        <Btn title="Paragraph" onClick={() => run('formatBlock', '<p>')}><span>¶</span></Btn>
        <Sep />
        <Btn title="Bold" onClick={() => run('bold')}><BoldIcon className="w-4 h-4" /></Btn>
        <Btn title="Italic" onClick={() => run('italic')}><ItalicIcon className="w-4 h-4" /></Btn>
        <Btn title="Underline" onClick={() => run('underline')}><UnderlineIcon className="w-4 h-4" /></Btn>
        <Btn title="Strikethrough" onClick={() => run('strikeThrough')}><span className="line-through">S</span></Btn>
        <Sep />
        <Btn title="Bullet list" onClick={() => run('insertUnorderedList')}><ListBulletIcon className="w-4 h-4" /></Btn>
        <Btn title="Numbered list" onClick={() => run('insertOrderedList')}><NumberedListIcon className="w-4 h-4" /></Btn>
        <Btn title="Quote" onClick={() => run('formatBlock', '<blockquote>')}><span>❝</span></Btn>
        <Btn title="Link" onClick={addLink}><LinkIcon className="w-4 h-4" /></Btn>
        <Sep />
        <Btn title="Align left" onClick={() => run('justifyLeft')}><span>⇤</span></Btn>
        <Btn title="Align center" onClick={() => run('justifyCenter')}><span>↔</span></Btn>
        <Btn title="Align right" onClick={() => run('justifyRight')}><span>⇥</span></Btn>
        <Sep />
        <Btn title="Undo" onClick={() => run('undo')}><ArrowUturnLeftIcon className="w-4 h-4" /></Btn>
        <Btn title="Redo" onClick={() => run('redo')}><ArrowUturnRightIcon className="w-4 h-4" /></Btn>
        <Btn title="Clear formatting" onClick={() => run('removeFormat')}><TrashIcon className="w-4 h-4" /></Btn>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="rte-content max-h-[600px] overflow-y-auto px-3 py-2.5 text-sm focus:outline-none"
      />
    </div>
  );
}
