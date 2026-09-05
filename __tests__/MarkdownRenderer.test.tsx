import React from 'react';
import { render } from '@testing-library/react-native';
import { MarkdownRenderer, FormattedText } from '../components/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders null when content is empty', () => {
    const { toJSON } = render(<MarkdownRenderer content="" />);
    expect(toJSON()).toBeNull();
  });

  it('renders headings correctly', () => {
    const content = '# H1 Title\n\n## H2 Section\n\n### H3 Subtitle';
    const { getByText } = render(<MarkdownRenderer content={content} />);
    expect(getByText('H1 Title')).toBeTruthy();
    expect(getByText('H2 Section')).toBeTruthy();
    expect(getByText('H3 Subtitle')).toBeTruthy();
  });

  it('renders lists with bullet items', () => {
    const content = '- First item\n- Second item\n* Third item';
    const { getByText } = render(<MarkdownRenderer content={content} />);
    expect(getByText('First item')).toBeTruthy();
    expect(getByText('Second item')).toBeTruthy();
    expect(getByText('Third item')).toBeTruthy();
  });

  it('renders blockquotes', () => {
    const content = '> This is a note quote';
    const { getByText } = render(<MarkdownRenderer content={content} />);
    expect(getByText('This is a note quote')).toBeTruthy();
  });

  it('renders inline bold and code formatting', () => {
    const { getByText } = render(
      <FormattedText text="Hello **world** and `code`" />
    );
    expect(getByText('world')).toBeTruthy();
    expect(getByText('code')).toBeTruthy();
  });
});
