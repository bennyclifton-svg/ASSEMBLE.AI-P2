'use client';

import { useState, useRef, useCallback } from 'react';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';

interface ObjectivesChatPanelProps {
  projectId: string;
}

const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 80;
const MAX_HEIGHT_VH = 0.6; // 60vh

export function ObjectivesChatPanel({ projectId: _projectId }: ObjectivesChatPanelProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(DEFAULT_HEIGHT);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.detail === 2) {
      // Double-click: collapse
      setIsCollapsed(true);
      return;
    }

    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = startYRef.current - ev.clientY; // Dragging up = larger
      const maxH = window.innerHeight * MAX_HEIGHT_VH;
      const newHeight = Math.min(maxH, Math.max(MIN_HEIGHT, startHeightRef.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height]);

  return (
    <div
      className="flex-shrink-0 flex flex-col"
      style={{
        height: isCollapsed ? 36 : height,
        borderTop: '1px solid var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 80%, transparent)',
        transition: isCollapsed ? 'height 0.15s ease' : undefined,
      }}
    >
      {/* Resize handle — only shown when expanded */}
      {!isCollapsed && (
        <div
          className="w-full h-2 flex-shrink-0 cursor-row-resize select-none flex items-center justify-center"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
          onMouseDown={handleResizeMouseDown}
          title="Drag to resize — double-click to collapse"
        >
          <div
            className="w-8 h-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-border-strong)' }}
          />
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-3 flex-shrink-0"
        style={{
          height: isCollapsed ? '100%' : 36,
          borderBottom: isCollapsed ? undefined : '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--color-accent-copper)' }} />
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Chat
          </span>
        </div>

        <button
          className="p-0.5 rounded transition-opacity hover:opacity-80"
          style={{ color: 'var(--color-text-muted)' }}
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? 'Expand chat panel' : 'Collapse chat panel'}
        >
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Body — only shown when expanded */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col min-h-0 p-3">
          <textarea
            disabled
            className="flex-1 w-full resize-none rounded text-sm border outline-none"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-bg-tertiary) 60%, transparent)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-muted)',
              cursor: 'not-allowed',
              padding: '8px 10px',
              fontFamily: 'var(--font-body)',
              lineHeight: '1.5',
            }}
            placeholder={
              "You'll be able to type here soon — e.g. \"redraft bullet 4\" or \"add a sustainability objective under Planning\""
            }
          />
        </div>
      )}
    </div>
  );
}
