/**
 * A made up trip for the landing page. Invented on purpose: a sample on a
 * public page must never be somebody's real booking. It feeds both the demo
 * card and /sample.ics, so what you see is what you download.
 */
const trip = {
  slug: 'K4M7QD',
  privateKey: null,
  title: 'Vilnius to Lisbon',
  startDate: '2026-10-07',
  endDate: '2026-10-12',
  needsReview: false,
};

const base = {
  cabin: null as string | null,
  address: null as string | null,
  seat: null as string | null,
  passengers: '["A. Petrauskas"]',
};

const segments = [
  {
    ...base,
    kind: 'car',
    carrier: null, carrierName: 'Europcar', number: null,
    bookingRef: 'RN4471280',
    address: 'Lisbon airport, terminal 1 desk',
    fromCode: 'LIS', fromCity: 'Lisbon', toCode: 'LIS', toCity: 'Lisbon',
    departLocal: '2026-10-07T10:30', departTz: 'Europe/Lisbon',
    arriveLocal: '2026-10-12T16:00', arriveTz: 'Europe/Lisbon',
  },
  {
    ...base,
    kind: 'flight',
    carrier: 'TP', carrierName: 'TAP Air Portugal', number: '1234',
    bookingRef: '8KQ2ZP', seat: '12C',
    fromCode: 'VNO', fromCity: 'Vilnius', toCode: 'LIS', toCity: 'Lisbon',
    departLocal: '2026-10-07T06:20', departTz: 'Europe/Vilnius',
    arriveLocal: '2026-10-07T09:45', arriveTz: 'Europe/Lisbon',
  },
  {
    ...base,
    kind: 'hotel',
    carrier: null, carrierName: 'Baixa House', number: null,
    bookingRef: '55-118-902',
    address: 'Rua da Prata 12, 1100-414 Lisbon',
    fromCode: 'LIS', fromCity: 'Lisbon', toCode: 'LIS', toCity: 'Lisbon',
    departLocal: '2026-10-07T14:00', departTz: 'Europe/Lisbon',
    arriveLocal: '2026-10-12T11:00', arriveTz: 'Europe/Lisbon',
  },
  {
    ...base,
    kind: 'flight',
    carrier: 'TP', carrierName: 'TAP Air Portugal', number: '1235',
    bookingRef: '8KQ2ZP', seat: '9A',
    fromCode: 'LIS', fromCity: 'Lisbon', toCode: 'VNO', toCity: 'Vilnius',
    departLocal: '2026-10-12T18:10', departTz: 'Europe/Lisbon',
    arriveLocal: '2026-10-13T00:40', arriveTz: 'Europe/Vilnius',
  },
];

// The page orders by departure, the way the database query does.
segments.sort((a, b) => (a.departLocal ?? '').localeCompare(b.departLocal ?? ''));

export const sampleTrip = trip;
export const sampleSegments = segments;
