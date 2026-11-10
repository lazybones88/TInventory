import nodemailer from "nodemailer";
import { CITY_PRODUCE, groupByCategory, groupByVendor, itemVendor, orderVendor, PULL_CATEGORIES, sortCityProduce, UNASSIGNED_VENDOR } from "./catalog";
import { afterPrep, exceedsPar } from "./par";
import { hasQty, qtyText } from "./qty";
import { shiftLabel } from "./shift";
import type { Report, VendorSetting } from "./types";

export function ownerEmail() {
  return process.env.OWNER_EMAIL || "fairhopefood@ymail.com";
}

export function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function appUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (fromEnv) return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  return "https://tamarasdowntown-inventory.vercel.app";
}

export function reportUrl(report: Report) {
  return `${appUrl()}/records?id=${report.id}`;
}

export type VendorMailResult = {
  vendor: string;
  email: string;
  sent: boolean;
  skipped?: "no-email" | "nothing-ordered";
  error?: string;
};

function vendorPlans(report: Report, settings: VendorSetting[]) {
  if (report.type !== "ordering") return [];
  return groupByVendor(report.lines)
    .filter((group) => group.vendor !== UNASSIGNED_VENDOR)
    .map((group) => {
      const ordered = group.rows.filter((line) => hasQty(line.orderQty));
      const email = settings.find((entry) => entry.name === group.vendor)?.email?.trim() || "";
      return { vendor: group.vendor, email, ordered };
    });
}

function vendorNotice(plans: ReturnType<typeof vendorPlans>) {
  if (!plans.length) return "";
  const emailed = plans.filter((plan) => plan.email && plan.ordered.length);
  const noEmail = plans.filter((plan) => !plan.email && plan.ordered.length);
  const parts: string[] = [];
  if (emailed.length) {
    parts.push(
      `<strong>Also emailed their own order:</strong> ${emailed
        .map((plan) => `${plan.vendor} (${plan.email})`)
        .join(", ")}`
    );
  }
  if (noEmail.length) {
    parts.push(
      `<strong>No vendor email on file — owner only:</strong> ${noEmail.map((plan) => plan.vendor).join(", ")}`
    );
  }
  if (!parts.length) return "";
  return `<p style="background:#f8e4c8;padding:12px 14px;border-radius:10px;">${parts.join("<br/>")}</p>`;
}

function formatVendorOrder(report: Report, vendor: string, lines: Report["lines"]) {
  const ordered = lines.filter((line) => itemVendor(line) === vendor && hasQty(line.orderQty));
  const sorted = vendor === CITY_PRODUCE ? sortCityProduce(ordered) : ordered;
  const sections =
    vendor === CITY_PRODUCE
      ? Array.from(new Set(sorted.map((line) => line.category))).map((category) => ({
          category,
          rows: sorted.filter((line) => line.category === category),
        }))
      : [{ category: "", rows: sorted }];
  const tableFor = (rows: typeof sorted) =>
    `<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr style="background:#7a1f2b;color:#faf6f0;text-align:left;">
            <th>Item</th><th>Unit</th><th>Quantity</th>
          </tr>
        </thead>
        <tbody>${rows
          .map(
            (line) => `<tr>
        <td>${line.name}</td>
        <td>${line.unit}</td>
        <td><strong>${qtyText(line.orderQty) || "0"}</strong></td>
      </tr>`
          )
          .join("")}</tbody>
      </table>`;
  return {
    subject: `Tamara's Downtown — ${vendor} inventory — ${report.date}`,
    html: `<div style="font-family:Georgia,serif;color:#2c1810;max-width:640px;">
      <h1 style="color:#7a1f2b;margin-bottom:4px;">Tamara's Downtown</h1>
      <p style="margin-top:0;color:#6b5344;">104 N Section St, Fairhope, AL</p>
      <h2 style="margin-bottom:4px;">${vendor} inventory</h2>
      <p><strong>Date:</strong> ${report.date}<br/>
      <strong>From:</strong> ${report.submittedBy}</p>
      <p>Please fill the items below. This list is only ${vendor}'s order — it does not include other vendors.</p>
      ${sections
        .map(
          (section) =>
            `${section.category ? `<h4 style="color:#7a1f2b;margin:16px 0 8px;">${section.category}</h4>` : ""}${tableFor(section.rows)}`
        )
        .join("")}
      <p style="margin-top:24px;color:#6b5344;font-size:12px;">Reply to this email if anything is short or substituted.</p>
    </div>`,
  };
}

