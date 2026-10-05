import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

function hostFor(res: object): ArgumentsHost {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();
  let res: { headersSent: boolean; status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    res = { headersSent: false, status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
  });

  it('sends HTTP errors as FAILED with their status', () => {
    filter.catch(new NotFoundException('Role not found'), hostFor(res));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'FAILED',
      data: { statusCode: 404, message: 'Role not found', error: 'Not Found' },
    });
  });

  it('keeps the per-field messages of a validation error', () => {
    filter.catch(
      new BadRequestException(['name must be a string']),
      hostFor(res),
    );
    expect(res.json.mock.calls[0][0].data).toMatchObject({
      statusCode: 400,
      message: ['name must be a string'],
    });
  });

  it('keeps extra fields of the error body', () => {
    filter.catch(
      new ConflictException({ message: 'Training running', jobId: 'j1' }),
      hostFor(res),
    );
    expect(res.json.mock.calls[0][0].data).toEqual({
      statusCode: 409,
      message: 'Training running',
      jobId: 'j1',
    });
  });

  it('handles errors built from a plain string', () => {
    filter.catch(new HttpException('Too many', 429), hostFor(res));
    expect(res.json).toHaveBeenCalledWith({
      status: 'FAILED',
      data: { statusCode: 429, message: 'Too many' },
    });
  });

  it('turns a unique index violation into a 409', () => {
    const duplicate = Object.assign(new Error('E11000 duplicate key'), {
      code: 11000,
      keyValue: { story: 'greet' },
    });
    filter.catch(duplicate, hostFor(res));
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      status: 'FAILED',
      data: {
        statusCode: 409,
        message: 'Giá trị "greet" của trường story đã tồn tại',
      },
    });
  });

  it('hides unexpected errors behind a 500', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    filter.catch(new Error('db password is hunter2'), hostFor(res));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'FAILED',
      data: { statusCode: 500, message: 'Internal server error' },
    });
  });

  it('writes nothing once the headers are sent', () => {
    res.headersSent = true;
    filter.catch(new NotFoundException(), hostFor(res));
    expect(res.status).not.toHaveBeenCalled();
  });
});
