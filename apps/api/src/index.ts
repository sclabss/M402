import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { advantageReportRouter } from './routes/advantage-report';
import { agentsRouter } from './routes/agents';
import { catalogRouter } from './routes/catalog';
import { hireRouter } from './routes/hire';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'm402-api' }));

app.use('/agents', agentsRouter);
app.use('/hire', hireRouter);
app.use('/catalog', catalogRouter);
app.use('/advantage-report', advantageReportRouter);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`M402 API listening on :${port}`);
});
