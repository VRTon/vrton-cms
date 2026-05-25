const PROTOCOL_OR_SCHEME_PATTERN = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

function getBaseUrl(): string {
  const baseUrl = String(import.meta.env.BASE_URL || '/');
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

export function withBasePath(value: string): string {
  const input = String(value || '').trim();
  if (!input) {
    return '';
  }

  if (
    input.startsWith('#')
    || input.startsWith('data:')
    || input.startsWith('blob:')
    || PROTOCOL_OR_SCHEME_PATTERN.test(input)
  ) {
    return input;
  }

  if (!input.startsWith('/')) {
    return input;
  }

  const baseUrl = getBaseUrl();
  const normalizedPath = input.replace(/^\/+/, '');
  return `${baseUrl}${normalizedPath}`;
}
