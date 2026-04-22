#!/usr/bin/env node
/**
 * Seeds the Moonfest 2026 event + ticket product in Supabase.
 * Idempotent — safe to run multiple times.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SELLER_EMAIL (optional, defaults to furrycolombia@gmail.com)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SELLER_EMAIL = process.env.SELLER_EMAIL || "furrycolombia@gmail.com";
const IMG_BASE = "https://moonfest.furrycolombia.com";

if (!SUPABASE_URL || !KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function query(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`Query ${path}: ${await res.text()}`);
  return res.json();
}

async function upsert(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=representation,resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Upsert ${path}: ${await res.text()}`);
  return res.json();
}

async function insert(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Insert ${path}: ${await res.text()}`);
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Patch ${path}: ${await res.text()}`);
  return res.json();
}

async function del(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Delete ${path}: ${await res.text()}`);
}

// ─── Payment Methods ─────────────────────────────────────────────────

const CONSPACE_PAYMENT_METHOD = {
  name_en: "Conspace (International)",
  name_es: "Conspace (Internacional)",
  is_active: true,
  requires_receipt: true,
  requires_transfer_number: true,
  sort_order: 1,
  display_blocks: [
    {
      id: "conspace-info",
      type: "text",
      content_en:
        "For attendees **outside Colombia** who don't have a local bank account. Complete your payment securely through Conspace:",
      content_es:
        "Para asistentes **fuera de Colombia** que no tienen cuenta bancaria local. Completa tu pago de forma segura a traves de Conspace:",
    },
    {
      id: "conspace-logo",
      type: "image",
      url: "https://filedn.com/leGgCrrYIXV0YvzNNKbdzBb/conspace.png",
      alt_en: "Conspace payment platform",
      alt_es: "Plataforma de pago Conspace",
      href: "https://conspace.app/events/moonfest",
      target: "_blank",
      rel: "noopener noreferrer",
    },
    {
      id: "conspace-link",
      type: "link",
      url: "https://conspace.app/events/moonfest",
      label_en: "Pay via Conspace",
      label_es: "Pagar via Conspace",
    },
    {
      id: "conspace-instructions",
      type: "text",
      content_en:
        "After completing your payment on Conspace, upload your payment receipt and fill in your details below so we can confirm your registration.",
      content_es:
        "Despues de completar tu pago en Conspace, sube tu comprobante de pago y completa tus datos para que podamos confirmar tu registro.",
    },
  ],
  form_fields: [
    {
      id: "email",
      type: "email",
      label_en: "Email",
      label_es: "Correo electronico",
      placeholder_en: "your@email.com",
      placeholder_es: "tu@correo.com",
      required: true,
    },
    {
      id: "display_name",
      type: "text",
      label_en: "Your name (alias or real) — how you'd like to be identified",
      label_es: "Tu nombre (alias o real) — como te gustaria ser identificado",
      placeholder_en: "e.g. Kira or Juan Perez",
      placeholder_es: "Ej. Kira o Juan Perez",
      required: true,
    },
    {
      id: "tracking",
      type: "text",
      label_en: "Conspace order ID or confirmation number",
      label_es: "ID de orden Conspace o numero de confirmacion",
      placeholder_en: "e.g. CS-123456",
      placeholder_es: "Ej. CS-123456",
      required: true,
    },
  ],
};

const NEQUI_PAYMENT_METHOD = {
  name_en: "Nequi",
  name_es: "Nequi",
  is_active: true,
  requires_receipt: true,
  requires_transfer_number: true,
  sort_order: 0,
  display_blocks: [
    {
      id: "nequi-info",
      type: "text",
      content_en:
        "Send payment to tag **@NEQUISAN15697**, number **3108747789**, or scan the QR below:",
      content_es:
        "Envía el pago al tag **@NEQUISAN15697**, al número **3108747789**, o escanea el QR:",
    },
    {
      id: "nequi-qr",
      type: "image",
      url: "https://filedn.com/leGgCrrYIXV0YvzNNKbdzBb/3108747789.jpg",
      alt_en: "Nequi QR code",
      alt_es: "Código QR Nequi",
    },
    {
      id: "nequi-amount",
      type: "text",
      content_en: "Amount: **$300,000 COP** per ticket.",
      content_es: "Monto: **$300,000 COP** por entrada.",
    },
    {
      id: "nequi-instructions",
      type: "text",
      content_en:
        "After sending, fill in the fields below and upload a screenshot of the transaction.",
      content_es:
        "Después de enviar, completa los campos y sube una captura de pantalla del comprobante.",
    },
  ],
  form_fields: [
    {
      id: "cedula",
      type: "text",
      label_en: "ID number (Cedula)",
      label_es: "Numero de cedula",
      placeholder_en: "e.g. 1234567890",
      placeholder_es: "Ej. 1234567890",
      required: true,
    },
    {
      id: "email",
      type: "email",
      label_en: "Email",
      label_es: "Correo electronico",
      placeholder_en: "your@email.com",
      placeholder_es: "tu@correo.com",
      required: true,
    },
    {
      id: "tracking",
      type: "text",
      label_en: "Booking / tracking reference",
      label_es: "Datos de tracking / reserva",
      placeholder_en: "Booking code or tracking number",
      placeholder_es: "Codigo de reserva o numero de tracking",
      required: false,
    },
    {
      id: "display_name",
      type: "text",
      label_en: "Your name (alias or real) — how you'd like to be identified",
      label_es: "Tu nombre (alias o real) — como te gustaria ser identificado",
      placeholder_en: "e.g. Kira or Juan Perez",
      placeholder_es: "Ej. Kira o Juan Perez",
      required: true,
    },
    {
      id: "sender_account_name",
      type: "text",
      label_en: "Name of the Nequi account sending the payment",
      label_es: "Nombre de la cuenta Nequi que envia el dinero",
      placeholder_en: "Full name of the account owner",
      placeholder_es: "Nombre completo del dueno de la cuenta",
      required: true,
    },
  ],
};

// ─── Data ────────────────────────────────────────────────────────────

const EVENT = {
  slug: "moonfest-2026",
  name_en: "Moonfest 2026",
  name_es: "Moonfest 2026",
  description_en:
    "A four-day furry convention in Paipa, Boyaca, Colombia. Includes parties, panels, artist market, and round-trip transportation from Bogota.",
  description_es:
    "Una convencion furry de cuatro dias en Paipa, Boyaca, Colombia. Incluye fiestas, paneles, mercado de artistas y transporte ida y vuelta desde Bogota.",
  location: "Estelar Paipa Hotel & Convention Center, Boyaca, Colombia",
  starts_at: "2026-07-10T14:00:00-05:00",
  ends_at: "2026-07-13T12:00:00-05:00",
};

const IMAGES = [
  {
    url: `${IMG_BASE}/photo_2026-03-02_21-15-08.jpg`,
    alt_en: "Moonfest community gathering",
    alt_es: "Encuentro comunidad Moonfest",
    sort_order: 1,
    is_cover: false,
  },
  {
    url: `${IMG_BASE}/BANNER_WEB.webp`,
    alt_en: "Estelar Paipa Hotel thermal pool",
    alt_es: "Piscina termal Hotel Estelar Paipa",
    sort_order: 2,
    is_cover: true,
  },
  {
    url: `${IMG_BASE}/chia.webp`,
    alt_en: "Chia fursuit at Moonfest",
    alt_es: "Fursuit Chia en Moonfest",
    sort_order: 3,
    is_cover: false,
    fit: "contain",
  },
  {
    url: `${IMG_BASE}/moka.webp`,
    alt_en: "Moka fursuit at Moonfest",
    alt_es: "Fursuit Moka en Moonfest",
    sort_order: 4,
    is_cover: false,
    fit: "contain",
  },
];

const SECTIONS = [
  {
    name_en: "What's included",
    name_es: "Que incluye",
    type: "two-column",
    sort_order: 0,
    items: [
      {
        title_en: "Official merch package",
        title_es: "Paquete de merch oficial",
        description_en:
          "Exclusive Moonfest 2026 merchandise included with your ticket.",
        description_es:
          "Mercancia exclusiva de Moonfest 2026 incluida con tu entrada.",
        icon: "Gift",
        sort_order: 0,
      },
      {
        title_en: "All parties & events",
        title_es: "Todas las fiestas y eventos",
        description_en:
          "Full access to the Latin party, rave, and all scheduled events.",
        description_es:
          "Acceso completo a la fiesta latina, rave y todos los eventos programados.",
        icon: "Music",
        sort_order: 1,
      },
      {
        title_en: "Panels & workshops",
        title_es: "Paneles y talleres",
        description_en:
          "Talks, panels, and workshops with special guests and community creators.",
        description_es:
          "Charlas, paneles y talleres con invitados especiales y creadores de la comunidad.",
        icon: "Users",
        sort_order: 2,
      },
      {
        title_en: "Dealer Den",
        title_es: "Mercado de artistas",
        description_en:
          "Buy and sell art, products, and community merch at the artist market.",
        description_es:
          "Compra y vende arte, productos y merch de la comunidad en el mercado de artistas.",
        icon: "Palette",
        sort_order: 3,
      },
    ],
  },
  {
    name_en: "Event highlights",
    name_es: "Destacados del evento",
    type: "cards",
    sort_order: 1,
    items: [
      {
        title_en: "Community & fun",
        title_es: "Comunidad y diversion",
        description_en:
          "Share with friends and meet new people in a safe, welcoming environment.",
        description_es:
          "Comparte con amigos y conoce gente nueva en un ambiente seguro y acogedor.",
        icon: "Heart",
        sort_order: 0,
      },
      {
        title_en: "Games & activities",
        title_es: "Juegos y actividades",
        description_en: "Join games and activities designed for our guests.",
        description_es:
          "Participa en juegos y actividades disenados para nuestros invitados.",
        icon: "Gamepad2",
        sort_order: 1,
      },
      {
        title_en: "Thermal waters",
        title_es: "Aguas termales",
        description_en: "Jacuzzi inside the hotel to recharge between events.",
        description_es:
          "Jacuzzi dentro del hotel para recargar energias entre eventos.",
        icon: "Waves",
        sort_order: 2,
      },
      {
        title_en: "Buffet breakfast",
        title_es: "Desayuno buffet",
        description_en:
          "Daily buffet breakfast during a set time window, included in the hotel package.",
        description_es:
          "Desayuno buffet diario en horario establecido, incluido en el paquete del hotel.",
        icon: "Coffee",
        sort_order: 3,
      },
      {
        title_en: "Nature & lake views",
        title_es: "Naturaleza y vistas al lago",
        description_en: "Lake Sochagota views and photo-ready outdoor spaces.",
        description_es:
          "Vistas al Lago Sochagota y espacios al aire libre para fotos.",
        icon: "Mountain",
        sort_order: 4,
      },
      {
        title_en: "Main event",
        title_es: "Evento principal",
        description_en: "Enjoy a Latin party and a rave.",
        description_es: "Disfruta de una fiesta latina y un rave.",
        icon: "Sparkles",
        sort_order: 5,
      },
    ],
  },
  {
    name_en: "Venue & logistics",
    name_es: "Sede y logistica",
    type: "two-column",
    sort_order: 2,
    items: [
      {
        title_en: "Location",
        title_es: "Ubicacion",
        description_en:
          "Estelar Paipa Hotel & Convention Center, Boyaca, Colombia. Lakefront setting on Lake Sochagota.",
        description_es:
          "Hotel y Centro de Convenciones Estelar Paipa, Boyaca, Colombia. Ubicacion frente al Lago Sochagota.",
        icon: "MapPin",
        sort_order: 0,
      },
      {
        title_en: "Dates",
        title_es: "Fechas",
        description_en: "July 10-13, 2026. Four days and three nights.",
        description_es: "10-13 de julio, 2026. Cuatro dias y tres noches.",
        icon: "Calendar",
        sort_order: 1,
      },
      {
        title_en: "Weather",
        title_es: "Clima",
        description_en:
          "July in Paipa is cool (avg high 14.8C, low 7.5C) with frequent rain. Pack thermal layers and a rain jacket.",
        description_es:
          "Julio en Paipa es fresco (max promedio 14.8C, min 7.5C) con lluvia frecuente. Lleva capas termicas y chaqueta impermeable.",
        icon: "CloudRain",
        sort_order: 2,
      },
      {
        title_en: "Hotel not included",
        title_es: "Hotel no incluido",
        description_en:
          "Hotel reservation is separate. Room prices: $673,540 COP (quad) to $1,980,160 COP (solo) for 4 days/3 nights with breakfast.",
        description_es:
          "La reserva del hotel es aparte. Precios: $673,540 COP (cuadruple) a $1,980,160 COP (individual) por 4 dias/3 noches con desayuno.",
        icon: "Building",
        sort_order: 3,
      },
    ],
  },
  {
    name_en: "FAQ",
    name_es: "Preguntas frecuentes",
    type: "two-column",
    sort_order: 3,
    items: [
      {
        title_en: "Is the hotel included?",
        title_es: "El hotel esta incluido?",
        description_en:
          "No. Hotel reservation is a separate step. Room prices range from $673,540 COP (quad) to $1,980,160 COP (solo) for 4 days/3 nights including breakfast.",
        description_es:
          "No. La reserva del hotel es un paso aparte. Los precios van desde $673,540 COP (cuadruple) hasta $1,980,160 COP (individual) por 4 dias/3 noches con desayuno incluido.",
        icon: "HelpCircle",
        sort_order: 0,
      },
      {
        title_en: "Is the ticket refundable?",
        title_es: "La entrada es reembolsable?",
        description_en:
          "No. This ticket is non-refundable. Please make sure you can attend before purchasing.",
        description_es:
          "No. Esta entrada no es reembolsable. Asegurate de poder asistir antes de comprar.",
        icon: "AlertCircle",
        sort_order: 1,
      },
      {
        title_en: "What about transportation?",
        title_es: "Que hay del transporte?",
        description_en:
          "Round-trip bus transportation from Bogota is being coordinated. Details will be announced closer to the event.",
        description_es:
          "Se esta coordinando transporte en bus ida y vuelta desde Bogota. Los detalles se anunciaran mas cerca del evento.",
        icon: "Bus",
        sort_order: 2,
      },
      {
        title_en: "Questions?",
        title_es: "Preguntas?",
        description_en:
          "Contact furrycolombia@gmail.com for any questions about the event.",
        description_es:
          "Contacta furrycolombia@gmail.com para cualquier pregunta sobre el evento.",
        icon: "Mail",
        sort_order: 3,
      },
    ],
  },
];

const ENTITLEMENTS = [
  {
    name_en: "Official merch package",
    name_es: "Paquete de merch oficial",
    type: "merch",
    sort_order: 0,
  },
  {
    name_en: "Convention entry (4 days)",
    name_es: "Entrada a la convencion (4 dias)",
    type: "entry",
    sort_order: 1,
  },
  {
    name_en: "All parties access",
    name_es: "Acceso a todas las fiestas",
    type: "party",
    sort_order: 2,
  },
  {
    name_en: "Panels & workshops",
    name_es: "Paneles y talleres",
    type: "other",
    sort_order: 3,
  },
  {
    name_en: "Dealer Den access",
    name_es: "Acceso al Dealer Den",
    type: "other",
    sort_order: 4,
  },
];

// ─── Main ────────────────────────────────────────────────────────────

async function run() {
  // 1. Event (upsert by slug)
  const events = await query("events?slug=eq.moonfest-2026&select=id");
  let eventId;
  if (events.length > 0) {
    eventId = events[0].id;
    console.log("Event exists:", eventId);
  } else {
    const ev = await insert("events", EVENT);
    eventId = ev[0].id;
    console.log("Event created:", eventId);
  }

  // 2. Seller
  const users = await query(
    `user_profiles?email=eq.${encodeURIComponent(SELLER_EMAIL)}&select=id`,
  );
  if (!users.length) {
    throw new Error(
      `User ${SELLER_EMAIL} not found. They must sign in at least once first.`,
    );
  }
  const sellerId = users[0].id;
  console.log("Seller:", sellerId);

  // 3. Product (upsert by slug)
  const existing = await query(
    "products?slug=eq.moonfest-2026-ticket&select=id",
  );
  let productId;

  const productData = {
    event_id: eventId,
    seller_id: sellerId,
    slug: "moonfest-2026-ticket",
    name_en: "Moonfest 2026 — Event Ticket",
    name_es: "Moonfest 2026 — Entrada al Evento",
    description_en:
      "Full access to Moonfest 2026. Includes official merch package, all parties, panels, artist market, and more.",
    description_es:
      "Acceso completo a Moonfest 2026. Incluye paquete de merch oficial, todas las fiestas, paneles, mercado de artistas y mas.",
    long_description_en:
      "Moonfest 2026 is Colombia's biggest furry convention, taking place July 10-13 at the Estelar Paipa Hotel & Convention Center in Boyaca. Set on the shores of Lake Sochagota, the venue offers thermal jacuzzis, a wellness spa, lakefront trails, and convention spaces for up to 600 people.\n\nYour ticket includes the official merch package, full access to all parties (Latin party + rave), panels, workshops, the Dealer Den artist market, games, competitions, and surprise activities.\n\nThe hotel reservation is a separate step — room prices range from $673,540 COP per person (quad room) to $1,980,160 COP (solo) for 4 days/3 nights including daily buffet breakfast. Additional hotel services (spa, thermal pools, restaurants, nautical activities) are available at extra cost.\n\nThis ticket is non-refundable. Questions: furrycolombia@gmail.com",
    long_description_es:
      "Moonfest 2026 es la convencion furry mas grande de Colombia, del 10 al 13 de julio en el Hotel y Centro de Convenciones Estelar Paipa en Boyaca. Ubicado a orillas del Lago Sochagota, el lugar ofrece jacuzzis termales, spa de bienestar, senderos frente al lago y espacios para convenciones de hasta 600 personas.\n\nTu entrada incluye el paquete de merch oficial, acceso completo a todas las fiestas (fiesta latina + rave), paneles, talleres, el mercado de artistas Dealer Den, juegos, competencias y actividades sorpresa.\n\nLa reserva del hotel es un paso aparte — los precios van desde $673,540 COP por persona (cuadruple) hasta $1,980,160 COP (individual) por 4 dias/3 noches con desayuno buffet diario incluido. Servicios adicionales del hotel (spa, piscinas termales, restaurantes, actividades nauticas) tienen costo extra.\n\nEsta entrada no es reembolsable. Preguntas: furrycolombia@gmail.com",
    tagline_en:
      "Colombia's biggest furry convention. Community, art, and a full experience.",
    tagline_es:
      "La convencion furry mas grande de Colombia. Comunidad, arte y una experiencia completa.",
    type: "ticket",
    category: "events",
    price: 300000,
    currency: "COP",
    max_quantity: 200,
    is_active: true,
    featured: true,
    refundable: false,
    sort_order: 1,
    tags: ["moonfest", "furry", "convention", "colombia", "2026", "paipa"],
    images: IMAGES,
    sections: SECTIONS,
  };

  if (existing.length > 0) {
    productId = existing[0].id;
    await patch(`products?id=eq.${productId}`, productData);
    console.log("Product updated:", productId);
  } else {
    const p = await insert("products", productData);
    productId = p[0].id;
    console.log("Product created:", productId);
  }

  // 4. Entitlements (delete + recreate for idempotency)
  await del(`product_entitlements?product_id=eq.${productId}`);
  const ents = await insert(
    "product_entitlements",
    ENTITLEMENTS.map((e) => ({ ...e, product_id: productId })),
  );
  console.log("Entitlements:", ents.length);

  // 5. Nequi payment method (upsert by seller + name)
  const existingMethod = await query(
    `seller_payment_methods?seller_id=eq.${sellerId}&name_en=eq.Nequi&select=id`,
  );
  if (existingMethod.length > 0) {
    const methodId = existingMethod[0].id;
    await patch(
      `seller_payment_methods?id=eq.${methodId}`,
      NEQUI_PAYMENT_METHOD,
    );
    console.log("Nequi payment method updated:", methodId);
  } else {
    const method = await insert("seller_payment_methods", {
      ...NEQUI_PAYMENT_METHOD,
      seller_id: sellerId,
    });
    console.log("Nequi payment method created:", method[0].id);
  }

  // 6. Conspace payment method (upsert by seller + name)
  const existingConspace = await query(
    `seller_payment_methods?seller_id=eq.${sellerId}&name_en=eq.Conspace%20(International)&select=id`,
  );
  if (existingConspace.length > 0) {
    const methodId = existingConspace[0].id;
    await patch(
      `seller_payment_methods?id=eq.${methodId}`,
      CONSPACE_PAYMENT_METHOD,
    );
    console.log("Conspace payment method updated:", methodId);
  } else {
    const method = await insert("seller_payment_methods", {
      ...CONSPACE_PAYMENT_METHOD,
      seller_id: sellerId,
    });
    console.log("Conspace payment method created:", method[0].id);
  }

  console.log("\nDone! Product live at https://store.furrycolombia.com/store");
}

run().catch((e) => {
  console.error("[seed-moonfest]", e.message);
  process.exit(1);
});
