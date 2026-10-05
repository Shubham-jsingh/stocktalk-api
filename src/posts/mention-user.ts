export const MAX_MENTIONS = 3;

export type MentionUser = {
  id: string;
  username: string;
  fullName: string | null;
  profilePhotoUrl: string | null;
};
