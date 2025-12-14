'use client';

/**
 * Variation Context Menu
 * Feature 006 - Cost Planning Module (Task T100)
 *
 * Right-click context menu for variation rows.
 * Provides actions: delete, change status, link to cost line.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  Trash,
  Link2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  FileText,
  ChevronRight,
} from 'lucide-react';
import type { VariationStatus, VariationCategory } from '@/types/variation';

// Category colors matching VariationDropdown
const CATEGORY_COLORS: Record<VariationCategory, string> = {
  Principal: '#6B9BD1',
  Contractor: '#D4A574',
  'Lessor Works': '#9F7AEA',
};

const STATUS_ICONS: Record<VariationStatus, React.ReactNode> = {
  Forecast: <Clock className="w-4 h-4" />,
  Approved: <CheckCircle className="w-4 h-4" />,
  Rejected: <XCircle className="w-4 h-4" />,
  Withdrawn: <AlertTriangle className="w-4 h-4" />,
};

const STATUS_COLORS: Record<VariationStatus, string> = {
  Forecast: '#f59e0b',
  Approved: '#4ade80',
  Rejected: '#f87171',
  Withdrawn: '#858585',
};

interface VariationContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  variation: {
    id: string;
    variationNumber: string;
    category: VariationCategory;
    status: VariationStatus;
    costLineId?: string | null;
  };
  onClose: () => void;
  // Action handlers
  onDelete?: () => void;
  onChangeStatus?: (status: VariationStatus) => void;
  onLinkToCostLine?: () => void;
  onUnlinkFromCostLine?: () => void;
  onCopyVariationNumber?: () => void;
  onViewDetails?: () => void;
  onDuplicate?: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  color?: string;
  hasSubmenu?: boolean;
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  danger = false,
  color,
  hasSubmenu = false,
}: MenuItemProps) {
  const getColorClass = () => {
    if (disabled) return 'text-[#6e6e6e] cursor-not-allowed';
    if (danger) return 'text-[#f87171] hover:bg-[#f87171]/10';
    return 'text-[#cccccc] hover:bg-[#37373d]';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
        transition-colors ${getColorClass()}
      `}
    >
      <span
        className="w-4 h-4 flex items-center justify-center flex-shrink-0"
        style={color ? { color } : undefined}
      >
        {icon}
      </span>
      <span className="flex-1" style={color ? { color } : undefined}>
        {label}
      </span>
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

function MenuHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1 text-xs text-[#6e6e6e] font-medium uppercase tracking-wider">
      {children}
    </div>
  );
}

export function VariationContextMenu({
  isOpen,
  position,
  variation,
  onClose,
  onDelete,
  onChangeStatus,
  onLinkToCostLine,
  onUnlinkFromCostLine,
  onCopyVariationNumber,
  onViewDetails,
  onDuplicate,
}: VariationContextMenuProps) {
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

    if (x + menuRect.width > viewportWidth - 10) {
      x = viewportWidth - menuRect.width - 10;
    }

    if (y + menuRect.height > viewportHeight - 10) {
      y = viewportHeight - menuRect.height - 10;
    }

    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position]);

  if (!isOpen) return null;

  const pos = adjustedPosition();
  const hasCostLine = !!variation.costLineId;
  const currentStatus = variation.status;

  const handleAction = (action?: () => void) => {
    action?.();
    onClose();
  };

  const handleStatusChange = (status: VariationStatus) => {
    if (status !== currentStatus) {
      onChangeStatus?.(status);
    }
    onClose();
  };

  // Available status transitions based on current status
  const availableStatuses: VariationStatus[] = (() => {
    switch (currentStatus) {
      case 'Forecast':
        return ['Approved', 'Rejected', 'Withdrawn'];
      case 'Approved':
        return ['Forecast', 'Rejected', 'Withdrawn'];
      case 'Rejected':
        return ['Forecast', 'Approved', 'Withdrawn'];
      case 'Withdrawn':
        return ['Forecast'];
      default:
        return [];
    }
  })();

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[#252526] border border-[#3e3e42] rounded-lg shadow-xl py-1 min-w-[220px]"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Variation info header */}
      <div className="px-3 py-1.5 flex items-center gap-2">
        <span
          className="px-1.5 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: `${CATEGORY_COLORS[variation.category]}20`,
            color: CATEGORY_COLORS[variation.category],
          }}
        >
          {variation.variationNumber}
        </span>
        <span
          className="text-xs"
          style={{ color: STATUS_COLORS[variation.status] }}
        >
          {variation.status}
        </span>
      </div>

      <MenuDivider />

      {/* View and copy */}
      <MenuItem
        icon={<FileText className="w-4 h-4" />}
        label="View Details"
        onClick={() => handleAction(onViewDetails)}
      />
      <MenuItem
        icon={<Copy className="w-4 h-4" />}
        label="Copy Variation Number"
        onClick={() => handleAction(onCopyVariationNumber)}
      />
      <MenuItem
        icon={<Copy className="w-4 h-4" />}
        label="Duplicate Variation"
        onClick={() => handleAction(onDuplicate)}
      />

      <MenuDivider />

      {/* Change Status */}
      <MenuHeader>Change Status</MenuHeader>

      {availableStatuses.map((status) => (
        <MenuItem
          key={status}
          icon={STATUS_ICONS[status]}
          label={status}
          onClick={() => handleStatusChange(status)}
          color={STATUS_COLORS[status]}
        />
      ))}

      <MenuDivider />

      {/* Linking */}
      <MenuHeader>Cost Line Link</MenuHeader>

      {hasCostLine ? (
        <MenuItem
          icon={<Link2 className="w-4 h-4" />}
          label="Unlink from Cost Line"
          onClick={() => handleAction(onUnlinkFromCostLine)}
        />
      ) : (
        <MenuItem
          icon={<Link2 className="w-4 h-4" />}
          label="Link to Cost Line..."
          onClick={() => handleAction(onLinkToCostLine)}
        />
      )}

      <MenuDivider />

      {/* Delete action */}
      <MenuItem
        icon={<Trash className="w-4 h-4" />}
        label="Delete Variation"
        onClick={() => handleAction(onDelete)}
        danger
      />
    </div>
  );
}

export default VariationContextMenu;
