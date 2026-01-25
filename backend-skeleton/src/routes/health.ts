import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'klineo-backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});
