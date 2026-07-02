import { Router, type Request } from 'express';
import { sql, jv } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const pid = (req: Request) => (req.params as Record<string, string>).pid;

export const dataModelRouter = Router({ mergeParams: true });
dataModelRouter.use(requireAuth);

dataModelRouter.get('/', async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT * FROM data_model_entities
      WHERE problem_id = ${pid(req)} AND user_id = ${req.userId}
      ORDER BY "order" ASC
    `;
    res.json(rows);
  } catch (err) { next(err); }
});

dataModelRouter.post('/', async (req, res, next) => {
  try {
    const p = req.body as Record<string, unknown>;
    const now = Date.now();
    const id = p.id as string;
    const name = (p.name as string | undefined) ?? '';
    const description = (p.description as string | undefined) ?? '';
    const order = (p.order as number | undefined) ?? 0;
    const createdAt = (p.createdAt as number | undefined) ?? now;
    const updatedAt = (p.updatedAt as number | undefined) ?? now;
    const [row] = await sql`
      INSERT INTO data_model_entities (id, user_id, problem_id, name, description, fields, "order", created_at, updated_at)
      VALUES (${id}, ${req.userId}, ${pid(req)}, ${name}, ${description}, ${sql.json(jv(p.fields ?? []))}, ${order}, ${createdAt}, ${updatedAt})
      RETURNING *
    `;
    res.status(201).json(row);
  } catch (err) { next(err); }
});

dataModelRouter.patch('/reorder', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] };
    await Promise.all(
      ids.map((id, index) =>
        sql`UPDATE data_model_entities SET "order" = ${index}, updated_at = ${Date.now()}
            WHERE id = ${id} AND user_id = ${req.userId}`,
      ),
    );
    res.json({});
  } catch (err) { next(err); }
});

export const dataModelFlatRouter = Router();
dataModelFlatRouter.use(requireAuth);

dataModelFlatRouter.get('/:id', async (req, res, next) => {
  try {
    const [row] = await sql`
      SELECT * FROM data_model_entities WHERE id = ${req.params.id} AND user_id = ${req.userId}
    `;
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(row);
  } catch (err) { next(err); }
});

dataModelFlatRouter.patch('/:id', async (req, res, next) => {
  try {
    const p = req.body as Record<string, unknown>;
    const now = Date.now();
    const name = (p.name as string | undefined) ?? null;
    const description = (p.description as string | undefined) ?? null;
    const fields = p.fields != null ? sql.json(jv(p.fields)) : null;
    const order = (p.order as number | undefined) ?? null;
    const [row] = await sql`
      UPDATE data_model_entities SET
        name        = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        fields      = COALESCE(${fields}, fields),
        "order"     = COALESCE(${order}, "order"),
        updated_at  = ${now}
      WHERE id = ${req.params.id} AND user_id = ${req.userId}
      RETURNING *
    `;
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(row);
  } catch (err) { next(err); }
});

dataModelFlatRouter.delete('/:id', async (req, res, next) => {
  try {
    await sql`DELETE FROM data_model_entities WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    res.status(204).send();
  } catch (err) { next(err); }
});
