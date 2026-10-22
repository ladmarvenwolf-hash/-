import { Offer, Side } from '../types';

export const DEMO_OFFERS: Offer[] = [
  { server: 'Mobile 3', item: 'Аптечка', stall: '18', price: 100000, side: 'sell', updated: 'Демо' },
  { server: 'Mobile 3', item: 'Аптечка', stall: '7', price: 125000, side: 'buy', updated: 'Демо' },
  { server: 'Mobile 3', item: 'Кейс', stall: '15', price: 500000, side: 'sell', updated: 'Демо' },
  { server: 'Mobile 3', item: 'Кейс', stall: '21', price: 590000, side: 'buy', updated: 'Демо' },
  { server: 'Mobile 3', item: 'Материалы', stall: '12', price: 75000, side: 'sell', updated: 'Демо' },
  { server: 'Mobile 3', item: 'Материалы', stall: '9', price: 82000, side: 'buy', updated: 'Демо' },
];

export function norm(s: string): string {
  return s
    .replace(/\uFEFF/g, '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');
}

export function canonicalSide(s: string): Side | '' {
  const n = norm(s);
  if (n === 'sell' || n.includes('прода')) return 'sell';
  if (n === 'buy' || n.includes('скуп') || n.includes('покупает')) return 'buy';
  return '';
}

export function parsePrice(s: string): number {
  try {
    let clean = s.trim().toLowerCase().replace(/\s+/g, '').replace(/,/g, '');
    if (clean.endsWith('кк') || clean.endsWith('kk')) {
      const num = parseFloat(clean.substring(0, clean.length - 2));
      return isNaN(num) ? -1 : num * 1000000;
    }
    if (clean.endsWith('к') || clean.endsWith('k')) {
      const num = parseFloat(clean.substring(0, clean.length - 1));
      return isNaN(num) ? -1 : num * 1000;
    }
    const num = parseFloat(clean);
    return isNaN(num) ? -1 : num;
  } catch {
    return -1;
  }
}

export function formatMoney(x: number): string {
  return Math.round(x).toLocaleString('en-US').replace(/,/g, ' ');
}

function findColumnIndex(map: Map<string, number>, ...names: string[]): number {
  for (const name of names) {
    const key = norm(name);
    if (map.has(key)) {
      return map.get(key)!;
    }
  }
  return -1;
}

// Splits CSV line handling potential quoted values and both comma and semicolon
export function parseCsvLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCsv(csvText: string, defaultServer: string): { offers: Offer[]; error?: string } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { offers: [], error: 'Пустой CSV' };
  }

  // Detect delimiter: comma or semicolon
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') && !headerLine.includes(',') ? ';' : ',';
  const headers = parseCsvLine(headerLine, delimiter);

  const headerMap = new Map<string, number>();
  headers.forEach((h, idx) => {
    headerMap.set(norm(h), idx);
  });

  const itemI = findColumnIndex(headerMap, 'item', 'товар', 'предмет', 'name', 'название');
  const priceI = findColumnIndex(headerMap, 'price', 'цена', 'стоимость');
  const sideI = findColumnIndex(headerMap, 'side', 'type', 'тип', 'сторона');
  const serverI = findColumnIndex(headerMap, 'server', 'сервер');
  const stallI = findColumnIndex(headerMap, 'stall', 'shop', 'лавка', 'номер лавки', 'номер_лавки');
  const updateI = findColumnIndex(headerMap, 'updated', 'timestamp', 'time', 'обновлено', 'время');

  if (itemI < 0 || priceI < 0 || sideI < 0) {
    return {
      offers: [],
      error: 'Нужны колонки item/товар, price/цена, side/тип',
    };
  }

  const loaded: Offer[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i], delimiter);
    const item = (row[itemI] ?? '').trim().replace(/^"|"$/g, '');
    const rawSide = (row[sideI] ?? '').trim().replace(/^"|"$/g, '');
    const side = canonicalSide(rawSide);
    const rawPrice = (row[priceI] ?? '').trim().replace(/^"|"$/g, '');
    const price = parsePrice(rawPrice);

    const server = serverI >= 0 && row[serverI] ? row[serverI].trim().replace(/^"|"$/g, '') : defaultServer;
    const stall = stallI >= 0 && row[stallI] ? row[stallI].trim().replace(/^"|"$/g, '') : '?';
    const updated = updateI >= 0 && row[updateI] ? row[updateI].trim().replace(/^"|"$/g, '') : 'Не указано';

    if (item.length > 0 && price > 0 && side.length > 0) {
      loaded.push({
        id: `${server}-${item}-${stall}-${side}-${i}`,
        server,
        item,
        stall,
        price,
        side: side as Side,
        updated,
      });
    }
  }

  return { offers: loaded };
}
