import type { SafeUser } from '../../users/users.service';

export interface AuthUser {
  uid: string;
  email: string | null;
  roles: string[];
  user: SafeUser;
}
