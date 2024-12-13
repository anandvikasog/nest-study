import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Ensure the API key is set
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL, // Add your verified sender email
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      if (error.response) {
        console.error('SendGrid response error:', error.response.body);
      }
      throw new Error('Unable to send email');
    }
  }
}
