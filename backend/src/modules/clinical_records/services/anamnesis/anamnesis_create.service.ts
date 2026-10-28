import type { RequestContext } from '../../../../shared/domain/request_context.js';
import { SubmitAction } from '../../actions/anamnesis/anamnesis_submit.action.js';
import {
  AnamnesisAnswersInvalidError,
  AnamnesisFormNotFoundError,
  MedicalRecordNotFoundError,
  PatientNotFoundForRecordError,
} from '../../models/errors/clinical_records.errors.js';
import { validateAnswers, visibleQuestions } from '../../models/anamnesis/anamnesis_answers.model.js';
import { ResolveRepository } from '../../repositories/anamnesis_form/anamnesis_form_resolve.repository.js';
import { GetIdRepository } from '../../repositories/medical_record/medical_record_get_id.repository.js';
import { GetRepository as GetPatientSnapshotRepository } from '../../repositories/patient_snapshot/patient_snapshot_get.repository.js';
import type { AnamnesisAnswersSchema } from '../../schemas/anamnesis.schema.js';
import type { AnamnesisCreateResult } from '../../types/anamnesis/anamnesis_create.types.js';

export class CreateService {
  constructor(
    private readonly getRecordId = new GetIdRepository(),
    private readonly getPatient = new GetPatientSnapshotRepository(),
    private readonly resolveForm = new ResolveRepository(),
    private readonly submit = new SubmitAction(),
  ) {}

  async execute(
    ctx: RequestContext,
    patientId: string,
    anamnesisSchema: AnamnesisAnswersSchema,
    signatureExtra?: Record<string, unknown>,
  ): Promise<AnamnesisCreateResult> {
    const recordId = await this.getRecordId.execute(ctx, patientId);
    if (!recordId) throw new MedicalRecordNotFoundError();

    const patient = await this.getPatient.execute(ctx, patientId);
    if (!patient) throw new PatientNotFoundForRecordError();

    const form = await this.resolveForm.execute(ctx, anamnesisSchema.professionalId);
    if (!form) throw new AnamnesisFormNotFoundError();

    const questions = visibleQuestions(form.questions, patient.sex);
    const issues = validateAnswers(questions, anamnesisSchema.answers);
    if (issues.length > 0) throw new AnamnesisAnswersInvalidError(issues);

    return this.submit.execute(ctx, {
      patientId,
      formId: form.id,
      formVersion: form.version,
      questions,
      answers: anamnesisSchema.answers,
      answeredBy: 'PROFESSIONAL',
      signatureExtra: { userId: ctx.userId, ...signatureExtra },
    });
  }
}
