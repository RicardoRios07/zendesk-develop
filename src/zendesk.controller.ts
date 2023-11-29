import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { createClient } from 'node-zendesk';

@Controller('zendesk')
export class ZendeskController {
    private readonly logger = new Logger(ZendeskController.name);

    private zendeskClient: any;

    private grupos: { nombre: string; id: number }[] = [];

    constructor() {
        this.zendeskClient = createClient({
            username: process.env.ZENDESK_USERNAME,
            token: process.env.ZENDESK_API_TOKEN,
            subdomain: process.env.ZENDESK_SUBDOMAIN,
        });
    }

    async getGroupId(product: string, location: string): Promise<number | undefined> {
        try {
            const zendeskGroups = await this.zendeskClient.groups.list();
            this.grupos = zendeskGroups.map(group => ({
                id: group.id,
                nombre: group.name,
            }));

            const productGroups = ['Buses', 'Delivery', 'Eventos', 'Karview', 'Kparking', 'Proyectos Especiales'];
            if (productGroups.includes(product)) {
                const grupo = this.grupos.find(grupo => grupo.nombre === `Soporte ${product}`);
                return grupo ? grupo.id : this.getGroupIdForDefaultGroup('Soporte Loja');
            } else {

                const grupo = this.grupos.find(grupo => grupo.nombre === `Soporte ${location}`);
                return grupo ? grupo.id : this.getGroupIdForDefaultGroup('Soporte Loja');
            }
        } catch (error) {
            this.logger.error('Error al obtener grupos desde Zendesk', error);
            throw error;
        }
    }


    @Post('ticketSender')
    async handleRequest(@Body() requestBody: any) {
        try {
            const requiredFields = ['motive', 'description', 'product', 'user', 'email', 'phone', 'location'];

            const hasAllRequiredFields = requiredFields.every(field => Object.keys(requestBody).includes(field));

            if (!hasAllRequiredFields) {
                this.logger.error('Campos incorrectos en la solicitud');
                return { error: 'Por favor, proporcione todos los campos requeridos.' };
            }

            const { motive, description, product, user, email, phone, location } = requestBody;

            if (!this.zendeskClient) {
                this.logger.error('Error: Cliente Zendesk no inicializado correctamente');
                return { status: 'Error', error: 'Error al procesar la solicitud' };
            }
    
            const groupId = await this.getGroupId(product, location);

            const zendeskTicket = {
                ticket: {
                    comment: {
                        body: `${description}\n\nUsuario: ${user}\nCorreo electrónico: ${email}\nTeléfono: ${phone}`,
                    },
                    priority: 'urgent',
                    subject: motive,
                    group_id: groupId,
                },
            };

            // this.logger.log('ZENDESK TICKET', zendeskTicket);

            const zendeskResponse = await this.zendeskClient.tickets.create(zendeskTicket);

            this.logger.log('Petición recibida y enviada a Zendesk con éxito');

            return {
                status: 'Éxito',
                message: 'Ticket creado exitosamente',
                data: { motive, description, product, user, email, phone, location },
                zendeskTicket: zendeskResponse.ticket,
            };
        } catch (error) {
            this.logger.error('Error al procesar la solicitud', error);
            throw error;
        }
    }

    private getGroupIdForDefaultGroup(defaultGroupName: string): number | undefined {
        const defaultGroup = this.grupos.find(grupo => grupo.nombre === defaultGroupName);
        return defaultGroup?.id;
    }

    @Get('grupos')
    async getAllGroups() {
        try {
            const zendeskGroups = await this.zendeskClient.groups.list();
            const grupos = zendeskGroups.map(group => ({
                id: group.id,
                nombre: group.name,
            }));

            return {
                status: 'Éxito',
                data: grupos,
            };
        } catch (error) {
            this.logger.error('Error al obtener la lista de grupos desde Zendesk', error);
            throw error;
        }
    }
}
