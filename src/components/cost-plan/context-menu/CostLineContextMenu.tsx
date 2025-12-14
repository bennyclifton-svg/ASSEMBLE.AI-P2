'use client';

/**
 * Cost Line Context Menu
 * Feature 006 - Cost Planning Module (Task T098)
 *
 * Right-click context menu for cost line rows.
 * Provides actions: insert, delete, copy, link invoice, create variation, etc.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Trash,
  Copy,
  ClipboardPaste,
  FileText,
  GitBranch,
  MessageSquare,
  History,
  ChevronRight,
} from 'lucide-react';
import type { CostLineSection } from '@/types/cost-plan';

interface CostLineContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  costLineId: string;
  section: CostLineSection;
  onClose: () => void;
  // Action handlers
  onInsertAbove?: () => void;
  onInsertBelow?: () => void;
  onDeleteRow?: () => void;
  onCopyRow?: () => void;
  onPasteRow?: () => void;
  onLinkInvoice?: () => void;
  onCreateVariation?: () => void;
  onAddComment?: () => void;
  onViewHistory?: () => void;
  // State
  canPaste?: boolean;
  hasComments?: boolean;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  hasSubmenu?: boolean;
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  danger = false,
  hasSubmenu = false,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
        transition-colors
        ${disabled
          ? 'text-[#6e6e6e] cursor-not-allowed'
          : danger
          ? 'text-[#f87171] hover:bg-[#f87171]/10'
          : 'text-[#cccccc] hover:bg-[#37373d]'}
      `}
    >
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-xs text-[#6e6e6e] ml-4">{shortcut}</span>
      )}
      {hasSubmenu && (
        <ChevronRight className="w-3 h-3 text-[#6e6e6e]" />
      )}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-[#3e3e42]" />;
}

export function CostLineContextMenu({
  isOpen,
  position,
  costLineId,
  section,
  onClose,
  onInsertAbove,
  onInsertBelow,
  onDeleteRow,
  onCopyRow,
  onPasteRow,
  onLinkInvoice,
  onCreateVariation,
  onAddComment,
  onViewHistory,
  canPaste = false,
  hasComments = false,
}: CostLineContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = useCallback(() => {
    if (!menuRef.current) return position;

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth - 10) {
      x = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight - 10) {
      y = viewportHeight - menuRect.height - 10;
    }

    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position]);

  if (!isOpen) return null;

  const pos = adjustedPosition();

  const handleAction = (action?: () => void) => {
    action?.();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[#252526] border border-[#3e3e42] rounded-lg shadow-xl py-1 min-w-[200px]"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Insert actions */}
      <MenuItem
        icon={<Plus className="w-4 h-4" />}
        label="Insert Row Above"
        shortcut="Ctrl+Shift+↑"
        onClick={() => handleAction(onInsertAbove)}
      />
      <MenuItem
        icon={<Plus className="w-4 h-4" />}
        label="Insert Row Below"
        shortcut="Ctrl+Shift+↓"
        onClick={() => handleAction(onInsertBelow)}
      />

      <MenuDivider />

      {/* Clipboard actions */}
      <MenuItem
        icon={<Copy className="w-4 h-4" />}
        label="Copy Row"
        shortcut="Ctrl+C"
        onClick={() => handleAction(onCopyRow)}
      />
      <MenuItem
        icon={<ClipboardPaste className="w-4 h-4" />}
        label="Paste Row"
        shortcut="Ctrl+V"
        onClick={() => handleAction(onPasteRow)}
        disabled={!canPaste}
      />

      <MenuDivider />

      {/* Link actions */}
      <MenuItem
        icon={<FileText className="w-4 h-4" />}
        label="Link Invoice..."
        onClick={() => handleAction(onLinkInvoice)}
      />
      <MenuItem
        icon={<GitBranch className="w-4 h-4" />}
        label="Create Variation..."
        onClick={() => handleAction(onCreateVariation)}
      />

      <MenuDivider />

      {/* Comment and history */}
      <MenuItem
        icon={<MessageSquare className="w-4 h-4" />}
        label={hasComments ? 'View Comments...' : 'Add Comment...'}
        onClick={() => handleAction(onAddComment)}
      />
      <MenuItem
        icon={<History className="w-4 h-4" />}
        label="View History"
        onClick={() => handleAction(onViewHistory)}
      />

      <MenuDivider />

      {/* Delete action */}
      <MenuItem
        icon={<Trash className="w-4 h-4" />}
        label="Delete Row"
        shortcut="Ctrl+Del"
        onClick={() => handleAction(onDeleteRow)}
        danger
      />
    </div>
  );
}

export default CostLineContextMenu;
