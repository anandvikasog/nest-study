export const verifyEmailTemplate = (verificationLink: string) => {
  return `
      <p>Hello,</p>
      <p>Thank you for signing up. Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>This link will expire in 1 hour.</p>
    `;
};
