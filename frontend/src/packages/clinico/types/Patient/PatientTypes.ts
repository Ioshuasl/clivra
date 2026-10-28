export type AttendancePatientAddress = {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

export type AttendancePatient = {
  id: string;
  name: string;
  socialName: string | null;
  birthDate: string | null;
  cpf?: string | null;
  sex?: string | null;
  phonePrimary?: string;
  phoneSecondary?: string | null;
  email?: string | null;
  address?: AttendancePatientAddress | null;
};

export type AttendancePatientUpdateInput = {
  name: string;
  socialName: string | null;
  cpf: string | null;
  birthDate: string | null;
  sex: string | null;
  phonePrimary: string;
  phoneSecondary: string | null;
  email: string | null;
  address: AttendancePatientAddress | null;
};
