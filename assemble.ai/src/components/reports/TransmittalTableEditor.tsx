'use client';

/**
 * Transmittal Table Editor - Phase 11 (T135-T137)
 *
 * Editable table component with:
 * - Add/remove rows
 * - Edit doc name, version, category
 * - Category dropdown with color-coded options
 * - Embedded inline with contentEditable="false"
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { getAllCategories } from '@/lib/constants/categories';
import type { Category } from '@/lib/constants/categories';

export interface TransmittalDocument {
  id: string;
  name: string;
  version: string;
  categoryId: string;
}

interface TransmittalTableEditorProps {
  documents: TransmittalDocument[];
  onUpdate: (documents: TransmittalDocument[]) => void;
}

export default function TransmittalTableEditor({
  documents,
  onUpdate,
}: TransmittalTableEditorProps) {
  const categories = getAllCategories();
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'name' | 'version' } | null>(null);

  /**
   * Add new row
   */
  const handleAddRow = useCallback(() => {
    const newDoc: TransmittalDocument = {
      id: `doc-${Date.now()}`,
      name: 'New Document',
      version: 'Rev 1',
      categoryId: 'planning', // Default category
    };
    onUpdate([...documents, newDoc]);
  }, [documents, onUpdate]);

  /**
   * Remove row
   */
  const handleRemoveRow = useCallback(
    (id: string) => {
      onUpdate(documents.filter(doc => doc.id !== id));
    },
    [documents, onUpdate]
  );

  /**
   * Update document field
   */
  const handleUpdateField = useCallback(
    (id: string, field: keyof TransmittalDocument, value: string) => {
      onUpdate(
        documents.map(doc =>
          doc.id === id ? { ...doc, [field]: value } : doc
        )
      );
    },
    [documents, onUpdate]
  );

  /**
   * Get category by ID
   */
  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || 'var(--color-text-primary)';
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  return (
    <div
      className="transmittal-table-wrapper border border-gray-700 rounded-lg overflow-hidden my-4"
      contentEditable={false}
    >
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)] px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Document Transmittal</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleAddRow}
          className="text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Row
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#2d2d2d] border-b border-gray-700">
              <th className="text-left px-4 py-2 text-gray-400 font-medium">Document Name</th>
              <th className="text-left px-4 py-2 text-gray-400 font-medium w-32">Version</th>
              <th className="text-left px-4 py-2 text-gray-400 font-medium w-48">Category</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No documents in transmittal. Click "Add Row" to add documents.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-800 hover:bg-[var(--color-bg-tertiary)]">
                  {/* Document Name */}
                  <td className="px-4 py-2">
                    {editingCell?.id === doc.id && editingCell.field === 'name' ? (
                      <input
                        type="text"
                        value={doc.name}
                        onChange={(e) => handleUpdateField(doc.id, 'name', e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingCell(null);
                        }}
                        autoFocus
                        className="w-full bg-[var(--color-bg-primary)] border border-gray-600 rounded px-2 py-1 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCell({ id: doc.id, field: 'name' })}
                        className="cursor-text px-2 py-1 rounded hover:bg-[var(--color-bg-primary)]"
                      >
                        {doc.name}
                      </div>
                    )}
                  </td>

                  {/* Version */}
                  <td className="px-4 py-2">
                    {editingCell?.id === doc.id && editingCell.field === 'version' ? (
                      <input
                        type="text"
                        value={doc.version}
                        onChange={(e) => handleUpdateField(doc.id, 'version', e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingCell(null);
                        }}
                        autoFocus
                        className="w-full bg-[var(--color-bg-primary)] border border-gray-600 rounded px-2 py-1 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div
                        onClick={() => setEditingCell({ id: doc.id, field: 'version' })}
                        className="cursor-text px-2 py-1 rounded hover:bg-[var(--color-bg-primary)]"
                      >
                        {doc.version}
                      </div>
                    )}
                  </td>

                  {/* Category Dropdown */}
                  <td className="px-4 py-2">
                    <select
                      value={doc.categoryId}
                      onChange={(e) => handleUpdateField(doc.id, 'categoryId', e.target.value)}
                      className="w-full bg-[var(--color-bg-primary)] border border-gray-600 rounded px-2 py-1 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: getCategoryColor(doc.categoryId) }}
                    >
                      {categories.map((category) => (
                        <option
                          key={category.id}
                          value={category.id}
                          style={{ color: category.color }}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Delete Button */}
                  <td className="px-2 py-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveRow(doc.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
