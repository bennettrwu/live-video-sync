import {FastifyInstance} from 'fastify';

export default async function accounts(fastify: FastifyInstance) {
  fastify.get('/', (res, req) => {
    const accountController = res.diScope.resolve('accountsController');
    accountController.test();
    return req.send('hi');
  });
}
