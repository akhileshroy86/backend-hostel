import { app, connectDB } from './app';

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running locally on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  });
