import {
    RFI_STATUS_LABELS,
    type RfiExportFormat,
    type RfiRecord,
} from '@/types/rfi';

export interface RfiExportProjectDetails {
    projectName: string;
    projectCode: string | null;
    address: string | null;
}

export interface RfiExportRenderInput {
    rfi: RfiRecord;
    project: RfiExportProjectDetails;
    format: RfiExportFormat;
    generatedAt: Date;
}

export interface RfiRenderedExport {
    buffer: Buffer;
    mimeType: string;
    extension: RfiExportFormat;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function textBlock(value: string | null): string {
    if (!value?.trim()) return '<p><em>-</em></p>';
    return `<p>${escapeHtml(value).replace(/\r?\n/g, '<br/>')}</p>`;
}

function formatDate(value: string | null): string {
    if (!value) return '-';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    return new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function formatGeneratedAt(value: Date): string {
    return new Intl.DateTimeFormat('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(value);
}

function evidenceHtml(rfi: RfiRecord): string {
    if (rfi.evidenceLinks.length === 0) return '<p><em>No evidence linked.</em></p>';
    const rows = rfi.evidenceLinks
        .map((link, index) => `
    <tr>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${index + 1}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(link.targetType)}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(link.label)}</td>
    </tr>`)
        .join('');

    return `
<table class="rfi-evidence" style="width:100%;border-collapse:collapse;">
  <thead>
    <tr>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:8%;">#</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;width:18%;">Type</th>
      <th style="padding:4px 6px;border:1px solid #DADADA;background:#F5F5F5;">Reference</th>
    </tr>
  </thead>
  <tbody>${rows}
  </tbody>
</table>`;
}

export function buildRfiExportHtml(input: RfiExportRenderInput): string {
    const projectLabel = input.project.projectCode
        ? `${input.project.projectCode} - ${input.project.projectName}`
        : input.project.projectName;
    const documentLabel = `${input.rfi.reference} - ${input.rfi.title}`;

    return `
<table class="project-info" style="width:100%;border-collapse:collapse;margin-bottom:12px;">
  <tbody>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;width:18%;">Project Name</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(projectLabel)}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;width:22%;"></td>
    </tr>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;">Address</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(input.project.address || '')}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;"></td>
    </tr>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;">Document</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;font-weight:bold;">${escapeHtml(documentLabel)}</td>
      <td class="issued-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;text-align:right;">Generated ${escapeHtml(formatGeneratedAt(input.generatedAt))}</td>
    </tr>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;">Status</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(RFI_STATUS_LABELS[input.rfi.status])}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;text-align:right;">${escapeHtml(input.rfi.responsiblePartyLabel)}</td>
    </tr>
    <tr>
      <td class="label-col" style="font-weight:bold;color:#1A6FB5;padding:4px 6px;border:1px solid #DADADA;">Due Date</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;">${escapeHtml(formatDate(input.rfi.dueDate))}</td>
      <td style="padding:4px 6px;border:1px solid #DADADA;text-align:right;">${escapeHtml(input.rfi.reference)}</td>
    </tr>
  </tbody>
</table>

<h1>${escapeHtml(input.rfi.reference)} - ${escapeHtml(input.rfi.title)}</h1>
<h2>Request</h2>
${textBlock(input.rfi.question)}

<h2>Response</h2>
${input.rfi.responseText || input.rfi.responseDate
    ? `<p><strong>Response date:</strong> ${escapeHtml(formatDate(input.rfi.responseDate))}</p>${textBlock(input.rfi.responseText)}`
    : '<p><em>No response recorded.</em></p>'}

<h2>Evidence</h2>
${evidenceHtml(input.rfi)}
`;
}

export async function renderRfiExport(input: RfiExportRenderInput): Promise<RfiRenderedExport> {
    const html = buildRfiExportHtml(input);
    const title = `${input.rfi.reference} - ${input.rfi.title}`;

    if (input.format === 'pdf') {
        const { exportToPDF } = await import('@/lib/export/pdf-enhanced');
        const arrayBuffer = await exportToPDF(html, title);
        return {
            buffer: Buffer.from(arrayBuffer),
            mimeType: 'application/pdf',
            extension: 'pdf',
        };
    }

    const { exportToDOCX } = await import('@/lib/export/docx-enhanced');
    return {
        buffer: await exportToDOCX(html, title),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
    };
}
