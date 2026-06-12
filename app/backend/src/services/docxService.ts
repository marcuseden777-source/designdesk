import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
} from "docx";
import { Quotation } from "../types";

const INK = "1A1A2E";
const GOLD = "C9A96E";
const MUTED = "6B6B7B";
const LINE = "E2E2E8";

const sgd = (n: number) =>
  "S$" + Math.round(n).toLocaleString("en-SG");

function groupByCategory(items: Quotation["line_items"]) {
  const groups: Record<string, Quotation["line_items"]> = {};
  for (const item of items) {
    (groups[item.category] ??= []).push(item);
  }
  return groups;
}

/** A right-aligned monetary cell. */
function moneyCell(text: string, opts: { bold?: boolean } = {}) {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text, bold: opts.bold, color: INK, size: 20 })],
      }),
    ],
  });
}

function textCell(
  text: string,
  opts: { bold?: boolean; color?: string; width?: number; size?: number } = {}
) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: opts.bold, color: opts.color ?? INK, size: opts.size ?? 20 }),
        ],
      }),
    ],
  });
}

const HEADER_SHADE = "F4F1EC";

function headerRow() {
  type Align = (typeof AlignmentType)[keyof typeof AlignmentType];
  const cells: [string, number, Align][] = [
    ["Item", 46, AlignmentType.LEFT],
    ["Tier", 16, AlignmentType.LEFT],
    ["Qty", 12, AlignmentType.RIGHT],
    ["Rate", 13, AlignmentType.RIGHT],
    ["Amount", 13, AlignmentType.RIGHT],
  ];
  return new TableRow({
    tableHeader: true,
    children: cells.map(
      ([label, width, align]) =>
        new TableCell({
          width: { size: width, type: WidthType.PERCENTAGE },
          shading: { fill: HEADER_SHADE },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: align,
              children: [new TextRun({ text: label, bold: true, color: MUTED, size: 16 })],
            }),
          ],
        })
    ),
  });
}

export async function generateDocx(q: Quotation): Promise<Buffer> {
  const grouped = groupByCategory(q.line_items);

  const itemRows: TableRow[] = [];
  for (const [category, items] of Object.entries(grouped)) {
    // Category sub-header spanning the row
    itemRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 5,
            shading: { fill: "FBF9F5" },
            margins: { top: 80, bottom: 40, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: category.toUpperCase(),
                    bold: true,
                    color: GOLD,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );

    for (const item of items) {
      const itemChildren = [
        new Paragraph({
          children: [new TextRun({ text: item.item_name, color: INK, size: 20 })],
        }),
      ];
      if (item.notes) {
        itemChildren.push(
          new Paragraph({
            children: [new TextRun({ text: item.notes, italics: true, color: MUTED, size: 16 })],
          })
        );
      }
      itemRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 46, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: itemChildren,
            }),
            textCell(item.selected_tier ?? "—", { width: 16, color: MUTED, size: 18 }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({ text: `${item.quantity} ${item.unit}`, color: INK, size: 18 }),
                  ],
                }),
              ],
            }),
            moneyCell(sgd(item.unit_rate)),
            moneyCell(sgd(item.total_amount)),
          ],
        })
      );
    }
  }

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: LINE },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: LINE },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [headerRow(), ...itemRows],
  });

  const totalsRow = (label: string, value: string, opts: { bold?: boolean; gold?: boolean } = {}) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          borders: noBorders(),
          children: [],
        }),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
          borders: noBorders(),
          margins: { top: 40, bottom: 40, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: label, bold: opts.bold, color: opts.gold ? GOLD : MUTED, size: opts.bold ? 22 : 20 }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          borders: noBorders(),
          margins: { top: 40, bottom: 40, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: value, bold: opts.bold, color: INK, size: opts.bold ? 24 : 20 })],
            }),
          ],
        }),
      ],
    });

  function noBorders() {
    const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    return { top: none, bottom: none, left: none, right: none };
  }

  const totalsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      totalsRow("Subtotal", sgd(q.subtotal)),
      totalsRow("GST (9%)", sgd(q.gst_amount)),
      totalsRow("TOTAL", sgd(q.grand_total), { bold: true, gold: true }),
    ],
  });

  const created = q.created_at ? new Date(q.created_at) : new Date();
  const dateStr = created.toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });

  const doc = new Document({
    creator: "DesignDesk",
    title: `Quotation — ${q.client_name}`,
    sections: [
      {
        properties: { page: { margin: { top: 1100, bottom: 1000, left: 1100, right: 1100 } } },
        children: [
          // Brand
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "Design", bold: true, color: INK, size: 40 }),
              new TextRun({ text: "Desk", bold: true, color: GOLD, size: 40 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "INTERIOR DESIGN QUOTATION", color: MUTED, size: 18, characterSpacing: 40 }),
            ],
          }),

          // Client / project block
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "Prepared for  ", color: MUTED, size: 18 }),
              new TextRun({ text: q.client_name, bold: true, color: INK, size: 22 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: q.project_address, color: INK, size: 20 })],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({ text: `${(q.project_type ?? "").toString().toUpperCase()}`, color: MUTED, size: 18 }),
              new TextRun({ text: q.total_sqft ? `  ·  ${q.total_sqft} sqft` : "", color: MUTED, size: 18 }),
              new TextRun({ text: `  ·  ${dateStr}`, color: MUTED, size: 18 }),
            ],
          }),

          itemsTable,
          new Paragraph({ spacing: { after: 120 }, children: [] }),
          totalsTable,

          new Paragraph({
            spacing: { before: 500 },
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: LINE, space: 8 } },
            children: [
              new TextRun({
                text: "Prices are estimates and subject to final site measurement. DesignDesk · Singapore",
                italics: true,
                color: MUTED,
                size: 16,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}
