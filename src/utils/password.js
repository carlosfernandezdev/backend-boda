import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = async (plain) => {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

export const verifyPassword = async (plain, hash) => {
  return bcrypt.compare(plain, hash);
};
