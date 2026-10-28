import { DocumentCancelData } from '@/packages/operacional/data/Document/DocumentCancelData';
import type { DocumentCancelInput } from '@/packages/operacional/types/Document/DocumentTypes';

export async function DocumentCancelService(inputSchema: DocumentCancelInput) {
  return DocumentCancelData(inputSchema);
}
