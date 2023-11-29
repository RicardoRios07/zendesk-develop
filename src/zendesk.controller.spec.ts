import { Test, TestingModule } from '@nestjs/testing';
import { ZendeskController } from './zendesk.controller';
import { createClient } from 'node-zendesk';

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
        const createClientMock = createClient as jest.Mock;
        createClientMock.mockImplementationOnce(() => ({
            tickets: {
                create: jest.fn().mockResolvedValueOnce({
                    ticket: { id: 123, subject: 'Test Subject' },
                }),
            },
        }));

        const getGroupIdSpy = jest.spyOn(controller, 'getGroupId');
        getGroupIdSpy.mockResolvedValueOnce(1); 

        const requestBody = {
            motive: 'Test Motivo',
            description: 'Test Descripcion',
            product: 'Test Product',
            user: 'Test User',
            email: 'test@example.com',
            phone: '123456789',
            city: 'Test City',
        };

        const result = await controller.handleRequest(requestBody);

        expect(result.status).toEqual('Éxito');
        expect(result.zendeskTicket.id).toEqual(123);
        expect(result.zendeskTicket.subject).toEqual('Test Subject');

        expect(createClientMock).toHaveBeenCalledWith({
            username: process.env.ZENDESK_USERNAME,
            token: process.env.ZENDESK_API_TOKEN,
            subdomain: process.env.ZENDESK_SUBDOMAIN,
        });

        const createTicketMock = createClientMock().tickets.create as jest.Mock;
        expect(createTicketMock).toHaveBeenCalledWith({
            ticket: {
                comment: {
                    body: 'Test Descripcion\n\nUsuario: Test User\nCorreo electrónico: test@example.com\nTeléfono: 123456789',
                },
                priority: 'urgent',
                subject: 'Test Motivo',
                group_id: 1, 
            },
        });

        expect(getGroupIdSpy).toHaveBeenCalledWith('Test Product', 'Test City');
    });
});
