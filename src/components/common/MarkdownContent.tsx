import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

function splitMarkdownIntoCards(markdown: string): string[] {
  const source = String(markdown || '').replace(/\r\n/g, '\n');
  if (!source.trim()) {
    return [];
  }

  const chunks: string[] = [];
  let buffer: string[] = [];
  const lines = source.split('\n');

  const flush = () => {
    const chunk = buffer.join('\n').trim();
    if (chunk) {
      chunks.push(chunk);
    }
    buffer = [];
  };

  for (const line of lines) {
    if (/^\s{0,3}(?:[-*_]\s*){3,}$/.test(line)) {
      flush();
      continue;
    }
    buffer.push(line);
  }

  flush();
  return chunks;
}

interface MarkdownContentProps {
  markdown: string
  splitByDivider?: boolean
  sectionClassName?: string
}

function MarkdownContent({ markdown, splitByDivider = false, sectionClassName = '' }: MarkdownContentProps) {
  if (!splitByDivider) {
    const html = marked.parse(markdown || '') as string;
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  const sections = splitMarkdownIntoCards(markdown);
  if (sections.length <= 1) {
    const html = marked.parse(markdown || '') as string;
    if (sectionClassName) {
      return (
        <section className={sectionClassName}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </section>
      );
    }
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }

  return (
    <>
      {sections.map((sectionMarkdown, index) => {
        const html = marked.parse(sectionMarkdown) as string;
        return (
          <section key={`markdown-card-${index}`} className={sectionClassName}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </section>
        );
      })}
    </>
  );
}

export default MarkdownContent;