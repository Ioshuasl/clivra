import forge from 'node-forge';
import type { CertificateInfo } from '../types/certificate/certificate.types.js';

export type P12ReadFailure = 'WRONG_PASSWORD' | 'INVALID_FILE';

export class P12ReadError extends Error {
  constructor(public readonly reason: P12ReadFailure) {
    super(`p12:${reason}`);
    this.name = 'P12ReadError';
  }
}

function commonName(attributes: forge.pki.CertificateField[]): string | null {
  const field = attributes.find((attribute) => attribute.shortName === 'CN');
  return typeof field?.value === 'string' ? field.value : null;
}

function fullName(attributes: forge.pki.CertificateField[]): string {
  return attributes
    .map((attribute) => `${attribute.shortName ?? attribute.name}=${String(attribute.value)}`)
    .join(', ');
}

/** Lê o .pfx com a senha e devolve só os metadados do certificado (nada da chave privada). */
export function readP12(pfx: Buffer, password: string): CertificateInfo {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary')));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    // forge usa estas mensagens quando o MAC/decifragem falha por senha errada.
    if (/Invalid password|PKCS#12 MAC could not be verified/i.test(message)) {
      throw new P12ReadError('WRONG_PASSWORD');
    }
    throw new P12ReadError('INVALID_FILE');
  }

  const bagsOf = (bagType: string): forge.pkcs12.Bag[] => p12.getBags({ bagType })[bagType] ?? [];
  const keyBags = [
    ...bagsOf(forge.pki.oids['pkcs8ShroudedKeyBag'] as string),
    ...bagsOf(forge.pki.oids['keyBag'] as string),
  ];
  const certBags = bagsOf(forge.pki.oids['certBag'] as string);
  const privateKey = keyBags[0]?.key;
  if (!privateKey || certBags.length === 0) throw new P12ReadError('INVALID_FILE');

  // O certificado do titular é o que combina com a chave privada (o resto é cadeia).
  const certificate =
    certBags
      .map((bag) => bag.cert)
      .find((candidate) => {
        const publicKey = candidate?.publicKey as forge.pki.rsa.PublicKey | undefined;
        return publicKey?.n !== undefined && publicKey.n.compareTo(privateKey.n) === 0;
      }) ?? certBags[0]?.cert;
  if (!certificate) throw new P12ReadError('INVALID_FILE');

  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
  return {
    subjectName: commonName(certificate.subject.attributes) ?? fullName(certificate.subject.attributes),
    issuerName: commonName(certificate.issuer.attributes) ?? fullName(certificate.issuer.attributes),
    serialNumber: certificate.serialNumber,
    fingerprintSha256: forge.md.sha256.create().update(der).digest().toHex(),
    notBefore: certificate.validity.notBefore,
    notAfter: certificate.validity.notAfter,
  };
}
