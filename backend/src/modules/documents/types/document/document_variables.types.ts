import type { DocumentVariables } from '../../models/document/document_render.model.js';

export type DocumentVariablesBuilt = {
  variables: DocumentVariables;
  /** Fuso da clínica (datas impressas no documento). */
  timezone: string;
  patient: { id: string; name: string };
  professional: { id: string; name: string; cro: string | null };
  letterhead: {
    clinicName: string;
    legalName: string | null;
    taxId: string | null;
    phone: string | null;
    addressLine: string | null;
  };
};
