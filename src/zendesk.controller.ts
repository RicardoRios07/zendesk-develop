import { Controller, Post, Get, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { createClient } from 'node-zendesk';

interface Grupo {
    nombre: string;
    id: number;
}

@Controller('zendesk')
export class ZendeskController {
    private readonly logger = new Logger(ZendeskController.name);
    private zendeskClient: any;
    private grupos: Grupo[] = [];
    private productGroups: { [key: string]: string[] } = {
        'Loja': ['KTaxi', 'Eventos', 'Delivery', 'Karview', 'Buses', 'Proyectos Especiales'],
        'Ambato': ['KTaxi', 'Parking'],
        'Cuenca': ['KTaxi'],
        'Ibarra': ['KTaxi', 'Karview'],
        'Tulcán': ['Karview'],
        'Santo Domingo': ['KTaxi'],
        'Quito': ['KTaxi'],
        'Riobamba': ['KTaxi'],
        'Perú': ['KTaxi'],
        'Colombia': ['KTaxi', 'Buses'],
        'Chile': ['KTaxi'],
        'México': ['Buses'],
        'Bolivia': ['KTaxi'],
    };

    constructor() {
        this.zendeskClient = createClient({
            username: process.env.ZENDESK_USERNAME,
            token: process.env.ZENDESK_API_TOKEN,
            subdomain: process.env.ZENDESK_SUBDOMAIN,
        });
    }

    private async getGroupId(product: string, location: string): Promise<number> {
        try {
            const zendeskGroups = await this.zendeskClient.groups.list();
            this.grupos = zendeskGroups.map(group => ({ id: group.id, nombre: group.name }));

            this.logger.log('Location:', location);
            this.logger.log('Product:', product);
            this.logger.log('Product Groups:', this.productGroups);

            const isLocationValid = this.productGroups.hasOwnProperty(location);
            const isProductAvailable = this.isProductAvailableInLocation(product, location);

            if (!isLocationValid || !isProductAvailable) {
                throw new Error('Producto no válido para la ubicación enviada');
            }

            const groupName = this.determineGroupName(product, location);
            const grupo = this.grupos.find(grupo => grupo.nombre === groupName);

            this.logger.log('Grupo encontrado:', groupName);
            this.logger.log('Grupo seleccionado:', grupo);

            return grupo ? grupo.id : this.getGroupIdForDefaultGroup('Soporte Loja');
        } catch (error) {
            this.logger.error('Error al obtener grupos desde Zendesk', error);
            throw error;
        }
    }

    private determineGroupName(product: string, location: string): string {
        if (location === 'Loja') {
            return `Soporte ${product}`;
        } else {
            return `Soporte ${location}`;
        }
    }

    @Post('ticketSender')
    async handleRequest(@Body() requestBody: any) {
        try {
            const requiredFields = ['motive', 'description', 'product', 'user', 'email', 'phone', 'groupId'];
            console.log("🚀 ~ file: zendesk.controller.ts:79 ~ ZendeskController ~ handleRequest ~ requiredFields:", requiredFields)

            

            const { motive, description, user, email, phone, groupId } = requestBody;

     
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

            const zendeskResponse = await this.zendeskClient.tickets.create(zendeskTicket);

            this.logger.log('Petición recibida y enviada a Zendesk con éxito');

            return {
                status: 'Éxito',
                message: 'Ticket creado exitosamente',
                data: { motive, description, groupId, user, email, phone },
                zendeskTicket: zendeskResponse.ticket,
            };
        } catch (error) {
            this.logger.error('Error al procesar la solicitud', error);
            throw error;
        }
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



    private getGroupIdForDefaultGroup(defaultGroupName: string): number | undefined {
        const defaultGroup = this.grupos.find(grupo => grupo.nombre === defaultGroupName);
        return defaultGroup?.id;
    }

    private isProductAvailableInLocation(product: string, location: string): boolean {
        const availableProducts = this.productGroups[location];

        if (!availableProducts) {
            return false;
        }

        this.logger.log('Available Products for Location:', availableProducts);

        return availableProducts.includes(product);
    }
}