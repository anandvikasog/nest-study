import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailService } from './email.service';
import {
  resetPasswordTemplate,
  verifyEmailTemplate,
} from 'src/utils/emailTemplates';
import { PrismaService } from './prisma.service';
import { Response } from 'express';

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
        { message: 'User already exists' },
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
    const verificationLink = `${process.env.FRONTEND_URL}/auth/verify-email?token=${emailVerifyToken}`;
    const emailContent = verifyEmailTemplate(verificationLink);
    await this.emailService.sendEmail(
      email,
      'Verify Your Email Address',
      emailContent,
    );

    return {
      message:
        'Signup successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string, res: Response) {
    const existingUser = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token, isEmailVerified: false },
    });

    if (!existingUser) {
      return res.redirect(`${process.env.FRONTEND_URL}/verify-email/fail`);
    }

    // Update the user's verification status
    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null, // Clear the token after verification
      },
    });
    return res.redirect(`${process.env.FRONTEND_URL}/verify-email/success`);
  }

  async login(email: string, password: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!existingUser) {
      throw new HttpException(
        { message: 'Incorrect email or password' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!existingUser.isEmailVerified) {
      throw new HttpException(
        { message: 'Please verify your email to login.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const isPasswordMatched = await bcrypt.compare(
      password,
      existingUser.password,
    );

    if (!isPasswordMatched) {
      throw new HttpException(
        { message: 'Incorrect email or password' },
        HttpStatus.NOT_FOUND,
      );
    }

    const accessToken = this.jwtService.sign({ id: existingUser.id });
    const newLoginToken = { token: accessToken, device: 'Chrome on Windows' };

    const MAX_TOKENS = 5;
    const updatedTokens: any = existingUser.loginTokens || [];
    if (updatedTokens.length >= MAX_TOKENS) {
      updatedTokens.shift(); // Remove the oldest token
    }
    updatedTokens.push(newLoginToken);

    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: { loginTokens: updatedTokens },
    });

    return {
      message: 'Logged in successfully.',
      token: accessToken,
      data: {
        id: existingUser.id,
        email: existingUser.email,
      },
    };
  }

  async forgetPassword(email: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!existingUser) {
      throw new HttpException(
        { message: 'User not exists' },
        HttpStatus.NOT_FOUND,
      );
    }

    if (!existingUser.isEmailVerified) {
      throw new HttpException(
        { message: 'Please verify your email.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const resetPasswordToken = this.jwtService.sign({ id: existingUser.id });

    // Send reset password email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetPasswordToken}`;
    const emailContent = resetPasswordTemplate(resetLink);
    await this.emailService.sendEmail(
      email,
      'Reset Your Password',
      emailContent,
    );

    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        resetPasswordToken,
      },
    });

    return {
      message: 'Reset password link send.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { resetPasswordToken: token },
    });

    if (!existingUser) {
      throw new HttpException(
        { message: 'Unauthorised' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!existingUser.isEmailVerified) {
      throw new HttpException(
        { message: 'Please verify your email.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
      },
    });

    return {
      message: 'Password reset successfully.',
    };
  }
}
