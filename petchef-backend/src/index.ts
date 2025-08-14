import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes/registerRoutes.js';

const server = Fastify({ logger: true });
await server.register(cors, { origin: true });

registerRoutes(server);

const port = Number(process.env.PORT || 8787);
const host = '0.0.0.0';

server.listen({ port, host })
	.then((address) => {
		server.log.info(`PetChef API listening at ${address}`);
	})
	.catch((err) => {
		server.log.error(err);
		process.exit(1);
	});