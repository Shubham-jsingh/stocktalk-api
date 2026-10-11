import { NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

// Keep firebase-admin (ESM deps) out of the unit test.
jest.mock('./push.service', () => ({ PushService: class {} }));

// Event hooks run in the background; wait for the queued work to settle.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('NotificationsService events', () => {
  const notifications = {
    create: jest.fn((row) => row),
    save: jest.fn(async (row) => ({ id: 'n-1', ...row })),
    exists: jest.fn(),
    query: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };
  const deviceTokens = {};
  const postsRepository = { findOne: jest.fn() };
  const usersRepository = {
    findOne: jest.fn().mockResolvedValue({ username: 'rahul', fullName: null }),
  };
  const pushService = {
    sendToUsers: jest.fn(),
    sendToFollowersOf: jest.fn(),
  };

  const service = new NotificationsService(
    notifications as never,
    deviceTokens as never,
    postsRepository as never,
    usersRepository as never,
    pushService as never,
  );

  const comment = {
    id: 'c-1',
    postId: 'p-1',
    authorId: 'commenter',
    parentId: null,
    body: 'Nice call',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('alerts the post owner about a top-level comment', async () => {
    postsRepository.findOne.mockResolvedValue({ id: 'p-1', authorId: 'owner' });

    service.onCommentCreated(comment);
    await flush();

    expect(notifications.save).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'owner',
        actorId: 'commenter',
        type: NotificationType.POST_COMMENT,
        postId: 'p-1',
        commentId: 'c-1',
      }),
    );
    expect(pushService.sendToUsers).toHaveBeenCalledWith(
      ['owner'],
      expect.objectContaining({ title: 'rahul commented on your post' }),
    );
  });

  it('ignores replies to comments', async () => {
    service.onCommentCreated({ ...comment, parentId: 'c-0' });
    await flush();

    expect(postsRepository.findOne).not.toHaveBeenCalled();
    expect(notifications.save).not.toHaveBeenCalled();
  });

  it('does not alert users about their own comments', async () => {
    postsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      authorId: 'commenter',
    });

    service.onCommentCreated(comment);
    await flush();

    expect(notifications.save).not.toHaveBeenCalled();
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('skips a repeat follow alert inside the dedupe window', async () => {
    notifications.exists.mockResolvedValue(true);

    service.onUserFollowed('fan', 'creator');
    await flush();

    expect(notifications.save).not.toHaveBeenCalled();
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('alerts a user about a new follower', async () => {
    notifications.exists.mockResolvedValue(false);

    service.onUserFollowed('fan', 'creator');
    await flush();

    expect(notifications.save).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'creator',
        actorId: 'fan',
        type: NotificationType.NEW_FOLLOWER,
      }),
    );
    expect(pushService.sendToUsers).toHaveBeenCalledWith(
      ['creator'],
      expect.objectContaining({ body: 'rahul started following you' }),
    );
  });

  it('fans a new post out to followers and pushes only when someone follows', async () => {
    notifications.query.mockResolvedValueOnce([]);
    service.onPostCreated({ id: 'p-1', authorId: 'creator', title: 'Hi' });
    await flush();
    expect(pushService.sendToFollowersOf).not.toHaveBeenCalled();

    notifications.query.mockResolvedValueOnce([{ id: 'n-1' }, { id: 'n-2' }]);
    service.onPostCreated({ id: 'p-1', authorId: 'creator', title: 'Hi' });
    await flush();
    expect(notifications.query).toHaveBeenLastCalledWith(
      expect.stringContaining('FROM user_follows'),
      ['creator', NotificationType.FOLLOWED_USER_POST, 'p-1'],
    );
    expect(pushService.sendToFollowersOf).toHaveBeenCalledWith(
      'creator',
      expect.objectContaining({ title: 'rahul shared a new post' }),
    );
  });

  it('never throws when delivery fails', async () => {
    postsRepository.findOne.mockRejectedValue(new Error('db down'));

    expect(() => service.onCommentCreated(comment)).not.toThrow();
    await flush();
  });

  it('puts the post image and first link into the follower push', async () => {
    notifications.query.mockResolvedValueOnce([{ id: 'n-1' }]);

    service.onPostCreated({
      id: 'p-1',
      authorId: 'creator',
      title: 'NVDA update',
      imageUrl: 'https://img.example/chart.png',
      links: ['https://www.tradingview.com/symbols/NASDAQ-NVDA/'],
    });
    await flush();

    expect(pushService.sendToFollowersOf).toHaveBeenCalledWith(
      'creator',
      expect.objectContaining({
        body: 'NVDA update\n🔗 tradingview.com',
        imageUrl: 'https://img.example/chart.png',
        data: expect.objectContaining({
          link: 'https://www.tradingview.com/symbols/NASDAQ-NVDA/',
          imageUrl: 'https://img.example/chart.png',
        }),
      }),
    );
  });

  it('marks read by ids or post, and counts those as seen', async () => {
    await service.markRead('me', ['n-1'], ['p-1']);
    const [readCall, seenCall] = notifications.update.mock.calls;
    expect(readCall[0]).toEqual([
      expect.objectContaining({ recipientId: 'me', id: expect.anything() }),
      expect.objectContaining({ recipientId: 'me', postId: expect.anything() }),
    ]);
    expect(readCall[1]).toEqual({ readAt: expect.any(Date) });
    expect(seenCall[1]).toEqual({ seenAt: expect.any(Date) });
  });

  it('opening the tab marks everything seen but nothing read', async () => {
    await service.markSeen('me');
    expect(notifications.update).toHaveBeenCalledTimes(1);
    expect(notifications.update).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'me' }),
      { seenAt: expect.any(Date) },
    );
  });
});
