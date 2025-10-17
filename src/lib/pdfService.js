import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// --- IMPORTANT --- //
// The X/Y coordinates in this file are placeholders. They need to be manually
// adjusted to match the exact layout of the PDF template. This is typically
// a trial-and-error process.
// A visual tool or a script to find coordinates would be the best approach.
// ----------------- //

async function getPdfTemplate() {
  const url = '/Hoja genérica para Mago 20º Aniversario Editable.pdf';
  const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
  return PDFDocument.load(existingPdfBytes);
}

function drawText(page, text, x, y, font, size = 10) {
  if (text) {
    page.drawText(String(text), { x, y, font, size, color: rgb(0, 0, 0) });
  }
}

function drawDot(page, x, y, filled = true) {
    const radius = 4;
    const options = {
        x, y, 
        size: radius,
        color: filled ? rgb(0,0,0) : rgb(1,1,1),
        borderColor: rgb(0,0,0),
        borderWidth: 0.5,
    };
    if(filled) {
        page.drawCircle({ ...options, color: rgb(0,0,0) });
    } else {
        page.drawCircle({ ...options, color: rgb(1,1,1) });
    }
}


export async function generateCharacterSheetPdf(sheetData) {
  const pdfDoc = await getPdfTemplate();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];

  // --- Basic Info (Placeholder Coordinates) ---
  drawText(page, sheetData.name, 100, 700, font);
  drawText(page, sheetData.player, 100, 680, font);
  drawText(page, sheetData.chronicle, 100, 660, font);
  drawText(page, sheetData.nature, 350, 700, font);
  drawText(page, sheetData.demeanor, 350, 680, font);
  drawText(page, sheetData.concept, 350, 660, font);

  // --- Attributes (Placeholder Coordinates) ---
  const attributes = sheetData.attributes;
  const attrX = { strength: 120, dexterity: 120, stamina: 120, charisma: 250, manipulation: 250, appearance: 250, perception: 380, intelligence: 380, wits: 380 };
  const attrY = { strength: 550, dexterity: 535, stamina: 520, charisma: 550, manipulation: 535, appearance: 520, perception: 550, intelligence: 535, wits: 520 };
  
  Object.keys(attributes.physical).forEach(key => {
      for(let i=0; i<5; i++) drawDot(page, attrX[key] + (i * 12), attrY[key], i < attributes.physical[key]);
  });
  Object.keys(attributes.social).forEach(key => {
      for(let i=0; i<5; i++) drawDot(page, attrX[key] + (i * 12), attrY[key], i < attributes.social[key]);
  });
    Object.keys(attributes.mental).forEach(key => {
      for(let i=0; i<5; i++) drawDot(page, attrX[key] + (i * 12), attrY[key], i < attributes.mental[key]);
  });

  // --- Abilities, Spheres, etc. would follow a similar pattern ---
  // This is a simplified example. A full implementation would require mapping all fields.

  // --- Save and Download ---
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${sheetData.name || 'character'}-sheet.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
