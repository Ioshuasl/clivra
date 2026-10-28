import type { PatientSignatureMethod } from '@/packages/operacional/enum/Document/PatientSignatureMethodEnum';

export type DocumentSettingSummary = {
  patientSignatureMethod: PatientSignatureMethod;
  quoteContractTemplateId: string | null;
  quoteContractAuto: boolean;
};

export type DocumentSettingUpdateInput = Partial<DocumentSettingSummary>;

export type SignatureDeliveryChannel = 'WHATSAPP' | 'EMAIL' | 'COPY';

export type SignatureRequestCreateInput = {
  documentId: string;
  channel: SignatureDeliveryChannel;
};

export type SignatureRequestCreateResult = {
  method: PatientSignatureMethod;
  sentVia: SignatureDeliveryChannel;
  expiresAt: string;
  publicUrl?: string;
};
