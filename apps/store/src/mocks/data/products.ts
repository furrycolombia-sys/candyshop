import type { Product } from "@/features/products/domain/types";

export const mockProducts: Product[] = [
  // ─── Physical Products (3) ────────────────────────────────────────────
  {
    id: "phys-001",
    slug: "toony-fox-head-base",
    name: "Toony Fox Head Base",
    tagline: "Your dream sona starts here.",
    description:
      "Pre-made foam head base for a toony fox character. Includes moving jaw, follow-me eyes, and elastic strap. Ready for furring.",
    longDescription:
      "This toony fox head base is the perfect starting point for your next fursuit build. Hand-carved from high-density upholstery foam and reinforced with a 3D-printed jaw hinge, it gives you a rock-solid foundation that looks amazing even before the fur goes on.\n\nThe follow-me eyes are pre-installed with a magnetic mounting system so you can swap between eye styles in seconds. The moving jaw is balanced with elastic tension bands for natural-looking movement without hand fatigue. Ventilation channels are carved into the interior so you can breathe easy at your next con.\n\nWhether you're a first-time builder or a seasoned maker, this base saves you dozens of hours of carving and gives you consistent, professional results every time.",
    price: 280,
    currency: "USD",
    type: "merch",
    category: "fursuits",
    images: [
      { url: "/images/products/placeholder.svg", alt: "Toony fox head base" },
    ],
    inStock: true,
    featured: true,
    createdAt: "2026-02-10T12:00:00Z",
    tags: ["fursuit", "head base", "foam", "toony", "fox"],
    rating: 4.8,
    reviewCount: 127,
    highlights: [
      {
        icon: "Sparkles",
        title: "Follow-Me Eyes",
        description:
          "Magnetic mounting system with swappable eye inserts for easy customization.",
      },
      {
        icon: "Zap",
        title: "Moving Jaw",
        description:
          "Elastic tension-balanced jaw for natural movement without fatigue.",
      },
      {
        icon: "Shield",
        title: "Reinforced Build",
        description:
          "3D-printed jaw hinge and high-density foam for long-lasting durability.",
      },
      {
        icon: "Wind",
        title: "Built-In Ventilation",
        description:
          "Carved airflow channels keep you cool during long con days.",
      },
    ],
    specs: [
      { label: "Material", value: "High-density upholstery foam" },
      { label: "Weight", value: "1.2 kg" },
      { label: "Dimensions", value: "35 x 30 x 30 cm" },
      { label: "Jaw Type", value: "Moving (elastic tension)" },
      { label: "Eye System", value: "Magnetic follow-me" },
      { label: "Ships From", value: "Portland, OR" },
    ],
    faq: [
      {
        question: "Can I use this base for species other than foxes?",
        answer:
          "The base shape works great for wolves, coyotes, and other canines with minimal modification. Some builders have adapted it for cats too by reshaping the muzzle.",
      },
      {
        question: "What kind of fur works best with this base?",
        answer:
          "We recommend medium-pile faux fur (around 2 inch) for the best toony look. Short pile works too if you want a sleeker style. The foam takes hot glue and spray adhesive equally well.",
      },
      {
        question: "Do you offer custom sizing?",
        answer:
          "This listing is for a standard adult size (22-24 inch head circumference). Message us for custom sizing requests at $40 extra.",
      },
    ],
    seller: {
      name: "FoamPaws Studio",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Full-time fursuit maker since 2019. Over 200 bases shipped worldwide. Every base is hand-carved with love in my Portland workshop.",
      rating: 4.9,
      totalSales: 842,
      responseTime: "Under 2 hours",
    },
    reviews: [
      {
        author: "SnowfoxCreations",
        rating: 5,
        text: "Absolutely incredible base! The jaw mechanism is so smooth and the follow-me eyes are spooky good. My first build turned out amazing thanks to this starting point.",
        date: "2026-02-28T14:30:00Z",
      },
      {
        author: "PawsAndClaws42",
        rating: 5,
        text: "Third base I've bought from FoamPaws and the quality just keeps getting better. The ventilation channels are a game-changer for summer cons.",
        date: "2026-03-05T09:15:00Z",
      },
      {
        author: "NovaBuildsFursuits",
        rating: 4,
        text: "Great base overall. The only reason I'm not giving 5 stars is that the elastic on the jaw was a tiny bit loose for my preference, but that's an easy fix. Highly recommend.",
        date: "2026-03-10T18:00:00Z",
      },
    ],
    merch: {
      weight: "1.2 kg",
      dimensions: "35 x 30 x 30 cm",
      shipsFrom: "Portland, OR",
      material: "High-density upholstery foam, 3D-printed PLA",
      careInstructions:
        "Store in a cool, dry place. Do not compress for extended periods.",
    },
  },
  {
    id: "phys-002",
    slug: "paw-print-enamel-pin-set",
    name: "Paw Print Enamel Pin Set",
    tagline: "Wear your paws on your sleeve.",
    description:
      "Set of 4 hard enamel pins featuring pastel paw prints with gold plating. Rubber clutch backs.",
    longDescription:
      "Show off your furry pride with this gorgeous set of four hard enamel pins. Each pin features a different pastel colorway - lavender, mint, peach, and sky blue - with polished gold plating that catches the light beautifully.\n\nThese aren't your flimsy convention floor pins. Each one is struck from high-quality zinc alloy with recessed enamel fills that won't chip or fade. The rubber clutch backs keep them securely fastened to your lanyard, jacket, or bag without scratching the surface underneath.\n\nPerfect for trading at cons, gifting to your furry friends, or just adding some paw-some flair to your everyday look.",
    price: 18,
    compareAtPrice: 24,
    currency: "USD",
    type: "merch",
    category: "merch",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Paw print enamel pin set",
      },
    ],
    inStock: true,
    featured: false,
    createdAt: "2026-03-01T08:00:00Z",
    tags: ["pins", "enamel", "pastel", "paw print", "merch"],
    rating: 4.6,
    reviewCount: 89,
    highlights: [
      {
        icon: "Palette",
        title: "4 Pastel Colorways",
        description:
          "Lavender, mint, peach, and sky blue to match any fursona palette.",
      },
      {
        icon: "Shield",
        title: "Hard Enamel Quality",
        description:
          "Zinc alloy construction with recessed fills that resist chipping.",
      },
      {
        icon: "Heart",
        title: "Perfect for Trading",
        description:
          "Con-ready size and quality that makes them ideal for pin trades.",
      },
    ],
    specs: [
      { label: "Material", value: "Zinc alloy with hard enamel" },
      { label: "Plating", value: "Gold" },
      { label: "Size (each)", value: "25 mm diameter" },
      { label: "Backing", value: "Rubber clutch (2 per pin)" },
      { label: "Weight (set)", value: "50 g" },
    ],
    faq: [
      {
        question: "Can I buy individual pins instead of the set?",
        answer:
          "Currently we only sell them as the 4-pin set. We may offer singles in the future if there's enough demand!",
      },
      {
        question: "Are these safe for pin boards and fabric?",
        answer:
          "Yes! The rubber clutch backs are gentle on fabric and won't scratch pin boards. The pin posts are standard gauge so they work with any pin display.",
      },
    ],
    seller: {
      name: "InkPaw Designs",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Graphic designer and pin enthusiast making cute furry merch. Every design is drawn by paw (well, by hand, but you get it).",
      rating: 4.7,
      totalSales: 1523,
      responseTime: "Under 6 hours",
    },
    reviews: [
      {
        author: "PinCollectorFox",
        rating: 5,
        text: "The gold plating is SO pretty in person. Photos don't do these justice. Already ordered a second set for trading at FurCon.",
        date: "2026-03-08T11:00:00Z",
      },
      {
        author: "CozyWolfDen",
        rating: 4,
        text: "Beautiful pins! One of the rubber backs was a little loose but the extras they included solved that. Colors are vibrant and the enamel is flawless.",
        date: "2026-03-14T16:45:00Z",
      },
    ],
    merch: {
      weight: "50 g",
      shipsFrom: "Austin, TX",
      material: "Zinc alloy, hard enamel, gold plating",
    },
  },
  {
    id: "phys-003",
    slug: "handpaw-sleeves-kemono",
    name: "Kemono Handpaw Sleeves",
    tagline: "Silky-smooth paws, con-tested comfort.",
    description:
      "Custom-dyed faux fur handpaw sleeves with silicone paw pads. One size fits most. Available in 6 colorways.",
    longDescription:
      "These kemono-style handpaw sleeves are the comfiest paws you'll ever wear. Made from premium custom-dyed faux fur with a buttery-soft inner lining, they keep your hands cool and comfortable even after hours of suiting.\n\nThe silicone paw pads are hand-poured in our studio using a proprietary mold for that perfect squishy feel. They're grippy enough to hold drinks and phones but smooth enough to give the best paw-shakes. Each pad is heat-bonded (not glued) to the fur for maximum durability.\n\nAvailable in Arctic White, Sunset Orange, Berry Purple, Forest Green, Cotton Candy Pink, and Midnight Blue. Can't decide? Mix and match for a unique look!",
    price: 95,
    currency: "USD",
    type: "merch",
    category: "fursuits",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Kemono handpaw sleeves",
      },
    ],
    inStock: true,
    featured: false,
    createdAt: "2026-01-20T15:30:00Z",
    tags: ["handpaws", "kemono", "fursuit", "silicone pads"],
    rating: 4.5,
    reviewCount: 64,
    highlights: [
      {
        icon: "Heart",
        title: "Squishy Silicone Pads",
        description:
          "Hand-poured, heat-bonded pads with the perfect squish factor.",
      },
      {
        icon: "Palette",
        title: "6 Colorways",
        description:
          "Arctic White, Sunset Orange, Berry Purple, Forest Green, Cotton Candy Pink, and Midnight Blue.",
      },
      {
        icon: "Zap",
        title: "All-Day Comfort",
        description:
          "Breathable inner lining keeps your hands cool during long suit sessions.",
      },
      {
        icon: "Shield",
        title: "Heat-Bonded Construction",
        description:
          "Pads are heat-bonded, not glued, for durability that lasts years of con wear.",
      },
    ],
    specs: [
      { label: "Fur Type", value: "Premium custom-dyed faux fur" },
      { label: "Pad Material", value: "Medical-grade silicone" },
      { label: "Sizing", value: "One size fits most (S-XL)" },
      { label: "Weight (pair)", value: "300 g" },
      { label: "Dimensions", value: "40 x 15 x 10 cm" },
      { label: "Ships From", value: "Seattle, WA" },
    ],
    faq: [
      {
        question: "Can I wash these?",
        answer:
          "Yes! Hand wash in cold water with mild detergent, then air dry. Do not machine wash or tumble dry. The silicone pads are waterproof and clean easily with a damp cloth.",
      },
      {
        question: "Do the paw pads work with touchscreens?",
        answer:
          "The silicone pads don't conduct touchscreen signals, but the fingertip areas above the pads are thin enough for basic touch interactions.",
      },
      {
        question: "Can I get custom colors not listed?",
        answer:
          "Absolutely! Custom dye jobs are available for an additional $25 per pair. Message us with your color reference and we'll make it happen.",
      },
    ],
    seller: {
      name: "KemonoCraft",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Specializing in kemono-style fursuit parts since 2021. We focus on comfort, quality, and that perfect round aesthetic. Based in Seattle.",
      rating: 4.6,
      totalSales: 437,
      responseTime: "Under 4 hours",
    },
    reviews: [
      {
        author: "FluffyPawBean",
        rating: 5,
        text: "THE SQUISH. I cannot stop squishing these pads. Also they're incredibly comfortable to wear and the fur quality is top tier. Getting another pair in Cotton Candy Pink!",
        date: "2026-02-14T10:20:00Z",
      },
      {
        author: "SuitDancerWolf",
        rating: 4,
        text: "Great paws for the price. The fur is beautiful and the pads feel amazing. I wish the wrist elastic was a tiny bit tighter for energetic dancing, but overall very happy.",
        date: "2026-02-28T20:00:00Z",
      },
      {
        author: "KemonoKitsune",
        rating: 5,
        text: "Ordered the custom color option and they nailed it perfectly. The color match to my ref sheet was spot-on. These are my go-to paws now.",
        date: "2026-03-12T13:30:00Z",
      },
    ],
    merch: {
      weight: "300 g",
      dimensions: "40 x 15 x 10 cm",
      shipsFrom: "Seattle, WA",
      material: "Faux fur, medical-grade silicone, stretch jersey lining",
      careInstructions:
        "Hand wash cold, air dry. Do not machine wash or tumble dry.",
    },
  },

  // ─── Digital Products (3) ─────────────────────────────────────────────
  {
    id: "digi-001",
    slug: "retro-sticker-pack-vol2",
    name: "Retro Sticker Pack Vol. 2",
    tagline: "Slap some personality on your chats.",
    description:
      "30 high-res transparent PNG stickers with retro furry art. Perfect for Telegram, Discord, and print-on-demand.",
    longDescription:
      "Volume 2 of the fan-favorite Retro Sticker Pack is here, and it's packed with even more expressive furry goodness. Thirty brand-new stickers featuring a cast of adorable characters in classic 90s cartoon style - think Saturday morning vibes with a modern furry twist.\n\nEach sticker is rendered at 512x512 pixels with transparent backgrounds, optimized for crisp display on Telegram, Discord, Signal, and any other platform that supports custom stickers. They also work beautifully for print-on-demand if you want to slap them on notebooks, water bottles, or laptop lids.\n\nThe pack includes expressions ranging from ecstatic to dramatically offended, plus reaction stickers for every group chat situation imaginable. Your friends will be begging you to share the pack.",
    price: 8,
    currency: "USD",
    type: "digital",
    category: "digital",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Retro sticker pack volume 2",
      },
    ],
    inStock: true,
    featured: false,
    createdAt: "2026-03-10T10:00:00Z",
    tags: ["stickers", "digital", "telegram", "discord", "retro"],
    rating: 4.7,
    reviewCount: 213,
    highlights: [
      {
        icon: "Download",
        title: "Instant Download",
        description:
          "Get all 30 stickers immediately after purchase. No waiting.",
      },
      {
        icon: "Sparkles",
        title: "Retro Art Style",
        description:
          "90s cartoon aesthetic with bold outlines and vibrant colors.",
      },
      {
        icon: "Users",
        title: "Multi-Platform Ready",
        description:
          "Optimized for Telegram, Discord, Signal, and print-on-demand.",
      },
    ],
    specs: [
      { label: "File Count", value: "30 stickers" },
      { label: "Resolution", value: "512 x 512 px" },
      { label: "Format", value: "PNG (transparent background)" },
      { label: "Total File Size", value: "45 MB (ZIP)" },
      { label: "License", value: "Personal use + print-on-demand for self" },
    ],
    faq: [
      {
        question: "Can I use these stickers commercially?",
        answer:
          "The license covers personal use and printing for yourself (sticking on your own stuff). For commercial resale or redistribution, please contact us about a commercial license.",
      },
      {
        question: "Are these compatible with WhatsApp?",
        answer:
          "Yes! The transparent PNGs work with WhatsApp's sticker maker apps. You'll just need to import them through a third-party sticker app since WhatsApp doesn't support direct sticker uploads.",
      },
    ],
    seller: {
      name: "RetroFur Studio",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Digital artist specializing in retro-inspired furry art. Drawing cartoon animals since before it was cool (okay, it was always cool).",
      rating: 4.8,
      totalSales: 3210,
      responseTime: "Under 12 hours",
    },
    reviews: [
      {
        author: "StickerHoarder99",
        rating: 5,
        text: "Even better than Volume 1! The expressions are SO good. The dramatically offended face is now my most-used sticker in every group chat.",
        date: "2026-03-12T08:00:00Z",
      },
      {
        author: "TelegramFoxFan",
        rating: 5,
        text: "Crisp quality, great variety of emotions, and the retro style is chef's kiss. Already hoping for a Volume 3!",
        date: "2026-03-15T19:30:00Z",
      },
      {
        author: "PrintNerdWolf",
        rating: 4,
        text: "Love the art style and they print beautifully on vinyl sticker paper. Would love higher resolution options for large format printing though.",
        date: "2026-03-18T14:15:00Z",
      },
    ],
    digital: {
      fileSize: "45 MB",
      format: "PNG (transparent)",
      resolution: "512 x 512 px",
      licenseType: "Personal use + self print-on-demand",
    },
  },
  {
    id: "digi-002",
    slug: "species-ref-template-canine",
    name: "Canine Reference Sheet Template",
    tagline: "Your fursona deserves a proper ref.",
    description:
      "Layered PSD/Procreate template for canine reference sheets. Front, back, and detail views with color palette slots.",
    longDescription:
      "Stop struggling with blank canvases and awkward proportions. This professionally designed reference sheet template gives you everything you need to create a polished, commission-ready character reference for any canine species.\n\nThe template includes fully separated layers for lineart, base colors, markings, shading, and accessories - so you can build up your character step by step. The front, back, and 3/4 views are anatomically proportioned and come in both feral and anthro variants. Color palette slots, text fields for personality notes, and a dedicated accessories panel round out the layout.\n\nAvailable as both a Photoshop PSD and a native Procreate file with identical layer structures. Works in Clip Studio Paint, Krita, and any app that reads PSD files.",
    price: 12,
    currency: "USD",
    type: "digital",
    category: "art",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Canine reference sheet template",
      },
    ],
    inStock: true,
    featured: true,
    createdAt: "2026-02-25T09:00:00Z",
    tags: ["template", "reference sheet", "canine", "PSD", "procreate"],
    rating: 4.9,
    reviewCount: 186,
    highlights: [
      {
        icon: "Palette",
        title: "Fully Layered",
        description:
          "Separate layers for lineart, base colors, markings, shading, and accessories.",
      },
      {
        icon: "Users",
        title: "Anthro + Feral",
        description:
          "Both anthro and feral body variants included in one purchase.",
      },
      {
        icon: "Download",
        title: "Multi-Format",
        description:
          "Native PSD and Procreate files. Compatible with Krita, CSP, and more.",
      },
      {
        icon: "Star",
        title: "Commission-Ready",
        description:
          "Professional layout that artists will love receiving as a reference.",
      },
    ],
    specs: [
      { label: "Canvas Size", value: "4000 x 3000 px (300 DPI)" },
      { label: "Formats", value: "PSD + Procreate (.procreate)" },
      { label: "Layer Count", value: "45+ organized layers" },
      { label: "Views Included", value: "Front, back, 3/4, detail close-ups" },
      { label: "File Size", value: "120 MB (ZIP)" },
      { label: "License", value: "Personal + commission use" },
    ],
    faq: [
      {
        question: "Can I use this for non-canine species?",
        answer:
          "The proportions are optimized for canines (wolves, foxes, dogs, etc.), but many buyers have adapted it for felines and other species by modifying the head and tail layers. We also sell species-specific templates if you want a perfect fit.",
      },
      {
        question:
          "Can I sell art made with this template (e.g., commissions for others)?",
        answer:
          "Yes! You can use the template to create reference sheets for your own characters and for paid commissions. You just can't redistribute the template file itself.",
      },
      {
        question: "Does this work in free software like Krita?",
        answer:
          "Yes, the PSD file opens in Krita, GIMP, and other free apps that support PSD. Layer groups and blending modes are preserved.",
      },
    ],
    seller: {
      name: "RefSheet Pro",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Professional template designer making life easier for furry artists. Our templates are used by over 5,000 artists worldwide.",
      rating: 4.9,
      totalSales: 5847,
      responseTime: "Under 8 hours",
    },
    reviews: [
      {
        author: "ArtistAlleyFox",
        rating: 5,
        text: "This template saved me SO much time. The layer organization is immaculate and the proportions are spot-on. I use this for every canine commission ref now.",
        date: "2026-03-02T10:00:00Z",
      },
      {
        author: "NewbieFurArtist",
        rating: 5,
        text: "As someone just starting out, this template was a lifesaver. It taught me so much about how ref sheets should be structured. Worth every penny.",
        date: "2026-03-08T15:30:00Z",
      },
      {
        author: "ProcreatePanda",
        rating: 5,
        text: "The Procreate version is flawless. All the layers transfer perfectly and the canvas size is great for iPad Pro. Already eyeing the feline template!",
        date: "2026-03-15T12:00:00Z",
      },
    ],
    digital: {
      fileSize: "120 MB",
      format: "PSD + Procreate",
      resolution: "4000 x 3000 px (300 DPI)",
      licenseType: "Personal + commission use",
    },
  },
  {
    id: "digi-003",
    slug: "lofi-fur-beats-album",
    name: "Lo-Fi Fur Beats Album",
    tagline: "Chill beats for chill beans.",
    description:
      "12-track lo-fi chillhop album with furry-themed cover art. Royalty-free for streams and videos.",
    longDescription:
      "Twelve tracks of pure, cozy vibes to soundtrack your drawing sessions, study nights, and lazy Sunday afternoons. Lo-Fi Fur Beats blends mellow chillhop instrumentals with subtle nature samples - gentle rain, crackling fireplaces, and distant birdsong - for that warm den energy.\n\nEvery track comes with a royalty-free license for your YouTube videos, Twitch streams, podcasts, and social media content. No claims, no strikes, no hassle. Just credit 'Lo-Fi Fur Beats by BeatPaw' in your description and you're golden.\n\nThe album includes both MP3 (320kbps) and lossless FLAC versions, plus a bonus PDF with the gorgeous cover art and track notes from the artist.",
    price: 5,
    currency: "USD",
    type: "digital",
    category: "digital",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Lo-Fi Fur Beats album cover",
      },
    ],
    inStock: true,
    featured: false,
    createdAt: "2026-03-15T14:00:00Z",
    tags: ["music", "lo-fi", "royalty-free", "chillhop"],
    rating: 4.4,
    reviewCount: 52,
    highlights: [
      {
        icon: "Music",
        title: "12 Chill Tracks",
        description:
          "Over 40 minutes of mellow chillhop perfect for any creative session.",
      },
      {
        icon: "Shield",
        title: "Royalty-Free License",
        description:
          "Use in YouTube, Twitch, podcasts, and social media with simple credit.",
      },
      {
        icon: "Download",
        title: "MP3 + FLAC",
        description:
          "High-quality 320kbps MP3 and lossless FLAC versions included.",
      },
    ],
    specs: [
      { label: "Track Count", value: "12 tracks" },
      { label: "Total Duration", value: "42 minutes" },
      { label: "Formats", value: "MP3 (320kbps) + FLAC" },
      { label: "File Size", value: "210 MB (ZIP)" },
      { label: "License", value: "Royalty-free with credit" },
      { label: "Bonus Content", value: "Cover art PDF + track notes" },
    ],
    faq: [
      {
        question: "Can I use this music in monetized YouTube videos?",
        answer:
          "Absolutely! The royalty-free license covers monetized content on any platform. Just include 'Music: Lo-Fi Fur Beats by BeatPaw' in your video description.",
      },
      {
        question: "Will I get copyright strikes?",
        answer:
          "No. This music is 100% original and not registered with any content ID system. You will not receive any automated claims or strikes.",
      },
      {
        question: "Can I use individual tracks in different videos?",
        answer:
          "Yes! The license covers unlimited use of any or all tracks across all your content. No per-video limits.",
      },
    ],
    seller: {
      name: "BeatPaw",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Producer, drummer, and full-time fluffball. Making chill beats for the furry community since 2022. All music made with real instruments + vintage synths.",
      rating: 4.5,
      totalSales: 789,
      responseTime: "Under 24 hours",
    },
    reviews: [
      {
        author: "DrawStreamFox",
        rating: 5,
        text: "This is my go-to album for art streams now. The vibes are immaculate and my viewers always ask what music I'm playing. Zero copyright issues after 50+ streams.",
        date: "2026-03-18T20:00:00Z",
      },
      {
        author: "ChillDeerStudios",
        rating: 4,
        text: "Really pleasant album with great variety. A couple tracks feel a bit samey but overall it's a solid purchase for the price. The FLAC quality is excellent.",
        date: "2026-03-20T11:00:00Z",
      },
    ],
    digital: {
      fileSize: "210 MB",
      format: "MP3 + FLAC",
      resolution: "320kbps / 16-bit 44.1kHz",
      licenseType: "Royalty-free with credit",
    },
  },

  // ─── Commission Products (3) ─────────────────────────────────────────
  {
    id: "comm-001",
    slug: "full-illustration-commission",
    name: "Full Illustration Commission",
    tagline: "Your character, fully realized.",
    description:
      "Full-body character illustration with detailed background. Includes 3 revision rounds and high-res files.",
    longDescription:
      "Bring your character to life with a stunning full-body illustration rendered in a painterly semi-realistic style. Each commission includes a detailed background tailored to your character's story - whether that's a cozy forest den, a neon-lit cityscape, or a fantastical dreamworld.\n\nThe process starts with a detailed consultation where we nail down your vision, followed by a rough sketch for your approval. From there, I refine the lineart, build up colors and lighting, and deliver a polished piece you'll be proud to show off. Three revision rounds are included at each major stage so we get it perfect.\n\nFinal delivery includes a high-res PNG (4000px+), a web-optimized version, and a version without the watermark for personal printing.",
    price: 150,
    currency: "USD",
    type: "service",
    category: "art",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Full illustration commission example",
      },
    ],
    inStock: true,
    featured: true,
    createdAt: "2026-01-15T11:00:00Z",
    tags: ["commission", "illustration", "full body", "character art"],
    rating: 4.9,
    reviewCount: 298,
    highlights: [
      {
        icon: "Sparkles",
        title: "Painterly Style",
        description:
          "Semi-realistic rendering with rich colors and dramatic lighting.",
      },
      {
        icon: "Star",
        title: "3 Revision Rounds",
        description:
          "Revisions at sketch, lineart, and color stages to get it perfect.",
      },
      {
        icon: "Download",
        title: "Multiple Formats",
        description:
          "High-res PNG, web version, and print-ready file included.",
      },
      {
        icon: "Clock",
        title: "21-Day Turnaround",
        description:
          "Consistent delivery timeline with progress updates along the way.",
      },
    ],
    specs: [
      { label: "Style", value: "Semi-realistic / painterly" },
      { label: "Resolution", value: "4000+ px on longest side" },
      { label: "Revisions", value: "3 rounds included" },
      { label: "Turnaround", value: "~21 days" },
      { label: "Deliverables", value: "Hi-res PNG, web PNG, print-ready" },
      {
        label: "Commercial Use",
        value: "Personal use only (ask for commercial)",
      },
    ],
    faq: [
      {
        question: "What do you need from me to start?",
        answer:
          "A reference sheet or detailed description of your character, the pose or scene you want, and any mood/lighting preferences. The more detail, the better the result!",
      },
      {
        question: "Can I commission multiple characters in one piece?",
        answer:
          "Absolutely! Additional characters are +$75 each. Couples and group shots are some of my favorite pieces to work on.",
      },
      {
        question: "What if I need more than 3 revisions?",
        answer:
          "Additional revision rounds are $20 each. In practice, most clients are happy within the included rounds. I also send progress snapshots so we stay aligned throughout.",
      },
    ],
    seller: {
      name: "LunarisArt",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Full-time freelance illustrator with 7 years in the furry fandom. I specialize in dramatic lighting, dynamic poses, and making your characters look like they belong in a fantasy novel cover.",
      rating: 4.9,
      totalSales: 1247,
      responseTime: "Under 3 hours",
    },
    reviews: [
      {
        author: "DragonSonaOwner",
        rating: 5,
        text: "I have no words. Luna took my rough character concept and turned it into the most breathtaking piece of art I've ever commissioned. The lighting is INSANE. Already planning my next commission.",
        date: "2026-02-20T16:00:00Z",
      },
      {
        author: "WolfpackLeader",
        rating: 5,
        text: "Commissioned a group piece with 3 characters and it exceeded all expectations. Communication was excellent throughout the entire process. 11/10 would recommend.",
        date: "2026-03-01T09:30:00Z",
      },
      {
        author: "ProtogenFan2026",
        rating: 5,
        text: "The semi-realistic style works SO well for protogens. The visor lighting effects were gorgeous. Fast turnaround too - got my piece in 16 days.",
        date: "2026-03-10T14:00:00Z",
      },
    ],
    service: {
      totalSlots: 5,
      slotsAvailable: 2,
      turnaroundDays: 21,
      revisionsIncluded: 3,
      commercialUse: false,
    },
  },
  {
    id: "comm-002",
    slug: "partial-fursuit-commission",
    name: "Partial Fursuit Commission",
    tagline: "Become your fursona. For real.",
    description:
      "Custom partial fursuit including head, handpaws, and tail. Fully ventilated with follow-me eyes. 3D-printed base option available.",
    longDescription:
      "This is it - the commission that turns your character from pixels on a screen into a real, wearable, huggable suit. Our partial fursuit package includes a fully custom head, a pair of handpaw gloves, and a tail, all built to match your character reference down to the last marking.\n\nEvery head is built on a 3D-printed base (optional foam carving available) with integrated ventilation, a moving jaw, and our signature follow-me eye system. We use only premium long-pile faux fur sourced from trusted suppliers, and every seam is double-stitched for durability that lasts through years of cons, meets, and spontaneous dance parties.\n\nThe process begins with a detailed consultation and a 3D mockup of your head shape for approval. From there, our team of three makers brings your character to life over approximately 90 days, with photo updates at every major milestone.",
    price: 3000,
    compareAtPrice: 3500,
    currency: "USD",
    type: "service",
    category: "fursuits",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Partial fursuit commission example",
      },
    ],
    inStock: true,
    featured: true,
    createdAt: "2026-02-01T10:00:00Z",
    tags: ["fursuit", "commission", "partial", "custom", "3D-printed"],
    rating: 4.8,
    reviewCount: 43,
    highlights: [
      {
        icon: "Star",
        title: "3D-Printed Base",
        description:
          "Precision-modeled base for a perfect fit and lightweight comfort.",
      },
      {
        icon: "Sparkles",
        title: "Follow-Me Eyes",
        description:
          "Our signature magnetic eye system for that magical living look.",
      },
      {
        icon: "Shield",
        title: "Double-Stitched",
        description:
          "Every seam reinforced for years of con wear and dance competitions.",
      },
      {
        icon: "Users",
        title: "Team of Three",
        description:
          "Head specialist, sewing expert, and finishing artist work on your suit.",
      },
    ],
    specs: [
      { label: "Includes", value: "Head, handpaws, tail" },
      { label: "Base Type", value: "3D-printed (foam carving available)" },
      { label: "Fur Type", value: "Premium long-pile faux fur" },
      { label: "Turnaround", value: "~90 days" },
      { label: "Head Ventilation", value: "Integrated fan + channel system" },
      { label: "Fitting", value: "Custom measurements required" },
    ],
    faq: [
      {
        question: "How do you get my measurements?",
        answer:
          "We send a detailed measurement guide with video instructions after booking. You'll need a friend to help with the head measurements. We also offer video call fittings if you want extra guidance.",
      },
      {
        question: "Can I upgrade to a full suit later?",
        answer:
          "Yes! We keep your patterns and 3D models on file. Bodysuits, feetpaws, and other additions can be commissioned later and will match perfectly.",
      },
      {
        question: "What's the difference between 3D-printed and foam base?",
        answer:
          "3D-printed bases are lighter, more precise, and better ventilated. Foam bases are traditional and slightly less expensive (-$200). Both produce great results, but we recommend 3D-printed for the best experience.",
      },
    ],
    seller: {
      name: "WildStitch Studios",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Three-person fursuit studio based in Chicago. We've been making fursuits for 6 years and have completed over 150 suits. Every suit is a labor of love.",
      rating: 4.8,
      totalSales: 156,
      responseTime: "Under 6 hours",
    },
    reviews: [
      {
        author: "FirstTimeSuiter",
        rating: 5,
        text: "I cried when I put the head on for the first time. It was like meeting my fursona in the mirror. The quality is absolutely unreal and the team was so patient with all my questions. Worth every single penny.",
        date: "2026-02-25T18:00:00Z",
      },
      {
        author: "ConVeteranHusky",
        rating: 5,
        text: "This is my third partial from different makers and WildStitch is on another level. The 3D-printed base is SO much lighter and the ventilation actually works. Suited for 4 hours at MFF with no issues.",
        date: "2026-03-05T12:00:00Z",
      },
      {
        author: "DanceBattleChamp",
        rating: 4,
        text: "Incredible build quality and the moving jaw is super smooth. Only minor issue was a slight delay (got it at 100 days instead of 90) but they communicated proactively and the result was worth the wait.",
        date: "2026-03-15T22:00:00Z",
      },
    ],
    service: {
      totalSlots: 3,
      slotsAvailable: 1,
      turnaroundDays: 90,
      revisionsIncluded: 5,
      commercialUse: false,
    },
  },
  {
    id: "comm-003",
    slug: "chibi-badge-commission",
    name: "Chibi Badge Commission",
    tagline: "The cutest way to wear your name.",
    description:
      "Cute chibi-style convention badge with lamination. Includes lanyard clip and double-sided print.",
    longDescription:
      "Nothing says 'I'm here and I'm adorable' quite like a custom chibi badge swinging from your lanyard. These badges are drawn in a bouncy, round chibi style that makes every character look impossibly cute, whether they're a fierce dragon or a fluffy bunny.\n\nEach badge is digitally illustrated, professionally printed on premium cardstock, and laminated for durability. The front features your character with your name and pronouns, while the back has a smaller character pose with social media handles. A sturdy lanyard clip is attached so you're con-ready right out of the envelope.\n\nTurnaround is lightning-fast at just 7 days, making these perfect for last-minute con prep. I always have plenty of slots open, so don't hesitate to grab one!",
    price: 35,
    currency: "USD",
    type: "service",
    category: "art",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Chibi badge commission example",
      },
    ],
    inStock: true,
    featured: false,
    createdAt: "2026-03-05T16:00:00Z",
    tags: ["badge", "chibi", "commission", "convention", "laminated"],
    rating: 4.7,
    reviewCount: 174,
    highlights: [
      {
        icon: "Zap",
        title: "7-Day Turnaround",
        description:
          "Lightning-fast delivery perfect for last-minute con prep.",
      },
      {
        icon: "Star",
        title: "Double-Sided Print",
        description: "Character + name on front, socials + alt pose on back.",
      },
      {
        icon: "Shield",
        title: "Laminated & Durable",
        description:
          "Premium cardstock with glossy lamination survives the con floor.",
      },
    ],
    specs: [
      { label: "Style", value: "Chibi / super-deformed" },
      { label: "Badge Size", value: "3 x 4 inches" },
      { label: "Print", value: "Double-sided, premium cardstock" },
      { label: "Finish", value: "Glossy lamination" },
      { label: "Turnaround", value: "~7 days" },
      { label: "Includes", value: "Badge + lanyard clip + digital file" },
    ],
    faq: [
      {
        question: "Can I get a digital-only version?",
        answer:
          "Yes! Digital-only badges are $25. You'll receive a high-res PNG ready for self-printing or online use.",
      },
      {
        question: "What info do you need for the badge?",
        answer:
          "Character reference, your badge name, pronouns (optional), and social media handles for the back. If you have specific pose or expression preferences, let me know!",
      },
      {
        question: "Do you ship internationally?",
        answer:
          "Yes! US shipping is included in the price. International shipping is an additional $5 for standard or $12 for tracked/express.",
      },
    ],
    seller: {
      name: "ChibiPaws",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Badge machine extraordinaire! I've drawn over 2,000 chibi badges and I still get excited for every single one. Making the fandom cuter, one badge at a time.",
      rating: 4.8,
      totalSales: 2341,
      responseTime: "Under 1 hour",
    },
    reviews: [
      {
        author: "ConGoerRaccoon",
        rating: 5,
        text: "Ordered this 5 days before a con and it arrived just in time. The print quality is amazing and my character looks SO CUTE in chibi form. Already ordering another for my alt sona.",
        date: "2026-03-10T08:00:00Z",
      },
      {
        author: "BadgeCollector",
        rating: 5,
        text: "This is my 4th badge from ChibiPaws and the consistency is incredible. The lamination is thick and sturdy, survived three cons without a scratch. Best badge artist in the fandom honestly.",
        date: "2026-03-14T14:30:00Z",
      },
      {
        author: "ShyDeerArtist",
        rating: 4,
        text: "Really lovely work! My only note is I wish the back had slightly more space for social handles, but the front character art is absolutely adorable. Fast delivery too.",
        date: "2026-03-18T10:00:00Z",
      },
    ],
    service: {
      totalSlots: 10,
      slotsAvailable: 7,
      turnaroundDays: 7,
      revisionsIncluded: 2,
      commercialUse: false,
    },
  },

  // ─── Ticket Products (3) ──────────────────────────────────────────────
  {
    id: "tick-001",
    slug: "pawcon-2026-weekend-pass",
    name: "PawCon 2026 Weekend Pass",
    tagline: "Three days of pure furry magic.",
    description:
      "Full weekend pass for PawCon 2026. Includes access to all panels, dealer's den, artist alley, and the Saturday night dance.",
    longDescription:
      "PawCon is back and bigger than ever! Your weekend pass gets you full access to three days of panels, workshops, performances, and the legendary Saturday night dance. Browse the dealer's den with over 150 vendors, discover new artists in the artist alley, and catch amazing fursuit performances on the main stage.\n\nThis year's theme is 'Neon Wilderness' featuring blacklight-reactive decorations, a glow-in-the-dark dance floor, and a special UV fursuit photo booth. Guest of Honor is the incredible TailWagger, known for their viral fursuit dance videos and charity streams.\n\nYour badge includes early access to the dealer's den on Friday (1 hour before general admission), a PawCon 2026 lanyard, and a collectible holographic sticker. Food trucks and refreshments are available on-site throughout the event.",
    price: 75,
    currency: "USD",
    type: "ticket",
    category: "events",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "PawCon 2026 weekend pass",
      },
    ],
    inStock: true,
    featured: true,
    createdAt: "2026-01-05T08:00:00Z",
    tags: ["convention", "furcon", "weekend pass", "Portland"],
    rating: 4.6,
    reviewCount: 89,
    highlights: [
      {
        icon: "Star",
        title: "Full Weekend Access",
        description:
          "Three days of panels, workshops, dealer's den, and artist alley.",
      },
      {
        icon: "Music",
        title: "Saturday Night Dance",
        description:
          "Glow-in-the-dark dance floor with professional DJ and light show.",
      },
      {
        icon: "MapPin",
        title: "150+ Vendors",
        description:
          "Massive dealer's den and artist alley with early access on Friday.",
      },
      {
        icon: "Award",
        title: "Swag Included",
        description:
          "Custom lanyard, holographic sticker, and event program included.",
      },
    ],
    specs: [
      { label: "Dates", value: "July 18-20, 2026" },
      { label: "Venue", value: "Portland Convention Center" },
      { label: "Hours", value: "Fri 2PM-10PM, Sat 10AM-12AM, Sun 10AM-5PM" },
      { label: "Capacity", value: "2,500 attendees" },
      { label: "Theme", value: "Neon Wilderness" },
      { label: "Guest of Honor", value: "TailWagger" },
    ],
    faq: [
      {
        question: "Is there a single-day pass option?",
        answer:
          "Saturday-only passes are available for $40. We don't offer Friday-only or Sunday-only passes at this time.",
      },
      {
        question: "Are fursuits required?",
        answer:
          "Not at all! Fursuits are welcome but absolutely not required. About 40% of attendees suit up at any given time. Come as you are!",
      },
      {
        question: "Can I get a refund if I can't attend?",
        answer:
          "Full refunds are available until June 18, 2026 (30 days before the event). After that, passes are transferable to another person but non-refundable.",
      },
    ],
    seller: {
      name: "PawCon Events LLC",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Organizing PawCon since 2020. We're a volunteer-run furry convention dedicated to creating the most welcoming and fun event on the West Coast.",
      rating: 4.7,
      totalSales: 4200,
      responseTime: "Under 12 hours",
    },
    reviews: [
      {
        author: "ConVet2025",
        rating: 5,
        text: "PawCon 2025 was the best con I've ever been to. The dealer's den was incredible, the dance was legendary, and the vibes were immaculate. Already got my 2026 pass!",
        date: "2026-01-20T10:00:00Z",
      },
      {
        author: "FirstConEver",
        rating: 5,
        text: "This was my first ever furry con and I was nervous, but everyone was SO friendly and welcoming. The panels were informative and fun. Can't wait to go back!",
        date: "2026-02-01T15:00:00Z",
      },
      {
        author: "DealersDenAddict",
        rating: 4,
        text: "Great con overall. The early dealer's den access was a nice perk. Only wish the venue had better AC - it got warm during peak hours. But the event itself was fantastic.",
        date: "2026-02-15T09:00:00Z",
      },
    ],
    ticket: {
      date: "2026-07-18",
      venue: "Portland Convention Center",
      location: "Portland, OR",
      capacity: 2500,
      ticketsRemaining: 340,
      doorsOpen: "2:00 PM (Friday)",
    },
  },
  {
    id: "tick-002",
    slug: "furry-art-workshop-june",
    name: "Furry Art Workshop - June",
    tagline: "Level up your art game, paws-on.",
    description:
      "3-hour hands-on digital art workshop covering character design fundamentals. Beginner-friendly. Supplies included.",
    longDescription:
      "Whether you've been drawing for years or just picked up a stylus last week, this workshop will give you the tools and confidence to create compelling furry character designs. Led by professional furry artist SketchTail, you'll learn the fundamentals of character anatomy, expression, and personality through hands-on exercises.\n\nThe workshop covers canine, feline, and avian body structures, how to give your characters readable expressions, and tips for designing memorable markings and color palettes. Each participant gets a digital handout packet with reference sheets, exercise templates, and a curated list of resources to continue learning.\n\nTablets are provided for those who need them (Wacom Intuos), and the venue has stable Wi-Fi for those bringing their own iPad or laptop. Light refreshments and snacks are included.",
    price: 40,
    currency: "USD",
    type: "ticket",
    category: "events",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Furry art workshop",
      },
    ],
    inStock: true,
    featured: false,
    createdAt: "2026-03-12T09:00:00Z",
    tags: ["workshop", "art", "digital art", "beginner", "Austin"],
    rating: 4.8,
    reviewCount: 28,
    highlights: [
      {
        icon: "Palette",
        title: "Hands-On Learning",
        description:
          "Practice exercises with real-time feedback from a pro artist.",
      },
      {
        icon: "Users",
        title: "Beginner-Friendly",
        description:
          "No experience needed. Tablets provided if you don't have one.",
      },
      {
        icon: "Download",
        title: "Digital Handout Pack",
        description:
          "Reference sheets, templates, and resource list to keep learning.",
      },
    ],
    specs: [
      { label: "Duration", value: "3 hours" },
      { label: "Date", value: "June 14, 2026" },
      { label: "Time", value: "1:00 PM - 4:00 PM" },
      { label: "Venue", value: "Creative Co-op, Austin TX" },
      { label: "Capacity", value: "30 participants" },
      { label: "Skill Level", value: "Beginner to intermediate" },
    ],
    faq: [
      {
        question: "Do I need to bring my own tablet?",
        answer:
          "Nope! We have Wacom Intuos tablets available for those who need them. If you prefer your own device (iPad, laptop, etc.), feel free to bring it. The venue has reliable Wi-Fi.",
      },
      {
        question: "What software will be used?",
        answer:
          "The instructor demonstrates in Clip Studio Paint, but you can follow along in any drawing software you're comfortable with. The techniques are software-agnostic.",
      },
    ],
    seller: {
      name: "SketchTail Workshops",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Professional furry artist and educator. I've taught over 50 workshops across 12 states. My mission is making art accessible and fun for everyone in the fandom.",
      rating: 4.9,
      totalSales: 620,
      responseTime: "Under 8 hours",
    },
    reviews: [
      {
        author: "BabyArtistOtter",
        rating: 5,
        text: "I went in barely able to draw a circle and came out with a character sketch I'm actually proud of. SketchTail is an incredible teacher who makes everything feel approachable. 10/10.",
        date: "2026-03-20T11:00:00Z",
      },
      {
        author: "DigitalArtDeer",
        rating: 5,
        text: "Even as someone with a few years of experience, I learned new techniques I hadn't considered. The handout packet alone is worth the price. Refreshments were a nice touch too!",
        date: "2026-03-21T16:30:00Z",
      },
    ],
    ticket: {
      date: "2026-06-14",
      venue: "Creative Co-op, Austin TX",
      location: "Austin, TX",
      capacity: 30,
      ticketsRemaining: 12,
      doorsOpen: "12:30 PM",
    },
  },
  {
    id: "tick-003",
    slug: "howl-at-the-moon-meetup",
    name: "Howl at the Moon Meetup",
    tagline: "Good vibes, great suits, gorgeous sunsets.",
    description:
      "Monthly outdoor fursuit walk and social at Griffith Park. Includes group photo session and picnic snacks.",
    longDescription:
      "Join us for the chillest furry event in Los Angeles! The Howl at the Moon Meetup is a monthly outdoor social where fursuiters and non-suiters alike come together for a scenic walk through Griffith Park, group photos with the Hollywood sign in the background, and a casual picnic hangout.\n\nThe event kicks off with a group walk along the easy-grade Observatory trail (suitable for all fitness levels and fursuit-friendly), followed by a professional group photo session at the scenic overlook. After that, we set up at the picnic area with provided snacks, drinks, and good conversation until sunset.\n\nSpotters and handlers are available for suiters, and we have a cool-down station with fans and cold water. Non-suiters are absolutely welcome - this is a social event for everyone in the community!",
    price: 10,
    currency: "USD",
    type: "ticket",
    category: "events",
    images: [
      {
        url: "/images/products/placeholder.svg",
        alt: "Howl at the Moon meetup",
      },
    ],
    inStock: true,
    featured: false,
    createdAt: "2026-03-18T07:00:00Z",
    tags: ["meetup", "outdoor", "fursuit walk", "Los Angeles", "social"],
    rating: 4.3,
    reviewCount: 34,
    highlights: [
      {
        icon: "MapPin",
        title: "Scenic Location",
        description:
          "Griffith Park with Hollywood sign views for amazing group photos.",
      },
      {
        icon: "Heart",
        title: "Community Vibes",
        description:
          "Welcoming social event for suiters and non-suiters alike.",
      },
      {
        icon: "Shield",
        title: "Spotter Support",
        description:
          "Handlers and a cool-down station available for fursuiting comfort.",
      },
    ],
    specs: [
      { label: "Date", value: "April 20, 2026" },
      { label: "Time", value: "4:00 PM - 8:00 PM" },
      { label: "Location", value: "Griffith Park, Los Angeles" },
      { label: "Trail Difficulty", value: "Easy (fursuit-friendly)" },
      { label: "Capacity", value: "60 attendees" },
      { label: "Includes", value: "Snacks, drinks, group photo" },
    ],
    faq: [
      {
        question: "Do I need a fursuit to attend?",
        answer:
          "Not at all! About half our attendees come without suits. It's a social event first and foremost. Handlers and photographers are especially welcome.",
      },
      {
        question: "What if it rains?",
        answer:
          "We monitor the forecast and will reschedule to the following Sunday if rain is expected. All ticket holders are notified via email at least 24 hours in advance.",
      },
      {
        question: "Is parking available?",
        answer:
          "Yes, there's free parking at the Griffith Observatory lot. We'll send detailed directions and meeting point info when you register.",
      },
    ],
    seller: {
      name: "LA Furry Socials",
      avatar: "/images/sellers/placeholder.svg",
      bio: "Organizing monthly furry meetups in the greater Los Angeles area since 2023. Our goal is simple: bring the community together in beautiful places and have a great time.",
      rating: 4.5,
      totalSales: 890,
      responseTime: "Under 4 hours",
    },
    reviews: [
      {
        author: "SunsetFoxLA",
        rating: 5,
        text: "Best meetup in LA by far. The group photo with the Hollywood sign is always incredible and the vibe is so relaxed and welcoming. The snacks are surprisingly good too!",
        date: "2026-03-20T19:00:00Z",
      },
      {
        author: "NewToFurry2026",
        rating: 4,
        text: "Went to my first meetup here and everyone was super nice. The walk was easy even in warm weather. Only wish it started a little later in summer since it was still pretty hot at 4pm.",
        date: "2026-03-21T09:00:00Z",
      },
      {
        author: "PhotoFurGryphon",
        rating: 4,
        text: "Great event for photography! The golden hour lighting at Griffith is unbeatable. Would love to see a dedicated photography meetup variant. The $10 price is very reasonable for what you get.",
        date: "2026-03-22T14:00:00Z",
      },
    ],
    ticket: {
      date: "2026-04-20",
      venue: "Griffith Park, Los Angeles",
      location: "Los Angeles, CA",
      capacity: 60,
      ticketsRemaining: 45,
      doorsOpen: "3:30 PM",
      ageRestriction: "All ages",
    },
  },
];

