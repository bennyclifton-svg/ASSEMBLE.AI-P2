'use client';

import React from 'react';
import { UserProfileSection } from './UserProfileSection';
import { DefaultSettingsSection } from './DefaultSettingsSection';

export function SettingsPanel() {
  return (
    <div className="h-full flex flex-col bg-[#252526] overflow-auto">
      {/* User Profile Section */}
      <div className="border-b border-[#3e3e42]">
        <UserProfileSection />
      </div>

      {/* Default Settings Section */}
      <div className="flex-1">
        <DefaultSettingsSection />
      </div>
    </div>
  );
}
