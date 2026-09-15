function pdfEscape(value) {
  let out = '';
  for (const char of String(value ?? '')) {
    const code = char.charCodeAt(0);
    if (char === '\\' || char === '(' || char === ')') {
      out += `\\${char}`;
    } else if (code >= 32 && code <= 126) {
      out += char;
    } else if (code >= 160 && code <= 255) {
      out += `\\${code.toString(8).padStart(3, '0')}`;
    } else if (char === '–' || char === '—') {
      out += '-';
    } else if (char === '…') {
      out += '...';
    } else if (char === '\n' || char === '\r' || char === '\t') {
      out += ' ';
    } else {
      out += '?';
    }
  }
  return out;
}

function makePdfPageContent(lines) {
  let y = 798;
  const chunks = ['BT', '/F1 11 Tf'];
  for (const line of lines) {
    const size = Number(line.size || 10);
    const leading = Number(line.leading || (size >= 16 ? 22 : 15));
    chunks.push(`/F1 ${size} Tf`);
    chunks.push(`1 0 0 1 44 ${y} Tm`);
    chunks.push(`(${pdfEscape(line.text)}) Tj`);
    y -= leading;
  }
  chunks.push('ET');
  return `${chunks.join('\n')}\n`;
}

function paginateReportLines(lines) {
  const pages = [];
  let current = [];
  let used = 0;
  const maxHeight = 720;
  for (const line of lines) {
    const height = Number(line.leading || (Number(line.size || 10) >= 16 ? 22 : 15));
    if (current.length && used + height > maxHeight) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(line);
    used += height;
  }
  if (current.length || !pages.length) pages.push(current);
  return pages;
}

export function buildSimplePdf(lines) {
  const encoder = new TextEncoder();
  const pages = paginateReportLines(lines);
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

  const kids = [];
  let nextId = 4;
  for (const pageLines of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    kids.push(`${pageId} 0 R`);
    const content = makePdfPageContent(pageLines);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`;
  }
  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;

  let pdf = '%PDF-1.4\n%FamilyFinance\n';
  const offsets = new Array(objects.length).fill(0);
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = encoder.encode(pdf).length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return encoder.encode(pdf);
}

