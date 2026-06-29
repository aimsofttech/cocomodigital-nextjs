import { useRef, useEffect, useState, type ReactNode } from 'react';
import {
  BoldIcon, ItalicIcon, UnderlineIcon, ListBulletIcon, LinkIcon, PhotoIcon,
  NumberedListIcon, ArrowUturnLeftIcon, ArrowUturnRightIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import uploadApi from '@/services/uploadApi';
import Tooltip from './Tooltip';

interface Props {
  value?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum height of the editing area in pixels (default 160). */
  minHeight?: number;
  /** S3 sub-folder for images inserted into the content (default 'content'). */
  uploadFolder?: string;
}

const exec = (command: string, arg?: string) => document.execCommand(command, false, arg);

/**
 * Lightweight rich-text editor built on a contentEditable surface (no external
 * deps). Stores/emits HTML so it drops straight into a react-hook-form field.
 */
export default function RichTextEditor({ value = '', onChange, placeholder = 'Write something…', minHeight = 160, uploadFolder = 'content' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Remember where the caret was before the file dialog stole focus, so the
  // uploaded image is inserted back at the user's position.
  const savedRange = useRef<Range | null>(null);
  const [uploading, setUploading] = useState(false);

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

  // Stash the current selection (inside the editor) before opening the OS file
  // picker, which moves focus out of the contentEditable surface.
  const pickImage = () => {
    const sel = window.getSelection();
    savedRange.current =
      sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)
        ? sel.getRangeAt(0).cloneRange()
        : null;
    fileRef.current?.click();
  };

  // Upload the chosen file to S3, then insert it at the saved caret position
  // (falling back to the end of the content).
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadApi.image(file, { folder: uploadFolder });
      ref.current?.focus();
      const sel = window.getSelection();
      if (savedRange.current && sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      }
      exec('insertImage', media.url);
      emit();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const Btn = ({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) => (
    <Tooltip content={title}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()} // keep selection/focus in the editor
        onClick={onClick}
        className="h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 text-sm font-medium"
      >
        {children}
      </button>
    </Tooltip>
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
        <Btn title={uploading ? 'Uploading…' : 'Insert image'} onClick={pickImage}>
          {uploading ? <span className="text-xs">…</span> : <PhotoIcon className="w-4 h-4" />}
        </Btn>
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
      <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
    </div>
  );
}
