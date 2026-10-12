import type { AutomationKey } from '../enum/automation/automation.enum.js';
import type { TemplateCategory, TemplateKey } from '../enum/template/template.enum.js';
import type { WhatsappAccountStatus } from '../enum/whatsapp_account/whatsapp_account.enum.js';

export type WhatsappAccountSummary = {
  id: string;
  sessionName: string;
  displayPhone: string | null;
  status: WhatsappAccountStatus;
  killSwitch: boolean;
  lastError: string | null;
  riskAcceptedAt: string | null;
  webhookVerifiedAt: string | null;
  createdAt: string;
};

export type WhatsappAccountQr = {
  qr: string | null;
  status: string;
  displayPhone: string | null;
};

export type MessageTemplateSummary = {
  id: string;
  key: string;
  category: TemplateCategory | string;
  language: string;
  providerName: string;
  body: string;
  variables: string[];
  status: string;
  global: boolean;
};

export type AutomationConfig = {
  sendAtLocalTime?: string;
  offsetHours?: number;
  onlyForStatuses?: string[];
  templateKey?: TemplateKey | string;
};

export type AutomationSummary = {
  id: string;
  key: AutomationKey | string;
  enabled: boolean;
  config: AutomationConfig;
  updatedAt: string;
};

export type MessagingUsage = {
  sent: number;
  failed: number;
};

export type MessageLogItem = {
  id: string;
  direction: string;
  type: string;
  templateKey: string | null;
  status: string;
  result: string | null;
  errorCode: string | null;
  relatedType: string | null;
  relatedId: string | null;
  createdAt: string;
};

export type MessageLogList = {
  items: MessageLogItem[];
  nextCursor: string | null;
};
