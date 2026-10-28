import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import forge from 'node-forge';

export type TestCertificateOptions = {
  commonName: string;
  password: string;
  /** Dias de validade a partir de hoje (negativo gera um certificado já vencido). */
  validDays?: number;
};

/** Gera um .pfx autoassinado (RSA 2048) só para testes locais — não é ICP-Brasil. */
export function createTestP12(options: TestCertificateOptions): Buffer {
  const { privateKey: pem } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const privateKey = forge.pki.privateKeyFromPem(pem);
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
  certificate.serialNumber = `0${Date.now().toString(16)}`;

  const days = options.validDays ?? 365;
  const now = Date.now();
  const expired = days < 0;
  certificate.validity.notBefore = new Date(now - (expired ? Math.abs(days) + 30 : 1) * 86_400_000);
  certificate.validity.notAfter = new Date(now + days * 86_400_000);

  const attributes = [
    { name: 'commonName', value: options.commonName },
    { name: 'organizationName', value: 'Clivra Teste' },
    { shortName: 'C', value: 'BR' },
  ];
  certificate.setSubject(attributes);
  certificate.setIssuer(attributes);
  certificate.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
  ]);
  certificate.sign(privateKey, forge.md.sha256.create());

  const asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [certificate], options.password, {
    algorithm: '3des',
  });
  return Buffer.from(forge.asn1.toDer(asn1).getBytes(), 'binary');
}

// Uso: tsx scripts/make-test-certificate.ts <arquivo.pfx> <senha> [nome comum]
if (process.argv[1]?.endsWith('make-test-certificate.ts')) {
  const [file, password, commonName] = process.argv.slice(2);
  if (!file || !password) {
    console.error('Uso: tsx scripts/make-test-certificate.ts <arquivo.pfx> <senha> [nome comum]');
    process.exit(1);
  }
  writeFileSync(file, createTestP12({ commonName: commonName ?? 'DENTISTA TESTE:12345678909', password }));
  console.log(`Certificado de teste gravado em ${file}`);
}
