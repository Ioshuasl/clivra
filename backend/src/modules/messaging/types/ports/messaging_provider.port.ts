export type ReplyButton = {
  text: string;
};

export type SendTemplateInput = {
  sessionName: string;
  to: string;
  body: string;
  buttons?: ReplyButton[];
  marketing: boolean;
};

export type SendTextInput = {
  sessionName: string;
  to: string;
  body: string;
};

export type SendMediaInput = {
  sessionName: string;
  to: string;
  kind: 'IMAGE' | 'DOCUMENT';
  fileUrl: string;
  mimeType: string;
  fileName: string;
  caption?: string | null;
};

export type SendResult = {
  providerMessageId: string;
};

export type MessagingProvider = {
  sendTemplate(input: SendTemplateInput): Promise<SendResult>;
  sendText(input: SendTextInput): Promise<SendResult>;
  sendMedia(input: SendMediaInput): Promise<SendResult>;
};

export type WahaSessionPort = {
  ensureSession(sessionName: string): Promise<void>;
  getQr(sessionName: string): Promise<{ qr: string | null; status: string; displayPhone: string | null }>;
  logout(sessionName: string): Promise<void>;
};
