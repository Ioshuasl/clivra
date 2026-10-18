import type { JobPayload } from './job_payload.js';
import { jobPayloadSchema } from './job_payload.js';
import type { EnqueueOptions, JobHandler, JobQueue } from './job_queue.port.js';
import { RedisUnavailableError } from './job_queue.port.js';
import type { JobName, QueueName } from './queue_names.js';
import { JOB_RETRY } from './queue_names.js';

type PendingJob = {
  queue: QueueName;
  jobName: JobName;
  payload: JobPayload;
  options?: EnqueueOptions;
};

export type ProcessedJob = {
  queue: QueueName;
  jobName: JobName;
  payload: JobPayload;
};

/** Fila in-process para smoke/CI. Não usa Redis. */
export class InMemoryJobQueue implements JobQueue {
  private readonly handlers = new Map<string, JobHandler>();
  private readonly pending: PendingJob[] = [];
  readonly processed: ProcessedJob[] = [];
  readonly dlq: Array<ProcessedJob & { error: string }> = [];
  private unavailable = false;

  /** Simula Redis fora do ar (dispatcher deve deixar outbox pendente). */
  setUnavailable(value: boolean): void {
    this.unavailable = value;
  }

  register(queue: QueueName, jobName: JobName, handler: JobHandler): void {
    this.handlers.set(handlerKey(queue, jobName), handler);
  }

  async add(
    queue: QueueName,
    jobName: JobName,
    payload: JobPayload,
    options?: EnqueueOptions,
  ): Promise<void> {
    if (this.unavailable) throw new RedisUnavailableError();
    jobPayloadSchema.parse(payload);
    if (options?.jobId) {
      const existing = this.pending.findIndex(
        (job) => job.queue === queue && job.options?.jobId === options.jobId,
      );
      if (existing >= 0) this.pending.splice(existing, 1);
    }
    this.pending.push({ queue, jobName, payload, options });
  }

  async remove(queue: QueueName, jobId: string): Promise<void> {
    for (let i = this.pending.length - 1; i >= 0; i -= 1) {
      const job = this.pending[i];
      if (job?.queue === queue && job.options?.jobId === jobId) {
        this.pending.splice(i, 1);
      }
    }
  }

  async drain(): Promise<void> {
    const due: PendingJob[] = [];
    const delayed: PendingJob[] = [];
    for (const job of this.pending) {
      if (job.options?.delayMs && job.options.delayMs > 0) delayed.push(job);
      else due.push(job);
    }
    this.pending.length = 0;
    this.pending.push(...delayed);

    while (due.length > 0) {
      const job = due.shift();
      if (!job) break;
      const handler = this.handlers.get(handlerKey(job.queue, job.jobName));
      if (!handler) {
        this.dlq.push({ ...job, error: 'NO_HANDLER' });
        continue;
      }
      const attempts = job.options?.retry?.attempts ?? JOB_RETRY[job.jobName].attempts;
      let lastError: unknown;
      for (let i = 0; i < attempts; i += 1) {
        try {
          await handler(job.payload);
          this.processed.push({ queue: job.queue, jobName: job.jobName, payload: job.payload });
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (lastError !== undefined) {
        this.dlq.push({
          queue: job.queue,
          jobName: job.jobName,
          payload: job.payload,
          error: lastError instanceof Error ? lastError.message : JSON.stringify(lastError),
        });
      }
    }
  }

  async tryConnect(): Promise<boolean> {
    return !this.unavailable;
  }

  isConnected(): boolean {
    return !this.unavailable;
  }

  async startWorkers(): Promise<void> {
    // in-memory: drain() é explícito no smoke
  }

  /** Libera jobs com delay (simula passagem do TTL da oferta). */
  releaseDelayed(): void {
    for (const job of this.pending) {
      if (job.options?.delayMs) job.options = { ...job.options, delayMs: 0 };
    }
  }

  async close(): Promise<void> {
    this.pending.length = 0;
  }
}

function handlerKey(queue: QueueName, jobName: JobName): string {
  return `${queue}:${jobName}`;
}
