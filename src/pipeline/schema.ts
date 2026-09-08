/** Strict JSON schema for the model output. Every field is required; optional
 *  values are expressed as a null union, which is what strict mode allows. */
const str = { type: ['string', 'null'] } as const;

export const tripSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['is_travel', 'confidence', 'needs_review', 'notes', 'trip_title', 'merge_with_trip_id', 'merge_reason', 'segments'],
  properties: {
    is_travel: { type: 'boolean', description: 'False for newsletters, marketing or anything with no booking in it.' },
    confidence: { type: 'number', description: '0 to 1. How sure you are that every segment below is correct and complete.' },
    needs_review: { type: 'boolean', description: 'True if a human should look at this.' },
    notes: str,
    trip_title: { ...str, description: 'Short human title, e.g. "Vilnius to Barcelona".' },
    merge_with_trip_id: { ...str, description: 'Id of an existing trip from the candidate list, or null for a new trip.' },
    merge_reason: str,
    segments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'carrier', 'carrier_name', 'number', 'booking_ref', 'address', 'from_code', 'from_city', 'to_code', 'to_city', 'depart_local', 'depart_tz', 'arrive_local', 'arrive_tz', 'cabin', 'seat', 'passengers'],
        properties: {
          kind: { type: 'string', enum: ['flight', 'train', 'bus', 'ferry', 'hotel', 'car', 'other'] },
          carrier: { ...str, description: 'IATA code, e.g. LH. Null for a hotel or a car.' },
          carrier_name: { ...str, description: 'Airline, ferry line, hotel name or rental company.' },
          number: { ...str, description: 'Flight or train number, e.g. 1234.' },
          booking_ref: { ...str, description: 'PNR, confirmation number or booking reference.' },
          address: { ...str, description: 'Street address of a hotel or a rental desk. Null for anything that moves.' },
          from_code: { ...str, description: 'IATA airport, station or port code. For a hotel or a car, the nearest city or airport code.' },
          from_city: str,
          to_code: str,
          to_city: str,
          depart_local: { ...str, description: 'YYYY-MM-DDTHH:MM local. Departure, check in, or car pick up. Never convert to UTC.' },
          depart_tz: { ...str, description: 'IANA zone of the departure point, e.g. Europe/Vilnius.' },
          arrive_local: { ...str, description: 'YYYY-MM-DDTHH:MM local. Arrival, check out, or car drop off.' },
          arrive_tz: str,
          cabin: str,
          seat: str,
          passengers: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

export type ExtractedSegment = {
  kind: string;
  address: string | null;
  carrier: string | null;
  carrier_name: string | null;
  number: string | null;
  booking_ref: string | null;
  from_code: string | null;
  from_city: string | null;
  to_code: string | null;
  to_city: string | null;
  depart_local: string | null;
  depart_tz: string | null;
  arrive_local: string | null;
  arrive_tz: string | null;
  cabin: string | null;
  seat: string | null;
  passengers: string[];
};

export type Extracted = {
  is_travel: boolean;
  confidence: number;
  needs_review: boolean;
  notes: string | null;
  trip_title: string | null;
  merge_with_trip_id: string | null;
  merge_reason: string | null;
  segments: ExtractedSegment[];
};
