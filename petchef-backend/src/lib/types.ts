export type LocaleCode = 'zh-TW' | 'en-US';

export interface User {
	id: string;
	email: string;
	householdId: string;
	locale: LocaleCode;
}

export interface Household {
	id: string;
	name: string;
}

export type ItemTag = 'human' | 'pet' | 'shared';

export interface FridgeItem {
	id: string;
	householdId: string;
	name: string;
	quantity: number;
	unit: string;
	expiresOn: string; // ISO date string
	tags: ItemTag[];
	barcode?: string | null;
}

export type Species = 'dog' | 'cat' | 'other';
export type ActivityLevel = 'low' | 'normal' | 'high';

export interface PetProfile {
	id: string;
	householdId: string;
	name: string;
	species: Species;
	breed?: string;
	birthdate?: string; // ISO date
	weightKg: number;
	allergies?: string[];
	activityLevel: ActivityLevel;
}

export type RecipeVariant = 'human' | 'pet';

export interface RecipeIngredient {
	name: string;
	qty: number;
	unit: string;
	optional?: boolean;
}

export interface Recipe {
	id: string;
	title: string;
	variant: RecipeVariant;
	baseRecipeId?: string | null;
	ingredients: RecipeIngredient[];
	steps: string[];
	dietTags?: string[];
	petSafety?: { safeFor?: Species[]; avoid?: string[] };
}

export interface Plan {
	id: string;
	householdId: string;
	date: string; // ISO date
	humanRecipeId: string;
	petRecipeId: string;
}

export interface FeedingLog {
	id: string;
	petId: string;
	time: string; // ISO datetime
	calories: number;
	notes?: string;
}

export interface ShoppingItem {
	id: string;
	householdId: string;
	name: string;
	qty: number;
	unit: string;
	fulfilled: boolean;
}