import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const authService = {
  hashPassword: async (password: string) => bcrypt.hash(password, 12),
  comparePassword: async (plain: string, hash: string) => bcrypt.compare(plain, hash),
  generateAccessToken: (id: string, role: string) => jwt.sign({ id, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN }),
  generateRefreshToken: (id: string) => jwt.sign({ id }, env.REFRESH_TOKEN_SECRET, { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN }),
  verifyAccessToken: (token: string) => jwt.verify(token, env.JWT_SECRET),
  verifyRefreshToken: (token: string) => jwt.verify(token, env.REFRESH_TOKEN_SECRET),
  generateOTP: () => Math.floor(100000 + Math.random() * 900000).toString(),
  hashOTP: async (otp: string) => bcrypt.hash(otp, 12)
};
