import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { initDb } from './db.js';
import { authRouter } from './routes/authRoutes.js';
import { problemRouter } from './routes/problemRoutes.js';
import {
  designPageRouter,
  designPageFlatRouter,
} from './routes/designPageRoutes.js';
import { deepDiveRouter, deepDiveFlatRouter } from './routes/deepDiveRoutes.js';
import { dataModelRouter, dataModelFlatRouter } from './routes/dataModelRoutes.js';
import { importRouter } from './routes/importRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRouter);
app.use('/api/problems', problemRouter);
app.use('/api/problems/:pid/design-pages', designPageRouter);
app.use('/api/problems/:pid/deep-dives', deepDiveRouter);
app.use('/api/problems/:pid/data-model-entities', dataModelRouter);
app.use('/api/design-pages', designPageFlatRouter);
app.use('/api/deep-dives', deepDiveFlatRouter);
app.use('/api/data-model-entities', dataModelFlatRouter);
app.use('/api/import', importRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use(errorHandler);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
