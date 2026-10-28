import { DocumentCreateData } from '@/packages/operacional/data/Document/DocumentCreateData';
import type { DocumentIssueInput } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentCreateService(inputSchema: DocumentIssueInput) {
  return DocumentCreateData(inputSchema);
}
