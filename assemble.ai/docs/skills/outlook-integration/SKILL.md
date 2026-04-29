---
name: outlook-integration
tier: 2
description: Outlook send and receive pipeline for the Correspondence Agent. Covers outbound email sending via win32com, inbound CM Agent Inbox monitoring, 13-category email classification, attachment auto-processing, time-bar detection, and response linking.
agents: [correspondence]
---

# Outlook Integration Skill

## When to Load

Load this skill when:
- Sending a correspondence item that has been approved by the user
- Monitoring the CM Agent Inbox for inbound emails
- Processing an inbound email attachment (auto-file and index)
- Classifying an inbound email for routing

## Configuration

All Outlook settings are in `settings.json`:

```json
{
  "outlook": {
    "enabled": true,
    "account": "yourname@company.com.au",
    "inbox_folder": "CM Agent Inbox",
    "poll_interval_seconds": 120,
    "auto_process_attachments": true,
    "time_bar_keywords": [
      "notice", "claim", "EOT", "extension of time", "variation",
      "payment claim", "show cause", "default", "terminate", "urgent",
      "without prejudice", "time bar", "14 days", "28 days", "7 days"
    ]
  }
}
```

**Prerequisites:**
```bash
pip install pywin32  # Windows only — required for Outlook COM automation
```

---

## Part 1: Outbound Email Pipeline

### Send Flow

```
1. Agent drafts correspondence content
2. Orchestrator presents draft to user for approval
3. User approves (with or without edits)
4. Correspondence Agent calls this skill to send
5. Email sent via Outlook (preserves sent item)
6. Correspondence register updated with sent status and timestamp
7. PROJECT_MEMORY Activity Log updated
```

### Sending Script

```python
# send_email.py — Send an approved email via Outlook
# Run: python system/skills/outlook-integration/send_email.py <json_payload>
```

```python
# send_email.py
import win32com.client
import sys
import json
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = "project.db"

def send_email(payload):
    """
    payload: {
        "to": "recipient@email.com",
        "cc": "optional@email.com",
        "subject": "RE: [Project] Subject",
        "body": "Email body text (plain text or HTML)",
        "html": false,
        "attachments": ["outputs/reports/file.pdf"],
        "correspondence_ref": "COR-012",
        "in_reply_to_ref": "IN-008"  // optional — for response linking
    }
    """
    outlook = win32com.client.Dispatch("Outlook.Application")
    mail = outlook.CreateItem(0)  # 0 = olMailItem

    mail.To = payload['to']
    if payload.get('cc'):
        mail.CC = payload['cc']
    mail.Subject = payload['subject']

    if payload.get('html', False):
        mail.HTMLBody = payload['body']
    else:
        mail.Body = payload['body']

    # Attach files
    for attachment_path in payload.get('attachments', []):
        path = Path(attachment_path)
        if path.exists():
            mail.Attachments.Add(str(path.resolve()))
        else:
            print(f"Warning: Attachment not found: {attachment_path}")

    mail.Send()
    sent_time = datetime.now().isoformat()
    print(f"Email sent: {payload['subject']} → {payload['to']} at {sent_time}")

    # Update correspondence register
    ref = payload.get('correspondence_ref')
    if ref:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            UPDATE correspondence_register
            SET status = 'sent', sent_at = ?
            WHERE reference = ?
        """, (sent_time, ref))
        conn.commit()
        conn.close()
        print(f"Correspondence register updated: {ref} → sent")

    # Link response to inbound item if applicable
    in_ref = payload.get('in_reply_to_ref')
    if in_ref:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""
            UPDATE inbound_register
            SET response_ref = ?, responded_at = ?, status = 'responded'
            WHERE reference = ?
        """, (ref, sent_time, in_ref))
        conn.commit()
        conn.close()
        print(f"Response linked: {in_ref} → {ref}")

    return sent_time

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: send_email.py '<json_payload>'")
        sys.exit(1)
    payload = json.loads(sys.argv[1])
    send_email(payload)
```

