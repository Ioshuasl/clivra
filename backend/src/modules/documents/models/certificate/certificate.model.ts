/** Certificado vencido não assina nada (a data de validade vem do próprio .pfx). */
export function isCertificateExpired(notAfter: Date, now: Date = new Date()): boolean {
  return notAfter.getTime() <= now.getTime();
}
