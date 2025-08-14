import { describe, it, expect } from 'vitest';
import { inventory, recipes, pets } from '../src/lib/sampleData.js';
import { rankRecipesByInventory, estimatePetCaloriesPerMeal, isIngredientPetUnsafe } from '../src/lib/rules.js';

describe('rules engine', () => {
	it('ranks pet-safe recipes higher and flags missing ingredients', () => {
		const ranked = rankRecipesByInventory(recipes, inventory, 'pet');
		expect(ranked.length).toBeGreaterThan(0);
		expect(ranked[0].recipe.variant).toBe('pet');
	});

	it('detects common toxins as unsafe for pets', () => {
		expect(isIngredientPetUnsafe('Onion')).toBe(true);
		expect(isIngredientPetUnsafe('Chocolate chips')).toBe(true);
		expect(isIngredientPetUnsafe('Chicken')).toBe(false);
	});

	it('estimates calories per meal for a dog', () => {
		const momo = pets[0];
		const kcal = estimatePetCaloriesPerMeal(momo);
		expect(kcal).toBeGreaterThan(100);
	});
});