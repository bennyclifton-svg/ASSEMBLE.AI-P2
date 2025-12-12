'use client';

/**
 * Column Mapping Dialog
 * Feature 006 - Cost Planning Module (Task T106)
 *
 * Dialog for mapping imported file columns to cost plan fields.
 * Supports saving mapping templates for reuse.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  X,
  ArrowRight,
  Check,
  AlertTriangle,
  Save,
  RotateCcw,
  Wand2,
  FileSpreadsheet,
  ChevronDown,
} from 'lucide-react';
import type { CostLineSection } from '@/types/cost-plan';

// ============================================================================
// TYPES
// ============================================================================

export interface TargetField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'section' | 'date';
  description?: string;
}

export interface ColumnMapping {
  sourceColumn: string | null;
  targetField: string;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'trim' | 'number' | 'cents';
}

interface ColumnMappingDialogProps {
  isOpen: boolean;
  sourceColumns: string[];
  targetFields: TargetField[];
  initialMappings?: ColumnMapping[];
  sampleData?: Record<string, string | number | null>[];
  onClose: () => void;
  onConfirm: (mappings: ColumnMapping[]) => void;
  onSaveTemplate?: (name: string, mappings: ColumnMapping[]) => void;
}

// ============================================================================
// DEFAULT TARGET FIELDS
// ============================================================================

export const COST_LINE_TARGET_FIELDS: TargetField[] = [
  { key: 'costCode', label: 'Cost Code', required: false, type: 'string', description: 'Unique identifier for the cost line' },
  { key: 'activity', label: 'Activity', required: true, type: 'string', description: 'Activity or work description' },
  { key: 'section', label: 'Section', required: true, type: 'section', description: 'FEES, CONSULTANTS, CONSTRUCTION, or CONTINGENCY' },
  { key: 'budgetCents', label: 'Budget', required: false, type: 'number', description: 'Original budget amount' },
  { key: 'approvedContractCents', label: 'Approved Contract', required: false, type: 'number', description: 'Contract award amount' },
  { key: 'reference', label: 'Reference', required: false, type: 'string', description: 'PO or contract reference' },
  { key: 'companyName', label: 'Company/Vendor', required: false, type: 'string', description: 'Company or vendor name' },
];

// ============================================================================
// AUTO-MAPPING SUGGESTIONS
// ============================================================================

const AUTO_MAP_PATTERNS: Record<string, string[]> = {
  costCode: ['cost code', 'code', 'item code', 'line code', 'ref', 'item no', 'item number'],
  activity: ['activity', 'description', 'desc', 'item', 'name', 'detail', 'particulars', 'line item'],
  section: ['section', 'category', 'type', 'group', 'cost type'],
  budgetCents: ['budget', 'original budget', 'budgeted', 'estimate', 'est'],
  approvedContractCents: ['contract', 'approved', 'award', 'contract value', 'approved value', 'let value'],
  reference: ['reference', 'ref', 'po', 'purchase order', 'contract ref', 'po number'],
  companyName: ['company', 'vendor', 'supplier', 'contractor', 'consultant', 'firm'],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findAutoMapping(sourceColumn: string): string | null {
  const normalized = sourceColumn.toLowerCase().trim();

  for (const [targetKey, patterns] of Object.entries(AUTO_MAP_PATTERNS)) {
    if (patterns.some((pattern) => normalized.includes(pattern) || pattern.includes(normalized))) {
      return targetKey;
    }
  }

  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ColumnMappingDialog({
  isOpen,
  sourceColumns,
  targetFields,
  initialMappings,
  sampleData = [],
  onClose,
  onConfirm,
  onSaveTemplate,
}: ColumnMappingDialogProps) {
  // State
  const [mappings, setMappings] = useState<ColumnMapping[]>(() => {
    if (initialMappings) return initialMappings;

    // Initialize with auto-mapped values where possible
    return targetFields.map((field) => ({
      sourceColumn: null,
      targetField: field.key,
      transform: 'none',
    }));
  });
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  // Get mapping for a target field
  const getMappingForTarget = useCallback((targetKey: string): ColumnMapping | undefined => {
    return mappings.find((m) => m.targetField === targetKey);
  }, [mappings]);

  // Update mapping for a target field
  const updateMapping = useCallback((targetKey: string, sourceColumn: string | null, transform?: string) => {
    setMappings((prev) => {
      const existing = prev.find((m) => m.targetField === targetKey);
      if (existing) {
        return prev.map((m) =>
          m.targetField === targetKey
            ? { ...m, sourceColumn, transform: (transform || m.transform) as ColumnMapping['transform'] }
            : m
        );
      }
      return [...prev, { sourceColumn, targetField: targetKey, transform: transform as ColumnMapping['transform'] || 'none' }];
    });
  }, []);

  // Auto-map all columns
  const handleAutoMap = useCallback(() => {
    const newMappings = targetFields.map((field) => {
      // Find best matching source column
      let bestMatch: string | null = null;

      for (const sourceCol of sourceColumns) {
        const suggested = findAutoMapping(sourceCol);
        if (suggested === field.key) {
          bestMatch = sourceCol;
          break;
        }
      }

      return {
        sourceColumn: bestMatch,
        targetField: field.key,
        transform: field.type === 'number' ? 'cents' : 'none',
      } as ColumnMapping;
    });

    setMappings(newMappings);
  }, [sourceColumns, targetFields]);

  // Reset mappings
  const handleReset = useCallback(() => {
    setMappings(
      targetFields.map((field) => ({
        sourceColumn: null,
        targetField: field.key,
        transform: 'none',
      }))
    );
  }, [targetFields]);

  // Get sample value for a source column
  const getSampleValue = useCallback((sourceColumn: string | null): string => {
    if (!sourceColumn || sampleData.length === 0) return '--';
    const value = sampleData[0][sourceColumn];
    return value?.toString() || '--';
  }, [sampleData]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    targetFields
      .filter((f) => f.required)
      .forEach((field) => {
        const mapping = getMappingForTarget(field.key);
        if (!mapping?.sourceColumn) {
          errors.push(`"${field.label}" is required`);
        }
      });

    return errors;
  }, [targetFields, getMappingForTarget]);

  // Available source columns (not yet mapped)
  const getAvailableColumns = useCallback((currentTargetKey: string) => {
    const usedColumns = mappings
      .filter((m) => m.targetField !== currentTargetKey && m.sourceColumn)
      .map((m) => m.sourceColumn);

    return sourceColumns.filter((col) => !usedColumns.includes(col));
  }, [sourceColumns, mappings]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (validationErrors.length === 0) {
      onConfirm(mappings);
    }
  }, [mappings, validationErrors, onConfirm]);

  // Handle save template
  const handleSaveTemplate = useCallback(() => {
    if (templateName.trim() && onSaveTemplate) {
      onSaveTemplate(templateName.trim(), mappings);
      setShowSaveTemplate(false);
      setTemplateName('');
    }
  }, [templateName, mappings, onSaveTemplate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#3e3e42] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Map Columns
            </h2>
            <p className="text-sm text-[#858585]">
              Match your file columns to cost plan fields
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="px-4 py-2 border-b border-[#3e3e42] bg-[#1e1e1e] flex items-center gap-2 shrink-0">
          <button
            onClick={handleAutoMap}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#cccccc] hover:text-white hover:bg-[#37373d] rounded transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            Auto-Map
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#cccccc] hover:text-white hover:bg-[#37373d] rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          {onSaveTemplate && (
            <button
              onClick={() => setShowSaveTemplate(!showSaveTemplate)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#cccccc] hover:text-white hover:bg-[#37373d] rounded transition-colors ml-auto"
            >
              <Save className="w-4 h-4" />
              Save Template
            </button>
          )}
        </div>

        {/* Save Template Form */}
        {showSaveTemplate && (
          <div className="px-4 py-3 border-b border-[#3e3e42] bg-[#1e1e1e] flex items-center gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              className="flex-1 px-3 py-1.5 bg-[#252526] border border-[#3e3e42] rounded text-[#cccccc] placeholder-[#6e6e6e] focus:outline-none focus:border-[#007acc]"
              autoFocus
            />
            <button
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
              className="px-3 py-1.5 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveTemplate(false)}
              className="px-3 py-1.5 text-[#858585] hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Mapping Table */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full">
            <thead className="sticky top-0 bg-[#1e1e1e]">
              <tr className="text-xs text-[#858585] uppercase tracking-wider">
                <th className="px-4 py-2 text-left font-medium border-b border-[#3e3e42]">
                  Target Field
                </th>
                <th className="px-4 py-2 text-center font-medium border-b border-[#3e3e42] w-10">

                </th>
                <th className="px-4 py-2 text-left font-medium border-b border-[#3e3e42]">
                  Source Column
                </th>
                <th className="px-4 py-2 text-left font-medium border-b border-[#3e3e42] w-32">
                  Preview
                </th>
              </tr>
            </thead>
            <tbody>
              {targetFields.map((field) => {
                const mapping = getMappingForTarget(field.key);
                const availableColumns = getAvailableColumns(field.key);
                const hasMapping = !!mapping?.sourceColumn;
                const isRequired = field.required;
                const showError = isRequired && !hasMapping;

                return (
                  <tr
                    key={field.key}
                    className={`
                      border-b border-[#3e3e42] hover:bg-[#2a2d2e]
                      ${showError ? 'bg-[#f87171]/5' : ''}
                    `}
                  >
                    {/* Target Field */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[#cccccc] ${isRequired ? 'font-medium' : ''}`}>
                          {field.label}
                        </span>
                        {isRequired && (
                          <span className="text-[#f87171] text-xs">*</span>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-xs text-[#6e6e6e] mt-0.5">{field.description}</p>
                      )}
                    </td>

                    {/* Arrow */}
                    <td className="px-2 py-3 text-center">
                      <ArrowRight
                        className={`w-4 h-4 mx-auto ${
                          hasMapping ? 'text-[#4ade80]' : 'text-[#4e4e4e]'
                        }`}
                      />
                    </td>

                    {/* Source Column Dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={mapping?.sourceColumn || ''}
                          onChange={(e) => updateMapping(field.key, e.target.value || null)}
                          className={`
                            w-full px-3 py-2 bg-[#1e1e1e] border rounded text-[#cccccc]
                            focus:outline-none focus:border-[#007acc] appearance-none cursor-pointer
                            ${showError ? 'border-[#f87171]' : 'border-[#3e3e42]'}
                          `}
                        >
                          <option value="">-- Select column --</option>
                          {mapping?.sourceColumn && !availableColumns.includes(mapping.sourceColumn) && (
                            <option value={mapping.sourceColumn}>{mapping.sourceColumn}</option>
                          )}
                          {availableColumns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585] pointer-events-none" />
                      </div>
                    </td>

                    {/* Preview Value */}
                    <td className="px-4 py-3">
                      {hasMapping ? (
                        <span className="text-sm text-[#858585] font-mono truncate block max-w-[120px]">
                          {getSampleValue(mapping?.sourceColumn || null)}
                        </span>
                      ) : (
                        <span className="text-sm text-[#4e4e4e]">--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="px-4 py-2 border-t border-[#3e3e42] bg-[#f87171]/10 shrink-0">
            <div className="flex items-center gap-2 text-[#f87171]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm">
                {validationErrors.length === 1
                  ? validationErrors[0]
                  : `${validationErrors.length} required fields not mapped`}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#3e3e42] flex items-center justify-between shrink-0">
          <div className="text-sm text-[#858585]">
            {mappings.filter((m) => m.sourceColumn).length} of {targetFields.length} fields mapped
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[#cccccc] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={validationErrors.length > 0}
              className="px-4 py-2 bg-[#0e639c] text-white rounded hover:bg-[#1177bb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm Mapping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ColumnMappingDialog;
