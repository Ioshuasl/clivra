import { z } from 'zod';
import { maskCpf, maskPhone } from '@/packages/clinico/helpers/PatientMask';
import type {
  AttendancePatient,
  AttendancePatientUpdateInput,
} from '@/packages/clinico/types/Patient/PatientTypes';

const optionalText = (max: number) => z.string().max(max).optional();

export const PatientEditSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo').max(200),
  socialName: optionalText(200),
  cpf: optionalText(14),
  birthDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'), z.literal('')]).optional(),
  sex: optionalText(40),
  phonePrimary: z.string().trim().min(8, 'Telefone obrigatório').max(30),
  phoneSecondary: optionalText(30),
  email: z
    .union([z.string().email('Esse e-mail parece incompleto. Ex.: nome@clinica.com'), z.literal('')])
    .optional(),
  street: optionalText(200),
  number: optionalText(20),
  complement: optionalText(100),
  district: optionalText(100),
  city: optionalText(100),
  state: z.union([z.string().length(2, 'Use a sigla, ex.: SP'), z.literal('')]).optional(),
  postalCode: optionalText(20),
});

export type PatientEditFormValues = z.infer<typeof PatientEditSchema>;

export function patientToEditValues(patient: AttendancePatient): PatientEditFormValues {
  return {
    name: patient.name,
    socialName: patient.socialName ?? '',
    cpf: maskCpf(patient.cpf),
    birthDate: patient.birthDate ? patient.birthDate.slice(0, 10) : '',
    sex: patient.sex ?? '',
    phonePrimary: maskPhone(patient.phonePrimary),
    phoneSecondary: maskPhone(patient.phoneSecondary),
    email: patient.email ?? '',
    street: patient.address?.street ?? '',
    number: patient.address?.number ?? '',
    complement: patient.address?.complement ?? '',
    district: patient.address?.district ?? '',
    city: patient.address?.city ?? '',
    state: patient.address?.state ?? '',
    postalCode: patient.address?.postalCode ?? '',
  };
}

const orNull = (value: string | undefined) => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
};

export function toPatientUpdateInput(values: PatientEditFormValues): AttendancePatientUpdateInput {
  const address = {
    street: orNull(values.street),
    number: orNull(values.number),
    complement: orNull(values.complement),
    district: orNull(values.district),
    city: orNull(values.city),
    state: orNull(values.state)?.toUpperCase() ?? null,
    postalCode: orNull(values.postalCode),
  };
  const filled = Object.entries(address).filter(([, item]) => item !== null);
  return {
    name: values.name.trim(),
    socialName: orNull(values.socialName),
    cpf: orNull(values.cpf),
    birthDate: orNull(values.birthDate),
    sex: orNull(values.sex),
    phonePrimary: values.phonePrimary.trim(),
    phoneSecondary: orNull(values.phoneSecondary),
    email: orNull(values.email),
    address: filled.length > 0 ? Object.fromEntries(filled) : null,
  };
}
