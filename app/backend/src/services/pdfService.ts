import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { Quotation } from "../types";

function formatSGD(amount: number): string {
  return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function groupByCategory(items: Quotation["line_items"]) {
  return items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

function buildHtml(q: Quotation): string {
  const grouped = groupByCategory(q.line_items);
  const today = new Date().toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });

  const categoryRows = Object.entries(grouped).map(([cat, items]) => `
    <tr class="cat-row"><td colspan="5">${cat}</td></tr>
    ${items.map(item => `
      <tr>
        <td>${item.item_name}${item.room ? ` <span class="room-tag">${item.room}</span>` : ""}</td>
        <td>${item.quantity} ${item.unit}</td>
        <td>${item.selected_tier}</td>
        <td class="right">${formatSGD(item.unit_rate)}</td>
        <td class="right">${formatSGD(item.total_amount)}</td>
      </tr>
    `).join("")}
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a2e; padding: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #c9a96e; padding-bottom: 20px; }
  .brand { font-size: 22px; font-weight: 700; color: #1a1a2e; }
  .brand span { color: #c9a96e; }
  .meta { text-align: right; color: #555; line-height: 1.7; }
  .project-block { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .block-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #c9a96e; margin-bottom: 4px; }
  .block-value { font-size: 12px; color: #1a1a2e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #1a1a2e; color: white; padding: 8px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  th.right, td.right { text-align: right; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr.cat-row td { background: #f8f4ee; font-weight: 700; font-size: 10px; color: #8b6914; padding: 6px 10px; }
  .room-tag { display: inline-block; background: #e8c99a33; color: #8b6914; border-radius: 3px; padding: 1px 5px; font-size: 9px; margin-left: 6px; }
  .totals { margin-left: auto; width: 280px; }
  .totals table { margin: 0; }
  .totals td { border: none; padding: 5px 10px; }
  .totals tr.grand td { font-weight: 700; font-size: 13px; background: #1a1a2e; color: white; padding: 10px; }
  .footer { margin-top: 48px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Design<span>Desk</span></div>
      <div style="color:#777;font-size:10px;margin-top:4px;">Interior Design Quotation</div>
    </div>
    <div class="meta">
      <div><strong>Quotation #${q.id.slice(0, 8).toUpperCase()}</strong></div>
      <div>Date: ${today}</div>
      <div>Status: ${q.status.toUpperCase()}</div>
    </div>
  </div>

  <div class="project-block">
    <div>
      <div class="block-label">Client</div>
      <div class="block-value">${q.client_name}</div>
    </div>
    <div>
      <div class="block-label">Project Address</div>
      <div class="block-value">${q.project_address}</div>
    </div>
    <div>
      <div class="block-label">Property Type</div>
      <div class="block-value">${q.project_type.toUpperCase()}</div>
    </div>
    <div>
      <div class="block-label">Total Area</div>
      <div class="block-value">${q.total_sqft} sqft</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty / Unit</th>
        <th>Tier</th>
        <th class="right">Unit Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>${categoryRows}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td class="right">${formatSGD(q.subtotal)}</td></tr>
      <tr><td>GST (9%)</td><td class="right">${formatSGD(q.gst_amount)}</td></tr>
      <tr class="grand"><td>TOTAL</td><td class="right">${formatSGD(q.grand_total)}</td></tr>
    </table>
  </div>

  <div class="footer">
    This quotation is valid for 30 days from the date of issue. All prices are in Singapore Dollars (SGD) and inclusive of GST.
    Prices are estimates and subject to final site measurement. DesignDesk · Singapore
  </div>
</body>
</html>`;
}

export async function generatePDF(quotation: Quotation): Promise<Buffer> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    || await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(quotation), { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
