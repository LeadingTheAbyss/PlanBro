import prisma from '@/lib/prisma';

const DIACRITICS_PATTERN = /\p{Diacritic}/gu;

// it takes a name with special symbols and converts it to a 
// normal name.
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(DIACRITICS_PATTERN, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return slug || 'traveler';
}

// Derives a username from a display name (e.g. a Google account name),
// appending a numeric suffix until it's unique in the DB.
// like kartikey1, kartikey2, ... 
// this is the best idea coz what if as soonas u log in, the name u get
// from oauth is a taken username.
export async function generateUniqueUsername(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}${suffix}`.slice(0, 20);
  }
  return candidate;
}
