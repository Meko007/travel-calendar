import { registerAs} from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'defaultSecret',
  expiresIn: parseInt(process.env.JWT_EXPIRES_IN ?? '3600', 10),
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'defaultRefreshSecret',
  refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN ?? '604800', 10),
//   resetSecret: process.env.JWT_RESET_SECRET || 'defaultResetSecret',
//   resetExpiresIn: parseInt(process.env.JWT_RESET_EXPIRES_IN ?? '600', 10),
//   audience: process.env.JWT_AUDIENCE,
//   issuer: process.env.JWT_ISSUER,
}));