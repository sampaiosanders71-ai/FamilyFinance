const PAGE_W = 612;
const PAGE_H = 792;

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

function contentForPage(ops,{backgroundName=null}={}) {
  const out = [];
  if (backgroundName) {
    out.push('q');
    out.push(`${PAGE_W.toFixed(2)} 0 0 ${PAGE_H.toFixed(2)} 0 0 cm`);
    out.push(`/${backgroundName} Do`);
    out.push('Q');
  }
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

function bytes(value){
  if (value instanceof Uint8Array) return value;
  return new TextEncoder().encode(String(value ?? ''));
}
function concatBytes(parts){
  const arrays=parts.map(bytes);
  const length=arrays.reduce((sum,a)=>sum+a.length,0);
  const out=new Uint8Array(length);
  let offset=0;
  for(const a of arrays){out.set(a,offset);offset+=a.length;}
  return out;
}

export function buildVisualPdf(pages,{backgroundJpeg=null}={}) {
  const objects = [];
  objects[1] = bytes('<< /Type /Catalog /Pages 2 0 R >>');
  objects[3] = bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects[4] = bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let nextId=5;
  let imageId=null;
  if(backgroundJpeg?.bytes?.length){
    imageId=nextId++;
    const imageBytes=backgroundJpeg.bytes instanceof Uint8Array?backgroundJpeg.bytes:new Uint8Array(backgroundJpeg.bytes);
    const imageHead=`<< /Type /XObject /Subtype /Image /Width ${Number(backgroundJpeg.width)||1530} /Height ${Number(backgroundJpeg.height)||1980} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`;
    objects[imageId]=concatBytes([imageHead,imageBytes,'\nendstream']);
  }
  const kids=[];
  for (const ops of pages || [[]]) {
    const pageId=nextId++;
    const contentId=nextId++;
    kids.push(`${pageId} 0 R`);
    const content=contentForPage(ops,{backgroundName:imageId?'BG':null});
    const resources=imageId?`<< /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /BG ${imageId} 0 R >> >>`:`<< /Font << /F1 3 0 R /F2 4 0 R >> >>`;
    objects[pageId]=bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources ${resources} /Contents ${contentId} 0 R >>`);
    const contentBytes=bytes(content);
    objects[contentId]=concatBytes([`<< /Length ${contentBytes.length} >>\nstream\n`,contentBytes,'endstream']);
  }
  objects[2]=bytes(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`);

  const parts=[bytes('%PDF-1.4\n%FamilyFinance\n')];
  const offsets=new Array(objects.length).fill(0);
  let current=parts[0].length;
  for(let i=1;i<objects.length;i++){
    if(!objects[i]) continue;
    offsets[i]=current;
    const obj=concatBytes([`${i} 0 obj\n`,objects[i],'\nendobj\n']);
    parts.push(obj);current+=obj.length;
  }
  const xrefOffset=current;
  let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for(let i=1;i<objects.length;i++) xref+=`${String(offsets[i]||0).padStart(10,'0')} 00000 n \n`;
  xref+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(bytes(xref));
  return concatBytes(parts);
}

export const PDF_PAGE = { width: PAGE_W, height: PAGE_H };
