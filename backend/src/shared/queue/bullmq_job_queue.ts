import { Queue, Worker, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { JobPayload } from './job_payload.js';
import { jobPayloadSchema } from './job_payload.js';
import type { EnqueueOptions, JobHandler, JobQueue } from './job_queue.port.js';
import { RedisUnavailableError } from './job_queue.port.js';
import type { JobName, QueueName } from './queue_names.js';
import { dlqName, JOB_RETRY, QUEUE } from './queue_names.js';

const BULLMQ_PREFIX = 'odonto';

export class BullmqJobQueue implements JobQueue {
  private probe: Redis | null = null;
  private readonly handlers = new Map<string, JobHandler>();
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];

  register(queue: QueueName, jobName: JobName, handler: JobHandler): void {
    this.handlers.set(`${queue}:${jobName}`, handler);
  }

  isConnected(): boolean {
    return this.probe?.status === 'ready';
  }

  async tryConnect(): Promise<boolean> {
    if (this.isConnected() && this.probe) {
      try {
        await this.probe.ping();
        return true;
      } catch {
        await this.dropProbe();
      }
    } else {
      await this.dropProbe();
    }

    try {
      const redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 2_000,
        retryStrategy: () => null,
      });
      await redis.connect();
      await redis.ping();
      this.probe = redis;
      return true;
    } catch (err) {
      logger.warn({ err }, 'redis_connect_failed');
      await this.dropProbe();
      return false;
    }
  }

  async remove(queue: QueueName, jobId: string): Promise<void> {
    if (!this.isConnected()) return;
    try {
      const job = await this.getQueue(queue).getJob(jobId);
      if (job) await job.remove();
    } catch {
      // job ausente ou Redis instável — cancelamento é best-effort
    }
  }

  async add(
    queue: QueueName,
    jobName: JobName,
    payload: JobPayload,
    options?: EnqueueOptions,
  ): Promise<void> {
    if (!this.isConnected()) {
      throw new RedisUnavailableError();
    }
    jobPayloadSchema.parse(payload);
    const retry = options?.retry ?? JOB_RETRY[jobName];
    const opts: JobsOptions = {
      jobId: options?.jobId,
      delay: options?.delayMs,
      attempts: retry.attempts,
      backoff: retry.backoff,
      removeOnComplete: { count: 1_000 },
      removeOnFail: false,
    };
    try {
      const q = this.getQueue(queue);
      await q.add(jobName, payload, opts);
    } catch (err) {
      throw new RedisUnavailableError(err);
    }
  }

  async startWorkers(): Promise<void> {
    if (!this.isConnected()) return;
    if (this.workers.length > 0) return;

    for (const queueName of Object.values(QUEUE)) {
      const worker = new Worker(
        queueName,
        async (job) => {
          const handler = this.handlers.get(`${queueName}:${job.name}`);
          if (!handler) {
            logger.warn({ queue: queueName, job: job.name }, 'job_handler_missing');
            return;
          }
          const payload = jobPayloadSchema.parse(job.data);
          await handler(payload);
        },
        {
          connection: this.bullmqConnection(),
          prefix: BULLMQ_PREFIX,
        },
      );

      worker.on('failed', (job, err) => {
        if (!job) return;
        const maxAttempts = job.opts.attempts ?? 1;
        if (job.attemptsMade >= maxAttempts) {
          logger.error(
            {
              queue: queueName,
              job: job.name,
              jobId: job.id,
              tenantId: (job.data as JobPayload | undefined)?.tenantId,
              requestId: (job.data as JobPayload | undefined)?.requestId,
              err,
            },
            'job_moved_to_dlq',
          );
          void this.moveToDlq(queueName, job.id, job.name, job.data, err);
        }
      });

      this.workers.push(worker);
    }
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close().catch(() => undefined)));
    this.workers.length = 0;
    await Promise.all([...this.queues.values()].map((q) => q.close().catch(() => undefined)));
    this.queues.clear();
    await this.dropProbe();
  }

  private bullmqConnection(): ConnectionOptions {
    return {
      url: env.REDIS_URL,
      maxRetriesPerRequest: null,
    };
  }

  private getQueue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: this.bullmqConnection(), prefix: BULLMQ_PREFIX });
      this.queues.set(name, queue);
    }
    return queue;
  }

  private async moveToDlq(
    queue: QueueName,
    jobId: string | undefined,
    jobName: string,
    data: unknown,
    err: Error,
  ): Promise<void> {
    try {
      const dlq = this.getQueue(dlqName(queue));
      await dlq.add(
        jobName,
        { originalJobId: jobId, error: err.message, data },
        { jobId: jobId ? `dlq-${jobId}` : undefined },
      );
    } catch (dlqErr) {
      logger.error({ dlqErr, queue, jobId }, 'dlq_enqueue_failed');
    }
  }

  private async dropProbe(): Promise<void> {
    if (!this.probe) return;
    try {
      this.probe.disconnect();
    } catch {
      // ignore
    }
    this.probe = null;
  }
}
