import { Router, type Request } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const pid = (req: Request) => (req.params as Record<string, string>).pid;

export const deepDiveRouter = Router({ mergeParams: true });
deepDiveRouter.use(requireAuth);

deepDiveRouter.get('/', async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT * FROM deep_dives
      WHERE problem_id = ${pid(req)} AND user_id = ${req.userId}
      ORDER BY "order" ASC
    `;
    res.json(rows);
  } catch (err) { next(err); }
});

deepDiveRouter.post('/', async (req, res, next) => {
  try {
    const p = req.body as Record<string, unknown>;
    const now = Date.now();
    const id = p.id as string;
    const title = (p.title as string | undefined) ?? '';
    const prompt = (p.prompt as string | undefined) ?? '';
    const response = (p.response as string | undefined) ?? '';
    const notes = (p.notes as string | undefined) ?? '';
    const order = (p.order as number | undefined) ?? 0;
    const createdAt = (p.createdAt as number | undefined) ?? now;
    const updatedAt = (p.updatedAt as number | undefined) ?? now;
    const [row] = await sql`
      INSERT INTO deep_dives (id, user_id, problem_id, title, prompt, response, notes, "order", created_at, updated_at)
      VALUES (${id}, ${req.userId}, ${pid(req)}, ${title}, ${prompt}, ${response}, ${notes}, ${order}, ${createdAt}, ${updatedAt})
      RETURNING *
    `;
    res.status(201).json(row);
  } catch (err) { next(err); }
});

deepDiveRouter.patch('/reorder', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] };
    await Promise.all(
      ids.map((id, index) =>
        sql`UPDATE deep_dives SET "order" = ${index}, updated_at = ${Date.now()}
            WHERE id = ${id} AND user_id = ${req.userId}`,
      ),
    );
    res.json({});
  } catch (err) { next(err); }
});

export const deepDiveFlatRouter = Router();
deepDiveFlatRouter.use(requireAuth);

deepDiveFlatRouter.patch('/:id', async (req, res, next) => {
  try {
    const p = req.body as Record<string, unknown>;
    const now = Date.now();
    const title = (p.title as string | undefined) ?? null;
    const prompt = (p.prompt as string | undefined) ?? null;
    const response = (p.response as string | undefined) ?? null;
    const notes = (p.notes as string | undefined) ?? null;
    const order = (p.order as number | undefined) ?? null;
    const [row] = await sql`
      UPDATE deep_dives SET
        title      = COALESCE(${title}, title),
        prompt     = COALESCE(${prompt}, prompt),
        response   = COALESCE(${response}, response),
        notes      = COALESCE(${notes}, notes),
        "order"    = COALESCE(${order}, "order"),
        updated_at = ${now}
      WHERE id = ${req.params.id} AND user_id = ${req.userId}
      RETURNING *
    `;
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(row);
  } catch (err) { next(err); }
});

deepDiveFlatRouter.delete('/:id', async (req, res, next) => {
  try {
    await sql`DELETE FROM deep_dives WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    res.status(204).send();
  } catch (err) { next(err); }
});
