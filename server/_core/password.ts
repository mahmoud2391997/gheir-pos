import bcrypt from "bcryptjs";

const DEFAULT_COST = 12;

export async function hashPassword(password: string, cost = DEFAULT_COST) {
  return bcrypt.hash(password, cost);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
