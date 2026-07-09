export async function sendVerificationEmail(email: string, verificationLink: string, companyName: string) {
  console.log(`\n==================================================`);
  console.log(`[EMAIL SIMULATION] Verification dispatched to: ${email}`);
  console.log(`Company Workspace: ${companyName}`);
  console.log(`Verification URL: ${verificationLink}`);
  console.log(`==================================================\n`);

  return {
    sent: false,
    simulated: true,
    message: "Local console simulation mode. Link printed in server logs."
  };
}