export function createMockProduct(overrides?: Partial<Product>): Product {
  return {
    id: crypto.randomUUID(),
    slug: "mock-product",
    name: "Mock Product",
    tagline: "A great product for testing.",
    description: "A mock product for testing.",
    longDescription:
      "This is a longer description of the mock product used for testing purposes. It contains enough text to simulate a realistic product detail page.",
    price: 25,
    currency: "USD",
    type: "merch",
    category: "merch",
    images: [{ url: "/images/products/placeholder.svg", alt: "Mock product" }],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
    tags: ["mock", "test"],
    rating: 4.5,
    reviewCount: 42,
    highlights: [
      {
        icon: "Star",
        title: "Great Quality",
        description: "Made with care and attention to detail.",
      },
      {
        icon: "Zap",
        title: "Fast Delivery",
        description: "Ships within 2 business days.",
      },
    ],
    specs: [
      { label: "Material", value: "Premium" },
      { label: "Weight", value: "100 g" },
    ],
    faq: [
      {
        question: "Is this a real product?",
        answer: "No, this is a mock product for testing purposes.",
      },
    ],
    seller: {
      name: "Test Seller",
      bio: "A mock seller for testing.",
      rating: 4.7,
      totalSales: 100,
      responseTime: "Under 1 hour",
    },
    reviews: [
      {
        author: "TestUser",
        rating: 5,
        text: "Great mock product!",
        date: new Date().toISOString(),
      },
    ],
    ...overrides,
  };
}
