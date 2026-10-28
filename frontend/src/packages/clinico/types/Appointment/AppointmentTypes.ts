export type AppointmentStatusInput = {
  status: string;
  reason?: string | null;
};

export type AttendanceAppointment = {
  id: string;
  patientId: string;
  professionalId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  patient?: { id: string; name: string; phonePrimary: string };
  professional?: { id: string; name: string };
  procedure?: { id: string; name: string; defaultMinutes: number } | null;
};
