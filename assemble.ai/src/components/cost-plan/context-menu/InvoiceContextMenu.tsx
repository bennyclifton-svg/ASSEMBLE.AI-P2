'use client';

/**
 * Invoice Context Menu
 * Feature 006 - Cost Planning Module (Task T099)
 *
 * Right-click context menu for invoice rows.
 * Provides actions: delete, link to cost line, link to variation, mark as paid.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  Trash,
  Link2,
  GitBranch,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  FileText,
} from 'lucide-react';
import type { Invoice } from '@/types/invoice';

type InvoiceStatus = 'Draft' | 'Submitted' | 'Approved' | 'Paid' | 'Rejected';

interface InvoiceContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  invoice: {
    id: string;
    invoiceNumber?: string | null;
    status?: InvoiceStatus;
    costLineId?: string | null;
    variationId?: string | null;
  };
  onClose: () => void;
  // Action handlers
  onDelete?: () => void;
  onLinkToCostLine?: () => void;
  onUnlinkFromCostLine?: () => void;
  onLinkToVariation?: () => void;
  onUnlinkFromVariation?: () => void;
  onMarkAsPaid?: () => void;
  onMarkAsApproved?: () => void;
  onMarkAsRejected?: () => void;
  onCopyInvoiceNumber?: () => void;
  onViewDocument?: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  success?: boolean;
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  danger = false,
  success = false,
}: MenuItemProps) {
  const getColorClass = () => {
    if (disabled) return 'text-[#6e6e6e] cursor-not-allowed';
    if (danger) return 'text-[#f87171] hover:bg-[#f87171]/10';
    if (success) return 'text-[#4ade80] hover:bg-[#4ade80]/10';
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
      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-xs text-[#6e6e6e] ml-4">{shortcut}</span>
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

export function InvoiceContextMenu({
  isOpen,
  position,
  invoice,
  onClose,
  onDelete,
  onLinkToCostLine,
  onUnlinkFromCostLine,
  onLinkToVariation,
  onUnlinkFromVariation,
  onMarkAsPaid,
  onMarkAsApproved,
  onMarkAsRejected,
  onCopyInvoiceNumber,
  onViewDocument,
}: InvoiceContextMenuProps) {
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
  const isPaid = invoice.status === 'Paid';
  const isApproved = invoice.status === 'Approved';
  const hasCostLine = !!invoice.costLineId;
  const hasVariation = !!invoice.variationId;

  const handleAction = (action?: () => void) => {
    action?.();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[#252526] border border-[#3e3e42] rounded-lg shadow-xl py-1 min-w-[220px]"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Invoice info header */}
      {invoice.invoiceNumber && (
        <>
          <MenuHeader>Invoice {invoice.invoiceNumber}</MenuHeader>
          <MenuDivider />
        </>
      )}

      {/* View document */}
      <MenuItem
        icon={<ExternalLink className="w-4 h-4" />}
        label="View Document"
        onClick={() => handleAction(onViewDocument)}
      />

      {invoice.invoiceNumber && (
        <MenuItem
          icon={<Copy className="w-4 h-4" />}
          label="Copy Invoice Number"
          onClick={() => handleAction(onCopyInvoiceNumber)}
        />
      )}

      <MenuDivider />

      {/* Linking actions */}
      <MenuHeader>Links</MenuHeader>

      {hasCostLine ? (
        <MenuItem
          icon={<Link2 className="w-4 h-4" />}
          label="Unlink from Cost Line"
          onClick={() => handleAction(onUnlinkFromCostLine)}
        />
      ) : (
        <MenuItem
          icon={<FileText className="w-4 h-4" />}
          label="Link to Cost Line..."
          onClick={() => handleAction(onLinkToCostLine)}
        />
      )}

      {hasVariation ? (
        <MenuItem
          icon={<GitBranch className="w-4 h-4" />}
          label="Unlink from Variation"
          onClick={() => handleAction(onUnlinkFromVariation)}
        />
      ) : (
        <MenuItem
          icon={<GitBranch className="w-4 h-4" />}
          label="Link to Variation..."
          onClick={() => handleAction(onLinkToVariation)}
        />
      )}

      <MenuDivider />

      {/* Status actions */}
      <MenuHeader>Status</MenuHeader>

      <MenuItem
        icon={<CheckCircle className="w-4 h-4" />}
        label="Mark as Approved"
        onClick={() => handleAction(onMarkAsApproved)}
        disabled={isApproved || isPaid}
        success={!isApproved && !isPaid}
      />

      <MenuItem
        icon={<CheckCircle className="w-4 h-4" />}
        label="Mark as Paid"
        onClick={() => handleAction(onMarkAsPaid)}
        disabled={isPaid}
        success={!isPaid}
      />

      <MenuItem
        icon={<XCircle className="w-4 h-4" />}
        label="Mark as Rejected"
        onClick={() => handleAction(onMarkAsRejected)}
        disabled={isPaid}
        danger={!isPaid}
      />

      <MenuDivider />

      {/* Delete action */}
      <MenuItem
        icon={<Trash className="w-4 h-4" />}
        label="Delete Invoice"
        onClick={() => handleAction(onDelete)}
        danger
      />
    </div>
  );
}

export default InvoiceContextMenu;
