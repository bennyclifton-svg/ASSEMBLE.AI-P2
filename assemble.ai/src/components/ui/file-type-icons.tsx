/**
 * Custom File Type Icons
 *
 * Document-style SVG icons with file type labels for PDF, Word, and Excel exports.
 * More intuitive and recognizable than generic file icons.
 */

import React from 'react';

interface FileTypeIconProps {
  /** Icon size in pixels (default: 20) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PDF Icon - Red document with "PDF" label
 */
export function PdfIcon({ size = 20, className = '' }: FileTypeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="PDF file"
    >
      {/* Document body */}
      <path
        d="M6 2C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6z"
        fill="#dc2626"
      />
      {/* Folded corner */}
      <path
        d="M14 2v6h6l-6-6z"
        fill="#ef4444"
      />
      {/* PDF text */}
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fill="white"
        fontSize="6"
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        PDF
      </text>
    </svg>
  );
}

/**
 * Word/DOCX Icon - Blue document with "DOC" label
 */
export function DocxIcon({ size = 20, className = '' }: FileTypeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Word document"
    >
      {/* Document body */}
      <path
        d="M6 2C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6z"
        fill="#2563eb"
      />
      {/* Folded corner */}
      <path
        d="M14 2v6h6l-6-6z"
        fill="#3b82f6"
      />
      {/* DOC text */}
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fill="white"
        fontSize="6"
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        DOC
      </text>
    </svg>
  );
}

/**
 * Excel/XLSX Icon - Green document with "XLS" label
 */
export function XlsxIcon({ size = 20, className = '' }: FileTypeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Excel spreadsheet"
    >
      {/* Document body */}
      <path
        d="M6 2C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6z"
        fill="#16a34a"
      />
      {/* Folded corner */}
      <path
        d="M14 2v6h6l-6-6z"
        fill="#22c55e"
      />
      {/* XLS text */}
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fill="white"
        fontSize="6"
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        XLS
      </text>
    </svg>
  );
}
