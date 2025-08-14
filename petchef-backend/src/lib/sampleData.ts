import { addDays, formatISO } from 'date-fns';
import type { FridgeItem, PetProfile, Recipe } from './types.js';

const householdId = 'hh-demo';

const todayIso = formatISO(new Date(), { representation: 'date' });

export const inventory: FridgeItem[] = [
	{
		id: 'item-chicken',
		householdId,
		name: 'Chicken Breast',
		quantity: 2,
		unit: 'pcs',
		expiresOn: formatISO(addDays(new Date(), 2), { representation: 'date' }),
		tags: ['shared'],
	},
	{
		id: 'item-carrot',
		householdId,
		name: 'Carrot',
		quantity: 4,
		unit: 'pcs',
		expiresOn: formatISO(addDays(new Date(), 5), { representation: 'date' }),
		tags: ['shared'],
	},
	{
		id: 'item-onion',
		householdId,
		name: 'Onion',
		quantity: 1,
		unit: 'pcs',
		expiresOn: formatISO(addDays(new Date(), 6), { representation: 'date' }),
		tags: ['human'],
	},
	{
		id: 'item-rice',
		householdId,
		name: 'White Rice',
		quantity: 500,
		unit: 'g',
		expiresOn: formatISO(addDays(new Date(), 120), { representation: 'date' }),
		tags: ['shared'],
	},
];

export const pets: PetProfile[] = [
	{
		id: 'pet-momo',
		householdId,
		name: 'Momo',
		species: 'dog',
		breed: 'Shiba Inu',
		weightKg: 9.5,
		activityLevel: 'normal',
		allergies: ['beef'],
	},
];

export const recipes: Recipe[] = [
	{
		id: 'rec-chicken-bowl-human',
		title: '簡易雞肉蔬菜飯 Human Chicken Veggie Rice',
		variant: 'human',
		baseRecipeId: 'rec-chicken-bowl-base',
		ingredients: [
			{ name: 'Chicken Breast', qty: 1, unit: 'pcs' },
			{ name: 'Carrot', qty: 1, unit: 'pcs' },
			{ name: 'Onion', qty: 0.5, unit: 'pcs', optional: true },
			{ name: 'White Rice', qty: 120, unit: 'g' },
		],
		steps: [
			'Cook rice. ',
			'Dice chicken and vegetables.',
			'Stir-fry with salt, pepper, and a splash of soy sauce.',
		],
		dietTags: ['home_style'],
		petSafety: { avoid: ['onion', 'garlic', 'chocolate'] },
	},
	{
		id: 'rec-chicken-bowl-pet',
		title: '寵物雞肉蔬菜碗 Pet-safe Chicken Veggie Bowl',
		variant: 'pet',
		baseRecipeId: 'rec-chicken-bowl-base',
		ingredients: [
			{ name: 'Chicken Breast', qty: 0.3, unit: 'pcs' },
			{ name: 'Carrot', qty: 0.25, unit: 'pcs' },
			{ name: 'White Rice', qty: 40, unit: 'g' },
		],
		steps: [
			'Boil or steam chicken and carrots without salt or seasoning.',
			'Shred chicken; chop carrots finely.',
			'Mix with cooked rice; cool to lukewarm before serving.',
		],
		dietTags: ['low_sodium'],
		petSafety: { safeFor: ['dog'] },
	},
];