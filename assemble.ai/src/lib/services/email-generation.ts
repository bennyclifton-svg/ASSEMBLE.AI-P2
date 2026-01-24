/**
 * Email Generation Service
 * Feature 021 - Notes, Meetings & Reports
 *
 * Generates email content from meeting data for distribution to attendees.
 */

interface MeetingSection {
    sectionLabel: string;
    content: string | null;
    childSections?: Array<{
        sectionLabel: string;
        content: string | null;
    }>;
}

interface MeetingAttendee {
    adhocName: string | null;
    adhocFirm: string | null;
    isDistribution: boolean;
    stakeholder?: {
        name: string;
        email: string | null;
        organization: string | null;
    } | null;
}

interface MeetingEmailData {
    title: string;
    meetingDate: string | null;
    sections: MeetingSection[];
    attendees: MeetingAttendee[];
    project?: {
        name: string;
        address?: string | null;
    } | null;
}

interface EmailGenerationResult {
    subject: string;
    body: string;
    recipients: string[];
}

/**
 * Generate email content from meeting data
 */
export function generateMeetingEmail(meeting: MeetingEmailData): EmailGenerationResult {
    // Build subject line
    const dateStr = meeting.meetingDate
        ? new Date(meeting.meetingDate).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : '';

    const subject = dateStr
        ? `${meeting.title} - ${dateStr}`
        : meeting.title;

    // Build recipients list (only attendees with isDistribution = true)
    const recipients = meeting.attendees
        .filter(a => a.isDistribution && a.stakeholder?.email)
        .map(a => a.stakeholder!.email!)
        .filter(Boolean);

    // Build email body
    const bodyParts: string[] = [];

    // Header
    if (meeting.project?.name) {
        bodyParts.push(`Project: ${meeting.project.name}`);
    }
    if (meeting.project?.address) {
        bodyParts.push(`Address: ${meeting.project.address}`);
    }
    if (meeting.meetingDate) {
        const formattedDate = new Date(meeting.meetingDate).toLocaleDateString('en-AU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        bodyParts.push(`Date: ${formattedDate}`);
    }

    if (bodyParts.length > 0) {
        bodyParts.push(''); // Empty line
    }

    // Attendees section
    const distributionList = meeting.attendees.filter(a => a.isDistribution);
    if (distributionList.length > 0) {
        bodyParts.push('DISTRIBUTION:');
        distributionList.forEach(a => {
            const name = a.stakeholder?.name || a.adhocName || 'Unknown';
            const org = a.stakeholder?.organization || a.adhocFirm || '';
            bodyParts.push(`  - ${name}${org ? ` (${org})` : ''}`);
        });
        bodyParts.push(''); // Empty line
    }

    // Agenda sections
    if (meeting.sections.length > 0) {
        bodyParts.push('AGENDA:');
        bodyParts.push('');

        meeting.sections.forEach((section, index) => {
            bodyParts.push(`${index + 1}. ${section.sectionLabel}`);

            if (section.content) {
                // Indent the content
                const contentLines = section.content.split('\n').filter(line => line.trim());
                contentLines.forEach(line => {
                    bodyParts.push(`   ${line.trim()}`);
                });
            }

            // Child sections
            if (section.childSections && section.childSections.length > 0) {
                section.childSections.forEach((child, childIndex) => {
                    bodyParts.push(`   ${index + 1}.${childIndex + 1} ${child.sectionLabel}`);
                    if (child.content) {
                        const childContentLines = child.content.split('\n').filter(line => line.trim());
                        childContentLines.forEach(line => {
                            bodyParts.push(`      ${line.trim()}`);
                        });
                    }
                });
            }

            bodyParts.push(''); // Empty line between sections
        });
    }

    // Footer
    bodyParts.push('---');
    bodyParts.push('This email was generated from the project management system.');

    const body = bodyParts.join('\n');

    return {
        subject,
        body,
        recipients,
    };
}

/**
 * Generate a mailto: URL for the meeting email
 */
export function generateMailtoUrl(emailData: EmailGenerationResult): string {
    const to = emailData.recipients.join(',');
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.body);

    return `mailto:${to}?subject=${subject}&body=${body}`;
}

/**
 * Format email body as HTML for rich email clients
 */
export function generateMeetingEmailHtml(meeting: MeetingEmailData): string {
    const parts: string[] = [];

    parts.push('<!DOCTYPE html>');
    parts.push('<html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; line-height: 1.6;">');

    // Title
    parts.push(`<h1 style="color: #5B9BD5;">${escapeHtml(meeting.title)}</h1>`);

    // Project info
    if (meeting.project?.name || meeting.meetingDate) {
        parts.push('<table style="border-collapse: collapse; margin-bottom: 20px;">');

        if (meeting.project?.name) {
            parts.push(`<tr><td style="padding: 5px 15px 5px 0; font-weight: bold;">Project:</td><td>${escapeHtml(meeting.project.name)}</td></tr>`);
        }
        if (meeting.project?.address) {
            parts.push(`<tr><td style="padding: 5px 15px 5px 0; font-weight: bold;">Address:</td><td>${escapeHtml(meeting.project.address)}</td></tr>`);
        }
        if (meeting.meetingDate) {
            const formattedDate = new Date(meeting.meetingDate).toLocaleDateString('en-AU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
            parts.push(`<tr><td style="padding: 5px 15px 5px 0; font-weight: bold;">Date:</td><td>${escapeHtml(formattedDate)}</td></tr>`);
        }

        parts.push('</table>');
    }

    // Distribution list
    const distributionList = meeting.attendees.filter(a => a.isDistribution);
    if (distributionList.length > 0) {
        parts.push('<h2 style="color: #70AD47;">Distribution</h2>');
        parts.push('<ul>');
        distributionList.forEach(a => {
            const name = a.stakeholder?.name || a.adhocName || 'Unknown';
            const org = a.stakeholder?.organization || a.adhocFirm || '';
            parts.push(`<li>${escapeHtml(name)}${org ? ` <span style="color: #666;">(${escapeHtml(org)})</span>` : ''}</li>`);
        });
        parts.push('</ul>');
    }

    // Agenda
    if (meeting.sections.length > 0) {
        parts.push('<h2 style="color: #70AD47;">Agenda</h2>');

        meeting.sections.forEach((section, index) => {
            parts.push(`<h3 style="color: #ED7D31;">${index + 1}. ${escapeHtml(section.sectionLabel)}</h3>`);

            if (section.content) {
                parts.push(`<p>${escapeHtml(section.content).replace(/\n/g, '<br>')}</p>`);
            }

            // Child sections
            if (section.childSections && section.childSections.length > 0) {
                parts.push('<ul>');
                section.childSections.forEach((child, childIndex) => {
                    parts.push(`<li><strong>${index + 1}.${childIndex + 1} ${escapeHtml(child.sectionLabel)}</strong>`);
                    if (child.content) {
                        parts.push(`<br>${escapeHtml(child.content).replace(/\n/g, '<br>')}`);
                    }
                    parts.push('</li>');
                });
                parts.push('</ul>');
            }
        });
    }

    // Footer
    parts.push('<hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">');
    parts.push('<p style="color: #999; font-size: 12px;">This email was generated from the project management system.</p>');

    parts.push('</body></html>');

    return parts.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
