/**
 * PDF Viewer Panel — Slide-in panel showing paper pages
 * Design: Warm paper-like background, smooth transitions
 */
import { useAppStore } from '@/lib/store';
import { PDF_PAGES, PDF_TITLE, PDF_AUTHOR, PDF_TOTAL_PAGES } from '@/lib/assets';
import { ChevronLeft, ChevronRight, X, BookOpen, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function PdfViewer() {
  const { currentPage, setCurrentPage, isPdfOpen, closePdf } = useAppStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImageLoaded(false);
  }, [currentPage]);

  if (!isPdfOpen) return null;

  const panelWidth = isFullscreen ? 'w-full' : 'w-[520px]';

  return (
    <div
      className={`fixed top-0 right-0 h-full ${panelWidth} z-[55] flex flex-col
        bg-[#FEFBF7]/98 backdrop-blur-2xl border-l border-[#E8DDD0]/60
        shadow-[-12px_0_40px_rgba(0,0,0,0.1)]
        animate-in slide-in-from-right duration-300`}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E8DDD0]/60 bg-gradient-to-r from-[#FFF8F0] to-[#FFF5EC]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C4956A] to-[#D4A57A] flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3
              className="text-sm font-bold text-[#3A2A1A] truncate"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {PDF_TITLE}
            </h3>
            <p className="text-[10px] text-[#8B7355] mt-0.5">{PDF_AUTHOR}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl hover:bg-[#F0E8E0] transition-colors"
          >
            {isFullscreen
              ? <Minimize2 className="w-4 h-4 text-[#8B7355]" />
              : <Maximize2 className="w-4 h-4 text-[#8B7355]" />}
          </button>
          <button
            onClick={closePdf}
            className="p-2 rounded-xl hover:bg-[#F0E8E0] transition-colors"
          >
            <X className="w-4 h-4 text-[#8B7355]" />
          </button>
        </div>
      </div>

      {/* Page content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
        <div className="relative bg-white rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden border border-[#F0E8E0]">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#FEFBF7]" style={{ minHeight: 600 }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#C4956A] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[#8B7355]">加载第 {currentPage} 页...</span>
              </div>
            </div>
          )}
          <img
            src={PDF_PAGES[currentPage - 1]}
            alt={`Page ${currentPage}`}
            className={`w-full h-auto transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#E8DDD0]/60 bg-gradient-to-r from-[#FFF8F0] to-[#FFF5EC]">
        <button
          onClick={() => { setCurrentPage(currentPage - 1); scrollRef.current?.scrollTo(0, 0); }}
          disabled={currentPage <= 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
            bg-gradient-to-r from-[#C4956A] to-[#D4A57A] text-white
            hover:from-[#B08060] hover:to-[#C09570]
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all duration-200 active:scale-95 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          上一页
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={PDF_TOTAL_PAGES}
            value={currentPage}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (v >= 1 && v <= PDF_TOTAL_PAGES) {
                setCurrentPage(v);
                scrollRef.current?.scrollTo(0, 0);
              }
            }}
            className="w-14 text-center text-sm font-semibold border border-[#E8DDD0] rounded-xl py-1.5 bg-white text-[#3A2A1A]
              focus:outline-none focus:ring-2 focus:ring-[#C4956A]/30 focus:border-[#C4956A]
              transition-all"
          />
          <span className="text-sm text-[#8B7355] font-medium">/ {PDF_TOTAL_PAGES}</span>
        </div>

        <button
          onClick={() => { setCurrentPage(currentPage + 1); scrollRef.current?.scrollTo(0, 0); }}
          disabled={currentPage >= PDF_TOTAL_PAGES}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold
            bg-gradient-to-r from-[#C4956A] to-[#D4A57A] text-white
            hover:from-[#B08060] hover:to-[#C09570]
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-all duration-200 active:scale-95 shadow-sm"
        >
          下一页
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
