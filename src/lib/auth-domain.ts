// Sign-in can OPTIONALLY be restricted via the NEXT_PUBLIC_SIGNIN_ALLOWLIST env
// var (comma-separated). Each entry is either:
//
//   - an email DOMAIN   — "@coinbase.com" or "coinbase.com" (leading "@" optional)
//   - a full ADDRESS    — "ash@coinbase.com"
//
// so a self-hoster on a shared provider (gmail.com, outlook.com) can allow just
// themselves, which a domain-only allowlist cannot express.
//
// - Set    → only matching emails may sign in (this is how masterkey.sh keeps
//            itself to its intended audience).
// - Unset/blank → ANY email may sign in. This is the default, so anyone who
//            forks/self-hosts this repo is NOT blocked by anything.
//
// The allowlist is NOT a secret (it is shown in the sign-in dialog), so it is a
// NEXT_PUBLIC_ var readable by both the client (for UX) and the server. The
// AUTHORITATIVE enforcement is server-side in /api/auth/check, where the email is
// derived from the validated CDP access token (never from client input) — so it
// cannot be spoofed by editing the request in devtools. The sign-in dialog only
// mirrors this check for UX. Shared here so the two never drift.

/** Raw allowlist entries, lowercased and trimmed. Empty array ⇒ no restriction. */
function entries(): string[] {
  return (process.env.NEXT_PUBLIC_SIGNIN_ALLOWLIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The configured allowed email domains, with any leading "@" stripped. An entry
 * is a domain when it has no "@" other than an optional leading one.
 */
export function allowedEmailDomains(): string[] {
  return entries()
    .filter((e) => !e.slice(1).includes("@"))
    .map((e) => e.replace(/^@/, ""))
    .filter(Boolean);
}

/** The configured allowed full email addresses ("user@host" entries). */
export function allowedSignInEmails(): string[] {
  return entries().filter((e) => e.slice(1).includes("@"));
}

/** Human-readable allowlist for UI copy: addresses as-is, domains as "@domain". */
export function allowedSignInLabels(): string[] {
  return [...allowedSignInEmails(), ...allowedEmailDomains().map((d) => `@${d}`)];
}

/** True when an allowlist is configured (sign-in is restricted). */
export function isSignInRestricted(): boolean {
  return entries().length > 0;
}

/**
 * True if `email` may sign in.
 *
 * When no allowlist is configured, EVERY email is allowed. Otherwise the address
 * must either match an allowlisted address exactly, or its domain must EXACTLY
 * match an allowlisted domain — we split on the LAST "@", so subdomains
 * (`x@corp.coinbase.com`) and look-alikes (`x@coinbase.com.evil.com`) are rejected.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  const domains = allowedEmailDomains();
  const emails = allowedSignInEmails();
  if (domains.length === 0 && emails.length === 0) return true; // no restriction
  if (!email) return false;
  const addr = email.trim().toLowerCase();
  if (emails.includes(addr)) return true;
  const at = addr.lastIndexOf("@");
  if (at === -1) return false;
  return domains.includes(addr.slice(at + 1));
}
