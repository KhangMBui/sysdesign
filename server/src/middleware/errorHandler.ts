import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);

  if (err instanceof Error) {
    // Postgres unique constraint violation
    if ('code' in err && err.code === '23505') {
      res.status(409).json({ error: 'A record with that value already exists.' });
      return;
    }
    res.status(500).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
