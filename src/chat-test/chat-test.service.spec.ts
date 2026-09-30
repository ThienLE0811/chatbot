import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RasaClient, RasaError } from '../training/rasa/rasa.client';
import { ChatTestService } from './chat-test.service';

describe('ChatTestService.send', () => {
  let rasa: { sendMessage: jest.Mock; tracker: jest.Mock };
  let service: ChatTestService;

  beforeEach(() => {
    rasa = { sendMessage: jest.fn(), tracker: jest.fn() };
    service = new ChatTestService(rasa as unknown as RasaClient);
  });

  it('returns the replies and the turn of the message just sent', async () => {
    rasa.sendMessage.mockResolvedValue([{ recipient_id: 's1', text: 'Chào!' }]);
    rasa.tracker.mockResolvedValue({
      sender_id: 's1',
      slots: {},
      events: [
        {
          event: 'user',
          text: 'cũ',
          parse_data: { intent: { name: 'a', confidence: 1 } },
        },
        {
          event: 'user',
          text: 'xin chào',
          parse_data: { intent: { name: 'chao_hoi', confidence: 0.9 } },
        },
      ],
    });

    const result = await service.send('s1', 'xin chào');

    expect(rasa.sendMessage).toHaveBeenCalledWith('s1', 'xin chào');
    expect(rasa.tracker).toHaveBeenCalledWith('s1');
    expect(result.replies).toEqual([{ recipient_id: 's1', text: 'Chào!' }]);
    expect(result.turn).toMatchObject({
      text: 'xin chào',
      intent: { name: 'chao_hoi', confidence: 0.9 },
    });
  });

  it('returns a null turn when the tracker holds no user message', async () => {
    rasa.sendMessage.mockResolvedValue([]);
    rasa.tracker.mockResolvedValue({ sender_id: 's1', slots: {}, events: [] });

    await expect(service.send('s1', 'hi')).resolves.toEqual({
      replies: [],
      turn: null,
    });
  });

  it('explains that no model is loaded when the tracker answers 409', async () => {
    rasa.sendMessage.mockResolvedValue([]);
    rasa.tracker.mockRejectedValue(
      new RasaError('Không đọc được hội thoại từ Rasa (HTTP 409)', {
        status: 409,
      }),
    );

    await expect(service.send('s1', 'hi')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('reports other Rasa failures as a bad gateway', async () => {
    rasa.sendMessage.mockRejectedValue(
      new RasaError('Rasa không trả lời tin nhắn (ECONNREFUSED)'),
    );

    await expect(service.send('s1', 'hi')).rejects.toThrow(
      new BadGatewayException('Rasa không trả lời tin nhắn (ECONNREFUSED)'),
    );
  });
});
