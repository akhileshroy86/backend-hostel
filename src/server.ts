import { app, connectDB } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running locally on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });
