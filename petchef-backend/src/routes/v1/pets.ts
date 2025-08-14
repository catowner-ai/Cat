import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PetProfile } from '../../lib/types.js';
import { pets as memPets } from '../../lib/sampleData.js';
import { estimatePetCaloriesPerMeal } from '../../lib/rules.js';

let pets: PetProfile[] = [...memPets];

const petSchema = z.object({
	id: z.string(),
	householdId: z.string(),
	name: z.string(),
	species: z.enum(['dog', 'cat', 'other']),
	breed: z.string().optional(),
	birthdate: z.string().optional(),
	weightKg: z.number().positive(),
	allergies: z.array(z.string()).optional(),
	activityLevel: z.enum(['low', 'normal', 'high']),
});

export async function petRoutes(app: FastifyInstance): Promise<void> {
	app.get('/pets', async () => ({ pets }));
	app.post('/pets', async (req, reply) => {
		const parsed = petSchema.safeParse(req.body);
		if (!parsed.success) return reply.status(400).send(parsed.error);
		pets.push(parsed.data);
		return { ok: true };
	});
	app.get('/pets/:id/calories', async (req, reply) => {
		const id = (req.params as any).id as string;
		const pet = pets.find((p) => p.id === id);
		if (!pet) return reply.status(404).send({ error: 'Not found' });
		const kcal = estimatePetCaloriesPerMeal(pet);
		return { kcalPerMeal: kcal };
	});
}