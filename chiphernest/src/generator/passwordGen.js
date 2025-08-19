export function generatePassword({
  pwdLength = 16,
  useLower = true,
  useUpper = true,
  useDigits = true,
  useSymbols = true,
  avoidAmbiguous = true,
  requireEachSet = true,
} = {}) {
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_-+=[]{};:,.<>?';

  let pool = '';
  if (useLower) pool += lowers;
  if (useUpper) pool += uppers;
  if (useDigits) pool += digits;
  if (useSymbols) pool += symbols;

  if (avoidAmbiguous) {
    pool = pool.replace(/[Il1O0]/g, '');
  }

  if (!pool) return '';

  const chars = [];

  if (requireEachSet) {
    if (useLower) chars.push(lowers[Math.floor(Math.random() * lowers.length)]);
    if (useUpper) chars.push(uppers[Math.floor(Math.random() * uppers.length)]);
    if (useDigits) chars.push(digits[Math.floor(Math.random() * digits.length)]);
    if (useSymbols) chars.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  while (chars.length < pwdLength) {
    chars.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export function poolSizeFromOptions(opts) {
  let size = 0;
  if (opts.useLower) size += 26;
  if (opts.useUpper) size += 26;
  if (opts.useDigits) size += 10;
  if (opts.useSymbols) size += 30;
  if (opts.avoidAmbiguous) {
    // Fjerner ca. 5 tegn
    size -= 5;
  }
  return Math.max(size, 1);
}

export function entropyBits({ length, poolSize }) {
  return Math.round(length * Math.log2(poolSize));
}
