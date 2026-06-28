const MAX_MESSAGE_LENGTH = 10000;

export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  let s = str
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  return s.slice(0, MAX_MESSAGE_LENGTH);
}

export function validateMessage(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Message is required' };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds ${MAX_MESSAGE_LENGTH} character limit` };
  }
  return { valid: true, error: null };
}
