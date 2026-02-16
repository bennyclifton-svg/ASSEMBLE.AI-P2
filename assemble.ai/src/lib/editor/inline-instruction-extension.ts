/**
 * Inline Instruction Highlight Extension for TipTap
 *
 * Detects // markers in editor text and applies visual decoration.
 * Users type "// elaborate on this" as inline instructions for the AI polish workflow.
 * The decoration is purely visual — it doesn't modify the document model.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const InlineInstructionHighlight = Extension.create({
  name: 'inlineInstructionHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('inlineInstructionHighlight'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc } = state;

            doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;

              const text = node.text;
              // Match // that's NOT preceded by : (avoids https://)
              const regex = /(?<!:)\/\/.*/g;
              let match;

              while ((match = regex.exec(text)) !== null) {
                const from = pos + match.index;
                const to = pos + match.index + match[0].length;
                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'inline-instruction',
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
