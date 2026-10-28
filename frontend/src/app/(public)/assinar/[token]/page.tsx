import { DocumentSignatureForm } from '@/packages/public/components/Document/DocumentSignatureForm';

export const metadata = { title: 'Assinar documento' };

type AssinarPageProps = {
  params: Promise<{ token: string }>;
};

export default async function AssinarPage({ params }: AssinarPageProps) {
  const { token } = await params;
  return <DocumentSignatureForm token={token} />;
}
