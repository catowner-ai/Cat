import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { FridgeItem } from '../../lib/types.js';
import { inventory as memInventory } from '../../lib/sampleData.js';

let inventory: FridgeItem[] = [...memInventory];

const itemSchema = z.object({
	id: z.string(),
	householdId: z.string(),
	name: z.string(),
	quantity: z.number().nonnegative(),
	unit: z.string(),
	expiresOn: z.string(),
	tags: z.array(z.enum(['human', 'pet', 'shared'])),
	barcode: z.string().nullable().optional(),
});

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
	app.get('/inventory', async (req, reply) => {
		return { items: inventory };
	});

	app.post('/inventory', async (req, reply) => {
		const parsed = itemSchema.safeParse(req.body);
		if (!parsed.success) return reply.status(400).send(parsed.error);
		inventory.push(parsed.data);
		return { ok: true };
	});

	app.put('/inventory/:id', async (req, reply) => {
		const id = (req.params as any).id as string;
		const parsed = itemSchema.partial().safeParse(req.body);
		if (!parsed.success) return reply.status(400).send(parsed.error);
		const idx = inventory.findIndex((i) => i.id === id);
		if (idx === -1) return reply.status(404).send({ error: 'Not found' });
		inventory[idx] = { ...inventory[idx], ...parsed.data } as FridgeItem;
		return { ok: true };
	});

	app.delete('/inventory/:id', async (req, reply) => {
		const id = (req.params as any).id as string;
		inventory = inventory.filter((i) => i.id !== id);
		return { ok: true };
	});
}