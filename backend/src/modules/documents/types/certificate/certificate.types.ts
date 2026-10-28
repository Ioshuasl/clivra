export type CertificateSummary = {
  subjectName: string;
  issuerName: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  expired: boolean;
  uploadedAt: string;
};

/** Certificado do usuário logado; `professionalId` nulo = usuário sem cadastro de profissional. */
export type CertificateMe = {
  professionalId: string | null;
  certificate: CertificateSummary | null;
};

/** Metadados lidos do .pfx (sem a chave privada). */
export type CertificateInfo = {
  subjectName: string;
  issuerName: string;
  serialNumber: string;
  fingerprintSha256: string;
  notBefore: Date;
  notAfter: Date;
};

/** Leitura interna: o .pfx já descriptografado (nunca sai pela API). */
export type CertificateRecord = CertificateInfo & { id: string; pfx: Buffer };
