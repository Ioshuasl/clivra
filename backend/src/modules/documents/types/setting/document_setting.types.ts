import type { PatientSignatureMethod } from '../../enum/signature/patient_signature_method.enum.js';

export type DocumentSettingSummary = {
  patientSignatureMethod: PatientSignatureMethod;
  /** Modelo de contrato usado nos orçamentos aprovados (nulo = a clínica não escolheu). */
  quoteContractTemplateId: string | null;
  /** Gera o contrato sozinho quando o orçamento é aprovado. */
  quoteContractAuto: boolean;
};

export type DocumentSettingPatch = Partial<DocumentSettingSummary>;
