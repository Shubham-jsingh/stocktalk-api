export interface FeedCursor {
  createdAt: string;
  id: string;
}

export function encodeFeedCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString(
    'base64url',
  );
}

export function decodeFeedCursor(cursor: string): FeedCursor {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8');
  const splitAt = raw.lastIndexOf('|');
  if (splitAt <= 0) {
    throw new Error('Invalid cursor');
  }
  const createdAt = raw.slice(0, splitAt);
  const id = raw.slice(splitAt + 1);
  if (!id || Number.isNaN(Date.parse(createdAt))) {
    throw new Error('Invalid cursor');
  }
  return { createdAt, id };
}
