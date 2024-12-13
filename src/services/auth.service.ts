import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from './email.service';
import { verifyEmailTemplate } from 'src/utils/emailTemplates';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  async signup(email: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new HttpException(
        { message: 'User already exists', success: false },
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailVerifyToken = this.jwtService.sign(
      { email },
      { expiresIn: '1h' },
    );

    // Insert the new user into the database
    await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerifyToken,
      },
    });

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${emailVerifyToken}`;
    const emailContent = verifyEmailTemplate(verificationLink);
    await this.emailService.sendEmail(
      email,
      'Verify Your Email Address',
      emailContent,
    );

    return {
      message:
        'Signup successful. Please check your email to verify your account.',
      success: true,
    };
  }
}
