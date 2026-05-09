'use client';

import React from 'react';
import { UserProfileSection } from './UserProfileSection';
import { DefaultSettingsSection } from './DefaultSettingsSection';
import { KnowledgeDomainManager } from '@/components/knowledge/KnowledgeDomainManager';

export function SettingsPanel() {
  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)] overflow-auto">
      {/* User Profile Section */}
      <div className="border-b border-[var(--color-border)]">
        <UserProfileSection />
      </div>

      {/* Default Settings Section */}
      <DefaultSettingsSection />

      {/* Knowledge Domains Section */}
      <div className="px-6 pb-6">
        <KnowledgeDomainManager />
      </div>
    </div>
  );
}
