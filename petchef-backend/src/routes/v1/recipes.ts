import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Recipe } from '../../lib/types.js';
import { recipes as memRecipes, inventory as memInventory } from '../../lib/sampleData.js';
import { rankRecipesByInventory } from '../../lib/rules.js';

let recipes: Recipe[] = [...memRecipes];

const recipeSchema = z.object({
	id: z.string(),
	title: z.string(),
	variant: z.enum(['human', 'pet']),
	baseRecipeId: z.string().nullable().optional(),
	ingredients: z.array(
		z.object({
			name: z.string(),
			qty: z.number().positive(),
			unit: z.string(),
			optional: z.boolean().optional(),
		})
	),
	steps: z.array(z.string()),
	dietTags: z.array(z.string()).optional(),
	petSafety: z
		.object({ safeFor: z.array(z.enum(['dog', 'cat', 'other'])).optional(), avoid: z.array(z.string()).optional() })
		.optional(),
});

export async function recipeRoutes(app: FastifyInstance): Promise<void> {
	app.get('/recipes', async () => ({ recipes }));
	app.post('/recipes', async (req, reply) => {
		const parsed = recipeSchema.safeParse(req.body);
		if (!parsed.success) return reply.status(400).send(parsed.error);
		recipes.push(parsed.data);
		return { ok: true };
	});

	app.get('/recipes/suggest', async (req, reply) => {
		const q = (req.query || {}) as any;
		const variant = (q.variant as 'human' | 'pet') || 'human';
		const ranked = rankRecipesByInventory(recipes, memInventory, variant).slice(0, 5);
		return { variant, suggestions: ranked };
	});
}