'use client';

import React, {
  useState, useEffect, useRef, useCallback, useLayoutEffect
} from 'react';
import { AlertCircle, Upload, Play, Link as LinkIcon, Code, Quote, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface InlineLink { text: string; url: string; from: number; to: number; }

export interface EditorBlock {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'bullet' | 'number'
      | 'code' | 'divider' | 'callout' | 'image' | 'embed' | 'button' | 'gallery' | 'latex';
  content: string;
  meta?: {
    indent?: number;
    calloutType?: 'tip' | 'warning';
    imageUrl?: string;
    imageAlt?: string;
    imageLoading?: boolean;
    imageProgress?: number;
    imageAlign?: 'left' | 'center' | 'right' | 'full';
    imageCaption?: string;
    imageWidth?: number;  // percentage 20–100
    embedType?: 'youtube' | 'maps' | 'social';
    buttonText?: string;
    buttonLink?: string;
    galleryUrls?: string[];
    dropCap?: boolean;
    links?: InlineLink[];
  };
}

type FloatingToolbar = {
  visible: boolean;
  x: number;
  y: number;
  blockId: string;
  selStart: number;
  selEnd: number;
};

interface RichBlogEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  mode?: 'rich' | 'markdown';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function indentClass(level: number) {
  if (level === 1) return 'pl-8 sm:pl-12';
  if (level === 2) return 'pl-16 sm:pl-24';
  if (level >= 3) return 'pl-24 sm:pl-36';
  return '';
}

function bulletSymbol(level: number) {
  if (level === 0) return '•';
  if (level === 1) return '◦';
  return '▪';
}

// ── FIX: Count position within current consecutive numbered-list run ──────────
// Each new run (interrupted by any non-number block) resets to 1.
function getListNumber(blocks: EditorBlock[], idx: number): number {
  let n = 1;
  for (let i = idx - 1; i >= 0; i--) {
    if (blocks[i].type === 'number') n++;
    else break;
  }
  return n;
}

// Parse raw content string, replacing [text](url) with rendered anchor spans
function parseInlineContent(content: string, links: InlineLink[] = []): React.ReactNode[] {
  if (!links.length) {
    // still render bold/italic/code visually in preview mode
    return renderInlineMarkup(content);
  }
  // Build nodes with link segments
  const sorted = [...links].sort((a, b) => a.from - b.from);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const lnk of sorted) {
    if (lnk.from > cursor) {
      nodes.push(...renderInlineMarkup(content.slice(cursor, lnk.from)));
    }
    nodes.push(
      <a
        key={`lnk-${lnk.from}`}
        href={lnk.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline underline-offset-2 decoration-blue-400/60 cursor-pointer transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {lnk.text}
      </a>
    );
    cursor = lnk.to;
  }
  if (cursor < content.length) nodes.push(...renderInlineMarkup(content.slice(cursor)));
  return nodes;
}

// Render **bold**, *italic*, `code`, ==highlight== in preview
function renderInlineMarkup(text: string): React.ReactNode[] {
  // Simple sequential replacer — enough for a travel blog
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|==[^=]+=={2})/g);
  return parts.map((p, i) => {
    if (/^\*\*(.+)\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^\*(.+)\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^`(.+)`$/.test(p)) return <code key={i} className="bg-neutral-200 text-[#D45B0C] font-mono text-[0.9em] px-1.5 py-0.5 rounded-md">{p.slice(1, -1)}</code>;
    if (/^==(.+)==$/.test(p)) return <mark key={i} className="bg-[#FFD166]/40 text-[#1F2937] rounded px-0.5">{p.slice(2, -2)}</mark>;
    if (/<[a-z][\s\S]*>/i.test(p)) return <span key={i} dangerouslySetInnerHTML={{ __html: p }} />;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// ─── Slash commands catalogue ──────────────────────────────────────────────────
const SLASH_CMDS = [
  { type: 'h1',              label: 'Heading 1',        icon: 'H1',  desc: 'Large section title' },
  { type: 'h2',              label: 'Heading 2',        icon: 'H2',  desc: 'Subheading' },
  { type: 'h3',              label: 'Heading 3',        icon: 'H3',  desc: 'Small subheading' },
  { type: 'quote',           label: 'Quote',            icon: '❝',   desc: 'Blockquote' },
  { type: 'bullet',          label: 'Bullet list',      icon: '•',   desc: 'Unordered list' },
  { type: 'number',          label: 'Numbered list',    icon: '1.',  desc: 'Ordered list' },
  { type: 'code',            label: 'Code block',       icon: '</>',  desc: 'Monospaced code' },
  { type: 'callout-tip',     label: 'Tip callout',      icon: '💡',  desc: 'Pro-tip highlight' },
  { type: 'callout-warning', label: 'Warning callout',  icon: '⚠️',  desc: 'Hazard notice' },
  { type: 'divider',         label: 'Divider',          icon: '—',   desc: 'Horizontal rule' },
  { type: 'gallery',         label: 'Photo gallery',    icon: '🖼️',  desc: 'Image collage' },
  { type: 'latex',           label: 'Math / LaTeX',     icon: '∑',   desc: 'Formula block' },
  { type: 'image-link',      label: 'Image Link',       icon: '🔗',  desc: 'Insert image from URL' },
];

// ─── Component ─────────────────────────────────────────────────────────────────
export const RichBlogEditor: React.FC<RichBlogEditorProps> = ({
  value,
  onChange,
  placeholder = "Write Your Story… '/' For More Features · Tab for Sub-Bullets · Paste Images",
  mode = 'rich',
}) => {
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rawMarkdown, setRawMarkdown] = useState(value);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  // Image selection state
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [imageToolbarPos, setImageToolbarPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [slashMenu, setSlashMenu] = useState<{ open: boolean; query: string; cursor: number }>({
    open: false, query: '', cursor: 0,
  });
  const [toolbar, setToolbar] = useState<FloatingToolbar>({
    visible: false, x: 0, y: 0, blockId: '', selStart: 0, selEnd: 0,
  });
  const [linkInput, setLinkInput] = useState<{ open: boolean; url: string }>({ open: false, url: '' });

  useEffect(() => {
    if (!selectedImageId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setBlocks(prev => prev.filter(b => b.id !== selectedImageId));
        setSelectedImageId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId]);

  const blockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const linkInputRef = useRef<HTMLInputElement>(null);
  const imageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── FIX 9: sync blocks → parent via useEffect, NOT inside setState callback ──
  const isInit = useRef(true);
  useEffect(() => {
    if (isInit.current) { isInit.current = false; return; }
    if (blocks.length === 0) return;
    onChange(JSON.stringify(blocks));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // ── FIX 3 & 5 & 4: focus after render via pendingFocusId ─────────────────
  // useLayoutEffect fires synchronously after DOM mutations, but for *newly inserted*
  // blocks the textarea ref callback runs during the same commit phase — sometimes
  // after useLayoutEffect. One rAF guarantees the ref is populated.
  useLayoutEffect(() => {
    if (!pendingFocusId) return;

    function tryFocus() {
      const el = blockRefs.current[pendingFocusId!];
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
        autoResize(el);
        setPendingFocusId(null);
      } else {
        // Ref not yet attached — wait one more frame
        requestAnimationFrame(() => {
          const el2 = blockRefs.current[pendingFocusId!];
          if (el2) {
            el2.focus();
            const len = el2.value.length;
            el2.setSelectionRange(len, len);
            autoResize(el2);
          }
          setPendingFocusId(null);
        });
      }
    }
    tryFocus();
  }, [blocks, pendingFocusId]);

  // ── Auto-resize all on block/mode change ──────────────────────────────────
  useEffect(() => {
    Object.values(blockRefs.current).forEach(autoResize);
  }, [blocks, mode]);

  // ── Parse value into blocks (once or when receiving delayed data) ──────────
  useEffect(() => {
    const isEffectivelyEmpty = blocks.length === 0 || (blocks.length === 1 && blocks[0].content === '' && blocks[0].type === 'paragraph');
    // If we already have real blocks and the user might be typing, do not overwrite from parent!
    if (!isEffectivelyEmpty) return;
    
    // If no value provided, ensure we have at least one empty block
    if (!value) {
      if (blocks.length === 0) {
        const initial = [{ id: uid(), type: 'paragraph' as const, content: '', meta: { indent: 0 } }];
        setBlocks(initial);
        setActiveId(initial[0].id);
      }
      return;
    }

    try {
      if (value?.startsWith('[') && value?.endsWith(']')) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          isInit.current = true;
          setBlocks(parsed);
          setActiveId(parsed[0].id);
          return;
        }
      }
    } catch (_) {}

    const lines = (value || '').split('\n');
    const initial: EditorBlock[] = lines.length
      ? lines.map((raw, i) => {
          const trimmed = raw.trim();
          let type: EditorBlock['type'] = 'paragraph';
          let content = trimmed;
          const meta: EditorBlock['meta'] = { indent: 0 };
          if (trimmed.startsWith('# '))        { type = 'h1';     content = trimmed.slice(2); }
          else if (trimmed.startsWith('## '))  { type = 'h2';     content = trimmed.slice(3); }
          else if (trimmed.startsWith('### ')) { type = 'h3';     content = trimmed.slice(4); }
          else if (trimmed.startsWith('> '))   { type = 'quote';  content = trimmed.slice(2); }
          else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) { type = 'bullet'; content = trimmed.slice(2); }
          else if (/^\d+\. /.test(trimmed))   { type = 'number'; content = trimmed.replace(/^\d+\. /, ''); }
          else if (trimmed === '---')          { type = 'divider'; content = ''; }
          return { id: `${uid()}-${i}`, type, content, meta };
        })
      : [{ id: uid(), type: 'paragraph' as const, content: '', meta: { indent: 0 } }];

    isInit.current = true;
    setBlocks(initial);
    setActiveId(initial[0]?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── FIX 1: Toolbar positioning via mouseup + Selection API ────────────────
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      // Small delay so the browser finalises the selection rect
      setTimeout(() => {
        let activeBlockId = null;
        let s = 0, en = 0;
        let selectedEl = null;

        // 1. Check if the active element is a textarea with text selected
        if (document.activeElement?.tagName === 'TEXTAREA') {
          const el = document.activeElement as HTMLTextAreaElement;
          if (el.selectionEnd - el.selectionStart > 0) {
            const bid = Object.keys(blockRefs.current).find(id => blockRefs.current[id] === el);
            if (bid) {
              activeBlockId = bid;
              s = el.selectionStart;
              en = el.selectionEnd;
              selectedEl = el;
            }
          }
        }

        // 2. If not a textarea selection, fallback to DOM selection (if they dragged on preview mode somehow, though preview has user-select issues)
        let rect: DOMRect | null = null;
        if (!activeBlockId) {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
            setToolbar(t => ({ ...t, visible: false }));
            return;
          }
          const range = sel.getRangeAt(0);
          rect = range.getBoundingClientRect();
          if (!rect || rect.width === 0) return;

          const target = e.target as HTMLElement;
          activeBlockId = Object.keys(blockRefs.current).find(id => {
            const el = blockRefs.current[id];
            return el && (el === target || el.contains(target));
          }) || null;
          
          if (activeBlockId) {
            selectedEl = blockRefs.current[activeBlockId];
            if (selectedEl) {
              s = selectedEl.selectionStart;
              en = selectedEl.selectionEnd;
            }
          }
        }

        if (!activeBlockId || !selectedEl) {
          setToolbar(t => ({ ...t, visible: false }));
          return;
        }

        if (!rect) {
          // Approximate the rect if from textarea
          rect = selectedEl.getBoundingClientRect();
        }

        // Position: use mouse coordinates for X, and rect.top for Y
        setToolbar({
          visible: true,
          x: e.clientX,
          y: rect.top - 52,
          blockId: activeBlockId,
          selStart: s,
          selEnd: en,
        });
        setLinkInput({ open: false, url: '' });
      }, 0);
    }

    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  // Dismiss toolbar on mousedown outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('[data-toolbar]')) return;
      setToolbar(t => ({ ...t, visible: false }));
      setLinkInput({ open: false, url: '' });
      // Deselect image if click is outside any image wrapper
      if (!target.closest('[data-image-block]')) {
        setSelectedImageId(null);
      }
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  // ── FIX 6: Global keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl || !activeId) return;

      // Only handle shortcuts when a block textarea is focused
      const active = document.activeElement;
      const isEditor = Object.values(blockRefs.current).includes(active as HTMLTextAreaElement);
      if (!isEditor) return;

      if (e.key === 'b' && !e.shiftKey) { e.preventDefault(); applyInline('bold'); return; }
      if (e.key === 'i' && !e.shiftKey) { e.preventDefault(); applyInline('italic'); return; }
      if (e.key === 'e')                 { e.preventDefault(); applyInline('code'); return; }
      if (e.key === 'k')                 { e.preventDefault(); openLinkInput(); return; }
      if (e.key === 'h' && e.shiftKey)   { e.preventDefault(); applyInline('highlight'); return; }
      if (e.key === 's' && e.shiftKey)   { e.preventDefault(); applyInline('strikethrough'); return; }
      if (e.key === '1' && e.altKey)     { e.preventDefault(); applyBlockType('h1'); return; }
      if (e.key === '2' && e.altKey)     { e.preventDefault(); applyBlockType('h2'); return; }
      if (e.key === '3' && e.altKey)     { e.preventDefault(); applyBlockType('h3'); return; }
      if (e.key === 'q' && e.shiftKey)   { e.preventDefault(); applyBlockType('quote'); return; }
      if (e.key === '8' && e.shiftKey)   { e.preventDefault(); applyBlockType('bullet'); return; }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, blocks, toolbar]);

  // ── Content update + markdown shortcut parsing ────────────────────────────
  function updateContent(id: string, raw: string, el?: HTMLTextAreaElement | null) {
    setBlocks(prev => {
      const next = prev.map(b => {
        if (b.id !== id) return b;
        let type = b.type;
        let content = raw;
        const meta = { ...b.meta };

        // Leading-spaces bullet/number indent
        const indentMatch = raw.match(/^(\s*)([-*]|\d+\.) /);
        if (indentMatch) {
          const spaces = indentMatch[1];
          content = raw.slice(indentMatch[0].length);
          type = /\d+/.test(indentMatch[2]) ? 'number' : 'bullet';
          meta.indent = spaces.includes('\t')
            ? (spaces.match(/\t/g)?.length ?? 0)
            : Math.floor(spaces.length / 2);
          return { ...b, type, content, meta };
        }

        // Standard line-start shortcuts
        if (raw === '---') { type = 'divider'; content = ''; }
        else if (/^#+\s/.test(raw) || /^#+[^\s#]/.test(raw)) {
          const match = raw.match(/^(#+)\s*(.*)/);
          if (match) {
            const level = match[1].length;
            if (level === 1) { type = 'h1'; content = match[2]; }
            else if (level === 2) { type = 'h2'; content = match[2]; }
            else { type = 'h3'; content = match[2]; }
          }
        }
        else if (raw.startsWith('> '))        { type = 'quote'; content = raw.slice(2); }
        else if (raw.startsWith('- ') || raw.startsWith('* '))  { type = 'bullet'; content = raw.slice(2); }
        else if (/^\d+\. /.test(raw))        { type = 'number'; content = raw.replace(/^\d+\. /, ''); }
        else if (raw.startsWith('```'))       { type = 'code';   content = raw.slice(3); }
        else if (raw.match(/^!\[(.*?)\]\((.*?)\)/)) {
          const match = raw.match(/^!\[(.*?)\]\((.*?)\)/);
          if (match) {
            type = 'image';
            content = '';
            meta.imageAlt = match[1];
            meta.imageUrl = match[2];
            meta.imageWidth = 100;
          }
        }

        return { ...b, type, content, meta };
      });
      return next;
    });

    // Slash menu detection
    const syntheticContent = raw; // raw is the latest value
    const lastSlash = syntheticContent.lastIndexOf('/');
    if (lastSlash !== -1) {
      const after = syntheticContent.slice(lastSlash + 1);
      if (!after.includes(' ') && !after.includes('\n')) {
        setSlashMenu({ open: true, query: after, cursor: 0 });
      } else {
        setSlashMenu(s => ({ ...s, open: false }));
      }
    } else {
      setSlashMenu(s => ({ ...s, open: false }));
    }

    // FIX 4 & 8: If a markdown shortcut just converted this block (e.g. "* " → bullet),
    // the block re-renders and the textarea might lose focus. Re-focus it.
    const wasConverted = ['# ', '## ', '### ', '> ', '- ', '* ', '```', '---'].some(p => raw.startsWith(p))
      || /^\d+\. /.test(raw);
    if (wasConverted) {
      setPendingFocusId(id);
    } else if (el) {
      requestAnimationFrame(() => autoResize(el));
    }
  }

  // ── Keyboard handler per block ────────────────────────────────────────────
  function onKeyDown(id: string, idx: number, e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const block = blocks[idx];

    // TAB: indent/unindent
    if (e.key === 'Tab') {
      e.preventDefault();
      const cur = block.meta?.indent ?? 0;
      const next = e.shiftKey ? Math.max(0, cur - 1) : Math.min(3, cur + 1);
      setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, meta: { ...b.meta, indent: next } } : b));
      return;
    }

    // Slash menu navigation
    if (slashMenu.open) {
      const cmds = SLASH_CMDS.filter(c => c.label.toLowerCase().includes(slashMenu.query.toLowerCase()));
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashMenu(s => ({ ...s, cursor: (s.cursor + 1) % (cmds.length || 1) })); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashMenu(s => ({ ...s, cursor: Math.max(0, s.cursor - 1) })); return; }
      if (e.key === 'Escape')    { setSlashMenu(s => ({ ...s, open: false })); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = cmds[slashMenu.cursor];
        if (chosen) applySlashCmd(id, idx, chosen.type);
        return;
      }
    }

    // ENTER
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cur = block.meta?.indent ?? 0;

      // Empty list item: dedent or convert
      if ((block.type === 'bullet' || block.type === 'number') && !block.content.trim()) {
        if (cur > 0) {
          setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, meta: { ...b.meta, indent: cur - 1 } } : b));
          setPendingFocusId(id);
        } else {
          setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, type: 'paragraph', meta: { ...b.meta, indent: 0 } } : b));
          setPendingFocusId(id);
        }
        return;
      }

      // Inherit list continuation
      const newType = (block.type === 'bullet' || block.type === 'number') ? block.type : 'paragraph';
      const newIndent = newType !== 'paragraph' ? (block.meta?.indent ?? 0) : 0;
      const newBlock: EditorBlock = { id: uid(), type: newType, content: '', meta: { indent: newIndent } };

      setBlocks(prev => {
        const next = [...prev];
        next.splice(idx + 1, 0, newBlock);
        return next;
      });
      setActiveId(newBlock.id);
      setPendingFocusId(newBlock.id);
      return;
    }

    // BACKSPACE at caret position 0
    if (e.key === 'Backspace' && e.currentTarget.selectionStart === 0) {
      const cur = block.meta?.indent ?? 0;

      // Dedent first if indented
      if (cur > 0 && !block.content) {
        e.preventDefault();
        setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, meta: { ...b.meta, indent: cur - 1 } } : b));
        setPendingFocusId(id);
        return;
      }
      // Revert non-paragraph type
      if (block.type !== 'paragraph' && !block.content) {
        e.preventDefault();
        setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, type: 'paragraph', meta: { ...b.meta, indent: 0 } } : b));
        setPendingFocusId(id);
        return;
      }
      // Merge up
      if (idx > 0 && !block.content) {
        e.preventDefault();
        const prevBlock = blocks[idx - 1];
        setBlocks(prev => {
          const next = prev.filter((_, i) => i !== idx);
          return next;
        });
        setActiveId(prevBlock.id);
        setPendingFocusId(prevBlock.id);
        return;
      }
    }
  }

  // ── Apply inline formatting ───────────────────────────────────────────────
  const getActiveSelection = useCallback((): { block: EditorBlock; el: HTMLTextAreaElement; s: number; en: number } | null => {
    const { blockId, selStart, selEnd } = toolbar;
    if (!blockId) {
      // Fallback: use current active element
      const el = document.activeElement as HTMLTextAreaElement;
      const bid = Object.keys(blockRefs.current).find(k => blockRefs.current[k] === el);
      if (!bid) return null;
      const block = blocks.find(b => b.id === bid);
      if (!block) return null;
      return { block, el, s: el.selectionStart, en: el.selectionEnd };
    }
    const block = blocks.find(b => b.id === blockId);
    const el = blockRefs.current[blockId];
    if (!block || !el) return null;
    return { block, el, s: selStart, en: selEnd };
  }, [toolbar, blocks]);

  function applyInline(fmt: string) {
    const hit = getActiveSelection();
    if (!hit) return;
    const { block, el, s, en } = hit;
    if (en - s < 1 && !['bold','italic','code','highlight','strikethrough'].includes(fmt)) return;

    const before = block.content.slice(0, s);
    const selected = en > s ? block.content.slice(s, en) : '';
    const after = block.content.slice(en > s ? en : s);

    let newContent = block.content;
    if (fmt === 'bold')          newContent = `${before}**${selected}**${after}`;
    else if (fmt === 'italic')   newContent = `${before}*${selected}*${after}`;
    else if (fmt === 'strikethrough') newContent = `${before}~~${selected}~~${after}`;
    else if (fmt === 'code')     newContent = `${before}\`${selected}\`${after}`;
    else if (fmt === 'highlight') newContent = `${before}==${selected}==${after}`;
    else if (fmt === 'color') {
      const color = window.prompt('Enter text color (e.g., #FF0000 or red):', '#FF8A3D');
      if (color) newContent = `${before}<span style="color:${color}">${selected}</span>${after}`;
    }
    else if (fmt === 'size') {
      const size = window.prompt('Enter font size (e.g., 20px, 1.5em):', '24px');
      if (size) newContent = `${before}<span style="font-size:${size}">${selected}</span>${after}`;
    }

    if (newContent !== block.content) {
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content: newContent } : b));
      requestAnimationFrame(() => { el.focus(); autoResize(el); });
    }
    setToolbar(t => ({ ...t, visible: false }));
  }

  function applyBlockType(type: EditorBlock['type']) {
    const hit = getActiveSelection();
    const bid = hit?.block.id ?? activeId;
    if (!bid) return;
    setBlocks(prev => prev.map(b => b.id === bid ? { ...b, type } : b));
    setToolbar(t => ({ ...t, visible: false }));
    setPendingFocusId(bid);
  }

  function openLinkInput() {
    setLinkInput(l => ({ ...l, open: true }));
    setTimeout(() => linkInputRef.current?.focus(), 60);
  }

  // ── FIX 7: Apply link as rich InlineLink metadata (not raw markdown) ───────
  function applyLink(url: string) {
    if (!url) return;
    const { blockId, selStart, selEnd } = toolbar;
    if (!blockId || selEnd - selStart < 1) return;

    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const linkText = block.content.slice(selStart, selEnd);

    const existingLinks = block.meta?.links ?? [];
    // Remove any overlapping links
    const filtered = existingLinks.filter(l => l.to <= selStart || l.from >= selEnd);
    const newLink: InlineLink = { text: linkText, url, from: selStart, to: selEnd };

    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, meta: { ...b.meta, links: [...filtered, newLink] } } : b
    ));
    setToolbar(t => ({ ...t, visible: false }));
    setLinkInput({ open: false, url: '' });
  }

  // ── Slash command apply ───────────────────────────────────────────────────
  function applySlashCmd(id: string, idx: number, type: string) {
    let btype: EditorBlock['type'] = 'paragraph';
    const meta: EditorBlock['meta'] = { indent: blocks[idx]?.meta?.indent ?? 0 };
    let content = '';

    if (type === 'h1') btype = 'h1';
    else if (type === 'h2') btype = 'h2';
    else if (type === 'h3') btype = 'h3';
    else if (type === 'quote') btype = 'quote';
    else if (type === 'bullet') btype = 'bullet';
    else if (type === 'number') btype = 'number';
    else if (type === 'code') btype = 'code';
    else if (type === 'callout-tip')     { btype = 'callout'; meta.calloutType = 'tip'; content = '💡 '; }
    else if (type === 'callout-warning') { btype = 'callout'; meta.calloutType = 'warning'; content = '⚠️ '; }
    else if (type === 'divider') btype = 'divider';
    else if (type === 'gallery') {
      btype = 'gallery';
      meta.galleryUrls = [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop',
        'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop',
      ];
    }
    else if (type === 'latex') { btype = 'latex'; content = '\\sum_{i=1}^{n} x_i'; }
    else if (type === 'image-link') {
      const url = window.prompt("Enter Image URL:", "https://");
      if (!url) return;
      btype = 'image';
      meta.imageUrl = url;
      meta.imageWidth = 100;
      content = '';
    }

    setBlocks(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], type: btype, content, meta };
      return next;
    });
    setSlashMenu({ open: false, query: '', cursor: 0 });
    setPendingFocusId(id);
  }

  // ── FIX 9: Paste — images ─────────────────────────────────────────────────
  function onPaste(idx: number, e: React.ClipboardEvent<HTMLTextAreaElement>) {
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        e.preventDefault();

        const tid = uid();
        const loader: EditorBlock = {
          id: tid, type: 'image', content: '',
          meta: { imageLoading: true, imageProgress: 10 },
        };

        // Insert loader block
        setBlocks(prev => {
          const next = [...prev];
          next.splice(idx + 1, 0, loader);
          return next;
        });

        let p = 10;
        const iv = setInterval(() => {
          p = Math.min(p + 25, 95);
          // Update progress — safe: no onChange call here
          setBlocks(prev => prev.map(b =>
            b.id === tid ? { ...b, meta: { ...b.meta, imageProgress: p } } : b
          ));
        }, 150);

        (async () => {
          try {
            const presignRes = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: file.name, contentType: file.type })
            });
            const presignData = await presignRes.json();
            
            if (!presignRes.ok) throw new Error(presignData.error || 'Failed to get upload URL');

            const uploadRes = await fetch(presignData.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': file.type },
              body: file,
            });

            if (!uploadRes.ok) throw new Error('Failed to upload file to storage bucket');

            clearInterval(iv);
            setBlocks(prev =>
              prev.map(b =>
                b.id === tid
                  ? { ...b, meta: { imageLoading: false, imageUrl: presignData.publicUrl } }
                  : b
              )
            );
          } catch (err) {
            clearInterval(iv);
            console.error('Pasted image upload failed:', err);
            setBlocks(prev => prev.filter(b => b.id !== tid));
            alert('Failed to upload pasted image.');
          }
        })();
        return;
      }
    }

    // Multi-line block creation
    const textData = e.clipboardData.getData('text/plain');
    if (textData.includes('\n')) {
      const lines = textData.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length > 1) {
        e.preventDefault();
        const newBlocks = lines.map(raw => {
          let type: EditorBlock['type'] = 'paragraph';
          let content = raw;
          const meta: EditorBlock['meta'] = { indent: 0 };

          if (raw === '---') { type = 'divider'; content = ''; }
          else if (/^#+\s/.test(raw) || /^#+[^\s#]/.test(raw)) {
            const match = raw.match(/^(#+)\s*(.*)/);
            if (match) {
              const level = match[1].length;
              if (level === 1) type = 'h1'; else if (level === 2) type = 'h2'; else type = 'h3';
              content = match[2];
            }
          }
          else if (raw.match(/^!\[(.*?)\]\((.*?)\)/)) {
            const match = raw.match(/^!\[(.*?)\]\((.*?)\)/);
            if (match) {
              type = 'image';
              content = '';
              meta.imageAlt = match[1];
              meta.imageUrl = match[2];
              meta.imageWidth = 100;
            }
          }
          else if (raw.startsWith('> '))        { type = 'quote'; content = raw.slice(2); }
          else if (raw.startsWith('- ') || raw.startsWith('* '))  { type = 'bullet'; content = raw.slice(2); }
          else if (/^\d+\. /.test(raw))        { type = 'number'; content = raw.replace(/^\d+\. /, ''); }
          else if (raw.startsWith('```'))       { type = 'code';   content = raw.slice(3); }

          return { id: uid(), type, content, meta } as EditorBlock;
        });

        setBlocks(prev => {
          const next = [...prev];
          if (!blocks[idx].content.trim() && blocks[idx].type === 'paragraph') {
            next.splice(idx, 1, ...newBlocks);
          } else {
            next.splice(idx + 1, 0, ...newBlocks);
          }
          return next;
        });
        const lastId = newBlocks[newBlocks.length - 1].id;
        setActiveId(lastId);
        setPendingFocusId(lastId);
        return;
      }
    }

    // URL embed detection
    const text = textData.trim();
    if (/^https?:\/\//.test(text) && blocks[idx] && !blocks[idx].content.trim()) {
      const isYT    = /youtube\.com|youtu\.be/.test(text);
      const isMaps  = /maps\.google/.test(text);
      if (isYT || isMaps) {
        e.preventDefault();
        setBlocks(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], type: 'embed', content: text, meta: { embedType: isYT ? 'youtube' : 'maps' } };
          return next;
        });
      }
    }
  }

  // ── Shared textarea factory ───────────────────────────────────────────────
  function makeTextarea(
    block: EditorBlock,
    idx: number,
    className: string,
    ph: string,
  ) {
    return (
      <textarea
        key={`ta-${block.id}`}
        ref={el => { blockRefs.current[block.id] = el; }}
        value={block.content}
        rows={1}
        className={`w-full bg-transparent resize-none overflow-hidden focus:outline-none ${className}`}
        placeholder={ph}
        onChange={e => updateContent(block.id, e.target.value, e.currentTarget)}
        onInput={e => autoResize(e.currentTarget)}
        onKeyDown={e => onKeyDown(block.id, idx, e)}
        onFocus={() => setActiveId(block.id)}
        onPaste={e => onPaste(idx, e)}
      />
    );
  }

  // ── Filtered slash commands ───────────────────────────────────────────────
  const filteredCmds = SLASH_CMDS.filter(c =>
    c.label.toLowerCase().includes(slashMenu.query.toLowerCase())
  );

  // ── Markdown mode ─────────────────────────────────────────────────────────
  if (mode === 'markdown') {
    return (
      <div className="w-full py-4">
        <textarea
          value={rawMarkdown}
          onChange={e => { setRawMarkdown(e.target.value); onChange(e.target.value); }}
          onInput={e => autoResize(e.currentTarget)}
          placeholder="# Write raw Markdown here..."
          rows={1}
          className="w-full min-h-[800px] bg-transparent border-0 focus:outline-none font-mono text-xl text-[#1F2937] placeholder:text-[#1F2937]/25 leading-[1.8] resize-none overflow-hidden"
        />
      </div>
    );
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full min-h-[800px] py-2 selection:bg-[#FF8A3D]/25 cursor-text"
      onClick={e => {
        if (e.target === e.currentTarget && blocks.length > 0) {
          const last = blocks[blocks.length - 1];
          setActiveId(last.id);
          setPendingFocusId(last.id);
        }
      }}
    >
      {/* Clear All Button */}
      {blocks.length > 0 && (blocks.length > 1 || (blocks[0]?.content && blocks[0].content.trim() !== '')) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('Are you sure you want to clear the entire editor?')) {
              setBlocks([{ id: uid(), type: 'paragraph', content: '', meta: { indent: 0 } }]);
            }
          }}
          className="absolute -top-12 right-0 sm:right-4 p-2 text-xs font-bold text-neutral-400 hover:text-rose-500 bg-neutral-100 hover:bg-rose-50 rounded-xl transition-colors z-10 flex items-center gap-1 shadow-sm border border-neutral-200"
          title="Clear Editor Content"
        >
          <AlertCircle size={14} /> Clear Editor
        </button>
      )}

      {/* ── Floating selection toolbar (FIX 1: positioned via mouseup/getBoundingClientRect) */}
      <AnimatePresence>
        {toolbar.visible && (
          <motion.div
            key="toolbar"
            data-toolbar="true"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed',
              left: `${toolbar.x}px`,
              top: `${toolbar.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 9999,
            }}
            className="flex items-center bg-[#1A1A1A] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.55)] border border-white/10 px-2 py-1.5 gap-0.5"
          >
            <ToolBtn onClick={() => applyInline('bold')} title="Bold — Ctrl+B"><span className="font-black text-[13px]">B</span></ToolBtn>
            <ToolBtn onClick={() => applyInline('italic')} title="Italic — Ctrl+I"><span className="italic font-semibold text-[13px] font-serif">I</span></ToolBtn>
            <ToolBtn onClick={() => applyInline('strikethrough')} title="Strikethrough — Ctrl+Shift+S"><span className="line-through text-[13px] font-semibold">S</span></ToolBtn>
            <ToolBtn onClick={() => applyInline('highlight')} title="Highlight — Ctrl+Shift+H"><span className="text-[#FFD166] text-[13px] font-black">✦</span></ToolBtn>
            <Divider />
            <ToolBtn onClick={() => applyInline('color')} title="Text Color"><span className="text-rose-400 text-[13px] font-black">A</span></ToolBtn>
            <ToolBtn onClick={() => applyInline('size')} title="Font Size"><span className="text-[13px] font-black tracking-tighter">Tt</span></ToolBtn>
            <Divider />
            <ToolBtn onClick={() => applyInline('code')} title="Inline code — Ctrl+E"><Code size={13} /></ToolBtn>
            <Divider />
            <ToolBtn onClick={openLinkInput} title="Link — Ctrl+K" active={linkInput.open}>
              <LinkIcon size={13} />
            </ToolBtn>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Image selection toolbar ── */}
      <AnimatePresence>
        {selectedImageId && !blocks.find(b => b.id === selectedImageId)?.meta?.imageLoading && (
          <motion.div
            key="img-toolbar"
            data-toolbar="true"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed',
              left: `${imageToolbarPos.x}px`,
              top: `${imageToolbarPos.y}px`,
              transform: 'translateX(-50%)',
              zIndex: 9999,
            }}
            className="flex items-center bg-[#1A1A1A] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.55)] border border-white/10 px-2 py-1.5 gap-0.5"
          >
            <ToolBtn title="Full width" active={!blocks.find(b=>b.id===selectedImageId)?.meta?.imageAlign || blocks.find(b=>b.id===selectedImageId)?.meta?.imageAlign==='full'}
              onClick={() => setBlocks(prev => prev.map(b => b.id===selectedImageId ? {...b,meta:{...b.meta,imageAlign:'full'}} : b))}>
              <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><rect x="0.5" y="0.5" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="2" y="2.5" width="11" height="6" rx="0.5" fill="currentColor" opacity="0.5"/></svg>
            </ToolBtn>
            <ToolBtn title="Align left" active={blocks.find(b=>b.id===selectedImageId)?.meta?.imageAlign==='left'}
              onClick={() => setBlocks(prev => prev.map(b => b.id===selectedImageId ? {...b,meta:{...b.meta,imageAlign:'left'}} : b))}>
              <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><rect x="0.5" y="0.5" width="7.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="2" y="2.5" width="4.5" height="6" rx="0.5" fill="currentColor" opacity="0.5"/><rect x="10" y="2.5" width="4.5" height="1.5" rx="0.5" fill="currentColor" opacity="0.35"/><rect x="10" y="5.5" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.35"/></svg>
            </ToolBtn>
            <ToolBtn title="Align center" active={blocks.find(b=>b.id===selectedImageId)?.meta?.imageAlign==='center'}
              onClick={() => setBlocks(prev => prev.map(b => b.id===selectedImageId ? {...b,meta:{...b.meta,imageAlign:'center'}} : b))}>
              <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><rect x="3.5" y="0.5" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="5" y="2.5" width="5" height="6" rx="0.5" fill="currentColor" opacity="0.5"/></svg>
            </ToolBtn>
            <ToolBtn title="Align right" active={blocks.find(b=>b.id===selectedImageId)?.meta?.imageAlign==='right'}
              onClick={() => setBlocks(prev => prev.map(b => b.id===selectedImageId ? {...b,meta:{...b.meta,imageAlign:'right'}} : b))}>
              <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><rect x="7" y="0.5" width="7.5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="2.5" width="4.5" height="6" rx="0.5" fill="currentColor" opacity="0.5"/><rect x="0.5" y="2.5" width="4.5" height="1.5" rx="0.5" fill="currentColor" opacity="0.35"/><rect x="0.5" y="5.5" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.35"/></svg>
            </ToolBtn>
            <Divider />
            <ToolBtn title="Edit caption"
              onClick={() => {
                const cur = blocks.find(b=>b.id===selectedImageId)?.meta?.imageCaption || '';
                const cap = window.prompt('Image caption (leave blank to remove):', cur);
                if (cap !== null) setBlocks(prev => prev.map(b => b.id===selectedImageId ? {...b,meta:{...b.meta,imageCaption:cap}} : b));
              }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M1 10.5h11M1 12h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </ToolBtn>
            <Divider />
            <ToolBtn title="Delete image"
              onClick={() => {
                setBlocks(prev => {
                  const f = prev.filter(b => b.id !== selectedImageId);
                  return f.length ? f : [{id:uid(),type:'paragraph',content:'',meta:{indent:0}}];
                });
                setSelectedImageId(null);
              }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5.5 3.5V2h2v1.5M3.5 3.5l.5 7.5h5l.5-7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </ToolBtn>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link URL sub-panel */}
      <AnimatePresence>
        {toolbar.visible && linkInput.open && (
          <motion.div
            key="link-panel"
            data-toolbar="true"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              position: 'fixed',
              left: `${toolbar.x}px`,
              top: `${toolbar.y + 46}px`,
              transform: 'translateX(-50%)',
              zIndex: 9998,
            }}
            className="flex items-center bg-[#1A1A1A] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.55)] border border-white/10 px-3 py-2.5 gap-2.5 min-w-[300px]"
          >
            <LinkIcon size={12} className="text-[#FF8A3D] shrink-0" />
            <input
              ref={linkInputRef}
              value={linkInput.url}
              onChange={e => setLinkInput(l => ({ ...l, url: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter')  { e.preventDefault(); applyLink(linkInput.url); }
                if (e.key === 'Escape') { setLinkInput({ open: false, url: '' }); }
              }}
              placeholder="Paste URL and press Enter…"
              className="flex-1 bg-transparent text-white text-[13px] font-medium focus:outline-none placeholder:text-white/30"
            />
            {linkInput.url && (
              <button
                onMouseDown={e => { e.preventDefault(); applyLink(linkInput.url); }}
                className="text-[#FF8A3D] text-[12px] font-black hover:text-[#FFD166] transition-colors shrink-0"
              >
                Apply
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slash command menu */}
      <AnimatePresence>
        {slashMenu.open && filteredCmds.length > 0 && (
          <motion.div
            key="slash"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.13 }}
            className="absolute left-2 sm:left-4 mt-1 w-72 bg-[#1A1A1A] rounded-3xl border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.5)] z-[500] overflow-hidden py-2"
          >
            <div className="px-4 py-1.5 text-[10px] font-black text-[#FFD166] uppercase tracking-[0.15em] border-b border-white/8 mb-1">
              ⚡ Insert block
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
              {filteredCmds.map((cmd, i) => (
                <button
                  key={cmd.type}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    if (!activeId) return;
                    const idx = blocks.findIndex(b => b.id === activeId);
                    applySlashCmd(activeId, idx, cmd.type);
                  }}
                  onMouseEnter={() => setSlashMenu(s => ({ ...s, cursor: i }))}
                  className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center gap-3 transition-all ${
                    i === slashMenu.cursor ? 'bg-[#FF8A3D] text-[#1A1A1A]' : 'text-white hover:bg-white/8'
                  }`}
                >
                  <span className="w-7 text-center text-base shrink-0">{cmd.icon}</span>
                  <div>
                    <div className="text-[13px] font-black leading-none">{cmd.label}</div>
                    <div className={`text-[10px] mt-0.5 ${i === slashMenu.cursor ? 'text-[#1A1A1A]/70' : 'text-white/40'}`}>{cmd.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Block list ─────────────────────────────────────────────────────── */}
      <div className="space-y-0">
        {blocks.map((block, idx) => {
          const indent  = block.meta?.indent ?? 0;
          const iClass  = indentClass(indent);
          const isLast  = idx === blocks.length - 1;
          const isActive = activeId === block.id;

          // ── Dual-view helper: show rendered HTML when not focused, raw textarea when focused ──
          const dualView = (
            taClass: string,
            phText: string,
            previewClass: string,
          ) => (
            <div className="relative w-full">
              {/* Raw textarea — always present, hidden behind preview when inactive */}
              <textarea
                ref={el => { blockRefs.current[block.id] = el; }}
                value={block.content}
                rows={1}
                className={`w-full bg-transparent resize-none overflow-hidden focus:outline-none ${taClass} ${isActive ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
                placeholder={phText}
                onChange={e => updateContent(block.id, e.target.value, e.currentTarget)}
                onInput={e => autoResize(e.currentTarget)}
                onKeyDown={e => onKeyDown(block.id, idx, e)}
                onFocus={() => setActiveId(block.id)}
                onPaste={e => onPaste(idx, e)}
              />
              {/* Preview layer (rendered HTML) when not active */}
              {!isActive && block.content && (
                <div
                  className={`cursor-text ${previewClass}`}
                  onClick={() => { setActiveId(block.id); setPendingFocusId(block.id); }}
                >
                  {parseInlineContent(block.content, block.meta?.links)}
                </div>
              )}
              {/* Invisible placeholder when inactive and empty */}
              {!isActive && !block.content && (
                <div
                  className={`cursor-text ${previewClass} text-[#1F2937]/25`}
                  onClick={() => { setActiveId(block.id); setPendingFocusId(block.id); }}
                >
                  {phText}
                </div>
              )}
            </div>
          );

          return (
            <div key={block.id} className={`w-full ${iClass}`}>

              {/* H1 */}
              {block.type === 'h1' && dualView(
                'text-5xl sm:text-6xl font-black text-[#1F2937] placeholder:text-[#1F2937]/20 py-3 mt-4 leading-tight tracking-tight',
                'Heading 1…',
                'text-5xl sm:text-6xl font-black text-[#1F2937] py-3 mt-4 leading-tight tracking-tight',
              )}

              {/* H2 */}
              {block.type === 'h2' && dualView(
                'text-3xl sm:text-5xl font-extrabold text-[#1F2937] placeholder:text-[#1F2937]/20 py-2 mt-3 leading-tight',
                'Heading 2…',
                'text-3xl sm:text-5xl font-extrabold text-[#1F2937] py-2 mt-3 leading-tight',
              )}

              {/* H3 */}
              {block.type === 'h3' && dualView(
                'text-2xl sm:text-4xl font-bold text-[#D45B0C] placeholder:text-[#D45B0C]/25 py-1.5 mt-2 leading-snug',
                'Heading 3…',
                'text-2xl sm:text-4xl font-bold text-[#D45B0C] py-1.5 mt-2 leading-snug',
              )}

              {/* Quote */}
              {block.type === 'quote' && (
                <div className="border-l-[6px] border-[#FF8A3D] pl-6 my-3 bg-[#FFF9E6]/40 rounded-r-2xl py-2">
                  {dualView(
                    'font-serif italic text-2xl sm:text-3xl text-[#1F2937] placeholder:text-[#1F2937]/25 leading-relaxed',
                    'Quote…',
                    'font-serif italic text-2xl sm:text-3xl text-[#1F2937] leading-relaxed',
                  )}
                </div>
              )}

              {/* Code */}
              {block.type === 'code' && (
                <div className="my-2 bg-[#1A1A1A] rounded-2xl p-5 border border-white/10">
                  {makeTextarea(block, idx,
                    'font-mono text-lg text-emerald-300 placeholder:text-white/20 leading-[1.7]',
                    ''
                  )}
                </div>
              )}

              {/* FIX 2: Bullet — NO placeholder text for list items */}
              {block.type === 'bullet' && (
                <div className="flex items-start gap-3 sm:gap-4 py-0.5">
                  <span className={`select-none leading-none mt-[10px] shrink-0 font-black ${
                    indent === 0 ? 'text-[#FF8A3D] text-3xl' :
                    indent === 1 ? 'text-[#D45B0C] text-2xl' :
                    'text-[#1F2937]/50 text-xl'
                  }`}>
                    {bulletSymbol(indent)}
                  </span>
                  {dualView(
                    `text-xl sm:text-2xl text-[#1F2937] placeholder:text-transparent leading-[1.65] py-1 ${isLast ? 'min-h-[300px]' : ''}`,
                    '',
                    `text-xl sm:text-2xl text-[#1F2937] leading-[1.65] py-1 ${isLast ? 'min-h-[60px]' : ''}`,
                  )}
                </div>
              )}

              {/* Number list — counter resets per consecutive run */}
              {block.type === 'number' && (
                <div className="flex items-start gap-3 sm:gap-4 py-0.5">
                  <span className={`text-[#D45B0C] font-black leading-none mt-[10px] shrink-0 min-w-[28px] ${
                    indent === 0 ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                  }`}>
                    {getListNumber(blocks, idx)}.
                  </span>
                  {dualView(
                    `text-xl sm:text-2xl text-[#1F2937] placeholder:text-transparent leading-[1.65] py-1 ${isLast ? 'min-h-[300px]' : ''}`,
                    '',
                    `text-xl sm:text-2xl text-[#1F2937] leading-[1.65] py-1 ${isLast ? 'min-h-[60px]' : ''}`,
                  )}
                </div>
              )}

              {/* FIX 4: Divider — thin warm-sand line with glow */}
              {block.type === 'divider' && (
                <div
                  className="py-7 flex items-center justify-center cursor-default"
                  onClick={() => setPendingFocusId(block.id)}
                >
                  <textarea
                    ref={el => { blockRefs.current[block.id] = el; }}
                    value=""
                    rows={1}
                    readOnly
                    className="sr-only"
                    onKeyDown={e => onKeyDown(block.id, idx, e)}
                    onFocus={() => setActiveId(block.id)}
                  />
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4B896] to-transparent opacity-60" />
                </div>
              )}

              {/* Callout */}
              {block.type === 'callout' && (
                <div className={`p-6 sm:p-8 rounded-[32px] border-2 flex items-start gap-5 my-4 ${
                  block.meta?.calloutType === 'warning' ? 'bg-rose-50 border-rose-300' : 'bg-[#FFF9E6] border-amber-300'
                }`}>
                  <AlertCircle
                    className={block.meta?.calloutType === 'warning' ? 'text-rose-500 shrink-0 mt-1' : 'text-amber-600 shrink-0 mt-1'}
                    size={26}
                  />
                  {makeTextarea(block, idx,
                    'text-lg sm:text-2xl font-bold text-neutral-900 placeholder:text-neutral-400 leading-relaxed',
                    'Write tip or warning…'
                  )}
                </div>
              )}

              {/* Image — click to select, drag handles to resize */}
              {block.type === 'image' && (
                <ResizableImageBlock
                  block={block}
                  isSelected={selectedImageId === block.id}
                  onSelect={e => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setSelectedImageId(block.id);
                    setImageToolbarPos({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 52,
                    });
                    setToolbar(t => ({ ...t, visible: false }));
                  }}
                  onWidthChange={w =>
                    setBlocks(prev => prev.map(b =>
                      b.id === block.id ? { ...b, meta: { ...b.meta, imageWidth: w } } : b
                    ))
                  }
                  onClickBelow={() => {
                    const newBlock: EditorBlock = { id: uid(), type: 'paragraph', content: '', meta: { indent: 0 } };
                    setBlocks(prev => {
                      const i = prev.findIndex(b => b.id === block.id);
                      const next = [...prev];
                      next.splice(i + 1, 0, newBlock);
                      return next;
                    });
                    setActiveId(newBlock.id);
                    setPendingFocusId(newBlock.id);
                  }}
                />
              )}

              {/* Embed */}
              {block.type === 'embed' && (
                <div className="p-6 rounded-3xl bg-[#1A1A1A] border border-white/10 flex items-center gap-5 my-4 shadow-xl">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#FFD166]">
                    <Play size={22} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-[#FFD166] uppercase tracking-wider">Embed</div>
                    <div className="text-sm text-neutral-200 font-bold truncate max-w-lg">{block.content}</div>
                  </div>
                </div>
              )}

              {/* Gallery */}
              {block.type === 'gallery' && (
                <div className="grid grid-cols-2 gap-4 my-6">
                  {block.meta?.galleryUrls?.map((url, i) => (
                    <div key={i} className="rounded-3xl overflow-hidden h-64 shadow-lg">
                      <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* LaTeX */}
              {block.type === 'latex' && (
                <div className="p-6 rounded-[32px] bg-neutral-950 border border-emerald-500/30 my-4">
                  <div className="text-[10px] text-neutral-500 font-black uppercase tracking-widest pb-2">Math / LaTeX</div>
                  {makeTextarea(block, idx,
                    'font-mono text-xl text-emerald-400 text-center placeholder:text-emerald-900 py-2',
                    '\\sum equation…'
                  )}
                </div>
              )}

              {/* Paragraph (dual-view with inline link rendering) */}
              {block.type === 'paragraph' && dualView(
                `text-xl sm:text-2xl text-[#1F2937] font-normal leading-[1.75] placeholder:text-[#1F2937]/25 py-1 ${isLast ? 'min-h-[400px]' : ''}`,
                idx === 0 && !block.content.trim() ? placeholder : '',
                `text-xl sm:text-2xl text-[#1F2937] font-normal leading-[1.75] py-1 ${isLast ? 'min-h-[400px]' : ''}`,
              )}

            </div>
          );
        })}
      </div>

      {/* Keyboard shortcut hint (shown only when canvas is empty) */}
      {blocks.length === 1 && !blocks[0].content && (
        <div className="absolute bottom-6 left-2 sm:left-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#1F2937]/20 font-medium select-none pointer-events-none">
          <span>Ctrl+B Bold</span>
          <span>Ctrl+I Italic</span>
          <span>Ctrl+K Link</span>
          <span>Ctrl+E Code</span>
          <span>/ Commands</span>
          <span>Tab Indent</span>
        </div>
      )}
    </div>
  );
};

// ─── Micro-components ──────────────────────────────────────────────────────────
function ToolBtn({ children, onClick, title, active = false }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-100 text-white select-none ${
        active ? 'bg-[#FF8A3D] text-[#1A1A1A]' : 'hover:bg-white/12 active:bg-white/20'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0" />;
}

// ─── Resizable Image Block ──────────────────────────────────────────────────────
// 8 drag handles: 4 corners (NW, NE, SE, SW) + 4 midpoints (N, E, S, W)
// Dragging any handle updates the container width as a percentage of parent.
interface ResizableImageBlockProps {
  block: EditorBlock;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent<HTMLDivElement>) => void;
  onWidthChange: (widthPct: number) => void;
  onClickBelow: () => void;
}

function ResizableImageBlock({
  block, isSelected, onSelect, onWidthChange, onClickBelow,
}: ResizableImageBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  // Width in percent of the parent container; defaults to 100 %
  const [widthPct, setWidthPct] = useState<number>(block.meta?.imageWidth ?? 100);
  // Which edge/corner is being dragged
  const dragRef = useRef<{
    startX: number;
    startWidth: number;
    parentWidth: number;
    dir: 'left' | 'right'; // which side drives the resize
  } | null>(null);

  // Keep local state in sync with block meta (e.g. after undo)
  useEffect(() => {
    if (block.meta?.imageWidth !== undefined && block.meta.imageWidth !== widthPct) {
      setWidthPct(block.meta.imageWidth);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.meta?.imageWidth]);

  // Notify parent whenever local width changes
  useEffect(() => {
    onWidthChange(widthPct);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widthPct]);

  // Global pointer move / up during drag
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      const { startX, startWidth, parentWidth, dir } = dragRef.current;
      const delta = e.clientX - startX;
      const newPx = dir === 'right' ? startWidth + delta : startWidth - delta;
      const newPct = Math.min(100, Math.max(15, (newPx / parentWidth) * 100));
      setWidthPct(Math.round(newPct));
    }
    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  function startDrag(e: React.PointerEvent, dir: 'left' | 'right') {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current || !wrapperRef.current) return;
    const parentWidth = wrapperRef.current.getBoundingClientRect().width;
    const startWidth  = containerRef.current.getBoundingClientRect().width;
    dragRef.current = { startX: e.clientX, startWidth, parentWidth, dir };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  // Cursor styles per handle position
  const handleCursor = (pos: string) => {
    if (pos === 'n' || pos === 's')   return 'ns-resize';
    if (pos === 'e' || pos === 'se' || pos === 'ne') return 'ew-resize';
    if (pos === 'w' || pos === 'sw' || pos === 'nw') return 'ew-resize';
    return 'nwse-resize';
  };

  // Handle dot positions (CSS top/left as % string)
  const handles = [
    { id: 'nw', top: '0%',   left: '0%',   translateX: '-50%', translateY: '-50%', dir: 'left'  as const },
    { id: 'n',  top: '0%',   left: '50%',  translateX: '-50%', translateY: '-50%', dir: 'right' as const },
    { id: 'ne', top: '0%',   left: '100%', translateX: '-50%', translateY: '-50%', dir: 'right' as const },
    { id: 'e',  top: '50%',  left: '100%', translateX: '-50%', translateY: '-50%', dir: 'right' as const },
    { id: 'se', top: '100%', left: '100%', translateX: '-50%', translateY: '-50%', dir: 'right' as const },
    { id: 's',  top: '100%', left: '50%',  translateX: '-50%', translateY: '-50%', dir: 'right' as const },
    { id: 'sw', top: '100%', left: '0%',   translateX: '-50%', translateY: '-50%', dir: 'left'  as const },
    { id: 'w',  top: '50%',  left: '0%',   translateX: '-50%', translateY: '-50%', dir: 'left'  as const },
  ];

  return (
    <div ref={wrapperRef} className="my-6 w-full">
      {/* Centred container whose width is widthPct% of parent */}
      <div
        ref={containerRef}
        data-image-block="true"
        className="relative mx-auto select-none"
        style={{ width: `${widthPct}%` }}
        onClick={onSelect}
      >
        {/* Image / loader */}
        <div
          className={`rounded-[32px] overflow-hidden bg-neutral-100 shadow-xl transition-all duration-150 ${
            isSelected
              ? 'ring-[3px] ring-[#FF8A3D] ring-offset-2'
              : 'ring-2 ring-white hover:ring-[#FF8A3D]/40'
          }`}
        >
          {block.meta?.imageLoading ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Upload className="text-[#FF8A3D] animate-bounce" size={34} />
              <span className="text-base font-black text-neutral-600">Uploading…</span>
              <div className="w-1/3 bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#FF8A3D] to-[#FFD166] h-full transition-all"
                  style={{ width: `${block.meta.imageProgress ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <img
                src={block.meta?.imageUrl?.includes('Special:FilePath') || block.meta?.imageUrl?.includes('wikimedia.org') ? `/api/proxy-image?url=${encodeURIComponent(block.meta.imageUrl)}` : block.meta?.imageUrl}
                alt={block.meta?.imageCaption || 'Inline image'}
                className="w-full h-auto max-h-[800px] object-contain block mx-auto rounded-[28px]"
                draggable={false}
                referrerPolicy="no-referrer"
              />
              {block.meta?.imageCaption && (
                <p className="text-center text-sm text-neutral-500 py-2 px-4 italic">
                  {block.meta.imageCaption}
                </p>
              )}
            </>
          )}
        </div>

        {/* Width badge shown while selected */}
        {isSelected && (
          <div
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-black text-[#D45B0C] bg-white border border-[#FF8A3D]/40 rounded-full px-2 py-0.5 shadow whitespace-nowrap pointer-events-none"
          >
            {widthPct}%
          </div>
        )}

        {/* 8 resize handles — only visible when selected */}
        {isSelected && !block.meta?.imageLoading && handles.map(h => (
          <div
            key={h.id}
            onPointerDown={e => startDrag(e, h.dir)}
            style={{
              position: 'absolute',
              top: h.top,
              left: h.left,
              transform: `translate(${h.translateX}, ${h.translateY})`,
              cursor: handleCursor(h.id),
              zIndex: 10,
            }}
            className="w-3 h-3 rounded-full bg-white border-[2.5px] border-[#FF8A3D] shadow-md hover:bg-[#FF8A3D] hover:scale-125 transition-all"
          />
        ))}
      </div>

      {/* Clickable zone below the image for inserting a new paragraph */}
      <div
        className="mt-8 mb-2 min-h-[40px] cursor-text"
        onClick={e => { e.stopPropagation(); onClickBelow(); }}
      />
    </div>
  );
}
