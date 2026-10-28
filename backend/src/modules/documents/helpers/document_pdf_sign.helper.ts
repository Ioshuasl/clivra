import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import { P12Signer } from '@signpdf/signer-p12';
import { SignPdf } from '@signpdf/signpdf';

// Espaço reservado para a assinatura CMS (certificados com cadeia longa precisam de mais que o padrão).
const SIGNATURE_LENGTH = 16_384;

export type PdfSignMeta = {
  signerName: string;
  reason: string;
  signingTime: Date;
};

/** Assina o PDF com o certificado A1 (assinatura PKCS#7 destacada, padrão adbe.pkcs7.detached). */
export async function signPdfWithP12(
  pdf: Buffer,
  p12: Buffer,
  password: string,
  meta: PdfSignMeta,
): Promise<Buffer> {
  const withPlaceholder = plainAddPlaceholder({
    pdfBuffer: pdf,
    reason: meta.reason,
    contactInfo: 'Clivra',
    name: meta.signerName,
    location: 'Brasil',
    signingTime: meta.signingTime,
    signatureLength: SIGNATURE_LENGTH,
  });
  return new SignPdf().sign(withPlaceholder, new P12Signer(p12, { passphrase: password }), meta.signingTime);
}
