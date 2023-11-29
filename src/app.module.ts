import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ZendeskController } from './zendesk.controller';

@Module({
  imports: [],
  controllers: [ZendeskController],
  providers: [],
})
export class AppModule {}
