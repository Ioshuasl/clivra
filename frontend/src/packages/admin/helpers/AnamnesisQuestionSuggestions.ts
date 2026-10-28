import type { AnamnesisFormQuestionFormValues } from '@/packages/admin/schemas/AnamnesisForm/AnamnesisFormSchema';

/** Perguntas prontas de anamnese: um clique adiciona já com o aviso certo para a equipe. */
export const ANAMNESIS_SUGGESTIONS: ReadonlyArray<{
  chip: string;
  question: Partial<AnamnesisFormQuestionFormValues>;
}> = [
  {
    chip: 'Alergia a medicamento',
    question: {
      label: 'Tem alergia a algum medicamento?',
      type: 'BOOLEAN_WITH_TEXT',
      alertMode: 'equals',
      alertValue: 'true',
      alertSeverity: 'CRITICAL',
      alertCategory: 'ALLERGY',
    },
  },
  {
    chip: 'Reação a anestesia',
    question: {
      label: 'Já teve reação a anestesia?',
      type: 'BOOLEAN_WITH_TEXT',
      alertMode: 'equals',
      alertValue: 'true',
      alertSeverity: 'CRITICAL',
      alertCategory: 'ALLERGY',
    },
  },
  {
    chip: 'Diabetes',
    question: {
      label: 'Tem diabetes?',
      type: 'SINGLE_CHOICE',
      options: ['Não', 'Tipo 1', 'Tipo 2', 'Gestacional'],
      alertMode: 'notEquals',
      alertValue: 'Não',
      alertSeverity: 'WARNING',
      alertCategory: 'CONDITION',
    },
  },
  {
    chip: 'Pressão alta',
    question: {
      label: 'Tem pressão alta?',
      type: 'BOOLEAN_WITH_TEXT',
      alertMode: 'equals',
      alertValue: 'true',
      alertSeverity: 'WARNING',
      alertCategory: 'CONDITION',
    },
  },
  {
    chip: 'Problema no coração',
    question: {
      label: 'Tem algum problema no coração?',
      type: 'BOOLEAN_WITH_TEXT',
      alertMode: 'equals',
      alertValue: 'true',
      alertSeverity: 'CRITICAL',
      alertCategory: 'CONDITION',
    },
  },
  {
    chip: 'Anticoagulante',
    question: {
      label: 'Usa remédio para afinar o sangue (anticoagulante)?',
      type: 'BOOLEAN_WITH_TEXT',
      alertMode: 'equals',
      alertValue: 'true',
      alertSeverity: 'CRITICAL',
      alertCategory: 'MEDICATION',
    },
  },
  {
    chip: 'Gestante',
    question: {
      label: 'Está grávida?',
      type: 'BOOLEAN',
      alertMode: 'equals',
      alertValue: 'true',
      alertSeverity: 'CRITICAL',
      alertCategory: 'CONDITION',
    },
  },
  {
    chip: 'Fumante',
    question: {
      label: 'Fuma?',
      type: 'SINGLE_CHOICE',
      options: ['Não', 'Sim', 'Ex-fumante'],
    },
  },
  {
    chip: 'Medicamentos em uso',
    question: { label: 'Quais medicamentos usa atualmente?', type: 'TEXT' },
  },
  {
    chip: 'Motivo da consulta',
    question: { label: 'Qual o motivo da consulta?', type: 'TEXT', required: true },
  },
];
