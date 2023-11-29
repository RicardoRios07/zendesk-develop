import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ZendeskController (e2e)', () => {
  let app;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/zendesk/ticketSender (POST) - should create a ticket', async () => {
    const requestBody = {
      motivo: 'Test Motivo',
      descripcion: 'Test Descripcion',
    };

    const response = await request(app.getHttpServer())
      .post('/zendesk/ticketSender')
      .send(requestBody)
      .expect(201); // Assuming a successful response should have status 201

    expect(response.body.status).toEqual('Éxito');
    expect(response.body.zendeskTicket).toBeDefined();
    // Add more assertions as needed based on the expected response structure
  });

  afterAll(async () => {
    await app.close();
  });
});