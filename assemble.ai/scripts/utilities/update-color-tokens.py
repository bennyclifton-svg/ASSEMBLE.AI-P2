#!/usr/bin/env python3
"""
Script to replace hardcoded hex colors with CSS design tokens in cost-plan components.
This script updates all .tsx and .ts files in the cost-plan directory.
"""

import os
import re
from pathlib import Path

# Color mappings from hex to CSS tokens
COLOR_MAPPINGS = [
    (r'#1e1e1e', 'var(--color-bg-primary)'),
    (r'#252526', 'var(--color-bg-secondary)'),
    (r'#2a2d2e', 'var(--color-bg-tertiary)'),
    (r'#3e3e42', 'var(--color-border)'),
    (r'#cccccc', 'var(--color-text-primary)'),
    (r'#858585', 'var(--color-text-muted)'),
    (r'#808080', 'var(--color-text-muted)'),
    (r'#aaaaaa', 'var(--color-text-secondary)'),
    (r'#007acc', 'var(--color-accent-green)'),
    (r'#0e639c', 'var(--color-accent-green)'),
    (r'#4fc1ff', 'var(--color-accent-teal)'),
    (r'#ffa726', 'var(--color-accent-yellow)'),
    (r'#f14c4c', 'var(--color-accent-coral)'),
]

def process_file(file_path):
    """Process a single file and replace hex colors with tokens."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Apply all color replacements
        for hex_color, token in COLOR_MAPPINGS:
            # Replace in className strings (between quotes)
            content = re.sub(
                rf'(["\'].*?)({hex_color})(.*?["\'])',
                rf'\1{token}\3',
                content,
                flags=re.IGNORECASE
            )

        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to process all files in cost-plan directory."""
    base_dir = Path(__file__).parent / 'assemble.ai' / 'src' / 'components' / 'cost-plan'

    if not base_dir.exists():
        print(f"Error: Directory not found: {base_dir}")
        return

    files_processed = 0
    files_updated = 0

    # Process all .tsx and .ts files recursively
    for file_path in base_dir.rglob('*.tsx'):
        # Skip .next and node_modules directories
        if '.next' in file_path.parts or 'node_modules' in file_path.parts:
            continue

        files_processed += 1
        if process_file(file_path):
            files_updated += 1
            print(f"Updated: {file_path.relative_to(base_dir)}")

    for file_path in base_dir.rglob('*.ts'):
        # Skip .next, node_modules, and .d.ts files
        if ('.next' in file_path.parts or
            'node_modules' in file_path.parts or
            file_path.suffix == '.d.ts'):
            continue

        files_processed += 1
        if process_file(file_path):
            files_updated += 1
            print(f"Updated: {file_path.relative_to(base_dir)}")

    print(f"\n✓ Processing complete!")
    print(f"  Files processed: {files_processed}")
    print(f"  Files updated: {files_updated}")

if __name__ == '__main__':
    main()
