import nodemailer from "nodemailer";
import { afterPrep, exceedsPar } from "./par";
import type { Report } from "./types";

export function ownerEmail() {
  return process.env.OWNER_EMAIL || "fairhopefood@ymail.com";
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function formatReport(report: Report) {
  const title =
    report.type === "prep"
      ? "Daily Prep Inventory"
      : "Manager Ordering Sheet";
  const over = report.lines.filter(
    (line) =>
      report.type === "prep" &&
      exceedsPar(line.par, line.onHand, line.madeToday ?? 0)
  );
  const rows = report.lines
    .map((line) => {
      const extra =
        report.type === "prep"
          ? `<td>${line.madeToday ?? 0}</td><td>${afterPrep(line.onHand, line.madeToday ?? 0)}</td><td>${line.overParReason || "—"}</td>`
          : `<td>${line.orderQty ?? 0}</td>`;
      const overClass =
        report.type === "prep" && exceedsPar(line.par, line.onHand, line.madeToday ?? 0)
          ? ' style="background:#f8e4c8;"'
          : "";
      return `<tr${overClass}>
        <td>${line.category}</td>
        <td>${line.name}</td>
        <td>${line.unit}</td>
        <td>${line.par}</td>
        <td>${line.onHand}</td>
        ${extra}
      </tr>`;
    })
    .join("");

  const extraHead =
    report.type === "prep"
      ? "<th>Made Today</th><th>On Hand + Made</th><th>Over-Par Reason</th>"
      : "<th>To Order</th>";

  const overBlock =
    over.length > 0
      ? `<h3 style="color:#7a1f2b;">Over par (on hand + made today)</h3>
        <ul>${over
          .map((line) => {
            const total = afterPrep(line.onHand, line.madeToday ?? 0);
            return `<li><strong>${line.name}</strong> — on hand ${line.onHand} + made ${line.madeToday ?? 0} = ${total} (par ${line.par}): ${line.overParReason || "No reason given"}</li>`;
          })
          .join("")}</ul>`
      : "";

  return {
    subject: `Tamara's Downtown — ${title} — ${report.date}`,
    html: `<div style="font-family:Georgia,serif;color:#2c1810;max-width:860px;">
      <h1 style="color:#7a1f2b;margin-bottom:4px;">Tamara's Downtown</h1>
      <p style="margin-top:0;color:#6b5344;">104 N Section St, Fairhope, AL</p>
      <h2 style="margin-bottom:4px;">${title}</h2>
      <p><strong>Date:</strong> ${report.date}<br/>
      <strong>Submitted:</strong> ${new Date(report.submittedAt).toLocaleString()}<br/>
      <strong>By:</strong> ${report.submittedBy}</p>
      ${overBlock}
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr style="background:#7a1f2b;color:#faf6f0;text-align:left;">
            <th>Category</th><th>Item</th><th>Unit</th><th>Par</th><th>On Hand</th>${extraHead}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#6b5344;font-size:12px;">Sent from Tamara's Downtown inventory app.</p>
    </div>`,
  };
}

export async function sendReportEmail(report: Report) {
  const { subject, html } = formatReport(report);
  if (!smtpConfigured()) {
    return {
      sent: false,
      error:
        "Email is not configured. Add SMTP_USER and SMTP_PASS on Vercel (Yahoo app password for fairhopefood@ymail.com).",
      subject,
      html,
    };
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mail.yahoo.com",
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: ownerEmail(),
    subject,
    html,
  });

  return { sent: true, subject, html };
}
