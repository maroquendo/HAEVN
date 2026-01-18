/**
 * Service to simulate sending emails for family invitations.
 * Since we don't have a backend to send real emails, this service will:
 * 1. Log the email content to the console.
 * 2. Provide a way to generate invite links that can be manually shared.
 */

export const generateInviteLink = (familyId: string, email: string): string => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
        invite: familyId,
        email: email
    });
    return `${baseUrl}/?${params.toString()}`;
};

export const sendInviteEmail = async (to: string, familyName: string, inviteLink: string): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    console.group('📧 [SIMULATED EMAIL] Family Invitation');
    console.log(`To: ${to}`);
    console.log(`Subject: Join ${familyName} on HAEVN`);
    console.log(`Body:`);
    console.log(`You have been invited to join the family "${familyName}" on HAEVN.`);
    console.log(`Click the link below to accept the invitation:`);
    console.log(inviteLink);
    console.groupEnd();

    // In a real app, this would make an API call to a backend service.
    return Promise.resolve();
};
