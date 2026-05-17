# Quickstart: Resizable Layout

## Overview
The `ResizableLayout` component provides a 3-column layout with drag-to-resize capabilities.

## Usage

```tsx
import { ResizableLayout } from '@/components/layout/ResizableLayout';

export default function DashboardPage() {
  return (
    <ResizableLayout
      leftContent={<PlanningCard />}
      centerContent={<ConsultantCard />}
      rightContent={<DocumentCard />}
    />
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| leftContent | ReactNode | Content for the Planning column |
| centerContent | ReactNode | Content for the Consultant column |
| rightContent | ReactNode | Content for the Document column |

## Configuration
Column widths are persisted in session state automatically. No manual configuration required.
