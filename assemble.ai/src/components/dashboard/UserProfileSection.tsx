'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { User, Mail, Pencil, Check, X, Lock, Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  organizationId: string | null;
}

export function UserProfileSection() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit display name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Change password modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch user data
  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch user');
      }

      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Start editing name
  const handleStartEditName = useCallback(() => {
    if (user) {
      setEditedName(user.displayName);
      setIsEditingName(true);
      setNameError(null);
    }
  }, [user]);

  // Cancel editing name
  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setEditedName('');
    setNameError(null);
  }, []);

  // Save display name
  const handleSaveName = useCallback(async () => {
    if (!editedName.trim()) {
      setNameError('Name cannot be empty');
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: editedName.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to update name');
      }

      const data = await res.json();
      setUser(data.user);
      setIsEditingName(false);
      setEditedName('');
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSavingName(false);
    }
  }, [editedName]);

  // Handle password change
  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to change password');
      }

      // Success - close modal and reset form
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  }, [passwordForm]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[var(--color-bg-hover)] rounded w-32" />
          <div className="h-20 bg-[var(--color-bg-hover)] rounded" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <div className="text-center text-[var(--color-error)]">
          <p>{error || 'Failed to load profile'}</p>
          <Button onClick={fetchUser} className="mt-2" variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Profile</h3>

      {/* User Info */}
      <div className="space-y-4">
        {/* Display Name */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-[var(--color-text-muted)]" />
            <div>
              <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                Display Name
              </label>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] h-8 w-48"
                    disabled={isSavingName}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEditName();
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="p-1 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 rounded"
                  >
                    {isSavingName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleCancelEditName}
                    disabled={isSavingName}
                    className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[var(--color-text-primary)]">{user.displayName}</span>
                  <button
                    onClick={handleStartEditName}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              {nameError && (
                <p className="text-xs text-[var(--color-error)] mt-1">{nameError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-[var(--color-text-muted)]" />
          <div>
            <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
              Email
            </label>
            <p className="text-[var(--color-text-primary)] mt-1">{user.email}</p>
          </div>
        </div>

        {/* Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[var(--color-text-muted)]" />
            <div>
              <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                Password
              </label>
              <p className="text-[var(--color-text-muted)] mt-1">••••••••</p>
            </div>
          </div>
          <Button
            onClick={() => setIsPasswordModalOpen(true)}
            variant="outline"
            size="sm"
            className="border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
          >
            Change
          </Button>
        </div>
      </div>

      {/* Logout */}
      <div className="pt-4 border-t border-[var(--color-border)]">
        <Button
          onClick={handleLogout}
          disabled={isLoggingOut}
          variant="ghost"
          className="text-[var(--color-error)] hover:bg-[var(--color-error)]/10 w-full justify-start"
        >
          {isLoggingOut ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}
          Sign Out
        </Button>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setPasswordError(null);
        }}
        title="Change Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Current Password
            </label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
              disabled={isSavingPassword}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              New Password
            </label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
              disabled={isSavingPassword}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
              disabled={isSavingPassword}
              required
            />
          </div>

          {passwordError && (
            <p className="text-sm text-[var(--color-error)]">{passwordError}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordError(null);
              }}
              disabled={isSavingPassword}
              className="border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSavingPassword}
              className="bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-white"
            >
              {isSavingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
