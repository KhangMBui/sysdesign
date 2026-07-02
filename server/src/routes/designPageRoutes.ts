import { Router, type Request } from 'express';
import { sql } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const pid = (req: Request) => (req.params as Record<string, string>).pid;

export const designPageRouter = Router({ mergeParams: true });
designPageRouter.use(requireAuth);

designPageRouter.get('/', async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT * FROM design_pages
      WHERE problem_id = ${pid(req)} AND user_id = ${req.userId}
      ORDER BY "order" ASC
    `;
    res.json(rows);
  } catch (err) { next(err); }
});

designPageRouter.post('/', async (req, res, next) => {
  try {
    const p = req.body as Record<string, unknown>;
    const now = Date.now();
    const id = p.id as string;
    const title = (p.title as string | undefined) ?? 'Design v1';
    const order = (p.order as number | undefined) ?? 0;
    const scene = (p.scene as string | undefined) ?? null;
    const notes = (p.notes as string | undefined) ?? null;
    const createdAt = (p.createdAt as number | undefined) ?? now;
    const updatedAt = (p.updatedAt as number | undefined) ?? now;
    const [row] = await sql`
      INSERT INTO design_pages (id, user_id, problem_id, title, "order", scene, notes, created_at, updated_at)
      VALUES (${id}, ${req.userId}, ${pid(req)}, ${title}, ${order}, ${scene}, ${notes}, ${createdAt}, ${updatedAt})
      RETURNING *
    `;
    res.status(201).json(row);
  } catch (err) { next(err); }
});

designPageRouter.patch('/reorder', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] };
    await Promise.all(
      ids.map((id, index) =>
        sql`UPDATE design_pages SET "order" = ${index}, updated_at = ${Date.now()}
            WHERE id = ${id} AND user_id = ${req.userId}`,
      ),
    );
    res.json({});
  } catch (err) { next(err); }
});

export const designPageFlatRouter = Router();
designPageFlatRouter.use(requireAuth);

designPageFlatRouter.patch('/:id', async (req, res, next) => {
  try {
    const p = req.body as Record<string, unknown>;
    const now = Date.now();
    const title = (p.title as string | undefined) ?? null;
    const scene = (p.scene as string | undefined) ?? null;
    const notes = (p.notes as string | undefined) ?? null;
    const order = (p.order as number | undefined) ?? null;
    const [row] = await sql`
      UPDATE design_pages SET
        title      = COALESCE(${title}, title),
        scene      = COALESCE(${scene}, scene),
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

designPageFlatRouter.delete('/:id', async (req, res, next) => {
  try {
    await sql`DELETE FROM design_pages WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    res.status(204).send();
  } catch (err) { next(err); }
});
