'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/lib/hooks/use-toast';

interface BookDemoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BookDemoDialog({ open, onOpenChange }: BookDemoDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/demo-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, source: 'demo_form' }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit');
            }

            toast({
                title: 'Demo request submitted',
                description: "We'll be in touch shortly.",
            });

            setFormData({ name: '', email: '', company: '', message: '' });
            onOpenChange(false);
        } catch {
            toast({
                title: 'Something went wrong',
                description: 'Please try again or email us directly.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass =
        'w-full px-4 py-3 bg-[var(--gray-900)] border border-[var(--gray-700)] ' +
        'rounded-lg text-white text-sm focus:outline-none focus:border-[var(--gray-500)] ' +
        'placeholder:text-[var(--gray-500)]';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-black border-[var(--gray-700)] text-white max-w-md [&>button>svg]:text-white">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl">
                        Book a Demo
                    </DialogTitle>
                    <DialogDescription className="text-[var(--gray-400)]">
                        Tell us about your project and we&apos;ll schedule a personalized demo.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-[var(--gray-300)] mb-1.5 block">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Your name"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="text-sm text-[var(--gray-300)] mb-1.5 block">Email *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="you@company.com"
                            className={inputClass}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm text-[var(--gray-300)] mb-1.5 block">Company</label>
                        <input
                            type="text"
                            value={formData.company}
                            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                            placeholder="Company name"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="text-sm text-[var(--gray-300)] mb-1.5 block">Message</label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Tell us about your project..."
                            rows={3}
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-5 py-2.5 text-sm text-[var(--gray-400)] hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.email}
                            className="px-5 py-2.5 text-sm font-semibold bg-[var(--primary)] text-black rounded-full hover:bg-[var(--primary-dark)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Request Demo'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
