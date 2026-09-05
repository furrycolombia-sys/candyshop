import { describe, it, expect } from "vitest";

import { typeDetails } from "./typeDetails";
import type {
  MerchDetails,
  DigitalDetails,
  ServiceDetails,
  TicketDetails,
} from "./typeDetails";

describe("typeDetails", () => {
  it("extracts and casts type_details correctly", () => {
    const row = {
      type_details: { weight: "500g", material: "fleece" },
    };
    const details = typeDetails<MerchDetails>(row);
    expect(details.weight).toBe("500g");
    expect(details.material).toBe("fleece");
  });

  it("returns empty object when type_details is null", () => {
    const row = { type_details: null };
    const details = typeDetails<MerchDetails>(row);
    expect(details).toEqual({});
  });

  it("returns empty object when type_details is undefined", () => {
    const row = { type_details: undefined };
    const details = typeDetails<MerchDetails>(row);
    expect(details).toEqual({});
  });

  it("casts DigitalDetails correctly", () => {
    const row = {
      type_details: {
        file_size: "12MB",
        format: "PNG",
        license_type: "personal",
      },
    };
    const details = typeDetails<DigitalDetails>(row);
    expect(details.file_size).toBe("12MB");
    expect(details.format).toBe("PNG");
    expect(details.license_type).toBe("personal");
  });

  it("casts ServiceDetails correctly", () => {
    const row = {
      type_details: {
        total_slots: 10,
        slots_available: 3,
        turnaround_days: 14,
        revisions_included: 2,
        commercial_use: true,
      },
    };
    const details = typeDetails<ServiceDetails>(row);
    expect(details.total_slots).toBe(10);
    expect(details.slots_available).toBe(3);
    expect(details.commercial_use).toBe(true);
  });

  it("casts TicketDetails correctly", () => {
    const row = {
      type_details: {
        venue: "FurFest Hall A",
        location: "Chicago, IL",
        capacity: 500,
        tickets_remaining: 42,
      },
    };
    const details = typeDetails<TicketDetails>(row);
    expect(details.venue).toBe("FurFest Hall A");
    expect(details.capacity).toBe(500);
    expect(details.tickets_remaining).toBe(42);
  });
});
