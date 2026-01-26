import { Router } from 'express';

export const healthRouter: Router = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'klineo-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});
