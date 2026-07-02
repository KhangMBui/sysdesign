import { Router } from 'express';
import { sql, jv } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const importRouter = Router();
importRouter.use(requireAuth);

interface ImportPayload {
  problems?: Record<string, unknown>[];
  designPages?: Record<string, unknown>[];
  deepDives?: Record<string, unknown>[];
  dataModelEntities?: Record<string, unknown>[];
}

importRouter.post('/', async (req, res, next) => {
  try {
    const { problems = [], designPages = [], deepDives = [], dataModelEntities = [] } =
      req.body as ImportPayload;
    const userId = req.userId;
    const now = Date.now();

    for (const p of problems) {
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
      await sql`
        INSERT INTO problems (
          id, user_id, title, description, constraints, notes, difficulty, completed,
          functional_reqs, non_functional_reqs, api_endpoints, er_diagram_scene,
          created_at, updated_at
        ) VALUES (
          ${id}, ${userId}, ${title}, ${description}, ${constraints}, ${notes},
          ${difficulty}, ${completed},
          ${sql.json(jv(p.functionalReqs ?? []))},
          ${sql.json(jv(p.nonFunctionalReqs ?? []))},
          ${sql.json(jv(p.apiEndpoints ?? []))},
          ${erDiagramScene}, ${createdAt}, ${updatedAt}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    for (const p of designPages) {
      const id = p.id as string;
      const problemId = p.problemId as string;
      const title = (p.title as string | undefined) ?? 'Design v1';
      const order = (p.order as number | undefined) ?? 0;
      const scene = (p.scene as string | undefined) ?? null;
      const notes = (p.notes as string | undefined) ?? null;
      const createdAt = (p.createdAt as number | undefined) ?? now;
      const updatedAt = (p.updatedAt as number | undefined) ?? now;
      await sql`
        INSERT INTO design_pages (id, user_id, problem_id, title, "order", scene, notes, created_at, updated_at)
        VALUES (${id}, ${userId}, ${problemId}, ${title}, ${order}, ${scene}, ${notes}, ${createdAt}, ${updatedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    for (const p of deepDives) {
      const id = p.id as string;
      const problemId = p.problemId as string;
      const title = (p.title as string | undefined) ?? '';
      const prompt = (p.prompt as string | undefined) ?? '';
      const response = (p.response as string | undefined) ?? '';
      const notes = (p.notes as string | undefined) ?? '';
      const order = (p.order as number | undefined) ?? 0;
      const createdAt = (p.createdAt as number | undefined) ?? now;
      const updatedAt = (p.updatedAt as number | undefined) ?? now;
      await sql`
        INSERT INTO deep_dives (id, user_id, problem_id, title, prompt, response, notes, "order", created_at, updated_at)
        VALUES (${id}, ${userId}, ${problemId}, ${title}, ${prompt}, ${response}, ${notes}, ${order}, ${createdAt}, ${updatedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    for (const p of dataModelEntities) {
      const id = p.id as string;
      const problemId = p.problemId as string;
      const name = (p.name as string | undefined) ?? '';
      const description = (p.description as string | undefined) ?? '';
      const order = (p.order as number | undefined) ?? 0;
      const createdAt = (p.createdAt as number | undefined) ?? now;
      const updatedAt = (p.updatedAt as number | undefined) ?? now;
      await sql`
        INSERT INTO data_model_entities (id, user_id, problem_id, name, description, fields, "order", created_at, updated_at)
        VALUES (
          ${id}, ${userId}, ${problemId}, ${name}, ${description},
          ${sql.json(jv(p.fields ?? []))},
          ${order}, ${createdAt}, ${updatedAt}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    res.json({
      imported: {
        problems: problems.length,
        designPages: designPages.length,
        deepDives: deepDives.length,
        dataModelEntities: dataModelEntities.length,
      },
    });
  } catch (err) { next(err); }
});
