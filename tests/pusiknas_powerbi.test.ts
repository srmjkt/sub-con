// Tests for the PowerBI query builder/response parser used by /api/pusiknas.
// Fixtures in sample_responses/ are real captured querydata responses.
// Run with: npx tsx tests/pusiknas_powerbi.test.ts
import * as fs from 'fs';
import * as path from 'path';
import {
  buildPowerBIQuery,
  makeInCondition,
  normalizeProvinceRows,
  parsePowerBIResponse,
} from '../src/lib/pusiknas/powerbi';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function loadFixture(name: string): any {
  const p = path.join(__dirname, '..', 'src', 'lib', 'pusiknas', 'sample_responses', name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getQuery(payload: any) {
  return payload.queries[0].Query.Commands[0].SemanticQueryDataShapeCommand.Query;
}

async function run() {
  console.log('Running pusiknas powerbi tests...');

  // --- Response parsing: grouped province rows (39 provinces) ---
  const provinceRows = parsePowerBIResponse(loadFixture('powerbi_province_grouped.json'));
  assert(provinceRows.length === 39, `expected 39 province rows, got ${provinceRows.length}`);
  assert(
    Object.keys(provinceRows[0]).join(',') === 'provinsi,count',
    `unexpected keys: ${Object.keys(provinceRows[0])}`
  );
  const provinceSum = provinceRows.reduce((s, r) => s + Number(r.count || 0), 0);
  assert(provinceSum === 356232, `province counts must sum to subtotal 356232, got ${provinceSum}`);

  // --- Normalization: uppercase -> display names, codes, DIY merge ---
  const provinces = normalizeProvinceRows(provinceRows);
  const dki = provinces.find((r) => r.provinsi === 'DKI Jakarta');
  assert(!!dki, 'DKI Jakarta row missing');
  assert(dki!.count === 36181, `DKI Jakarta count=${dki!.count}`);
  assert(dki!.kode_provinsi === '31', `DKI Jakarta kode=${dki!.kode_provinsi}`);
  const diyRows = provinces.filter((r) => r.provinsi === 'Daerah Istimewa Yogyakarta');
  assert(diyRows.length === 1, 'Yogyakarta spellings must merge into one row');
  assert(diyRows[0].count === 482 + 3279, `merged Yogyakarta count=${diyRows[0].count}`);
  const normSum = provinces.reduce((s, r) => s + Number(r.count || 0), 0);
  assert(normSum === 356232, `normalized sum=${normSum}`);

  // --- Grouped rows with compression markers (Ø null group, R repeat) ---
  const poldaRows = parsePowerBIResponse(loadFixture('powerbi_polda_grouped.json'));
  assert(poldaRows.length === 47, `expected 47 polda rows, got ${poldaRows.length}`);
  assert(poldaRows[0].polda === null && poldaRows[0].count === 6876, 'Ø row must decode as null group + value');
  const poldaSum = poldaRows.reduce((s, r) => s + Number(r.count || 0), 0);
  assert(poldaSum === 356232, `polda sum=${poldaSum}`);

  // Chained R rows: values verified against isolated live queries (probe B1/B3).
  const jenisRows = parsePowerBIResponse(loadFixture('powerbi_jenis_grouped.json'));
  const asusila = jenisRows.find((r) => r.kategori === 'Asusila di Muka Umum');
  assert(!!asusila && asusila.count === 1, `Asusila=${JSON.stringify(asusila)}`);
  const bangunan = jenisRows.find((r) => r.kategori === 'Bangunan Tanpa Izin (PBG/IMB)');
  assert(!!bangunan && bangunan.count === 1, `Bangunan=${JSON.stringify(bangunan)}`);

  // Filtered response with an R row (DIY count proven via isolated query).
  const filtered = parsePowerBIResponse(loadFixture('powerbi_jenis_filtered.json'));
  const filteredDiy = filtered.find((r) => r.provinsi === 'DI YOGYAKARTA');
  assert(!!filteredDiy && filteredDiy.count === 2, `filtered DIY=${JSON.stringify(filteredDiy)}`);


  // --- Measure-only response ---
  const totals = parsePowerBIResponse(loadFixture('powerbi_measure_only.json'));
  assert(totals.length === 1 && totals[0].count === 356232, `total rows=${JSON.stringify(totals)}`);
  assert(normalizeProvinceRows(totals)[0].count === 356232, 'measure-only rows pass through normalization');

  // --- Error payloads surface instead of silently returning [] ---
  let threw = false;
  try {
    parsePowerBIResponse(loadFixture('powerbi_error.json'));
  } catch (e: any) {
    threw = true;
    assert(/QueryLiteralExpression|literal/i.test(e.message), `unexpected error message: ${e.message}`);
  }
  assert(threw, 'error payload must throw');

  // --- Query builder: heatmap shape ---
  const heatmap = getQuery(buildPowerBIQuery({ year: '2026', groupBy: 'province' }));
  assert(heatmap.Select.length === 2, 'heatmap select has column + measure');
  assert(
    heatmap.Select[0].Column.Property === 'Nama_Propinsi' && heatmap.Select[0].Name === 'provinsi',
    'heatmap column must be VIEW_DATA_LP.Nama_Propinsi'
  );
  assert(
    heatmap.Select[1].Measure.Property === 'Jumlah_CT' && heatmap.Select[1].Name === 'count',
    'heatmap measure must be VIEW_DATA_LP.Jumlah_CT'
  );
  assert(JSON.stringify(heatmap.Binding.Primary.Groupings[0].Projections) === '[0,1]', 'heatmap projections');
  assert(heatmap.Where[0].Condition.In.Values[0][0].Literal.Value === '2026L', 'year literal stays raw');

  // --- Query builder: filters ---
  const filteredQ = getQuery(
    buildPowerBIQuery({
      year: '2026',
      groupBy: 'province',
      province: 'Jawa Barat',
      polda: 'Polda Metro Jaya',
      satker: 'Satker X',
      crimeType: 'Pembunuhan',
    })
  );
  assert(filteredQ.Where.length === 5, `expected year+4 filters, got ${filteredQ.Where.length}`);
  const [provW, poldaW, satkerW, crimeW] = filteredQ.Where.slice(1).map((w: any) => w.Condition.In);
  assert(provW.Expressions[0].Column.Property === 'Nama_Propinsi', 'province filter column');
  assert(provW.Values[0][0].Literal.Value === "'Jawa Barat'", 'province literal must be quoted');
  assert(provW.Values[0].length === 1 && Array.isArray(provW.Values[0]), 'tuple-per-value shape');
  assert(poldaW.Expressions[0].Column.Property === 'Polda', 'polda filter column');
  assert(satkerW.Expressions[0].Column.Property === 'satker', 'satker filter column');
  assert(crimeW.Expressions[0].Column.Property === 'Jenis_Kejahatan', 'crime filter column');
  assert(crimeW.Values[0][0].Literal.Value === "'Pembunuhan'", 'crime literal must be quoted');

  // Legacy province codes resolve to names; DIY expands to both spellings.
  const codeQ = getQuery(buildPowerBIQuery({ year: '2026', groupBy: 'province', province: '31' }));
  assert(
    codeQ.Where[1].Condition.In.Values[0][0].Literal.Value === "'DKI Jakarta'",
    'province code 31 must resolve to DKI Jakarta'
  );
  const diyQ = getQuery(
    buildPowerBIQuery({ year: '2026', groupBy: 'province', province: 'Daerah Istimewa Yogyakarta' })
  );
  const diyValues = diyQ.Where[1].Condition.In.Values.map((t: any) => t[0].Literal.Value);
  assert(diyValues.includes("'DI YOGYAKARTA'"), `DIY expansion missing: ${diyValues}`);

  // --- Query builder: plain total shape ---
  const total = getQuery(buildPowerBIQuery({ year: '2026' }));
  assert(total.Select.length === 1 && total.Select[0].Measure.Property === 'Jumlah_CT', 'total select');
  assert(JSON.stringify(total.Binding.Primary.Groupings[0].Projections) === '[0]', 'total projections');

  // --- Literal escaping ---
  const escaped = makeInCondition('v', 'Jenis_Kejahatan', ["O'Brien"]);
  assert(
    escaped.Condition.In.Values[0][0].Literal.Value === "'O''Brien'",
    `quote escaping failed: ${escaped.Condition.In.Values[0][0].Literal.Value}`
  );

  console.log('OK');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
