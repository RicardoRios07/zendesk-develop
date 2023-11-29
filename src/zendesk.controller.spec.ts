import { Test, TestingModule } from '@nestjs/testing';
import { ZendeskController } from './zendesk.controller';
import { createClient, ZendeskClientOptions } from 'node-zendesk';

jest.mock('node-zendesk', () => ({
    createClient: jest.fn(),
}));

describe('ZendeskController', () => {
    let controller: ZendeskController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ZendeskController],
        }).compile();

        controller = module.get<ZendeskController>(ZendeskController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should create a ticket', async () => {
        // Mock de createClient
        const createClientMock = createClient as jest.Mock;
        createClientMock.mockImplementationOnce(() => ({
            tickets: {
                create: jest.fn().mockResolvedValueOnce({
                    ticket: { id: 123, subject: 'Test Subject' },
                }),
            },
        }));

        const requestBody = {
            motivo: 'Test Motivo',
            descripcion: 'Test Descripcion',
        };

        const result = await controller.handleRequest(requestBody);

        // Asegurarse de que la respuesta es la esperada
        expect(result.status).toEqual('Éxito');
        expect(result.zendeskTicket.id).toEqual(123);
        expect(result.zendeskTicket.subject).toEqual('Test Subject');

        // Asegurarse de que createClient se llamó con las credenciales correctas
        expect(createClientMock).toHaveBeenCalledWith({
            username: process.env.ZENDESK_USERNAME,
            token: process.env.ZENDESK_API_TOKEN,
            subdomain: process.env.ZENDESK_SUBDOMAIN,
        });

        // Asegurarse de que tickets.create se llamó con la estructura correcta del ticket
        const createTicketMock = createClientMock().tickets.create as jest.Mock;
        expect(createTicketMock).toHaveBeenCalledWith({
            ticket: {
                comment: {
                    body: 'Test Descripcion',
                },
                priority: 'urgent',
                subject: 'Test Motivo',
            },
        });
    });
});
