import { teachers } from '../teachers.js';
import { Buffer } from 'node:buffer';

export const shortText = (value, max) => typeof value === 'string' &&
  value.trim().length > 0 && value.length <= max;
const photoPattern = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function allowedJpeg(bytes) {
  if (bytes.length > 800000 || bytes[0] !== 255 || bytes[1] !== 216 ||
      bytes.at(-2) !== 255 || bytes.at(-1) !== 217) return false;
  let offset = 2;
  while (offset + 4 < bytes.length && bytes[offset++] === 255) {
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || offset + 2 > bytes.length) return false;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return false;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) return false;
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      return height > 0 && height <= 1024 && width > 0 && width <= 1024;
    }
    offset += length;
  }
  return false;
}

export function validate({ mode, teacher, tone, message, history, photos }) {
  if (!['chat', 'image'].includes(mode) || !Number.isInteger(teacher) ||
      teacher < 0 || teacher >= teachers.length || !shortText(message, 1800) ||
      !tone || !['mizah', 'elestiri', 'samimiyet'].every(key =>
        Number.isInteger(tone[key]) && tone[key] >= 0 && tone[key] <= 100) ||
      !Array.isArray(history) || history.length > 6 || history.some(item =>
        !item || !['user', 'assistant'].includes(item.role) || !shortText(item.content, 1800)) ||
      !Array.isArray(photos) || photos.length > 2 || photos.some(photo => {
        if (typeof photo !== 'string' || photo.length > 1100000) return true;
        const match = photo.match(photoPattern);
        if (!match) return true;
        return !allowedJpeg(Buffer.from(match[1], 'base64'));
      })) {
    throw new HttpError(400, 'Mesajı veya fotoğrafları kontrol et.');
  }
  return { mode, teacher, tone, message, photos,
    history: history.map(({ role, content }) => ({ role, content })) };
}

export function teacherInstructions(payload) {
  const [name, style] = teachers[payload.teacher];
  const { mizah, elestiri, samimiyet } = payload.tone;
  return `Sen kişisel seramik hocasısın. Türkçe konuş. ${name}: ${style}
  Mizah %${mizah}, eleştiri %${elestiri}, samimiyet %${samimiyet}. Eleştiriyi çözümle birlikte ver.
  Fotoğraftan doğrulanamayan malzeme ve üretim koşullarını kesinmiş gibi sunma.
  Üretici bilgisi olmadan kesin fırın programı önerme. Bir seferde en fazla bir soru sor.
  Görsel fikir önerebilirsin. Görsel üretimi için kullanıcı ayrı düğmeyi kullanır.`;
}
