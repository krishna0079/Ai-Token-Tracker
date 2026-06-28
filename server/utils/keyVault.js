import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

const getSecret = () => {
  const s = process.env.ENCRYPTION_SECRET;
  if (!s || s.length !== 32) throw new Error('ENCRYPTION_SECRET must be exactly 32 characters');
  return s;
};

export function encryptKey(plainKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(plainKey, 'utf8'), cipher.final()]);
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptKey(record) {
  const decipher = crypto.createDecipheriv(ALGO, getSecret(), Buffer.from(record.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(record.tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(record.encrypted, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

export function maskKey(plainKey) {
  if (!plainKey || plainKey.length < 8) return '••••••••';
  return plainKey.slice(0, 6) + '••••••••' + plainKey.slice(-4);
}
