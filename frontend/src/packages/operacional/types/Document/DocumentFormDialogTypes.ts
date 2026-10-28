import type {
  DocumentDetail,
  DocumentSummary,
  DocumentTemplateSummary,
  TiptapDoc,
} from '@/packages/operacional/types/Document/DocumentTypes';

export type DocumentTemplateFormDialogProps = {
  /** Modelo em edição; sem valor = novo modelo. */
  template?: DocumentTemplateSummary;
  onClose: () => void;
};

export type DocumentIssueFormDialogProps = {
  patientId: string;
  /** Documento a corrigir; sem valor = emitir um novo. */
  amendDocumentId?: string;
  onClose: () => void;
  onIssued: (document: DocumentSummary) => void;
};

export type DocumentCancelFormDialogProps = {
  patientId: string;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
};

export type DocumentCertificateFormDialogProps = {
  /** Já existe um certificado e este envio o substitui. */
  replacing: boolean;
  onClose: () => void;
};

export type DocumentSignFormDialogProps = {
  patientId: string;
  documentId: string;
  documentTitle: string;
  onClose: () => void;
  onSigned: (document: DocumentDetail) => void;
};

export type DocumentSignatureRequestFormDialogProps = {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
};

export type DocumentRichEditorProps = {
  initialValue: TiptapDoc;
  onChange: (value: TiptapDoc) => void;
  /** Mostra os botões de campos automáticos (nome do paciente, CPF…). */
  showVariables?: boolean;
  /** Inclui os dados do orçamento (valor, parcelas…); só para modelos de contrato. */
  showQuoteVariables?: boolean;
  ariaLabel: string;
};

export type DocumentPanelProps = { patientId: string };
