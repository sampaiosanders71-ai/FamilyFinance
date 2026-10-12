const PAGE_SIZE = 250;

// A fresh query is needed for each page: Supabase query builders are mutable.
export async function listAllRows(buildQuery, label = 'Histórico') {
  for (let attempt = 0; attempt < 2; attempt++) {
    const first = await buildQuery({count:'exact'}).range(0, PAGE_SIZE - 1);
    if (first.error) throw first.error;
    const expected = first.count;
    if (!Number.isInteger(expected) || expected < 0) throw new Error(`${label}: contagem indisponível.`);
    const rows = [...(first.data || [])];
    let offset = rows.length;
    while (offset < expected) {
      const page = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
      if (page.error) throw page.error;
      if (!page.data?.length) break;
      rows.push(...page.data);
      offset += page.data.length;
    }
    const final = await buildQuery({count:'exact', head:true});
    if (final.error) throw final.error;
    const unique = new Set(rows.map(row => row.id));
    if (final.count === expected && rows.length === expected && unique.size === expected) return rows;
  }
  throw new Error(`${label} incompleto ou alterado durante a leitura. Tente sincronizar novamente.`);
}
