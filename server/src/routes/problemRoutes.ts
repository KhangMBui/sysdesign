import { Router } from 'express';
import { sql, jv } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const problemRouter = Router();
problemRouter.use(requireAuth);

problemRouter.get('/', async (req, res, next) => {
  try {
    const rows = await sql`
      SELECT * FROM problems WHERE user_id = ${req.userId} ORDER BY updated_at DESC
    `;
    res.json(rows);
  } catch (err) { next(err); }
});

problemRouter.post('/', async (req, res, next) => {
  try {
    const p = req.body as Record<string, unknown>;
    const now = Date.now();
    const id = p.id as string;
    const title = (p.title as string | undefined) ?? 'Untitled Problem';
    const description = (p.description as string | undefined) ?? '';
    const constraints = (p.constraints as string | undefined) ?? '';
    const notes = (p.notes as string | undefined) ?? '';
    const difficulty = (p.difficulty as string | undefined) ?? '';
    const completed = (p.completed as boolean | undefined) ?? false;
    const erDiagramScene = (p.erDiagramScene as string | undefined) ?? null;
    const createdAt = (p.createdAt as number | undefined) ?? now;
    const updatedAt = (p.updatedAt as number | undefined) ?? now;

    const [row] = await sql`
      INSERT INTO problems (
        id, user_id, title, description, constraints, notes, difficulty, completed,
        functional_reqs, non_functional_reqs, api_endpoints, er_diagram_scene,
        created_at, updated_at
      ) VALUES (
        ${id}, ${req.userId}, ${title}, ${description}, ${constraints}, ${notes},
        ${difficulty}, ${completed},
        ${sql.json(jv(p.functionalReqs ?? []))},
        ${sql.json(jv(p.nonFunctionalReqs ?? []))},
        ${sql.json(jv(p.apiEndpoints ?? []))},
        ${erDiagramScene}, ${createdAt}, ${updatedAt}
      )
      RETURNING *
    `;
    res.status(201).json(row);
  } catch (err) { next(err); }
});

problemRouter.get('/:id', async (req, res, next) => {
  try {
    const [row] = await sql`
      SELECT * FROM problems WHERE id = ${req.params.id} AND user_id = ${req.userId}
    `;
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(row);
  } catch (err) { next(err); }
});

problemRouter.patch('/:id', async (req, res, next) => {
  try {
    const p = req.body as Record<string, unknown>;
    const now = Date.now();

    const [row] = await sql`
      UPDATE problems SET
        title               = COALESCE(${(p.title as string | undefined) ?? null}, title),
        description         = COALESCE(${(p.description as string | undefined) ?? null}, description),
        constraints         = COALESCE(${(p.constraints as string | undefined) ?? null}, constraints),
        notes               = COALESCE(${(p.notes as string | undefined) ?? null}, notes),
        difficulty          = COALESCE(${(p.difficulty as string | undefined) ?? null}, difficulty),
        completed           = COALESCE(${(p.completed as boolean | undefined) ?? null}, completed),
        functional_reqs     = COALESCE(${p.functionalReqs != null ? sql.json(jv(p.functionalReqs)) : null}, functional_reqs),
        non_functional_reqs = COALESCE(${p.nonFunctionalReqs != null ? sql.json(jv(p.nonFunctionalReqs)) : null}, non_functional_reqs),
        api_endpoints       = COALESCE(${p.apiEndpoints != null ? sql.json(jv(p.apiEndpoints)) : null}, api_endpoints),
        er_diagram_scene    = COALESCE(${(p.erDiagramScene as string | undefined) ?? null}, er_diagram_scene),
        updated_at          = ${now}
      WHERE id = ${req.params.id} AND user_id = ${req.userId}
      RETURNING *
    `;
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(row);
  } catch (err) { next(err); }
});

problemRouter.delete('/:id', async (req, res, next) => {
  try {
    await sql`DELETE FROM problems WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    res.status(204).send();
  } catch (err) { next(err); }
});
