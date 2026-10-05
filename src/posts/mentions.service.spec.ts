import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MentionsService } from './mentions.service';

describe('MentionsService.resolveIds', () => {
  const usersRepository = { find: jest.fn() };
  const service = new MentionsService(
    usersRepository as never,
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty list when no ids are sent', async () => {
    await expect(service.resolveIds('author-1')).resolves.toEqual([]);
    await expect(service.resolveIds('author-1', [])).resolves.toEqual([]);
  });

  it('deduplicates ids', async () => {
    usersRepository.find.mockResolvedValue([{ id: 'user-2' }]);

    await expect(
      service.resolveIds('author-1', ['user-2', ' user-2 ', 'user-2']),
    ).resolves.toEqual(['user-2']);
  });

  it('rejects more than three unique ids', async () => {
    await expect(
      service.resolveIds('author-1', ['a', 'b', 'c', 'd']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects mentioning yourself', async () => {
    await expect(
      service.resolveIds('author-1', ['author-1']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown ids with 404', async () => {
    usersRepository.find.mockResolvedValue([]);

    await expect(service.resolveIds('author-1', ['missing'])).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