---

## Part 2: Inbound Email Monitoring

### Monitor Script

```python
# monitor_inbox.py — Poll CM Agent Inbox and process new emails
# Run: python system/skills/outlook-integration/monitor_inbox.py
# (Typically run in background via file watcher / scheduled task)
```

```python
# monitor_inbox.py
import win32com.client
import sqlite3
import json
import hashlib
import shutil
import sys
from datetime import datetime
from pathlib import Path

DB_PATH = "project.db"
DOCS_BASE = Path("docs")

# Auto-filing rules: classification → destination folder
AUTO_FILE_RULES = {
    'geotech':           DOCS_BASE / 'feasibility',
    'contamination':     DOCS_BASE / 'feasibility',
    'environmental':     DOCS_BASE / 'feasibility',
    'heritage':          DOCS_BASE / 'feasibility',
    'survey':            DOCS_BASE / 'feasibility',
    'planning':          DOCS_BASE / 'design',
    'traffic':           DOCS_BASE / 'design',
    'acoustic':          DOCS_BASE / 'design',
    'bca':               DOCS_BASE / 'design',
    'section_j':         DOCS_BASE / 'design',
    'fire':              DOCS_BASE / 'design',
    'structural':        DOCS_BASE / 'design',
    'civil':             DOCS_BASE / 'design',
    'drawing':           DOCS_BASE / 'design',
    'specification':     DOCS_BASE / 'design',
    'variation_claim':   DOCS_BASE / 'delivery',
    'eot_claim':         DOCS_BASE / 'delivery',
    'progress_claim':    DOCS_BASE / 'delivery',
    'notice':            DOCS_BASE / 'delivery',
    'insurance':         DOCS_BASE / 'delivery',
    'programme':         DOCS_BASE / 'delivery',
    'superintendent':    DOCS_BASE / 'delivery',
    'tender':            DOCS_BASE / 'procurement',
    'cost_plan':         DOCS_BASE / 'design',
    'unclassified':      DOCS_BASE / 'inbound',
}

def email_hash(msg):
    """Generate a hash to detect duplicate processing."""
    key = f"{msg.SenderEmailAddress}|{msg.Subject}|{msg.ReceivedTime}"
    return hashlib.md5(key.encode()).hexdigest()

def get_inbox_folder(outlook, folder_name):
    namespace = outlook.GetNamespace("MAPI")
    inbox = namespace.GetDefaultFolder(6)  # 6 = olFolderInbox
    for folder in inbox.Folders:
        if folder.Name == folder_name:
            return folder
    return None

def is_processed(conn, msg_hash):
    cur = conn.execute(
        "SELECT id FROM inbound_register WHERE message_hash = ?", (msg_hash,)
    )
    return cur.fetchone() is not None

def classify_email(subject, body, attachments):
    """
    Classify inbound email into one of 13 significant categories.
    Returns (classification, confidence, time_bar_detected).
    """
    subject_lower = subject.lower()
    body_lower = body[:2000].lower()  # Check first 2000 chars of body
    combined = subject_lower + ' ' + body_lower

    # Time-bar keywords
    time_bar_terms = ['notice', 'claim', 'eot', 'extension of time', 'variation claim',
                      'payment claim', 'show cause', 'default', 'terminate', 'without prejudice',
                      '14 days', '28 days', '7 days', 'time bar', 'dispute']
    time_bar = any(term in combined for term in time_bar_terms)

    # Classification rules (order matters — more specific first)
    rules = [
        (['variation claim', 'variation notice', 'cl 36', 'clause 36'],         'variation_claim'),
        (['eot claim', 'extension of time', 'delay claim', 'cl 34', 'clause 34'], 'eot_claim'),
        (['payment claim', 'progress claim', 'progress payment'],                'progress_claim'),
        (['show cause', 'default notice', 'termination notice', 'notice to show'], 'notice'),
        (['practical completion', 'pc claim', 'completion notice'],              'pc_claim'),
        (['defect', 'rectification', 'dlp'],                                     'defect'),
        (['superintendent report', 'site report', 'monthly report', 'fortnightly'], 'superintendent'),
        (['programme', 'schedule', 'baseline programme', 'revised programme'],   'programme'),
        (['insurance', 'bank guarantee', 'bond', 'security'],                    'insurance'),
        (['acoustic', 'noise'],                                                  'acoustic'),
        (['geotech', 'geotechnical', 'bore log'],                               'geotech'),
        (['bca', 'ncc', 'building code', 'fire engineering'],                   'bca'),
        (['drawing', 'revision', 'rev ', 'architectural', 'dxf', 'dwg'],       'drawing'),
        (['specification', 'spec ', 'section 0'],                               'specification'),
        (['council', 'da ', 'development application', 'conditions of consent'], 'planning'),
        (['rfi', 'request for information'],                                     'rfi'),
        (['cost plan', 'estimate', 'qs report', 'quantity surveyor'],           'cost_plan'),
        (['tender', 'rfq', 'rft', 'quotation', 'bid'],                         'tender'),
    ]

    for keywords, classification in rules:
        if any(kw in combined for kw in keywords):
            return classification, 'medium', time_bar

    # Check attachments for clues
    for att_name in attachments:
        att_lower = att_name.lower()
        if any(x in att_lower for x in ['.dxf', '.dwg', 'drawing', 'plan', 'elevation']):
            return 'drawing', 'low', time_bar
        if any(x in att_lower for x in ['spec', 'specification']):
            return 'specification', 'low', time_bar
        if any(x in att_lower for x in ['report', 'assessment', 'study']):
            return 'report_submission', 'low', time_bar

    return 'unclassified', 'low', time_bar

def process_email(conn, msg, folder_name):
    """Process a single inbound email."""
    msg_hash = email_hash(msg)

    if is_processed(conn, msg_hash):
        return None  # Already processed

    subject = msg.Subject or ''
    sender = msg.SenderEmailAddress or ''
    sender_name = msg.SenderName or sender
    received = str(msg.ReceivedTime)
    body = msg.Body or ''

    # Get attachment names
    attachment_names = [msg.Attachments.Item(i+1).FileName
                        for i in range(msg.Attachments.Count)]

    classification, confidence, time_bar = classify_email(subject, body, attachment_names)

    # Generate inbound reference
    cur = conn.execute("SELECT COUNT(*) FROM inbound_register")
    count = cur.fetchone()[0] + 1
    in_ref = f"IN-{count:03d}"

    # Register in inbound_register
    conn.execute("""
        INSERT INTO inbound_register
        (reference, message_hash, from_address, from_name, subject, received_at,
         classification, confidence, time_bar_detected, body_preview, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received')
    """, (in_ref, msg_hash, sender, sender_name, subject, received,
          classification, confidence, time_bar, body[:500]))
    conn.commit()

    # Save attachments
    saved_attachments = []
    if msg.Attachments.Count > 0 and classification != 'unclassified':
        dest_folder = AUTO_FILE_RULES.get(classification, DOCS_BASE / 'inbound')
        dest_folder.mkdir(parents=True, exist_ok=True)

        for i in range(msg.Attachments.Count):
            att = msg.Attachments.Item(i + 1)
            dest_path = dest_folder / att.FileName
            att.SaveAsFile(str(dest_path))
            saved_attachments.append(str(dest_path))
            print(f"  Saved: {att.FileName} → {dest_folder}")

    result = {
        'reference': in_ref,
        'from': f"{sender_name} <{sender}>",
        'subject': subject,
        'received': received,
        'classification': classification,
        'confidence': confidence,
        'time_bar': time_bar,
        'attachments': attachment_names,
        'saved_to': saved_attachments
    }

    print(f"[{in_ref}] {classification.upper()} {'⚠ TIME-BAR' if time_bar else ''}")
    print(f"  From: {sender_name}")
    print(f"  Subject: {subject}")
    print(f"  Attachments saved: {len(saved_attachments)}")

    return result

def monitor_inbox(inbox_folder_name='CM Agent Inbox'):
    outlook = win32com.client.Dispatch("Outlook.Application")
    folder = get_inbox_folder(outlook, inbox_folder_name)
    if not folder:
        print(f"Folder '{inbox_folder_name}' not found in Outlook inbox.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    results = []

    messages = folder.Items
    messages.Sort("[ReceivedTime]", True)  # Newest first
    for msg in messages:
        try:
            if msg.Class == 43:  # 43 = olMail
                result = process_email(conn, msg, inbox_folder_name)
                if result:
                    results.append(result)
        except Exception as e:
            print(f"Error processing message: {e}")

    conn.close()
    print(f"\nProcessed {len(results)} new emails.")
    return results

if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else 'CM Agent Inbox'
    results = monitor_inbox(folder)
    if results:
        print("\nNEW EMAILS SUMMARY:")
        for r in results:
            time_bar_flag = " ⚠ TIME-BAR DETECTED" if r['time_bar'] else ""
            print(f"  [{r['reference']}] {r['classification'].upper()}{time_bar_flag}")
            print(f"    From: {r['from']}")
            print(f"    Subject: {r['subject']}")
```

