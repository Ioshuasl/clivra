import { createHash } from 'node:crypto';
import forge from 'node-forge';

/** Confere a assinatura PKCS#7 do PDF: o digest bate com o conteúdo e a assinatura bate com o certificado. */
export function verifyPdfSignature(pdf: Buffer): { ok: boolean; signer: string; reason: string } {
  const text = pdf.toString('latin1');
  const byteRange = text.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
  const contents = text.match(/\/Contents\s*<([0-9a-fA-F]+)>/);
  if (!byteRange || !contents?.[1]) return { ok: false, signer: '', reason: 'sem assinatura no PDF' };
  const [a, b, c, d] = byteRange.slice(1).map(Number) as [number, number, number, number];
  const signed = Buffer.concat([pdf.subarray(a, a + b), pdf.subarray(c, c + d)]);

  const der = forge.util.hexToBytes(contents[1].replace(/(00)+$/, ''));
  const p7 = forge.pkcs7.messageFromAsn1(forge.asn1.fromDer(der, { strict: false })) as forge.pkcs7.PkcsSignedData & {
    rawCapture: { authenticatedAttributes: forge.asn1.Asn1[]; signature: string };
  };
  const attributes = p7.rawCapture.authenticatedAttributes;
  const digestAttribute = attributes
    .map((attribute) => attribute.value as forge.asn1.Asn1[])
    .find((parts) => forge.asn1.derToOid(parts[0]?.value as string) === '1.2.840.113549.1.9.4');
  const embeddedDigest = (
    (digestAttribute?.[1]?.value as forge.asn1.Asn1[] | undefined)?.[0]?.value as string | undefined
  );
  const expectedDigest = createHash('sha256').update(signed).digest('binary');
  if (embeddedDigest !== expectedDigest) return { ok: false, signer: '', reason: 'digest diferente' };

  const attributesDer = forge.asn1
    .toDer(forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, attributes))
    .getBytes();
  const md = forge.md.sha256.create();
  md.update(attributesDer);
  const certificate = p7.certificates[0] as forge.pki.Certificate | undefined;
  if (!certificate) return { ok: false, signer: '', reason: 'sem certificado' };
  const valid = (certificate.publicKey as forge.pki.rsa.PublicKey).verify(
    md.digest().bytes(),
    p7.rawCapture.signature,
  );
  const reason = text.match(/\/Reason\s*\(([^)]*)\)/)?.[1] ?? '';
  return { ok: valid, signer: certificate.subject.getField('CN')?.value as string, reason };
}
