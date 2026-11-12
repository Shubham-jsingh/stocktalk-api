import type { SafeUser } from '../../users/users.service';

export interface AuthUser {
  uid: string;
  email: string | null;
  roles: string[];
  user: SafeUser;
  /** Firebase auth_time in seconds. Unset for tokens that omit it. */
  authTime?: number;
}
