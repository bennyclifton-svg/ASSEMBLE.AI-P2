/**
 * FortuneSheet Context Menu Configuration
 * Feature 006 - Cost Planning Module (Task T076)
 *
 * Custom context menu item definitions and action handlers.
 */

import type { CostLineSection } from '@/types/cost-plan';

// ============================================================================
// CONTEXT MENU TYPES
// ============================================================================

export type MenuAction =
  | 'insertRowAbove'
  | 'insertRowBelow'
  | 'deleteRow'
  | 'copyRow'
  | 'pasteRow'
  | 'linkInvoice'
  | 'createVariation'
  | 'addComment'
  | 'viewHistory'
  | 'collapseSection'
  | 'expandSection'
  | 'collapseAll'
  | 'expandAll';

export interface MenuItem {
  key: MenuAction;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  submenu?: MenuItem[];
}

export interface MenuContext {
  rowIndex: number;
  colIndex: number;
  costLineId?: string | null;
  section?: CostLineSection | null;
  isHeader: boolean;
  isSectionHeader: boolean;
  isSubtotal: boolean;
  isTotal: boolean;
  selectedRows: number[];
}

// ============================================================================
// MENU ITEM DEFINITIONS
// ============================================================================

/**
 * Cost line context menu items
 */
export const COST_LINE_MENU_ITEMS: MenuItem[] = [
  {
    key: 'insertRowAbove',
    label: 'Insert Row Above',
    icon: '↑',
    shortcut: 'Ctrl+Shift+↑',
  },
  {
    key: 'insertRowBelow',
    label: 'Insert Row Below',
    icon: '↓',
    shortcut: 'Ctrl+Shift+↓',
  },
  { key: 'deleteRow', label: 'Delete Row', icon: '🗑️', shortcut: 'Ctrl+Del' },
  { key: 'copyRow', label: 'Copy Row', icon: '📋', shortcut: 'Ctrl+C', divider: true },
  { key: 'pasteRow', label: 'Paste Row', icon: '📥', shortcut: 'Ctrl+V' },
  { key: 'linkInvoice', label: 'Link Invoice...', icon: '🧾', divider: true },
  { key: 'createVariation', label: 'Create Variation...', icon: '📝' },
  { key: 'addComment', label: 'Add Comment...', icon: '💬' },
  { key: 'viewHistory', label: 'View History', icon: '📜', divider: true },
];

/**
 * Section header context menu items
 */
export const SECTION_HEADER_MENU_ITEMS: MenuItem[] = [
  { key: 'collapseSection', label: 'Collapse Section', icon: '▼' },
  { key: 'expandSection', label: 'Expand Section', icon: '▶' },
  { key: 'collapseAll', label: 'Collapse All Sections', icon: '⏬', divider: true },
  { key: 'expandAll', label: 'Expand All Sections', icon: '⏫' },
  { key: 'insertRowBelow', label: 'Add Line to Section', icon: '➕', divider: true },
];

/**
 * Default context menu items (for non-editable areas)
 */
export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { key: 'collapseAll', label: 'Collapse All Sections', icon: '⏬' },
  { key: 'expandAll', label: 'Expand All Sections', icon: '⏫' },
];

// ============================================================================
// MENU GENERATION
// ============================================================================

/**
 * Get context menu items based on click context
 */
export function getContextMenuItems(context: MenuContext): MenuItem[] {
  // Header row - minimal menu
  if (context.isHeader) {
    return DEFAULT_MENU_ITEMS;
  }

  // Section header - section controls
  if (context.isSectionHeader) {
    return SECTION_HEADER_MENU_ITEMS;
  }

  // Subtotal or total row - read only
  if (context.isSubtotal || context.isTotal) {
    return DEFAULT_MENU_ITEMS;
  }

  // Regular cost line row - full menu
  if (context.costLineId) {
    return COST_LINE_MENU_ITEMS;
  }

  // Default fallback
  return DEFAULT_MENU_ITEMS;
}

/**
 * Filter menu items based on state
 */
