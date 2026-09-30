import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosHeaders } from 'axios';
import { RasaClient, RasaError } from './rasa.client';

function httpError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

describe('RasaClient.status', () => {
  const config = new ConfigService({ RASA_URL: 'http://rasa:5005' });
  let client: RasaClient;
  let get: jest.Mock;

  beforeEach(() => {
    client = new RasaClient(config);
    get = jest.fn();
    (client as any).http.get = get;
  });

  it('treats "No agent loaded" (409) as a reachable Rasa without a model', async () => {
    get.mockRejectedValue(
      httpError(409, { message: 'No agent loaded.', reason: 'Conflict' }),
    );

    await expect(client.status()).resolves.toEqual({
      model_file: null,
      model_id: null,
      num_active_training_jobs: 0,
    });
  });

  it('reports other HTTP failures with the message Rasa returned', async () => {
    get.mockRejectedValue(
      httpError(401, { message: 'User is not authenticated.' }),
    );

    await expect(client.status()).rejects.toThrow(
      new RasaError(
        'Không kết nối được tới Rasa (HTTP 401): User is not authenticated.',
      ),
    );
  });
});
