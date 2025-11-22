# Firebase Email Deliverability Guide

Firebase authentication emails often go to spam because they're sent from Firebase's default domain (`noreply@<project-id>.firebaseapp.com`). Here are solutions to improve deliverability:

## Solution 1: Use Custom Domain (Recommended - Best Results)

This is the **best long-term solution** and requires a **Firebase Blaze (paid) plan**.

### Steps:

1. **Go to Firebase Console:**
   - Navigate to **Authentication** > **Templates**
   - Click the **pencil icon** to edit any email template (e.g., "Email address verification")

2. **Add Custom Domain:**
   - Click **"Customize domain"** or **"Authorized domains"**
   - Add your domain (e.g., `yourdomain.com`)
   - Firebase will provide DNS records to add

3. **Add DNS Records:**
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add the TXT record Firebase provides for domain verification
   - Wait for DNS propagation (can take up to 48 hours)

4. **Verify Domain:**
   - Once verified, Firebase will send emails from `noreply@yourdomain.com`
   - This significantly improves deliverability

### Benefits:
- ✅ Professional sender address
- ✅ Better email reputation
- ✅ Higher inbox delivery rates
- ✅ Brand consistency

---

## Solution 2: Customize Email Templates

Even without a custom domain, you can improve emails:

1. **Go to Firebase Console:**
   - **Authentication** > **Templates**
   - Click the **pencil icon** on any template

2. **Customize:**
   - Add your app name
   - Customize the subject line
   - Add your logo/branding
   - Improve the email content

3. **Best Practices:**
   - Use clear, professional language
   - Include your app name in subject
   - Add a clear call-to-action
   - Include contact information

---

## Solution 3: Use Custom SMTP Server (Advanced)

If you have a Blaze plan, you can use your own SMTP server:

1. **Choose an Email Service:**
   - **SendGrid** (recommended - free tier available)
   - **Mailgun** (good deliverability)
   - **Amazon SES** (cost-effective)
   - **Postmark** (excellent deliverability)

2. **Set Up SendGrid (Example):**
   - Sign up at [sendgrid.com](https://sendgrid.com)
   - Create an API key
   - Verify your domain in SendGrid
   - Get SMTP credentials

3. **Configure in Firebase:**
   - Go to **Authentication** > **Templates**
   - Click **"SMTP Settings"**
   - Enable custom SMTP
   - Enter your SMTP server details:
     - **SMTP Host:** `smtp.sendgrid.net`
     - **SMTP Port:** `587` (or `465` for SSL)
     - **SMTP Username:** `apikey`
     - **SMTP Password:** Your SendGrid API key

4. **Configure DNS Records:**
   - Add SPF record: `v=spf1 include:sendgrid.net ~all`
   - Add DKIM records (provided by SendGrid)
   - Add DMARC record (optional but recommended)

---

## Solution 4: Immediate Actions (No Setup Required)

While setting up the above solutions:

1. **Update Verification Screen:**
   - Already done! Your verification screen tells users to check spam folder

2. **User Education:**
   - Add a note in your app about checking spam
   - Consider adding this to the verification screen

3. **Email Content:**
   - Make sure Firebase email templates are customized
   - Use professional language

---

## Quick Fix: Update Verification Screen Message

You can update the verification screen to be more explicit about spam:

```typescript
// In VerificationScreen.tsx, update the instruction text:
<Text style={styles.instruction}>
    please check your inbox and click the verification link to activate your account.
    {'\n\n'}if you don't see the email, check your spam/junk folder. 
    {'\n\n'}tip: add noreply@[your-project].firebaseapp.com to your contacts to prevent future emails from going to spam.
</Text>
```

---

## Recommended Approach

1. **Short-term:** Customize email templates in Firebase Console
2. **Medium-term:** Set up a custom domain (requires Blaze plan)
3. **Long-term:** Consider custom SMTP with SendGrid for maximum control

---

## Firebase Console Steps (Quick Reference)

1. Go to: https://console.firebase.google.com
2. Select your project
3. Navigate to: **Authentication** > **Templates**
4. Click the **pencil icon** on any email template
5. Customize the template or set up custom domain/SMTP

---

## Testing

After making changes:
1. Send a test verification email
2. Check if it arrives in inbox (not spam)
3. Test with different email providers (Gmail, Outlook, Yahoo)
4. Monitor deliverability over time

---

## Additional Resources

- [Firebase Email Templates Documentation](https://firebase.google.com/docs/auth/custom-email-handler)
- [SendGrid Setup Guide](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp)
- [SPF/DKIM/DMARC Guide](https://www.dmarcanalyzer.com/spf-dkim-dmarc/)

