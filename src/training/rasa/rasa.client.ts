import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { Readable } from 'stream';

export interface RasaStatus {
  model_file: string | null;
  model_id: string | null;
  num_active_training_jobs: number;
}

export class RasaError extends Error {
  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = 'RasaError';
  }
}

/** Rasa model files are plain names like 20260923-101500-brave-lake.tar.gz. */
const MODEL_FILE_PATTERN = /^[\w.-]+\.tar\.gz$/;
const STATUS_TIMEOUT_MS = 10_000;
const LOAD_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_TRAIN_TIMEOUT_MS = 60 * 60_000;
const MAX_ERROR_BODY_BYTES = 64 * 1024;

export function isValidModelFile(name: string): boolean {
  return MODEL_FILE_PATTERN.test(name);
}

/** Rasa reports the model as a path, e.g. /app/models/x.tar.gz. */
export function modelFileName(path: string | null): string | null {
  if (!path) return null;
  return path.split(/[\\/]/).pop() ?? null;
}

@Injectable()
export class RasaClient {
  private readonly http: AxiosInstance;
  private readonly modelDir: string;
  private readonly trainTimeoutMs: number;

  constructor(config: ConfigService) {
    const token = config.get<string>('RASA_TOKEN');
    this.http = axios.create({
      baseURL: config.getOrThrow<string>('RASA_URL'),
      params: token ? { token } : undefined,
    });
    this.modelDir = config
      .get<string>('RASA_MODEL_DIR', '/app/models')
      .replace(/\/+$/, '');
    this.trainTimeoutMs = Number(
      config.get('RASA_TRAIN_TIMEOUT_MS', DEFAULT_TRAIN_TIMEOUT_MS),
    );
  }

  async status(): Promise<RasaStatus> {
    try {
      const { data } = await this.http.get<RasaStatus>('/status', {
        timeout: STATUS_TIMEOUT_MS,
      });
      return data;
    } catch (error) {
      // Rasa answers 409 "No agent loaded" until a first model is loaded;
      // the server is reachable, it just runs without a model.
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        return {
          model_file: null,
          model_id: null,
          num_active_training_jobs: 0,
        };
      }
      throw await toRasaError(error, 'Không kết nối được tới Rasa');
    }
  }

  /**
   * Trains a model and returns the file name Rasa saved it under. Rasa answers
   * with the model archive itself; the body is discarded because the model is
   * already stored in Rasa's model directory.
   */
  async train(yaml: string): Promise<{ modelFile: string }> {
    try {
      const response = await this.http.post<Readable>('/model/train', yaml, {
        headers: { 'Content-Type': 'application/yaml' },
        responseType: 'stream',
        timeout: this.trainTimeoutMs,
        maxBodyLength: Infinity,
      });
      response.data.destroy();

      const modelFile = response.headers['filename'];
      if (typeof modelFile !== 'string' || !isValidModelFile(modelFile)) {
        throw new RasaError('Rasa không trả về tên file model hợp lệ', {
          filename: modelFile ?? null,
        });
      }
      return { modelFile };
    } catch (error) {
      if (error instanceof RasaError) throw error;
      throw await toRasaError(error, 'Rasa train thất bại');
    }
  }

  async loadModel(modelFile: string): Promise<void> {
    if (!isValidModelFile(modelFile)) {
      throw new RasaError(`Tên file model không hợp lệ: ${modelFile}`);
    }
    try {
      await this.http.put(
        '/model',
        { model_file: `${this.modelDir}/${modelFile}` },
        { timeout: LOAD_TIMEOUT_MS },
      );
    } catch (error) {
      throw await toRasaError(error, `Rasa không nạp được model ${modelFile}`);
    }
  }
}

/** Turns an axios failure into a message that says what Rasa actually replied. */
async function toRasaError(
  error: unknown,
  fallback: string,
): Promise<RasaError> {
  if (!axios.isAxiosError(error)) {
    return new RasaError(
      `${fallback}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const axiosError = error as AxiosError;
  if (!axiosError.response) {
    const reason =
      axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT'
        ? 'hết thời gian chờ'
        : axiosError.code ?? axiosError.message;
    return new RasaError(`${fallback} (${reason})`, { code: axiosError.code });
  }

  const body = await readBody(axiosError.response.data);
  const rasaMessage =
    typeof body === 'object' && body !== null
      ? [body.message, body.reason].filter(Boolean).join(' – ')
      : String(body ?? '').slice(0, 500);
  return new RasaError(
    `${fallback} (HTTP ${axiosError.response.status})${
      rasaMessage ? `: ${rasaMessage}` : ''
    }`,
    { status: axiosError.response.status, body },
  );
}

async function readBody(data: unknown): Promise<any> {
  let text: string;
  if (data instanceof Readable) {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of data) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(buffer);
      size += buffer.length;
      if (size >= MAX_ERROR_BODY_BYTES) {
        data.destroy();
        break;
      }
    }
    text = Buffer.concat(chunks).toString('utf8');
  } else if (typeof data === 'string') {
    text = data;
  } else {
    return data;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
