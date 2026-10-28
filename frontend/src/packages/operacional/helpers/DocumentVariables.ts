/** Campos automáticos que o texto do modelo aceita (o sistema troca pelo dado real ao emitir). */
export const DOCUMENT_VARIABLES = [
  { key: 'paciente.nome', label: 'Nome do paciente' },
  { key: 'paciente.cpf', label: 'CPF do paciente' },
  { key: 'paciente.data_nascimento', label: 'Nascimento do paciente' },
  { key: 'profissional.nome', label: 'Nome do dentista' },
  { key: 'profissional.cro', label: 'CRO do dentista' },
  { key: 'clinica.nome', label: 'Nome da clínica' },
  { key: 'clinica.cnpj', label: 'CNPJ da clínica' },
  { key: 'data.hoje', label: 'Data de hoje' },
  { key: 'data.hoje_extenso', label: 'Data por extenso' },
] as const;

/** Só fazem sentido no contrato do orçamento aprovado. */
export const QUOTE_DOCUMENT_VARIABLES = [
  { key: 'orcamento.numero', label: 'Nº do orçamento' },
  { key: 'orcamento.total', label: 'Valor total' },
  { key: 'orcamento.entrada', label: 'Valor da entrada' },
  { key: 'orcamento.parcelas', label: 'Parcelas e vencimentos' },
  { key: 'orcamento.itens', label: 'Procedimentos aprovados' },
] as const;
