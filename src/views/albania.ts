/**
 * The Albania trip that shaped the kind styles: a flight, a bus, a ferry and
 * three stays in three towns. Times and places are the real itinerary; the
 * names, references and addresses are made up, so it is safe in the repo.
 * Only /variants renders it.
 */
export const albaniaTrip = {
  slug: 'ALBDEMO',
  privateKey: null,
  title: 'Vilnius to Tirana',
  startDate: '2026-09-29',
  endDate: '2026-10-03',
  needsReview: false,
};

const base = {
  carrier: null as string | null, carrierName: null as string | null, number: null as string | null,
  bookingRef: null as string | null, address: null as string | null,
  fromCode: null as string | null, fromCity: null as string | null, toCode: null as string | null, toCity: null as string | null,
  departTz: 'Europe/Tirane', arriveTz: 'Europe/Tirane', arriveLocal: null as string | null,
  cabin: null as string | null, seat: null as string | null, passengers: '["A. Petrauskas"]',
};

export const albaniaSegments = [
  {
    ...base, kind: 'flight', carrier: 'W6', carrierName: 'Wizz Air', number: '1937', bookingRef: 'Q7X2LM',
    fromCode: 'VNO', fromCity: 'Vilnius', toCode: 'TIA', toCity: 'Tirana',
    departLocal: '2026-09-29T13:30', departTz: 'Europe/Vilnius', arriveLocal: '2026-09-29T15:05',
  },
  {
    ...base, kind: 'hotel', carrierName: 'The Center 103', bookingRef: 'HMDEMO0001', address: 'Old town, Shkodër',
    fromCity: 'Shkodër', toCity: 'Shkodër', departLocal: '2026-09-29T15:00', arriveLocal: '2026-09-30T11:00',
  },
  {
    ...base, kind: 'bus', carrierName: 'Travel North Albania', bookingRef: 'DEMO7PMW',
    fromCity: 'Shkodër', toCity: 'Theth', departLocal: '2026-09-30T07:00', arriveLocal: '2026-09-30T09:00',
  },
  {
    ...base, kind: 'hotel', carrierName: 'Breezy Hotel', bookingRef: '5700000001', address: 'Valbonë',
    fromCity: 'Valbonë', toCity: 'Valbonë', departLocal: '2026-09-30T13:00', arriveLocal: '2026-10-01T11:00',
  },
  {
    // The ticket gives no arrival time, as the real one did not.
    ...base, kind: 'ferry', carrierName: 'Rozafa Ferry', bookingRef: '10001',
    fromCity: 'Valbonë', toCity: 'Shkodër', departLocal: '2026-10-01T10:00',
  },
  {
    ...base, kind: 'hotel', carrierName: "Ovi's Blloku Home", bookingRef: 'HMDEMO0002', address: 'Blloku, Tiranë',
    fromCity: 'Tiranë', toCity: 'Tiranë', departLocal: '2026-10-01T13:00', arriveLocal: '2026-10-03T11:00',
  },
  {
    ...base, kind: 'flight', carrier: 'W6', carrierName: 'Wizz Air', number: '1938', bookingRef: 'Q7X2LM',
    fromCode: 'TIA', fromCity: 'Tirana', toCode: 'VNO', toCity: 'Vilnius',
    departLocal: '2026-10-03T16:00', arriveLocal: '2026-10-03T19:35', arriveTz: 'Europe/Vilnius',
  },
];

/** There was no car on this trip. Added with ?car=1 so the car style can be judged too. */
export const albaniaCar = {
  ...base, kind: 'car', carrierName: 'Sixt', bookingRef: 'RN0000001', address: 'Tirana airport desk',
  fromCode: 'TIA', fromCity: 'Tirana', toCode: 'TIA', toCity: 'Tirana',
  departLocal: '2026-10-01T14:00', arriveLocal: '2026-10-03T14:00',
};
