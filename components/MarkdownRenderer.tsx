import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MarkdownRendererProps {
  content: string;
  style?: object;
}

interface InlineSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

function parseInlineFormatting(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.substring(lastIndex, match.index) });
    }
    const matchedStr = match[0];
    if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      segments.push({ text: matchedStr.slice(2, -2), bold: true });
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      segments.push({ text: matchedStr.slice(1, -1), italic: true });
    } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      segments.push({ text: matchedStr.slice(1, -1), code: true });
    } else {
      segments.push({ text: matchedStr });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex) });
  }

  return segments;
}

export function FormattedText({
  text,
  baseStyle,
}: {
  text: string;
  baseStyle?: object;
}) {
  const segments = parseInlineFormatting(text);
  return (
    <Text style={baseStyle}>
      {segments.map((seg, idx) => {
        const style: any = {};
        if (seg.bold) style.fontWeight = '700';
        if (seg.italic) style.fontStyle = 'italic';
        if (seg.code) {
          style.fontFamily = 'monospace';
          style.backgroundColor = '#f3f4f6';
          style.color = '#7b2fbe';
        }
        return (
          <Text key={idx} style={style}>
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
}

export function MarkdownRenderer({ content, style }: MarkdownRendererProps) {
  if (!content) return null;

  const rawBlocks = content.split(/\n\s*\n/);

  return (
    <View style={[styles.container, style]}>
      {rawBlocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split('\n');

        // Heading 1 (# )
        if (trimmed.startsWith('# ')) {
          return (
            <View key={blockIdx} style={styles.h1Container}>
              <FormattedText
                text={trimmed.slice(2)}
                baseStyle={styles.h1Text}
              />
            </View>
          );
        }

        // Heading 2 (## )
        if (trimmed.startsWith('## ')) {
          return (
            <View key={blockIdx} style={styles.h2Container}>
              <FormattedText
                text={trimmed.slice(3)}
                baseStyle={styles.h2Text}
              />
            </View>
          );
        }

        // Heading 3 (### )
        if (trimmed.startsWith('### ')) {
          return (
            <View key={blockIdx} style={styles.h3Container}>
              <FormattedText
                text={trimmed.slice(4)}
                baseStyle={styles.h3Text}
              />
            </View>
          );
        }

        // Blockquote (> )
        if (trimmed.startsWith('> ')) {
          const quoteText = lines.map(l => l.replace(/^>\s?/, '')).join('\n');
          return (
            <View key={blockIdx} style={styles.blockquote}>
              <FormattedText
                text={quoteText}
                baseStyle={styles.blockquoteText}
              />
            </View>
          );
        }

        // Code block (```)
        if (trimmed.startsWith('```')) {
          const codeText = trimmed
            .replace(/^```[a-z]*\n?/, '')
            .replace(/\n?```$/, '');
          return (
            <View key={blockIdx} style={styles.codeBlock}>
              <Text style={styles.codeText}>{codeText}</Text>
            </View>
          );
        }

        // Bullet / List block (- , * , 1. )
        const isList = lines.every(
          l =>
            /^\s*[-*•]\s+/.test(l) ||
            /^\s*\d+\.\s+/.test(l) ||
            l.trim().length === 0
        );

        if (isList) {
          return (
            <View key={blockIdx} style={styles.listContainer}>
              {lines.map((line, lineIdx) => {
                const bulletMatch = line.match(/^\s*([-*•]|\d+\.)\s+(.*)$/);
                if (!bulletMatch) return null;
                const prefix = bulletMatch[1];
                const itemText = bulletMatch[2];
                const isNumbered = /^\d+\.$/.test(prefix);

                return (
                  <View key={lineIdx} style={styles.listItem}>
                    <Text style={styles.bulletPrefix}>
                      {isNumbered ? prefix : '•'}
                    </Text>
                    <View style={styles.listTextContainer}>
                      <FormattedText
                        text={itemText}
                        baseStyle={styles.paragraphText}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        }

        // Standard Paragraph
        return (
          <View key={blockIdx} style={styles.paragraphContainer}>
            {lines.map((line, lineIdx) => (
              <FormattedText
                key={lineIdx}
                text={line}
                baseStyle={styles.paragraphText}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  h1Container: {
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#7b2fbe',
    paddingBottom: 4,
  },
  h1Text: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0d0d0d',
    lineHeight: 28,
  },
  h2Container: {
    marginTop: 10,
    marginBottom: 2,
  },
  h2Text: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6b21a8',
    lineHeight: 24,
  },
  h3Container: {
    marginTop: 6,
  },
  h3Text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 22,
  },
  paragraphContainer: {
    marginBottom: 4,
  },
  paragraphText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#374151',
  },
  listContainer: {
    gap: 6,
    marginVertical: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletPrefix: {
    fontSize: 15,
    fontWeight: '800',
    color: '#7b2fbe',
    lineHeight: 23,
    width: 16,
    textAlign: 'center',
  },
  listTextContainer: {
    flex: 1,
  },
  blockquote: {
    backgroundColor: '#f5f3ff',
    borderLeftWidth: 4,
    borderLeftColor: '#7b2fbe',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  blockquoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#4c1d95',
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 10,
    marginVertical: 6,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#f3f4f6',
    lineHeight: 18,
  },
});
