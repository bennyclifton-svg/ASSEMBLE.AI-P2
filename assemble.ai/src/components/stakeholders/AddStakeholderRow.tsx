'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, X, Check } from 'lucide-react';
import type { StakeholderGroup, CreateStakeholderRequest } from '@/types/stakeholder';
import { getSubgroupsForGroup } from '@/types/stakeholder';

interface AddStakeholderRowProps {
  onAdd: (data: CreateStakeholderRequest) => Promise<unknown>;
}

const GROUP_OPTIONS: { value: StakeholderGroup; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'authority', label: 'Authority' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'contractor', label: 'Contractor' },
];

export function AddStakeholderRow({ onAdd }: AddStakeholderRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [group, setGroup] = useState<StakeholderGroup>('client');
  const [subgroup, setSubgroup] = useState(''); // This becomes the 'name' field (discipline/role)
  const [firm, setFirm] = useState('');
  const [contactName, setContactName] = useState(''); // Actual person's name
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const subgroupRef = useRef<HTMLSelectElement>(null);

  // Get appropriate subgroups for dropdown based on selected group
  const subgroups = getSubgroupsForGroup(group);

  // Focus subgroup dropdown when entering add mode
  useEffect(() => {
    if (isAdding && subgroupRef.current) {
      subgroupRef.current.focus();
    }
  }, [isAdding]);

  // Reset subgroup when group changes
  useEffect(() => {
    setSubgroup('');
  }, [group]);

  const handleSubmit = async () => {
    if (!subgroup.trim()) return; // SubGroup (discipline/role) is required

    setIsSaving(true);
    try {
      const data: CreateStakeholderRequest = {
        stakeholderGroup: group,
        name: subgroup.trim(), // SubGroup value goes into name field
        isEnabled: group === 'consultant' || group === 'contractor',
      };

      // Add firm (organization)
      if (firm.trim()) {
        data.organization = firm.trim();
      }

      // Add contact info
      if (contactName.trim()) {
        data.contactName = contactName.trim();
      }
      if (phone.trim()) {
        data.contactPhone = phone.trim();
      }
      if (email.trim()) {
        data.contactEmail = email.trim();
      }

      await onAdd(data);
      handleCancel();
    } catch (error) {
      console.error('Failed to add stakeholder:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setGroup('client');
    setSubgroup('');
    setFirm('');
    setContactName('');
    setPhone('');
    setEmail('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors border-t border-[var(--color-border)]"
      >
        <Plus className="w-4 h-4" />
        <span>Add stakeholder</span>
      </button>
    );
  }

  const inputClassName = cn(
    'flex-1 min-w-0 px-2 py-1 text-sm rounded',
    'bg-[var(--color-bg-primary)] border border-[var(--color-border)]',
    'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
    'focus:outline-none focus:border-[var(--color-accent-green)]',
    'disabled:opacity-50'
  );

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)]">
      {/* Group dropdown */}
      <select
        value={group}
        onChange={(e) => setGroup(e.target.value as StakeholderGroup)}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className={cn(inputClassName, 'w-28')}
      >
        {GROUP_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* SubGroup dropdown - the discipline/role (required) */}
      <select
        ref={subgroupRef}
        value={subgroup}
        onChange={(e) => setSubgroup(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className={cn(inputClassName, 'w-44')}
      >
        <option value="">SubGroup *</option>
        {subgroups.map((sg) => (
          <option key={sg} value={sg}>
            {sg}
          </option>
        ))}
      </select>

      {/* Firm input */}
      <input
        type="text"
        value={firm}
        onChange={(e) => setFirm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Firm"
        disabled={isSaving}
        className={cn(inputClassName, 'w-36')}
      />

      {/* Contact Name input - actual person's name */}
      <input
        type="text"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Name"
        disabled={isSaving}
        className={cn(inputClassName, 'flex-1')}
      />

      {/* Phone input */}
      <input
        type="text"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Phone"
        disabled={isSaving}
        className={cn(inputClassName, 'w-32')}
      />

      {/* Email input */}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Email"
        disabled={isSaving}
        className={cn(inputClassName, 'w-44')}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-1 w-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSubmit}
          disabled={!subgroup.trim() || isSaving}
          className="h-7 w-7 p-0 text-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)]/10"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-[var(--color-accent-green)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
          className="h-7 w-7 p-0 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
