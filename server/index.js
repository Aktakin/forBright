import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { triageRouter } from './routes/triage.js';
import { patientsRouter } from './routes/patients.js';
import { auditRouter } from './routes/audit.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/triage', triageRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/audit', auditRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const tryPorts = [PORT, 3002, 3003].filter((p, i, a) => a.indexOf(p) === i);
function listen(portIndex) {
  if (portIndex >= tryPorts.length) {
    console.error('Could not start server: ports', tryPorts.join(', '), 'are in use.');
    process.exit(1);
  }
  const port = tryPorts[portIndex];
  const server = app.listen(port, () => console.log(`Server running at http://localhost:${server.address().port}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying next…`);
      listen(portIndex + 1);
    } else throw err;
  });
}
listen(0);
