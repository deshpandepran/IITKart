import app from './app';
import { env } from './config/env';
import prisma from './config/db';
import { logger } from './utils/logger';

async function main() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();

// Handle unexpected closures
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected on app termination');
  process.exit(0);
});
