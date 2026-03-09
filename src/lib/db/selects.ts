import { users } from "@/lib/db/schema";

export const authUserSelect = {
  id: users.id,
  role: users.role,
  username: users.username,
  email: users.email,
  name: users.name,
  className: users.className,
  isActive: users.isActive,
  mustChangePassword: users.mustChangePassword,
  tokenInvalidatedAt: users.tokenInvalidatedAt,
};

export const safeUserSelect = {
  id: users.id,
  username: users.username,
  email: users.email,
  name: users.name,
  className: users.className,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};
