'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, MapPin, ExternalLink, Play, CheckCircle2, ShieldAlert, ArrowRight, Upload } from 'lucide-react';
import { EditorBlock, InlineLink } from './RichBlogEditor';

// ─── Rich inline renderer (mirrors editor preview) ─────────────────────────────
function renderInlineMarkup(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|==[^=]+=={2})/g);
  return parts.map((p, i) => {
    if (/^\*\*(.+)\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (/^\*(.+)\*$/.test(p))     return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^`(.+)`$/.test(p))       return <code key={i} className="bg-neutral-100 text-[#D45B0C] font-mono text-[0.88em] px-1.5 py-0.5 rounded-md">{p.slice(1, -1)}</code>;
    if (/^==(.+)==$/.test(p))     return <mark key={i} className="bg-[#FFD166]/40 text-[#1F2937] rounded px-0.5">{p.slice(2, -2)}</mark>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

function renderRichContent(content: string, links: InlineLink[] = []): React.ReactNode {
  if (!links.length) return <>{renderInlineMarkup(content)}</>;
  const sorted = [...links].sort((a, b) => a.from - b.from);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const lnk of sorted) {
    if (lnk.from > cursor) nodes.push(...renderInlineMarkup(content.slice(cursor, lnk.from)));
    nodes.push(
      <a key={`l${lnk.from}`} href={lnk.url} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline underline-offset-2 decoration-blue-400/60 transition-colors">
        {lnk.text}
      </a>
    );
    cursor = lnk.to;
  }
  if (cursor < content.length) nodes.push(...renderInlineMarkup(content.slice(cursor)));
  return <>{nodes}</>;
}

interface RichArticleRendererProps {
  content?: string;
  excerpt: string;
  city?: string;
}

export const RichArticleRenderer: React.FC<RichArticleRendererProps> = ({ content, excerpt, city }) => {
  const router = useRouter();

  // Try parsing content as structured JSON blocks first
  let parsedBlocks: EditorBlock[] | null = null;
  let cleanContent = content?.trim() || '';
  
  if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
    try { cleanContent = JSON.parse(cleanContent); } catch(e) {}
  }
  
  if (cleanContent.startsWith('[') && cleanContent.endsWith(']')) {
    try {
      const parsed = JSON.parse(cleanContent);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
        parsedBlocks = parsed;
      }
    } catch (e) {
      console.error("Failed to parse blocks in RichArticleRenderer", e);
    }
  }

  // Default fallback story block array if parsedBlocks is empty
  const defaultStoryProse = `
[DropCap:There is a profound magic in traveling across Indian valleys and coastlines when you drop the rushed sightseeing schedules and embrace genuine slow immersion. From authentic home-cooked meals brewed over firewood to quiet riverside conversations at dusk, every corner of India offers an unhurried perspective that resets the traveler's soul.]

[Callout:tip:💡 **Pro-Tip for ${city || 'this destination'}**: Always book your local train or mountain bus tickets at least 48 hours early to guarantee panoramic window seats during the scenic ascend!]

## The Anatomy of a Perfect Indian Expedition

When you travel with curiosity across regional heritage towns, unforgettable human encounters unfold naturally. Whether it is a local tea stall owner serving hot cardamom chai on a rainy mountain slope, or a family sharing stories in a serene Goan village courtyard, these personal memories outlast any material souvenir.

[Gallery: https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80 | https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=600&q=80]

[Callout:secret:🌿 **Local Secret**: Do not skip the small artisan alleys just behind the main bazaar! You will find authentic handloom textiles and generational firewood spice stalls.]

$$Total\\_Budget = \\sum (Stay_{₹2500} + Transit_{₹1400} + Food_{₹1200}) \\approx ₹5,100$$

[Button: ✈️ Adopt This Exact Itinerary in PlanBro -> /plan/setup]
  `.trim();

  // Render individual JSON block nodes
  const renderJsonBlock = (block: EditorBlock, idx: number) => {
    switch (block.type) {
      case 'h1':
        return <h1 key={block.id || idx} className="text-3xl sm:text-4xl font-black text-[#1F2937] pt-6 pb-2 tracking-tight">{renderRichContent(block.content, block.meta?.links)}</h1>;
      
      case 'h2': {
        const slug = block.content.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
        return <h2 key={block.id || idx} id={`blog-section-${slug}`} className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] pt-4 border-b-2 border-[#FF8A3D]/20 pb-3 tracking-tight">{renderRichContent(block.content, block.meta?.links)}</h2>;
      }
      
      case 'h3':
        return <h3 key={block.id || idx} id={`blog-section-${idx}`} className="text-xl sm:text-2xl font-bold text-[#D45B0C] pt-3 pb-1 tracking-tight">{renderRichContent(block.content, block.meta?.links)}</h3>;
      
      case 'quote':
        return (
          <div key={block.id || idx} className="border-l-4 border-[#FF8A3D] pl-6 my-6 bg-[#FFF9E6]/60 py-3.5 rounded-r-2xl font-serif italic text-base sm:text-lg text-[#1F2937] leading-relaxed">
            &ldquo;{renderRichContent(block.content, block.meta?.links)}&rdquo;
          </div>
        );
      
      case 'bullet': {
        const indentLvl = block.meta?.indent ?? 0;
        const indentClass = indentLvl === 1 ? 'ml-7 sm:ml-9' : indentLvl >= 2 ? 'ml-14 sm:ml-18' : '';
        const symbol = indentLvl === 0 ? '•' : indentLvl === 1 ? '◦' : '▪';
        const symClass = indentLvl === 0 ? 'text-[#FF8A3D] text-xl font-black mt-0.5' : indentLvl === 1 ? 'text-[#D45B0C] text-base font-black mt-1' : 'text-[#1F2937]/60 text-sm font-black mt-1';
        return (
          <div key={block.id || idx} className={`flex items-start gap-2.5 my-1.5 ${indentClass}`}>
            <span className={`shrink-0 ${symClass}`}>{symbol}</span>
            <span className="text-base sm:text-lg text-[#374151] leading-relaxed">{block.content}</span>
          </div>
        );
      }
      
      case 'number': {
        const indentLvlN = block.meta?.indent ?? 0;
        const indentClassN = indentLvlN === 1 ? 'ml-7 sm:ml-9' : indentLvlN >= 2 ? 'ml-14 sm:ml-18' : '';
        return (
          <div key={block.id || idx} className={`flex items-start gap-2.5 my-1.5 ${indentClassN}`}>
            <span className="text-[#D45B0C] font-black text-sm mt-1 shrink-0 min-w-[24px]">{idx}.</span>
            <span className="text-base sm:text-lg text-[#374151] leading-relaxed">{block.content}</span>
          </div>
        );
      }
      
      case 'divider':
        return (
          <div key={block.id || idx} className="py-4 flex items-center justify-center">
            <div className="w-2/3 border-b-2 border-dashed border-[#FF8A3D]/40" />
          </div>
        );
      
      case 'callout': {
        const type = block.meta?.calloutType || 'tip';
        let bgStyle = "bg-[#FFF9E6] border-amber-400 text-amber-950";
        let icon = <Sparkles className="text-amber-600 shrink-0" size={20} />;
        if (type === 'warning') {
          bgStyle = "bg-rose-50 border-rose-400 text-rose-950";
          icon = <ShieldAlert className="text-rose-600 shrink-0" size={20} />;
        }
        return (
          <div key={block.id || idx} className={`my-6 p-6 rounded-3xl border-2 shadow-sm flex items-start gap-4 ${bgStyle}`}>
            <div className="p-2 bg-white rounded-2xl shadow-xs shrink-0 mt-0.5">{icon}</div>
            <div className="text-sm sm:text-base font-bold leading-relaxed">{block.content}</div>
          </div>
        );
      }
      
      case 'image': {
        const widthPct = block.meta?.imageWidth || 100;
        return (
          <div key={block.id || idx} className="my-6 w-full flex justify-center">
            <div
              className="rounded-[32px] overflow-hidden border-4 border-white shadow-2xl bg-neutral-100 max-w-full"
              style={{ width: `${widthPct}%` }}
            >
              <img
                src={block.meta?.imageUrl?.includes('Special:FilePath') || block.meta?.imageUrl?.includes('wikimedia.org') ? `/api/proxy-image?url=${encodeURIComponent(block.meta.imageUrl)}` : block.meta?.imageUrl || block.content}
                alt={block.meta?.imageCaption || 'Story visual upload'}
                className="w-full h-auto max-h-[850px] object-contain block mx-auto"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {block.meta?.imageCaption && (
                <p className="text-center text-sm text-neutral-500 py-2 px-4 italic bg-white/50">
                  {block.meta.imageCaption}
                </p>
              )}
            </div>
          </div>
        );
      }
      
      case 'embed':
        return (
          <div key={block.id || idx} className="my-6 p-6 rounded-3xl bg-[#1F2937] text-white border-2 border-[#FF8A3D]/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500 flex items-center justify-center text-rose-400 shrink-0">
                <Play size={24} fill="currentColor" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#FFB347] uppercase tracking-wider">Unfurled Rich Embed</span>
                <h5 className="font-black text-base text-white truncate max-w-sm">{block.content}</h5>
                <p className="text-xs text-neutral-400">Click to open interactive maps coordinates</p>
              </div>
            </div>
            <a
              href={block.content}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span>Open Link</span>
            </a>
          </div>
        );
      
      case 'button':
        return (
          <div key={block.id || idx} className="my-6 flex justify-center sm:justify-start">
            <button
              onClick={() => router.push(block.meta?.buttonLink || '/plan/setup')}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF8A3D] via-[#FFB347] to-[#FFD166] text-[#1F2937] font-black text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(255,138,61,0.35)] hover:scale-103 transition-all flex items-center gap-2"
            >
              <span>{block.meta?.buttonText}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        );
      
      case 'gallery':
        return (
          <div key={block.id || idx} className="my-6">
            <div className="grid grid-cols-2 gap-4">
              {block.meta?.galleryUrls?.map((url, i) => (
                <div key={i} className="rounded-3xl overflow-hidden bg-neutral-100 border-3 border-white shadow-lg h-56">
                  <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'latex':
        return (
          <div key={block.id || idx} className="my-6 p-5 rounded-2xl bg-neutral-950 text-emerald-300 font-mono text-xs sm:text-sm border border-emerald-500/30 shadow-lg text-center font-bold tracking-wide">
            $${block.content}$$
          </div>
        );
      
      default: {
        const hasDropCap = block.meta?.dropCap;
        if (hasDropCap) {
          const firstChar = block.content.charAt(0);
          const rest = block.content.slice(1);
          return (
            <p key={block.id || idx} className="my-4 text-base sm:text-lg text-[#374151] font-normal leading-relaxed">
              <span className="float-left text-5xl sm:text-6xl font-black text-[#D45B0C] pr-3 pt-1 leading-none font-serif select-none drop-shadow-xs">
                {firstChar}
              </span>
              <span>{renderRichContent(rest, block.meta?.links)}</span>
            </p>
          );
        }
        return (
          <p key={block.id || idx} className="text-base sm:text-lg text-[#374151] font-normal leading-relaxed my-4">
            {renderRichContent(block.content, block.meta?.links)}
          </p>
        );
      }
    }
  };

  // Render raw markdown paragraphs if not JSON format
  const renderMarkdownBlock = (block: string, idx: number) => {
    const trimmed = block.trim();

    if (trimmed.startsWith('[Callout:') && trimmed.endsWith(']')) {
      const parts = trimmed.slice(9, -1).split(':');
      const type = parts[0];
      const text = parts.slice(1).join(':').trim();
      let bgStyle = "bg-[#FFF9E6] border-amber-400 text-amber-950";
      let icon = <Sparkles className="text-amber-600 shrink-0" size={20} />;
      if (type === 'warning') {
        bgStyle = "bg-rose-50 border-rose-400 text-rose-950";
        icon = <ShieldAlert className="text-rose-600 shrink-0" size={20} />;
      } else if (type === 'packing') {
        bgStyle = "bg-emerald-50 border-emerald-400 text-emerald-950";
        icon = <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />;
      } else if (type === 'secret') {
        bgStyle = "bg-indigo-50 border-indigo-400 text-indigo-950";
        icon = <MapPin className="text-indigo-600 shrink-0" size={20} />;
      }
      return (
        <div key={idx} className={`my-8 p-6 rounded-3xl border-2 shadow-sm flex items-start gap-4 ${bgStyle}`}>
          <div className="p-2 bg-white rounded-2xl shadow-xs shrink-0 mt-0.5">{icon}</div>
          <div className="text-sm sm:text-base font-bold leading-relaxed">{text}</div>
        </div>
      );
    }

    if (trimmed.startsWith('[DropCap:') && trimmed.endsWith(']')) {
      const text = trimmed.slice(9, -1).trim();
      const firstChar = text.charAt(0);
      const rest = text.slice(1);
      return (
        <p key={idx} className="my-6 text-base sm:text-lg font-normal leading-relaxed text-[#374151]">
          <span className="float-left text-5xl sm:text-6xl font-black text-[#D45B0C] pr-3 pt-1 leading-none font-serif select-none drop-shadow-xs">
            {firstChar}
          </span>
          <span>{rest}</span>
        </p>
      );
    }

    if (trimmed.startsWith('[Gallery:') && trimmed.endsWith(']')) {
      const urls = trimmed.slice(9, -1).split('|').map(u => u.trim()).filter(Boolean);
      return (
        <div key={idx} className="my-8">
          <div className="grid grid-cols-2 gap-4">
            {urls.map((url, i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-neutral-100 border-3 border-white shadow-lg h-56">
                <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (trimmed.startsWith('[Button:') && trimmed.endsWith(']')) {
      const content = trimmed.slice(8, -1).trim();
      const [btnText, href] = content.includes('->') ? content.split('->').map(s => s.trim()) : [content, '/plan/setup'];
      return (
        <div key={idx} className="my-8 flex justify-center sm:justify-start">
          <button
            onClick={() => router.push(href || '/plan/setup')}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF8A3D] via-[#FFB347] to-[#FFD166] text-[#1F2937] font-black text-sm uppercase tracking-wider shadow-[0_8px_25px_rgba(255,138,61,0.35)] hover:scale-103 transition-all flex items-center gap-2"
          >
            <span>{btnText}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      );
    }

    if (trimmed.startsWith('[Embed:') && trimmed.endsWith(']')) {
      const parts = trimmed.slice(7, -1).split(':');
      const url = parts.slice(1).join(':').trim();
      return (
        <div key={idx} className="my-8 p-6 rounded-3xl bg-[#1F2937] text-white border-2 border-[#FF8A3D]/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500 flex items-center justify-center text-rose-400 shrink-0">
              <Play size={24} fill="currentColor" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#FFB347] uppercase tracking-wider">Unfurled Embed</span>
              <h5 className="font-black text-base text-white truncate max-w-sm">{url}</h5>
            </div>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition-colors">
            Open Link
          </a>
        </div>
      );
    }

    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      return (
        <div key={idx} className="my-8 p-5 rounded-2xl bg-neutral-950 text-emerald-300 font-mono text-center font-bold tracking-wide">
          {trimmed}
        </div>
      );
    }

    if (trimmed.startsWith('# ')) return <h1 key={idx} className="text-3xl font-black text-[#1F2937] pt-6 pb-2">{trimmed.slice(2)}</h1>;
    if (trimmed.startsWith('## ')) return <h2 key={idx} className="text-2xl font-extrabold text-[#1F2937] pt-4 pb-1 border-b-2 border-[#FF8A3D]/20 pb-3">{trimmed.slice(3)}</h2>;
    if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-xl font-bold text-[#D45B0C] pt-3 pb-1">{trimmed.slice(4)}</h3>;

    return (
      <p key={idx} className="text-base sm:text-lg text-[#374151] font-normal leading-relaxed my-4">
        {trimmed}
      </p>
    );
  };

  const paragraphs = parsedBlocks ? null : (content && content.trim().length > 20 ? content : defaultStoryProse).split(/\n\n+/);

  let safeExcerpt = excerpt;
  if (safeExcerpt && (safeExcerpt.includes('{"id":') || safeExcerpt.startsWith('[') || safeExcerpt.startsWith('"[') || safeExcerpt.includes('type":"paragraph"'))) {
    safeExcerpt = city ? `Embarking on a beautiful journey exploring the best of ${city} and its hidden cultural trails.` : "Embarking on a beautiful journey discovering hidden trails and cultural experiences.";
  }

  return (
    <div className="space-y-4">
      {/* Excerpt Pull-Quote */}
      <p className="font-bold text-xl sm:text-2xl text-[#1F2937] leading-normal font-serif italic border-l-4 border-[#FF8A3D] pl-6 my-8 bg-[#FFF9E6]/60 py-3.5 rounded-r-2xl shadow-2xs">
        &ldquo;{safeExcerpt}&rdquo;
      </p>

      {/* Render Content blocks */}
      <div className="space-y-2">
        {parsedBlocks 
          ? parsedBlocks.map((block, idx) => renderJsonBlock(block, idx))
          : paragraphs?.map((para, idx) => renderMarkdownBlock(para, idx))
        }
      </div>
    </div>
  );
};