---

## Part 3: Email Classification (13 Categories)

| Classification | Description | Routing (Orchestrator) |
|---------------|-------------|----------------------|
| `variation_claim` | Contractor submitting a variation claim | Delivery → Finance (Sequential) |
| `eot_claim` | Extension of time claim | Delivery → Program (Sequential) |
| `progress_claim` | Monthly progress payment claim | Delivery (Single) |
| `pc_claim` | Practical completion claim | Delivery → Finance → Program (Sequential) |
| `notice` | Show cause, default, termination notice | Delivery (Single — urgent) |
| `defect` | Defect notification during DLP | Delivery (Single) |
| `superintendent` | Superintendent or site report | Delivery (Single) |
| `drawing` | New or revised drawing | Design (Single) |
| `report_submission` | Any technical report submitted | Design (Single) |
| `planning` | Council RFI, DA correspondence, conditions | Design (Single) |
| `rfi` | Request for information | Original requesting agent |
| `programme` | Updated programme or schedule | Program (Single) |
| `insurance` | Insurance certificate, bank guarantee | Delivery (Single) |
| `cost_plan` | QS estimate or cost report | Finance (Single) |
| `tender` | Tender-related correspondence | Procurement (Single) |
| `unclassified` | Cannot classify — ask user | User decides |

---

## Part 4: Time-Bar Detection and Handling

Time-bar emails are flagged during classification. When detected, the Orchestrator is notified immediately:

```
🚨 TIME-BAR ALERT — IN-014
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: BuildCo Construction Pty Ltd
Subject: Extension of Time Claim — EOT #3 — Clause 34

Received: 2025-11-20 14:23
Classification: eot_claim
Time-bar keywords detected: "extension of time", "clause 34", "28 days"

Action required: Response due within 28 days (AS 4000 Clause 34.4)
Response deadline: 2025-12-18

Routing to Delivery Agent → Program Agent for assessment now.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The response deadline is also written to the PROJECT_MEMORY Active State so the Orchestrator surfaces it on every subsequent interaction until the matter is resolved.

---

## Part 5: Response Linking

When a response is sent to an inbound item, the `inbound_register` is updated:

```sql
-- Check all inbound items awaiting response
SELECT reference, from_name, subject, classification, received_at,
       CASE WHEN time_bar_detected THEN '⚠ TIME-BAR' ELSE '' END as flag,
       response_ref, status
FROM inbound_register
WHERE status IN ('received', 'actioned')
ORDER BY received_at DESC;
```

This gives the Correspondence Agent a live view of correspondence requiring responses.
