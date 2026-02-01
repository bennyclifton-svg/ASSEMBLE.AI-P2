export type FirmType = 'consultant' | 'contractor';

export interface FirmData {
  id?: string;
  companyName: string;
  contactPerson: string;
  email: string;
  mobile?: string;  // Consultants only
  phone?: string;   // Legacy field
  address: string;
  abn: string;
  notes: string;
  shortlisted: boolean;
  awarded: boolean;
  companyId: string | null;
  // Category field (discipline for consultants, trade for contractors)
  discipline?: string;
  trade?: string;
}

export interface FirmCardProps {
  type: FirmType;
  firm: FirmData;
  category: string;  // discipline or trade value
  onSave: (data: Partial<FirmData>) => Promise<void>;
  onDelete: () => void | Promise<void>;
  onShortlistToggle: (shortlisted: boolean) => Promise<void>;
  onAwardToggle: (awarded: boolean) => Promise<void>;
  onFileDrop: (file: File, action: 'replace' | 'add') => Promise<void>;
}

export interface AddFirmButtonProps {
  onAdd: () => void;
  onFileDrop: (file: File) => Promise<void>;
}

export interface DropActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplace: () => void;
  onAddNew: () => void;
  fileName: string;
}
