/**
 * Retrieves the list of admin emails from environment variables.
 * Can be safely used in both Server Components/API Routes and Client Components.
 */
export const getAdminEmails = (): string[] => {
  const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  return envEmails
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
};

export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const adminEmails = getAdminEmails().map(e => e.toLowerCase());
  return adminEmails.includes(email.toLowerCase());
};
