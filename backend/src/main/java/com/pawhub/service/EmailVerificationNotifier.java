package com.pawhub.service;

import com.pawhub.config.PawhubProperties;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Sends verification email when SMTP ({@code spring.mail.*}) is configured; otherwise logs the link (local dev).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationNotifier {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final PawhubProperties pawhubProperties;

    public void sendVerificationEmail(String toEmail, String displayName, String verificationLink) {
        PawhubProperties.Mail mail = pawhubProperties.getMail();
        String subject = "Confirm your email — PawHub";
        String textBody =
                "Hi " + displayName + ",\n\n"
                        + "Welcome to the litter! Confirm your human account by opening this link (valid 48 hours).\n\n"
                        + verificationLink
                        + "\n\n"
                        + "If your inbox shows plain text only, use the link above — the full PawHub layout is in the HTML version.\n\n"
                        + "If you didn’t create a PawHub account, you can ignore this message.\n\n"
                        + "— The PawHub team\n";

        String htmlBody =
                buildVerificationEmailHtml(escapeHtml(displayName), verificationLink, escapeHtmlAttribute(logoUrlForEmail()));

        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender != null) {
            try {
                MimeMessage message = sender.createMimeMessage();
                // multipart + UTF-8 so clients get multipart/alternative (HTML + plain); HTML is styled like the app.
                MimeMessageHelper helper =
                        new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name());
                helper.setFrom(mail.getFrom(), mail.getFromName());
                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setText(textBody, htmlBody);
                sender.send(message);
                log.info("Verification email sent to {}", toEmail);
            } catch (Exception e) {
                log.error(
                        "Failed to send verification email to {}: {}",
                        toEmail,
                        e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName(),
                        e);
                if (isLikelySmtpAuthFailure(e)) {
                    logSmtpAuthTroubleshooting(e);
                }
                log.warn("Verification link for {}: {}", toEmail, verificationLink);
            }
        } else {
            log.warn(
                    "SMTP not configured (set spring.mail.host). Verification link for {}:\n{}",
                    toEmail,
                    verificationLink);
        }
    }

    private static void logSmtpAuthTroubleshooting(Throwable e) {
        String full = collectMessages(e);
        // Gmail: https://support.google.com/mail/?p=BadCredentials
        if (full.contains("BadCredentials")
                || full.contains("5.7.8")
                || full.contains("support.google.com/mail")) {
            log.warn(
                    "Gmail rejected the SMTP password (535 BadCredentials). Use a real Google *App Password*: "
                            + "google.com sign-in → Security → 2-Step Verification must be ON → App passwords → "
                            + "create one for 'Mail' / 'Other', then paste the 16 single letters into spring.mail.password "
                            + "with no spaces. Do not use your normal Gmail password, a custom team password, or Outlook-style keys. "
                            + "Username must be the exact @gmail.com address for that account.");
            return;
        }
        if (full.contains("SmtpClientAuthentication")
                || full.contains("5.7.139")
                || full.contains("smtp_auth_disabled")) {
            log.warn(
                    "Microsoft error 535.7.139: SMTP client authentication is disabled for the sending mailbox "
                            + "(spring.mail.username) — this is not fixed by a new app password. "
                            + "For local dev, switch application-local.yml (or MAIL_*) to Gmail: smtp.gmail.com + Google App Password; "
                            + "set pawhub.mail.from to that Gmail. "
                            + "For production use a provider with SMTP or API (SendGrid, Mailgun, SES). "
                            + "Work/school Microsoft 365 only: an admin can enable Authenticated SMTP for the user. "
                            + "https://aka.ms/smtp_auth_disabled");
            return;
        }
        log.warn(
                "SMTP auth failed for the *sender* account (spring.mail.username/password), not the recipient. "
                        + "Gmail: 2-Step Verification + 16-character App Password; MAIL_HOST=smtp.gmail.com; "
                        + "pawhub.mail.from should match MAIL_USERNAME.");
    }

    private static String collectMessages(Throwable e) {
        StringBuilder sb = new StringBuilder();
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t.getMessage() != null) {
                sb.append(t.getMessage()).append(' ');
            }
        }
        return sb.toString();
    }

    private static boolean isLikelySmtpAuthFailure(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            String m = t.getMessage();
            if (m != null) {
                String lower = m.toLowerCase();
                if (lower.contains("authentication")
                        || lower.contains("535")
                        || lower.contains("credentials")
                        || lower.contains("failed to authenticate")) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * HTML verification email: PawHub {@code theme.css} colors, Inter + Nunito. Inline styles for every client;
     * extra {@code <style>} block for resets + mobile padding where supported (Apple Mail, many web clients).
     * Placeholders: %s = display name (escaped), %s = verification URL (button href), %s = same URL (paste block),
     * %s = absolute logo URL for {@code <img src>} (attribute-escaped).
     */
    private String logoUrlForEmail() {
        String base = pawhubProperties.getPublicBaseUrl();
        if (base == null || base.isBlank()) {
            base = "http://localhost:8080";
        }
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + "/pawhub-logo.png";
    }

    private static String escapeHtmlAttribute(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        return raw.replace("&", "&amp;").replace("\"", "&quot;");
    }

    private String buildVerificationEmailHtml(
            String displayNameHtmlSafe, String verificationLink, String logoSrcAttrSafe) {
        String href = verificationLink == null ? "" : verificationLink.replace("&", "&amp;");
        // language=HTML
        return """
                <!DOCTYPE html>
                <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
                <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="x-apple-disable-message-reformatting">
                <meta name="color-scheme" content="light">
                <meta name="supported-color-schemes" content="light">
                <title>Confirm your email — PawHub</title>
                <!--[if mso]>
                <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
                <![endif]-->
                <style type="text/css">
                  /* Email-safe extras; critical layout still duplicated inline below. */
                  #MessageViewBody, #MessageWebViewDiv { width: 100%% !important; }
                  a { color: #2f6d5f; }
                  img { border: 0; outline: none; text-decoration: none; }
                  table { border-collapse: collapse !important; }
                  body, .ph-email-body-text {
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                  }
                  @media screen and (max-width: 620px) {
                    .ph-email-shell { padding: 20px 12px 36px 12px !important; }
                    .ph-email-card { border-radius: 18px !important; }
                    .ph-email-px { padding-left: 22px !important; padding-right: 22px !important; }
                    .ph-email-hero { padding: 22px 20px 18px 20px !important; }
                    .ph-email-btn td { border-radius: 999px !important; }
                    .ph-email-btn a { padding: 16px 26px !important; font-size: 15px !important; }
                  }
                </style>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Nunito:wght@600;700&display=swap" rel="stylesheet">
                </head>
                <body class="ph-email-body-text" style="margin:0;padding:0;background-color:#f6f3ef;">
                <!-- Preheader (inbox snippet; hidden in body) -->
                <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f6f3ef;opacity:0;">
                  Tap to verify your PawHub account — whiskers, matches &amp; forever homes await.
                </div>
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f3ef;">
                  <tr>
                    <td class="ph-email-shell" align="center" style="padding:32px 16px 48px 16px;background-color:#f6f3ef;background-image:radial-gradient(1200px 600px at 10%% -10%%,#e8f4f1 0%%,transparent 55%%),radial-gradient(900px 500px at 100%% 0%%,#fff4e0 0%%,transparent 50%%);">
                      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;">
                        <tr>
                          <td class="ph-email-card" style="border-radius:22px;overflow:hidden;border:1px solid #e3dcd4;background-color:#ffffff;box-shadow:0 10px 30px rgba(45,74,62,0.08),0 2px 10px rgba(45,74,62,0.04),0 0 0 1px rgba(255,255,255,0.6) inset;">
                            <!-- Accent stripe (matches --color-accent) -->
                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                              <tr><td style="height:5px;line-height:5px;font-size:0;background-color:#f4b942;">&nbsp;</td></tr>
                            </table>
                            <!-- Header: primary gradient like .ph-btn-primary -->
                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color:#3d8b7a;background-image:linear-gradient(135deg,#3d8b7a 0%%,#2f6d5f 100%%);">
                              <tr>
                                <td class="ph-email-hero" style="padding:28px 28px 22px 28px;text-align:center;border-bottom:1px solid rgba(255,253,249,0.12);">
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 10px auto;">
                                    <tr>
                                      <td align="center" style="padding:0 12px;">
                                        <img src="%s" width="280" alt="PawHub" style="display:block;margin:0 auto;height:auto;max-width:300px;border:0;outline:none;text-decoration:none;" />
                                      </td>
                                    </tr>
                                  </table>
                                  <p style="margin:8px 0 0 0;padding:0;font-family:'Inter',system-ui,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;font-weight:400;color:#e8f4f1;line-height:1.5;max-width:420px;margin-left:auto;margin-right:auto;">
                                    One cozy place for whiskers, matches, and forever homes.
                                  </p>
                                  <p style="margin:14px 0 0 0;padding:0;font-size:18px;line-height:1.2;color:rgba(255,253,249,0.9);letter-spacing:0.18em;">&#x1F43E; &#x1F43E; &#x1F43E;</p>
                                </td>
                              </tr>
                            </table>
                            <!-- Body -->
                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td class="ph-email-px" style="padding:28px 32px 8px 32px;font-family:'Inter',system-ui,Segoe UI,Helvetica,Arial,sans-serif;color:#2b2a28;">
                                  <p style="margin:0 0 10px 0;font-family:'Nunito',Georgia,serif;font-size:20px;font-weight:700;color:#2f6d5f;line-height:1.3;">Hi %s,</p>
                                  <p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#2b2a28;">
                                    You are <strong style="color:#2f6d5f;">one tail swish</strong> away from activating your <strong style="color:#2f6d5f;">human</strong> account.
                                    Tap the button so we know it is really you — your cat is already the boss.
                                  </p>
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px 0;">
                                    <tr>
                                      <td style="border-radius:10px;background-color:#fffdf9;border:1px solid #e3dcd4;padding:14px 16px;box-shadow:0 1px 0 rgba(255,255,255,0.9) inset;">
                                        <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6b6560;">Link expires in</p>
                                        <p style="margin:4px 0 0 0;font-family:'Nunito',Georgia,serif;font-size:18px;font-weight:700;color:#3d8b7a;">48 hours</p>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td class="ph-email-px" style="padding:0 32px 22px 32px;">
                                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                      <td style="height:1px;line-height:1px;font-size:0;background:linear-gradient(90deg,transparent 0%%,#e3dcd4 15%%,#e3dcd4 85%%,transparent 100%%);">&nbsp;</td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <!-- CTA: pill like .ph-btn-primary -->
                              <tr>
                                <td class="ph-email-px" align="center" style="padding:0 32px 28px 32px;">
                                  <table role="presentation" class="ph-email-btn" cellspacing="0" cellpadding="0" border="0" align="center" style="border-collapse:separate;">
                                    <tr>
                                      <td align="center" style="border-radius:999px;background-color:#2f6d5f;background-image:linear-gradient(135deg,#3d8b7a 0%%,#2f6d5f 100%%);box-shadow:0 8px 22px rgba(61,139,122,0.38),0 1px 0 rgba(255,255,255,0.15) inset;mso-padding-alt:15px 34px;">
                                        <a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:15px 34px;font-family:'Nunito',system-ui,Segoe UI,sans-serif;font-size:16px;font-weight:700;color:#ffffff !important;text-decoration:none;border-radius:999px;letter-spacing:0.02em;">
                                          Verify My Human Account
                                        </a>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                              <tr>
                                <td class="ph-email-px" style="padding:0 32px 28px 32px;font-family:'Inter',system-ui,Segoe UI,Helvetica,Arial,sans-serif;">
                                  <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#6b6560;">Button not working?</p>
                                  <p style="margin:0;font-size:11px;line-height:1.55;word-break:break-all;color:#2b2a28;border:1px solid #e3dcd4;border-radius:10px;padding:12px 14px;background-color:#fffdf9;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">
                                    %s
                                  </p>
                                </td>
                              </tr>
                              <tr>
                                <td class="ph-email-px" style="padding:0 32px 28px 32px;font-family:'Inter',system-ui,Segoe UI,Helvetica,Arial,sans-serif;">
                                  <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6560;">
                                    If you did not create a PawHub account, you can ignore this message — no kibble was harmed.
                                  </p>
                                </td>
                              </tr>
                              <!-- Footer band: --color-accent-soft -->
                              <tr>
                                <td class="ph-email-px" style="background-color:#ffe7b3;background-image:linear-gradient(180deg,#fff4e0 0%%,#ffe7b3 100%%);border-top:1px solid #f4b942;padding:20px 32px 24px 32px;text-align:center;">
                                  <p style="margin:0 0 6px 0;font-family:'Nunito',Georgia,serif;font-size:15px;font-weight:700;color:#2f6d5f;">Thanks for being part of the litter</p>
                                  <p style="margin:0;font-size:12px;color:#6b6560;font-family:'Inter',system-ui,Segoe UI,Helvetica,Arial,sans-serif;">&mdash; The PawHub team &nbsp;&#x1F43E;</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:18px 0 0 0;font-family:'Inter',system-ui,Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:#9a918a;text-align:center;max-width:480px;padding:0 12px;">
                        You are receiving this because someone registered at PawHub with this address.
                      </p>
                    </td>
                  </tr>
                </table>
                </body>
                </html>
                """
                .formatted(
                        logoSrcAttrSafe,
                        displayNameHtmlSafe,
                        href,
                        href);
    }

    private static String escapeHtml(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
