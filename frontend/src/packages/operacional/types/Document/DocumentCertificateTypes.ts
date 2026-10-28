export type CertificateSummary = {
  subjectName: string;
  issuerName: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  expired: boolean;
  uploadedAt: string;
};

/** `professionalId` nulo = o usuário não está cadastrado como profissional (não usa certificado). */
export type CertificateMe = {
  professionalId: string | null;
  certificate: CertificateSummary | null;
};

export type CertificateUploadInput = { pfxBase64: string; password: string };

export type DocumentSignInput = { documentId: string; password: string };
