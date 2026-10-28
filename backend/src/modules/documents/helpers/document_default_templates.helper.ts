import type { DocumentKind } from '../enum/document/document_kind.enum.js';
import type { SignaturePolicy } from '../enum/document/signature_policy.enum.js';
import type { TiptapDoc, TiptapNode } from '../types/document/tiptap.types.js';

export type DefaultDocumentTemplate = {
  systemKey: string;
  kind: DocumentKind;
  name: string;
  professionalSignature: SignaturePolicy;
  patientSignature: SignaturePolicy;
  content: TiptapDoc;
};

function text(value: string, bold = false): TiptapNode {
  return bold ? { type: 'text', text: value, marks: [{ type: 'bold' }] } : { type: 'text', text: value };
}

function p(value: string, align: 'left' | 'center' | 'right' | 'justify' = 'left'): TiptapNode {
  return { type: 'paragraph', attrs: { textAlign: align }, content: [text(value)] };
}

function blank(): TiptapNode {
  return { type: 'paragraph', attrs: { textAlign: 'left' } };
}

function title(value: string): TiptapNode {
  return { type: 'heading', attrs: { level: 1, textAlign: 'center' }, content: [text(value, true)] };
}

function clause(heading: string, body: string): TiptapNode {
  return {
    type: 'paragraph',
    attrs: { textAlign: 'justify' },
    content: [text(`${heading} `, true), text(body)],
  };
}

function doc(...content: TiptapNode[]): TiptapDoc {
  return { type: 'doc', content };
}

/**
 * Modelos iniciais da clínica. Texto-base genérico: a clínica deve revisar com seu
 * responsável técnico/advogado antes de usar (frontend sinaliza modelos de sistema).
 */
export const DEFAULT_DOCUMENT_TEMPLATES: readonly DefaultDocumentTemplate[] = [
  {
    systemKey: 'prescription_simple',
    kind: 'PRESCRIPTION',
    name: 'Receita simples',
    professionalSignature: 'OPTIONAL',
    patientSignature: 'NONE',
    content: doc(
      title('RECEITUÁRIO'),
      p('Paciente: {{paciente.nome}}'),
      blank(),
      { type: 'paragraph', attrs: { textAlign: 'left' }, content: [text('Prescrição:', true)] },
      blank(),
      blank(),
      blank(),
      blank(),
      p('{{data.hoje_extenso}}', 'right'),
    ),
  },
  {
    systemKey: 'certificate_attendance',
    kind: 'CERTIFICATE',
    name: 'Atestado de comparecimento',
    professionalSignature: 'OPTIONAL',
    patientSignature: 'NONE',
    content: doc(
      title('ATESTADO'),
      blank(),
      p(
        'Atesto, para os devidos fins, que {{paciente.nome}}, CPF {{paciente.cpf}}, compareceu a esta clínica em {{data.hoje}} para atendimento odontológico, no período das ____ às ____.',
        'justify',
      ),
      blank(),
      p('{{data.hoje_extenso}}', 'right'),
    ),
  },
  {
    systemKey: 'consent_general',
    kind: 'CONSENT_TERM',
    name: 'Termo de consentimento (TCLE)',
    professionalSignature: 'OPTIONAL',
    patientSignature: 'OPTIONAL',
    content: doc(
      title('TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO'),
      blank(),
      p(
        'Eu, {{paciente.nome}}, CPF {{paciente.cpf}}, declaro que fui informado(a) pelo(a) cirurgião(ã)-dentista {{profissional.nome}}, CRO {{profissional.cro}}, sobre o diagnóstico, o plano de tratamento proposto, suas alternativas, benefícios, riscos e a necessidade de colaboração durante e após o tratamento.',
        'justify',
      ),
      blank(),
      p(
        'Tive a oportunidade de esclarecer minhas dúvidas e compreendo que os resultados dependem também da resposta individual do meu organismo e do cumprimento das orientações recebidas. Autorizo a realização dos procedimentos descritos no plano de tratamento.',
        'justify',
      ),
      blank(),
      p('{{data.hoje_extenso}}', 'right'),
    ),
  },
  {
    systemKey: 'contract_services',
    kind: 'CONTRACT',
    name: 'Contrato de prestação de serviços odontológicos',
    professionalSignature: 'OPTIONAL',
    patientSignature: 'OPTIONAL',
    content: doc(
      title('CONTRATO DE PRESTAÇÃO DE SERVIÇOS ODONTOLÓGICOS'),
      blank(),
      p(
        'Pelo presente instrumento, de um lado {{clinica.nome}}, CNPJ {{clinica.cnpj}}, neste ato representada pelo(a) cirurgião(ã)-dentista {{profissional.nome}}, CRO {{profissional.cro}} (CONTRATADA), e de outro {{paciente.nome}}, CPF {{paciente.cpf}} (CONTRATANTE), firmam o presente contrato.',
        'justify',
      ),
      clause('Cláusula 1ª — Do objeto.', 'A CONTRATADA prestará serviços odontológicos conforme o plano de tratamento e o orçamento aprovados pelo CONTRATANTE, que integram este contrato.'),
      clause('Cláusula 2ª — Do pagamento.', 'O CONTRATANTE pagará o valor total de {{orcamento.total}} pelos procedimentos aprovados no orçamento nº {{orcamento.numero}} ({{orcamento.itens}}), conforme as condições: entrada de {{orcamento.entrada}}; parcelamento em {{orcamento.parcelas}}.'),
      clause('Cláusula 3ª — Das obrigações do CONTRATANTE.', 'Comparecer às consultas agendadas, informar corretamente seu histórico de saúde e seguir as orientações recebidas.'),
      clause('Cláusula 4ª — Das faltas e remarcações.', 'Faltas ou remarcações devem ser comunicadas com antecedência mínima combinada com a clínica.'),
      clause('Cláusula 5ª — Do foro.', 'As partes elegem o foro da comarca da CONTRATADA para dirimir eventuais controvérsias.'),
      blank(),
      p('{{data.hoje_extenso}}', 'right'),
    ),
  },
  {
    systemKey: 'image_use_term',
    kind: 'CONSENT_TERM',
    name: 'Termo de uso de imagem',
    professionalSignature: 'NONE',
    patientSignature: 'OPTIONAL',
    content: doc(
      title('TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM'),
      blank(),
      p(
        'Eu, {{paciente.nome}}, CPF {{paciente.cpf}}, autorizo {{clinica.nome}} a utilizar fotografias, radiografias e vídeos do meu tratamento para fins de registro clínico, documentação, ensino e comunicação científica, respeitando o sigilo profissional e as normas do Conselho Federal de Odontologia.',
        'justify',
      ),
      blank(),
      p('{{data.hoje_extenso}}', 'right'),
    ),
  },
];
