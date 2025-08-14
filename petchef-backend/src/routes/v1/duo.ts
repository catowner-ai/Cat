import type { FastifyInstance } from 'fastify';
import { recipes as memRecipes, inventory as memInventory } from '../../lib/sampleData.js';
import { rankRecipesByInventory } from '../../lib/rules.js';

export async function duoRoutes(app: FastifyInstance): Promise<void> {
	app.get('/duo/suggest', async (req, reply) => {
		const humanRanked = rankRecipesByInventory(memRecipes, memInventory, 'human');
		const petRanked = rankRecipesByInventory(memRecipes, memInventory, 'pet');

		const petByBase = new Map(
			petRanked
				.filter((r) => r.recipe.baseRecipeId)
				.map((r) => [r.recipe.baseRecipeId as string, r])
		);

		const pairs = humanRanked
			.filter((h) => h.recipe.baseRecipeId && petByBase.has(h.recipe.baseRecipeId))
			.map((h) => {
				const p = petByBase.get(h.recipe.baseRecipeId as string)!;
				return {
					baseRecipeId: h.recipe.baseRecipeId,
					score: h.score + p.score,
					human: h,
					pet: p,
				};
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, 5);

		return { pairs };
	});
}