import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './v1/health.js';
import { inventoryRoutes } from './v1/inventory.js';
import { petRoutes } from './v1/pets.js';
import { recipeRoutes } from './v1/recipes.js';
import { duoRoutes } from './v1/duo.js';

export function registerRoutes(app: FastifyInstance): void {
	app.register(healthRoutes, { prefix: '/v1' });
	app.register(inventoryRoutes, { prefix: '/v1' });
	app.register(petRoutes, { prefix: '/v1' });
	app.register(recipeRoutes, { prefix: '/v1' });
	app.register(duoRoutes, { prefix: '/v1' });
}