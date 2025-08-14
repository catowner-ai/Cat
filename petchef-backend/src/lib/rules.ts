import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { FridgeItem, PetProfile, Recipe } from './types.js';

export interface RecipeMatch {
	recipe: Recipe;
	score: number;
	missing: { name: string; qty: number; unit: string }[];
}

const PET_TOXINS = new Set([
	'onion',
	'garlic',
	'chocolate',
	'grapes',
	'raisins',
	'xylitol',
	'alcohol',
]);

export function isIngredientPetUnsafe(ingredientName: string): boolean {
	const key = ingredientName.trim().toLowerCase();
	return Array.from(PET_TOXINS).some((t) => key.includes(t));
}

export function rankRecipesByInventory(
	recipes: Recipe[],
	inventory: FridgeItem[],
	variant: 'human' | 'pet'
): RecipeMatch[] {
	const now = new Date();
	const inventoryByName = new Map<string, FridgeItem>(
		inventory.map((i) => [i.name.toLowerCase(), i])
	);

	return recipes
		.filter((r) => r.variant === variant)
		.map((r) => {
			let score = 0;
			const missing: RecipeMatch['missing'] = [];

			for (const ing of r.ingredients) {
				const inv = inventoryByName.get(ing.name.toLowerCase());
				if (!inv || inv.quantity < ing.qty) {
					missing.push({ name: ing.name, qty: ing.qty, unit: ing.unit });
					score -= ing.optional ? 0.5 : 2;
				} else {
					score += 2;
					const days = differenceInCalendarDays(parseISO(inv.expiresOn), now);
					if (days <= 2) score += 2; // near expiry boost
				}
			}

			// Penalize pet variant if contains unsafe ingredients by metadata or by heuristic
			if (variant === 'pet') {
				const hasUnsafe = r.ingredients.some((i) => isIngredientPetUnsafe(i.name));
				if (hasUnsafe) score -= 5;
			}

			return { recipe: r, score, missing };
		})
		.sort((a, b) => b.score - a.score);
}

export function estimatePetCaloriesPerMeal(pet: PetProfile): number {
	// RER = 70 * BW^0.75; MER factor by activity 1.2-1.8 dogs, 1.0-1.4 cats
	const bodyWeight = pet.weightKg;
	const rer = 70 * Math.pow(bodyWeight, 0.75);
	const factor = pet.species === 'dog'
		? (pet.activityLevel === 'high' ? 1.8 : pet.activityLevel === 'low' ? 1.2 : 1.5)
		: (pet.activityLevel === 'high' ? 1.4 : pet.activityLevel === 'low' ? 1.0 : 1.2);
	const mer = rer * factor;
	return Math.round(mer / 2); // assume two meals/day
}