function formatReport(report: Report, settings: VendorSetting[] = []) {
  const vendorName = orderVendor(report);
  const title =
    report.type === "prep"
      ? "Daily Prep Inventory"
      : report.type === "pull"
        ? "Pull Inventory"
        : vendorName
          ? `${vendorName} inventory`
          : "Manager Ordering Sheet";
  const over = report.lines.filter(
    (line) =>
      report.type === "prep" &&
      exceedsPar(line.par, line.onHand, line.madeToday ?? 0)
  );
  function lineRow(line: Report["lines"][number]) {
    const extra =
      report.type === "prep"
        ? `<td>${qtyText(line.madeToday) || "0"}</td><td>${afterPrep(line.onHand, line.madeToday ?? 0)}</td><td>${line.overParReason || "—"}</td>`
        : `<td>${qtyText(line.orderQty) || "0"}</td>`;
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
  }

  const extraHead =
    report.type === "prep"
      ? "<th>Made Today</th><th>On Hand + Made</th><th>Over-Par Reason</th>"
      : report.type === "pull"
        ? "<th>Pull</th>"
        : "<th>To Order</th>";

  const tableHead = `<thead>
          <tr style="background:#7a1f2b;color:#faf6f0;text-align:left;">
            <th>Category</th><th>Item</th><th>Unit</th><th>Par</th><th>On Hand</th>${extraHead}
          </tr>
        </thead>`;

  const tables =
    report.type === "ordering"
      ? groupByVendor(report.lines)
          .map((group) => {
            const orderedCount = group.rows.filter((line) => hasQty(line.orderQty)).length;
            const sections =
              group.vendor === CITY_PRODUCE
                ? Array.from(new Set(group.rows.map((line) => line.category))).map((category) => {
                    const rows = group.rows.filter((line) => line.category === category);
                    return {
                      category,
                      rows: [...rows.filter((line) => hasQty(line.orderQty)), ...rows.filter((line) => !hasQty(line.orderQty))],
                    };
                  })
                : [
                    {
                      category: "",
                      rows: [
                        ...group.rows.filter((line) => hasQty(line.orderQty)),
                        ...group.rows.filter((line) => !hasQty(line.orderQty)),
                      ],
                    },
                  ];
            return `<h3 style="color:#7a1f2b;margin:24px 0 8px;">${group.vendor}</h3>
              <p style="margin:0 0 8px;color:#6b5344;font-size:13px;">${orderedCount} item${orderedCount === 1 ? "" : "s"} to order</p>
              ${sections
                .map(
                  (section) =>
                    `${section.category ? `<h4 style="color:#7a1f2b;margin:16px 0 8px;">${section.category}</h4>` : ""}
              <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
                ${tableHead}
                <tbody>${section.rows.map(lineRow).join("")}</tbody>
              </table>`
                )
                .join("")}`;
          })
          .join("")
      : report.type === "pull"
        ? groupByCategory(report.lines, PULL_CATEGORIES)
            .map((group) => {
              return `<h3 style="color:#7a1f2b;margin:24px 0 8px;">${group.vendor}</h3>
              <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
                ${tableHead}
                <tbody>${group.rows.map(lineRow).join("")}</tbody>
              </table>`;
            })
            .join("")
        : `<table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
        ${tableHead}
        <tbody>${report.lines.map(lineRow).join("")}</tbody>
      </table>`;

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

  const shiftBit = report.type === "prep" && report.shift ? ` — ${shiftLabel(report.shift)}` : "";
  const plans = vendorPlans(report, settings);
  return {
    subject: `Tamara's Downtown — ${title}${shiftBit} — ${report.date}`,
    html: `<div style="font-family:Georgia,serif;color:#2c1810;max-width:860px;">
      <h1 style="color:#7a1f2b;margin-bottom:4px;">Tamara's Downtown</h1>
      <p style="margin-top:0;color:#6b5344;">104 N Section St, Fairhope, AL</p>
      <h2 style="margin-bottom:4px;">${title}${shiftBit}</h2>
      <p><strong>Date:</strong> ${report.date}<br/>
      ${report.type === "prep" && report.shift ? `<strong>Shift:</strong> ${shiftLabel(report.shift)}<br/>` : ""}
      <strong>Submitted:</strong> ${new Date(report.submittedAt).toLocaleString()}<br/>
      <strong>By:</strong> ${report.submittedBy}</p>
      ${vendorNotice(plans)}
      <p style="margin:20px 0;">
        <a href="${reportUrl(report)}" style="display:inline-block;background:#7a1f2b;color:#fffaf2;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">
          Open this ${report.type === "ordering" ? "order" : report.type === "pull" ? "pull" : "prep"} sheet
        </a>
      </p>
      <p style="font-size:13px;color:#6b5344;">Or copy this link: ${reportUrl(report)}</p>
      ${overBlock}
      ${tables}
      <p style="margin-top:24px;color:#6b5344;font-size:12px;">Sent from Tamara's Downtown inventory app.</p>
    </div>`,
  };
}

