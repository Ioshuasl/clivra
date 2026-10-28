export const PATIENT_SIGNATURE_METHODS = ['ACCEPT', 'WHATSAPP_CODE'] as const;

export type PatientSignatureMethod = (typeof PATIENT_SIGNATURE_METHODS)[number];

export const PATIENT_SIGNATURE_METHOD_LABELS: Record<PatientSignatureMethod, string> = {
  ACCEPT: 'Aceite simples',
  WHATSAPP_CODE: 'Código de confirmação',
};

export const PATIENT_SIGNATURE_METHOD_HINTS: Record<PatientSignatureMethod, string> = {
  ACCEPT:
    'O paciente abre o link no celular, lê o documento e confirma com um toque. É rápido e não tem custo.',
  WHATSAPP_CODE:
    'Além do aceite, o paciente digita um código de 6 números enviado ao WhatsApp dele (ou ao e-mail, se o WhatsApp da clínica não estiver conectado). É mais seguro.',
};
