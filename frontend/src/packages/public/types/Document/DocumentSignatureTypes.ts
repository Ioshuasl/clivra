export type SignatureMethod = 'ACCEPT' | 'WHATSAPP_CODE';

export type DocumentNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string }>;
  content?: DocumentNode[];
};

export type DocumentContent = { type: 'doc'; content: DocumentNode[] };

export type PublicSignatureView = {
  clinicName: string;
  patientFirstName: string;
  method: SignatureMethod;
  document: { title: string; content: DocumentContent };
  expiresAt: string;
};

export type PublicSendCodeResult = {
  sentVia: 'WHATSAPP' | 'EMAIL';
  destinationHint: string;
  expiresAt: string;
};

export type PublicSignResult = { signedAt: string };

export type DocumentSignatureSignInput = { token: string; code?: string };