async function sendMail(to: string, subject: string, html: string) {
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
    to,
    subject,
    html,
  });

  return { sent: true, subject, html };
}

async function trySend(to: string, subject: string, html: string) {
  try {
    return await sendMail(to, subject, html);
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Email failed.",
      subject,
      html,
    };
  }
}

export async function sendReportEmail(report: Report, settings: VendorSetting[] = []) {
  const { subject, html } = formatReport(report, settings);
  const owner = await trySend(ownerEmail(), subject, html);
  const vendors: VendorMailResult[] = [];
  for (const plan of vendorPlans(report, settings)) {
    if (!plan.ordered.length) {
      vendors.push({ vendor: plan.vendor, email: plan.email, sent: false, skipped: "nothing-ordered" });
      continue;
    }
    if (!plan.email) {
      vendors.push({ vendor: plan.vendor, email: "", sent: false, skipped: "no-email" });
      continue;
    }
    const message = formatVendorOrder(report, plan.vendor, plan.ordered);
    const result = await trySend(plan.email, message.subject, message.html);
    vendors.push({
      vendor: plan.vendor,
      email: plan.email,
      sent: result.sent,
      error: result.sent ? undefined : result.error,
    });
  }
  return { sent: owner.sent, error: owner.error, vendors };
}

export async function sendVendorPriceRequest(input: {
  vendor: string;
  email: string;
  month: string;
  uploadUrl: string;
}) {
  const subject = `Tamara's Downtown — ${input.month} price list please`;
  const html = `<div style="font-family:Georgia,serif;color:#2c1810;max-width:640px;">
    <h1 style="color:#7a1f2b;margin-bottom:4px;">Tamara's Downtown</h1>
    <p style="margin-top:0;color:#6b5344;">104 N Section St, Fairhope, AL</p>
    <p>Please send this month's item price spreadsheet for <strong>${input.vendor}</strong> (${input.month}).</p>
    <p>Upload the Excel/CSV file here (no login needed):</p>
    <p style="margin:20px 0;">
      <a href="${input.uploadUrl}" style="display:inline-block;background:#7a1f2b;color:#fffaf2;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;">
        Upload ${input.month} prices
      </a>
    </p>
    <p style="font-size:13px;color:#6b5344;">Or copy this link: ${input.uploadUrl}</p>
    <p>A column for item name and a column for unit price is enough. We will compare it to last month and keep a price record if anything changed.</p>
  </div>`;
  return sendMail(input.email, subject, html);
}
