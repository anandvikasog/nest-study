import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth.module';
import { EmailService } from './services/email.service';

@Module({
  imports: [AuthModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class AppModule {}
