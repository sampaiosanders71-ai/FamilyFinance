const PAGE_W = 595.28;
const PAGE_H = 841.89;

function pdfEscape(value) {
  let out = '';
  for (const char of String(value ?? '')) {
    const code = char.charCodeAt(0);
    if (char === '\\' || char === '(' || char === ')') out += `\\${char}`;
    else if (code >= 32 && code <= 126) out += char;
    else if (code >= 160 && code <= 255) out += `\\${code.toString(8).padStart(3, '0')}`;
    else if (char === '–' || char === '—') out += '-';
    else if (char === '…') out += '...';
    else if (char === '\n' || char === '\r' || char === '\t') out += ' ';
    else out += '?';
  }
  return out;
}

function rgb(hex) {
  const clean = String(hex || '#000000').replace('#','').padEnd(6,'0').slice(0,6);
  const n = Number.parseInt(clean, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function approxTextWidth(text, size, bold = false) {
  const factor = bold ? 0.56 : 0.52;
  return String(text ?? '').length * Number(size || 10) * factor;
}

function contentForPage(ops) {
  const out = [];
  for (const op of ops || []) {
    if (op.type === 'rect') {
      const [r,g,b] = rgb(op.fill || '#ffffff');
      const y = PAGE_H - Number(op.y || 0) - Number(op.h || 0);
      out.push('q');
      out.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
      if (op.stroke) {
        const [sr,sg,sb] = rgb(op.stroke);
        out.push(`${sr.toFixed(3)} ${sg.toFixed(3)} ${sb.toFixed(3)} RG`);
        out.push(`${Number(op.lineWidth || 0.8).toFixed(2)} w`);
        out.push(`${Number(op.x || 0).toFixed(2)} ${y.toFixed(2)} ${Number(op.w || 0).toFixed(2)} ${Number(op.h || 0).toFixed(2)} re B`);
      } else {
        out.push(`${Number(op.x || 0).toFixed(2)} ${y.toFixed(2)} ${Number(op.w || 0).toFixed(2)} ${Number(op.h || 0).toFixed(2)} re f`);
      }
      out.push('Q');
    } else if (op.type === 'line') {
      const [r,g,b] = rgb(op.color || '#000000');
      const y1 = PAGE_H - Number(op.y1 || 0);
      const y2 = PAGE_H - Number(op.y2 || 0);
      out.push('q');
      out.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
      out.push(`${Number(op.width || 1).toFixed(2)} w`);
      if (op.dash) out.push(`[${op.dash.map(Number).join(' ')}] 0 d`);
      out.push(`${Number(op.x1 || 0).toFixed(2)} ${y1.toFixed(2)} m ${Number(op.x2 || 0).toFixed(2)} ${y2.toFixed(2)} l S`);
      out.push('Q');
    } else if (op.type === 'polyline') {
      const points = Array.isArray(op.points) ? op.points : [];
      if (points.length < 2) continue;
      const [r,g,b] = rgb(op.color || '#000000');
      out.push('q');
      out.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
      out.push(`${Number(op.width || 1.5).toFixed(2)} w`);
      const first = points[0];
      out.push(`${Number(first.x).toFixed(2)} ${(PAGE_H-Number(first.y)).toFixed(2)} m`);
      for (const point of points.slice(1)) out.push(`${Number(point.x).toFixed(2)} ${(PAGE_H-Number(point.y)).toFixed(2)} l`);
      out.push('S');
      out.push('Q');
    } else if (op.type === 'circle') {
      const radius = Number(op.r || 2.5);
      const cx = Number(op.x || 0), cy = PAGE_H - Number(op.y || 0);
      const k = 0.5522847498 * radius;
      const [r,g,b] = rgb(op.fill || '#000000');
      out.push('q');
      out.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
      out.push(`${(cx+radius).toFixed(2)} ${cy.toFixed(2)} m`);
      out.push(`${(cx+radius).toFixed(2)} ${(cy+k).toFixed(2)} ${(cx+k).toFixed(2)} ${(cy+radius).toFixed(2)} ${cx.toFixed(2)} ${(cy+radius).toFixed(2)} c`);
      out.push(`${(cx-k).toFixed(2)} ${(cy+radius).toFixed(2)} ${(cx-radius).toFixed(2)} ${(cy+k).toFixed(2)} ${(cx-radius).toFixed(2)} ${cy.toFixed(2)} c`);
      out.push(`${(cx-radius).toFixed(2)} ${(cy-k).toFixed(2)} ${(cx-k).toFixed(2)} ${(cy-radius).toFixed(2)} ${cx.toFixed(2)} ${(cy-radius).toFixed(2)} c`);
      out.push(`${(cx+k).toFixed(2)} ${(cy-radius).toFixed(2)} ${(cx+radius).toFixed(2)} ${(cy-k).toFixed(2)} ${(cx+radius).toFixed(2)} ${cy.toFixed(2)} c f`);
      out.push('Q');
    } else if (op.type === 'text') {
      const size = Number(op.size || 10);
      const bold = !!op.bold;
      const font = bold ? '/F2' : '/F1';
      const [r,g,b] = rgb(op.color || '#111111');
      let x = Number(op.x || 0);
      if (op.align === 'center') x -= approxTextWidth(op.text, size, bold) / 2;
      else if (op.align === 'right') x -= approxTextWidth(op.text, size, bold);
      const y = PAGE_H - Number(op.y || 0) - size;
      out.push('BT');
      out.push(`${font} ${size.toFixed(2)} Tf`);
      out.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
      out.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`);
      out.push(`(${pdfEscape(op.text)}) Tj`);
      out.push('ET');
    }
  }
  return `${out.join('\n')}\n`;
}

export function buildVisualPdf(pages) {
  const encoder = new TextEncoder();
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  const kids = [];
  let nextId = 5;
  for (const ops of pages || [[]]) {
    const pageId = nextId++;
    const contentId = nextId++;
    kids.push(`${pageId} 0 R`);
    const content = contentForPage(ops);
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`;
  }
  objects[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;

  let pdf = '%PDF-1.4\n%FamilyFinance\n';
  const offsets = new Array(objects.length).fill(0);
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = encoder.encode(pdf).length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return encoder.encode(pdf);
}

export const PDF_PAGE = { width: PAGE_W, height: PAGE_H };
