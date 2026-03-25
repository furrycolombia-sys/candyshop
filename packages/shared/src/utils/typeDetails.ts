/**
 * Extracts and casts the type_details JSONB field from a product row.
 */
export function typeDetails<T>(product: { type_details: unknown }): T {
  return (product.type_details ?? {}) as T;
}

export interface MerchDetails {
  weight?: string;
  dimensions?: string;
  ships_from?: string;
  material?: string;
  care_instructions?: string;
}

export interface DigitalDetails {
  file_size?: string;
  format?: string;
  resolution?: string;
  license_type?: string;
}

export interface ServiceDetails {
  total_slots?: number;
  slots_available?: number;
  turnaround_days?: number;
  revisions_included?: number;
  commercial_use?: boolean;
}

export interface TicketDetails {
  venue?: string;
  location?: string;
  doors_open?: string;
  age_restriction?: string;
  capacity?: number;
  tickets_remaining?: number;
}