export function filterMenuItems(
  items: MenuItem[],
  options: {
    canPaste?: boolean;
    hasSelection?: boolean;
    isCollapsed?: boolean;
    multiRowSelection?: boolean;
  }
): MenuItem[] {
  const { canPaste = false, hasSelection = false, isCollapsed = false, multiRowSelection = false } = options;

  return items.map((item) => {
    const newItem = { ...item };

    // Disable paste if nothing to paste
    if (item.key === 'pasteRow' && !canPaste) {
      newItem.disabled = true;
    }

    // Disable delete if nothing selected
    if (item.key === 'deleteRow' && !hasSelection) {
      newItem.disabled = true;
    }

    // Show collapse or expand based on state
    if (item.key === 'collapseSection' && isCollapsed) {
      newItem.disabled = true;
    }
    if (item.key === 'expandSection' && !isCollapsed) {
      newItem.disabled = true;
    }

    // Disable single-row actions if multiple rows selected
    if (multiRowSelection) {
      if (['linkInvoice', 'createVariation', 'addComment', 'viewHistory'].includes(item.key)) {
        newItem.disabled = true;
      }
    }

    return newItem;
  });
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

export interface MenuActionHandlers {
  onInsertRowAbove?: (context: MenuContext) => void;
  onInsertRowBelow?: (context: MenuContext) => void;
  onDeleteRow?: (context: MenuContext) => void;
  onCopyRow?: (context: MenuContext) => void;
  onPasteRow?: (context: MenuContext) => void;
  onLinkInvoice?: (costLineId: string) => void;
  onCreateVariation?: (costLineId: string) => void;
  onAddComment?: (costLineId: string) => void;
  onViewHistory?: (costLineId: string) => void;
  onCollapseSection?: (section: CostLineSection) => void;
  onExpandSection?: (section: CostLineSection) => void;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
}

/**
 * Execute menu action
 */
export function executeMenuAction(
  action: MenuAction,
  context: MenuContext,
  handlers: MenuActionHandlers
): void {
  switch (action) {
    case 'insertRowAbove':
      handlers.onInsertRowAbove?.(context);
      break;
    case 'insertRowBelow':
      handlers.onInsertRowBelow?.(context);
      break;
    case 'deleteRow':
      handlers.onDeleteRow?.(context);
      break;
    case 'copyRow':
      handlers.onCopyRow?.(context);
      break;
    case 'pasteRow':
      handlers.onPasteRow?.(context);
      break;
    case 'linkInvoice':
      if (context.costLineId) {
        handlers.onLinkInvoice?.(context.costLineId);
      }
      break;
    case 'createVariation':
      if (context.costLineId) {
        handlers.onCreateVariation?.(context.costLineId);
      }
      break;
    case 'addComment':
      if (context.costLineId) {
        handlers.onAddComment?.(context.costLineId);
      }
      break;
    case 'viewHistory':
      if (context.costLineId) {
        handlers.onViewHistory?.(context.costLineId);
      }
      break;
    case 'collapseSection':
      if (context.section) {
        handlers.onCollapseSection?.(context.section);
      }
      break;
    case 'expandSection':
      if (context.section) {
        handlers.onExpandSection?.(context.section);
      }
      break;
    case 'collapseAll':
      handlers.onCollapseAll?.();
      break;
    case 'expandAll':
      handlers.onExpandAll?.();
      break;
  }
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: MenuAction;
}

export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  { key: 'Delete', ctrl: true, action: 'deleteRow' },
  { key: 'ArrowUp', ctrl: true, shift: true, action: 'insertRowAbove' },
  { key: 'ArrowDown', ctrl: true, shift: true, action: 'insertRowBelow' },
  { key: 'c', ctrl: true, action: 'copyRow' },
  { key: 'v', ctrl: true, action: 'pasteRow' },
];

/**
 * Check if keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutConfig
): boolean {
  const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.alt ? event.altKey : !event.altKey;
  const keyMatch = event.key === shortcut.key || event.code === shortcut.key;

  return ctrlMatch && shiftMatch && altMatch && keyMatch;
}

/**
 * Find action for keyboard event
 */
export function getActionFromKeyboard(
  event: KeyboardEvent,
  shortcuts: ShortcutConfig[] = DEFAULT_SHORTCUTS
): MenuAction | null {
  const matched = shortcuts.find((s) => matchesShortcut(event, s));
  return matched?.action ?? null;
}
