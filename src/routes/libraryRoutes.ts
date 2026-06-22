import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/db';

const router = Router();

/**
 * Get all available Onleihe libraries
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const libraries = await db
      .selectFrom('onleihe_libraries')
      .selectAll()
      .orderBy('name', 'asc')
      .execute();

    res.json(libraries);
  } catch (error) {
    console.error('Error fetching libraries:', error);
    res.status(500).json({ error: 'Failed to fetch libraries' });
  }
});

/**
 * Get a specific library by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const libraryId = parseInt(req.params.id as string);

    if (isNaN(libraryId)) {
      res.status(400).json({ error: 'Invalid library ID' });
      return;
    }

    const library = await db
      .selectFrom('onleihe_libraries')
      .selectAll()
      .where('id', '=', libraryId)
      .executeTakeFirst();

    if (!library) {
      res.status(404).json({ error: 'Library not found' });
      return;
    }

    res.json(library);
  } catch (error) {
    console.error('Error fetching library:', error);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

/**
 * Create a new Onleihe library
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, onleihe_id, description } = req.body;

    if (!name || !onleihe_id) {
      res.status(400).json({ error: 'Name and onleihe_id are required' });
      return;
    }

    const db = getDatabase();

    // Check if library with this onleihe_id already exists
    const existingLibrary = await db
      .selectFrom('onleihe_libraries')
      .select('id')
      .where('onleihe_id', '=', onleihe_id)
      .executeTakeFirst();

    if (existingLibrary) {
      res.status(409).json({ error: 'Library with this Onleihe ID already exists' });
      return;
    }

    const result = await db
      .insertInto('onleihe_libraries')
      .values({
        name,
        onleihe_id,
        description: description || null,
      })
      .executeTakeFirst();

    const libraryId = Number(result.insertId);
    const library = await db
      .selectFrom('onleihe_libraries')
      .selectAll()
      .where('id', '=', libraryId)
      .executeTakeFirst();

    res.status(201).json(library);
  } catch (error) {
    console.error('Error creating library:', error);
    res.status(500).json({ error: 'Failed to create library' });
  }
});

/**
 * Update a library
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.id as string);
    const { name, onleihe_id, description } = req.body;

    if (isNaN(libraryId)) {
      res.status(400).json({ error: 'Invalid library ID' });
      return;
    }

    const db = getDatabase();

    // Check if library exists
    const existingLibrary = await db
      .selectFrom('onleihe_libraries')
      .select('id')
      .where('id', '=', libraryId)
      .executeTakeFirst();

    if (!existingLibrary) {
      res.status(404).json({ error: 'Library not found' });
      return;
    }

    // If onleihe_id is being changed, check for conflicts
    if (onleihe_id) {
      const conflictingLibrary = await db
        .selectFrom('onleihe_libraries')
        .select('id')
        .where('onleihe_id', '=', onleihe_id)
        .where('id', '!=', libraryId)
        .executeTakeFirst();

      if (conflictingLibrary) {
        res.status(409).json({ error: 'Another library with this Onleihe ID already exists' });
        return;
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (onleihe_id !== undefined) updateData.onleihe_id = onleihe_id;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    await db
      .updateTable('onleihe_libraries')
      .set(updateData)
      .where('id', '=', libraryId)
      .execute();

    const library = await db
      .selectFrom('onleihe_libraries')
      .selectAll()
      .where('id', '=', libraryId)
      .executeTakeFirst();

    res.json(library);
  } catch (error) {
    console.error('Error updating library:', error);
    res.status(500).json({ error: 'Failed to update library' });
  }
});

/**
 * Delete a library
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const libraryId = parseInt(req.params.id as string);

    if (isNaN(libraryId)) {
      res.status(400).json({ error: 'Invalid library ID' });
      return;
    }

    const db = getDatabase();

    // Check if library exists
    const library = await db
      .selectFrom('onleihe_libraries')
      .select('id')
      .where('id', '=', libraryId)
      .executeTakeFirst();

    if (!library) {
      res.status(404).json({ error: 'Library not found' });
      return;
    }

    // Delete library (cascading deletes will handle related records)
    await db
      .deleteFrom('onleihe_libraries')
      .where('id', '=', libraryId)
      .execute();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting library:', error);
    res.status(500).json({ error: 'Failed to delete library' });
  }
});

export default router;