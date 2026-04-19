import type {
  ExternalLinkEntry,
  FAQItem,
  FaqCategoryId,
  ForumComment,
  ForumPost,
  ForumRoom,
  User,
} from "./types";

/** Demo authors — replace with API user profiles later. */
export const USERS: Record<string, User> = {
  u1: {
    id: "u1",
    displayName: "Maya Chen",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop",
    badges: ["VERIFIED_EXPERT", "TOP_CONTRIBUTOR"],
  },
  u2: {
    id: "u2",
    displayName: "Jordan Lee",
    avatarUrl: null,
    badges: ["NEW_CAT_PARENT"],
  },
  u3: {
    id: "u3",
    displayName: "Sam Rivera",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop",
    badges: ["SHELTER_PARTNER"],
  },
  u4: {
    id: "u4",
    displayName: "Alex Kim",
    avatarUrl: null,
    badges: ["TOP_CONTRIBUTOR"],
  },
  u5: {
    id: "u5",
    displayName: "Riley Patel",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop",
    badges: ["NEW_CAT_PARENT"],
  },
  op: {
    id: "op",
    displayName: "You (demo)",
    avatarUrl: null,
    badges: [],
  },
};

export const FAQ_CATEGORY_META: {
  id: FaqCategoryId;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: "new-owners",
    label: "New Owners",
    shortLabel: "New",
    description: "First weeks, gear, and safe introductions.",
  },
  {
    id: "nutrition",
    label: "Nutrition",
    shortLabel: "Food",
    description: "Meals, macros, and bowls — without the noise.",
  },
  {
    id: "litter-box",
    label: "Litter Box",
    shortLabel: "Litter",
    description: "Setup, habits, and solving common issues.",
  },
  {
    id: "behavior",
    label: "Behavior",
    shortLabel: "Behavior",
    description: "Play, stress signals, and happy routines.",
  },
  {
    id: "health",
    label: "Health",
    shortLabel: "Health",
    description: "Wellness patterns — always pair with your vet.",
  },
  {
    id: "life-stages",
    label: "Life Stages",
    shortLabel: "Stages",
    description: "Kittens, adults, and golden years.",
  },
];

/** Topic filters for the Editorial hub (external links only). */
export const EDITORIAL_TOPICS: { id: string; label: string }[] = [
  { id: "all", label: "All picks" },
  { id: "health", label: "Health & vet" },
  { id: "behavior", label: "Behavior & training" },
  { id: "nutrition", label: "Nutrition" },
  { id: "welfare", label: "Welfare & environment" },
  { id: "science", label: "Science & news" },
];

/**
 * Hand-picked authoritative pages — opens off-site. Edit URLs here; no article bodies in-app.
 */
export const EXTERNAL_LINKS: ExternalLinkEntry[] = [
  {
    id: "el-1",
    title: "General cat care (ASPCA)",
    url: "https://www.aspca.org/pet-care/cat-care/general-cat-care",
    topicId: "welfare",
    sourceLabel: "ASPCA",
    dek: "Baseline husbandry, feeding, and safety from a major animal welfare org.",
    imageUrl: "https://images.unsplash.com/photo-1514888288774-7caa1c58b3c9?w=800&q=80&auto=format&fit=crop",
    featured: true,
  },
  {
    id: "el-2",
    title: "Feline Health Center (Cornell)",
    url: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center",
    topicId: "health",
    sourceLabel: "Cornell University",
    dek: "Vet-school curated feline health resources and articles.",
    imageUrl: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "el-3",
    title: "International Cat Care — advice library",
    url: "https://icatcare.org/advice/",
    topicId: "behavior",
    sourceLabel: "International Cat Care",
    dek: "Evidence-leaning behavior, care, and life-stage guides.",
    imageUrl: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "el-4",
    title: "Cat care resources (AVMA)",
    url: "https://www.avma.org/resources-tools/pet-owners/petcare/cats",
    topicId: "health",
    sourceLabel: "American Veterinary Medical Association",
    dek: "Professional veterinary association overview for cat owners.",
    imageUrl: null,
  },
  {
    id: "el-5",
    title: "Feeding your cat (Humane Society)",
    url: "https://www.humanesociety.org/resources/cat-care-feeding",
    topicId: "nutrition",
    sourceLabel: "The Humane Society of the United States",
    dek: "Practical feeding considerations and routines.",
    imageUrl: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "el-6",
    title: "Indoor cats & enrichment (AAFP)",
    url: "https://catfriendly.com/cat-care-at-home/indoor-cats/",
    topicId: "behavior",
    sourceLabel: "American Association of Feline Practitioners",
    dek: "Indoor living, stress reduction, and home setup.",
    imageUrl: null,
  },
  {
    id: "el-7",
    title: "Environmental enrichment for cats",
    url: "https://www.avma.org/resources-tools/pet-owners/petcare/environmental-enrichment-cats",
    topicId: "welfare",
    sourceLabel: "AVMA",
    dek: "Why enrichment matters and how to add it responsibly.",
    imageUrl: null,
  },
  {
    id: "el-8",
    title: "CDC — Healthy pets: cats",
    url: "https://www.cdc.gov/healthypets/pets/cats.html",
    topicId: "health",
    sourceLabel: "U.S. CDC",
    dek: "Zoonoses and healthy habits around pet cats (public health lens).",
    imageUrl: null,
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: "faq-intro-two-cats",
    categoryId: "new-owners",
    question: "How do I introduce two cats safely?",
    isHealthRelated: false,
    answer: [
      "Go slow — introductions are a series of controlled exposures, not a single meeting. Start with complete separation: each cat gets food, litter, and rest behind a solid door so neither feels trapped.",
      "Swap scents daily: exchange bedding or gently rub a sock on cheeks and swap between rooms. Feed both cats on opposite sides of the door so they pair the other’s smell with something positive.",
      "When both are eating calmly a few feet from the barrier, add visual access using a baby gate or cracked door before any shared space. First visual sessions should be short and end on a calm note.",
      "Expect occasional hisses; watch for sustained fear (flattened ears, tucked tail, refusing food). If you see that, widen distance and repeat easier steps. Punishment increases fear — redirect with play instead.",
      "Full unsupervised access may take two to four weeks — longer for shy adults. One shared litter zone per cat plus one extra box reduces territorial stress during the transition.",
    ].join("\n\n"),
  },
  {
    id: "faq-zoomies",
    categoryId: "behavior",
    question: "Why does my cat get nighttime zoomies?",
    isHealthRelated: false,
    answer: [
      "“Zoomies” are often a burst of predatory energy — crepuscular cats are wired to hunt most at dawn and dusk. Indoors, that rhythm lands on your hallway at 10 p.m.",
      "If medical issues are ruled out, treat zoomies as unspent play drive. Schedule two interactive play sessions daily with a wand toy that mimics prey — finish with a small meal so the sequence feels complete.",
      "Reduce evening caffeine-like triggers: chaotic TV glare, laser pointers without a catch toy finish, or irregular feeding times. A predictable wind-down routine helps.",
      "Provide safe sprint lanes — clear floor paths, stable scratching posts — so the burst doesn’t knock fragile items. If vocalization or pacing is new, ask your veterinarian; pain and hyperthyroidism can mimic hyperactivity.",
    ].join("\n\n"),
  },
  {
    id: "faq-hydration",
    categoryId: "nutrition",
    question: "Hydration strategies: wet food vs dry — what actually works?",
    isHealthRelated: true,
    answer: [
      "Moisture content is the biggest lever. Many cats eating primarily wet food consume more total water indirectly; dry-only diets can be fine for some individuals if water intake is actively supported — your veterinarian knows your cat’s history.",
      "Offer multiple fresh water sources away from food bowls; some cats prefer wide, shallow dishes that don’t bump whiskers. Stainless and ceramic are easy to clean daily.",
      "Fountains help some cats and annoy others — run a side-by-side trial and measure interest rather than assuming.",
      "Broths and toppers can help but watch sodium and overall calories; therapeutic diets may forbid certain additions — always confirm with your clinic before changing prescription foods.",
    ].join("\n\n"),
  },
  {
    id: "faq-litter-first-week",
    categoryId: "new-owners",
    question: "What litter box setup should I use in the first week?",
    isHealthRelated: false,
    answer: [
      "Start simple: one large open box per cat plus one extra, scooped daily. Place boxes in quiet, low-traffic areas — not beside noisy appliances.",
      "Use unscented, fine clumping litter for most adults; kittens may need non-clumping per veterinarian guidance. Avoid drastic scent changes during moves.",
      "If your cat hesitates, try relocating one box nearer to where they hide — you can gradually move it once confidence returns.",
    ].join("\n\n"),
  },
  {
    id: "faq-carrier",
    categoryId: "new-owners",
    question: "How do I make the carrier less scary?",
    isHealthRelated: false,
    answer: [
      "Leave the carrier out year-round with the door off or fixed open. Line it with a familiar blanket and drop treats inside randomly — not only on vet days.",
      "Practice closing the door for seconds while feeding inside, then release. Build duration slowly; the goal is neutral or positive association.",
      "Covering the carrier with a breathable cloth during travel reduces visual overstimulation for many cats.",
    ].join("\n\n"),
  },
  {
    id: "faq-new-cat-supplies",
    categoryId: "new-owners",
    question: "Which supplies are worth buying before day one?",
    isHealthRelated: false,
    answer: [
      "Core list: appropriate food, stainless or ceramic bowls, litter boxes, unscented litter, scratching posts, hiding places, and vet contact info.",
      "Skip gadget overload — a sturdy wand toy and predictable routine beat fifty unused bells.",
      "ID: breakaway collar and microchip registration if your veterinarian recommends.",
    ].join("\n\n"),
  },
  {
    id: "faq-macros",
    categoryId: "nutrition",
    question: "Do cats need carb-free diets?",
    isHealthRelated: true,
    answer: [
      "Cats are obligate carnivores — protein and specific amino acids matter critically. Commercial complete diets formulate within nutritional standards; “carb-free” marketing isn’t the same as clinical appropriateness.",
      "Therapeutic diets for diabetes or urinary disease differ by individual — your veterinarian should guide changes, especially if your cat has comorbidities.",
      "Sudden diet switches can cause GI upset; transition gradually unless instructed otherwise.",
    ].join("\n\n"),
  },
  {
    id: "faq-raw",
    categoryId: "nutrition",
    question: "Is raw feeding safer than kibble?",
    isHealthRelated: true,
    answer: [
      "Raw diets carry pathogen risks for pets and humans in the household, especially immunocompromised members. Commercial raw may mitigate but not eliminate risk.",
      "If you explore raw, discuss formulation balance and testing protocols with a veterinarian credentialed in nutrition — homemade imbalance is common.",
      "Many cats thrive on high-quality commercial wet or dry with good husbandry; ideology shouldn’t replace bloodwork trends and body condition scoring.",
    ].join("\n\n"),
  },
  {
    id: "faq-portions",
    categoryId: "nutrition",
    question: "How often should I feed an adult indoor cat?",
    isHealthRelated: false,
    answer: [
      "Most adults do well with two measured meals; some prefer multiple small meals. Automatic feeders help consistency for busy households.",
      "Measure by weight on the bag for your cat’s target — cups vary by scoop technique. Track body condition monthly with photos from above and the side.",
      "Treats should be a tiny fraction of daily calories to avoid weight creep.",
    ].join("\n\n"),
  },
  {
    id: "faq-picky",
    categoryId: "nutrition",
    question: "My cat is picky — how do I switch foods?",
    isHealthRelated: false,
    answer: [
      "Transition over 7–10 days: mix increasing proportions of new food unless your veterinarian recommends abrupt change for medical reasons.",
      "Warm wet food slightly to enhance aroma; try flatter plates if whisker fatigue is suspected.",
      "If refusal persists beyond 24 hours or vomiting occurs, pause and consult your clinic — cats can develop hepatic issues when fasting.",
    ].join("\n\n"),
  },
  {
    id: "faq-litter-smell",
    categoryId: "litter-box",
    question: "How do I control odor without heavy perfumes?",
    isHealthRelated: false,
    answer: [
      "Scoop at least daily; deep-clean monthly with mild soap — avoid ammonia and strong citrus that deter cats.",
      "Carbon filters help enclosed boxes if airflow is adequate; stale enclosed boxes can backfire.",
      "Odor spikes can signal medical issues — note changes in volume or frequency.",
    ].join("\n\n"),
  },
  {
    id: "faq-litter-location",
    categoryId: "litter-box",
    question: "Where should litter boxes live in an open floor plan?",
    isHealthRelated: false,
    answer: [
      "Cats want escape routes — avoid dead-end corners beside washing machines. Place boxes along walls with sightlines, not in the only hallway between rooms.",
      "Separate food and water from boxes by at least a few feet; many cats dislike eating beside elimination areas.",
      "In multi-cat homes, scatter boxes — not all in one utility closet.",
    ].join("\n\n"),
  },
  {
    id: "faq-pee-outside",
    categoryId: "litter-box",
    question: "My cat peed outside the box — is it spite?",
    isHealthRelated: true,
    answer: [
      "Spite isn’t a useful model — cats usually respond to stress, pain, or substrate aversion. First step with new inappropriate elimination is veterinary evaluation to rule out urinary issues.",
      "After medical clearance, assess box size, cleanliness, bully cat dynamics, and recent changes (litter brand, new pet, construction noise).",
      "Add temporary boxes near problem spots while you troubleshoot, then fade once stable.",
    ].join("\n\n"),
  },
  {
    id: "faq-tracking",
    categoryId: "litter-box",
    question: "How do I reduce litter tracking?",
    isHealthRelated: false,
    answer: [
      "Use a top-exit or high-sided box; add a textured mat that catches granules on exit.",
      "Trim long paw fur gently if your veterinarian approves — it can act like Velcro for litter.",
      "Switching to larger granule litters can help some households.",
    ].join("\n\n"),
  },
  {
    id: "faq-play-bite",
    categoryId: "behavior",
    question: "How do I stop play biting on ankles?",
    isHealthRelated: false,
    answer: [
      "Redirect predatory energy to wand toys — never hands as toys. End sessions when play gets too aroused.",
      "If ambushed, freeze, then toss a toy away from you to redirect. Consistency matters across family members.",
      "Increase daily play totals before the time of day bites usually happen.",
    ].join("\n\n"),
  },
  {
    id: "faq-scratch-furniture",
    categoryId: "behavior",
    question: "Can I stop scratching on the sofa without declawing?",
    isHealthRelated: true,
    answer: [
      "Declawing is increasingly discouraged due to pain and behavior sequelae; many regions restrict it. Prefer nail trims, sturdy posts placed along travel routes, and sticky tape deterrents on furniture edges during training.",
      "Reward use of scratchers with treats placed on tiers; make the sofa less rewarding temporarily with covers.",
      "Ask your veterinarian about nail cap products if appropriate for your cat’s temperament.",
    ].join("\n\n"),
  },
  {
    id: "faq-hiding",
    categoryId: "behavior",
    question: "My new cat hides all day — is that normal?",
    isHealthRelated: false,
    answer: [
      "Hiding can be normal for days in a new home — provide covered beds, vertical exits, and low-pressure observation.",
      "Sit quietly nearby reading; let curiosity bridge distance. Forced grabbing increases fear duration.",
      "If hiding comes with appetite loss beyond 24–36 hours, contact your veterinarian.",
    ].join("\n\n"),
  },
  {
    id: "faq-vomit-hairball",
    categoryId: "health",
    question: "Hairballs vs vomiting — when should I worry?",
    isHealthRelated: true,
    answer: [
      "Occasional hairballs in long-haired cats happen; frequent vomiting is not a hairball personality trait — it deserves workup.",
      "Red flags: lethargy, weight loss, blood, diarrhea, or vomiting more than twice weekly.",
      "Regular brushing and hydration support grooming; discuss lubricant products with your veterinarian if recommended.",
    ].join("\n\n"),
  },
  {
    id: "faq-dental",
    categoryId: "health",
    question: "Do cats really need dental care?",
    isHealthRelated: true,
    answer: [
      "Dental disease is common and painful — bad breath isn’t “just cat breath.” Professional assessment under anesthesia allows thorough treatment when needed.",
      "Home brushing helps some cats; start with pet toothpaste and tiny sessions. Never use human fluoride pastes.",
      "Dental diets or treats may help specific individuals — ask your clinic what fits your cat’s mouth.",
    ].join("\n\n"),
  },
  {
    id: "faq-vaccines",
    categoryId: "health",
    question: "Which vaccines are core for indoor cats?",
    isHealthRelated: true,
    answer: [
      "Guidelines evolve by region and lifestyle — your veterinarian tailors schedules. Indoor-only cats may still need rabies vaccination per local law.",
      "Discuss risk factors: screen exposure, fostering, or travel. Titers and selective non-core vaccines vary.",
      "Bring previous records to new-pet visits to avoid duplicate doses.",
    ].join("\n\n"),
  },
  {
    id: "faq-parasites",
    categoryId: "health",
    question: "Does my indoor cat need parasite prevention?",
    isHealthRelated: true,
    answer: [
      "Indoor cats can still get fleas via humans and items; heartworm risk exists in many regions though lower than dogs.",
      "Your veterinarian balances product choice with local prevalence and household tolerance.",
      "Never use dog-only products on cats — some are toxic.",
    ].join("\n\n"),
  },
  {
    id: "faq-kitten-schedule",
    categoryId: "life-stages",
    question: "What does a kitten’s first month schedule look like?",
    isHealthRelated: false,
    answer: [
      "Expect multiple vet visits for vaccines, parasite control, and growth checks — write questions as they arise.",
      "Feed kitten-appropriate food in measured meals; free-feeding can complicate weight patterns later.",
      "Socialize gently with varied sounds and surfaces; prioritize nap and safety over marathon handling sessions.",
    ].join("\n\n"),
  },
  {
    id: "faq-adult-transition",
    categoryId: "life-stages",
    question: "When should I switch from kitten to adult food?",
    isHealthRelated: false,
    answer: [
      "Most cats transition around 10–12 months; large breeds may differ. Follow package guidance and your veterinarian for large kittens.",
      "Transition gradually across a week unless your clinic advises otherwise.",
      "Monitor body condition — adulthood is about stable weight more than birthday alone.",
    ].join("\n\n"),
  },
  {
    id: "faq-senior-labs",
    categoryId: "life-stages",
    question: "What screening helps senior cats stay ahead of issues?",
    isHealthRelated: true,
    answer: [
      "Many clinics recommend annual or biannual visits for seniors — blood pressure, urinalysis, and organ panels depending on risk.",
      "Home observations matter: appetite, water intake, mobility, and litter changes.",
      "Pain scoring tools help — subtle stiffness isn’t “just aging” until evaluated.",
    ].join("\n\n"),
  },
];

export const FORUM_ROOMS: ForumRoom[] = [
  {
    id: "r1",
    slug: "help",
    title: "Help & Questions",
    description: "Setup, feeding, and “is this normal?”",
    icon: "help",
    createdByUserId: null,
  },
  {
    id: "r2",
    slug: "show-and-tell",
    title: "Show & Tell",
    description: "Photos, milestones, and cozy wins.",
    icon: "sparkles",
    createdByUserId: null,
  },
  {
    id: "r3",
    slug: "behavior",
    title: "Behavior Lab",
    description: "Scratching, introductions, and stress.",
    icon: "brain",
    createdByUserId: null,
  },
];

export const FORUM_POSTS: ForumPost[] = [
  {
    id: "p1",
    roomSlug: "help",
    authorId: "u2",
    title: "First week — when to let my kitten explore the full apartment?",
    body: "She’s confident in the bedroom but freezes past the hallway. Should I wait or carry her to new rooms?",
    createdAt: "2026-04-18T14:22:00Z",
    score: 42,
    commentCount: 5,
    helpfulCommentId: "c-help-1",
  },
  {
    id: "p2",
    roomSlug: "help",
    authorId: "u5",
    title: "Switching from clay to pine — realistic timeline?",
    body: "Trying to reduce dust. Using two boxes side by side — any tips for picky cats?",
    createdAt: "2026-04-17T09:10:00Z",
    score: 18,
    commentCount: 2,
    helpfulCommentId: null,
  },
  {
    id: "p3",
    roomSlug: "show-and-tell",
    authorId: "u3",
    title: "Finally caught the synchronized nap",
    body: "Two fosters on one chair — after three weeks of separate corners this feels huge.",
    createdAt: "2026-04-18T20:00:00Z",
    score: 210,
    commentCount: 8,
    helpfulCommentId: null,
  },
  {
    id: "p4",
    roomSlug: "show-and-tell",
    authorId: "u1",
    title: "DIY window perch — $12 hardware store version",
    body: "Bracket + bath mat + shelf board. Photos in comments if anyone wants measurements.",
    createdAt: "2026-04-16T11:45:00Z",
    score: 96,
    commentCount: 4,
    helpfulCommentId: null,
  },
  {
    id: "p5",
    roomSlug: "behavior",
    authorId: "u4",
    title: "Older cat hisses at kitten through gate — how long is too long?",
    body: "Feeding on either side of the gate works, but no visual tolerance yet on day 9.",
    createdAt: "2026-04-15T16:30:00Z",
    score: 74,
    commentCount: 6,
    helpfulCommentId: "c-beh-1",
  },
  {
    id: "p6",
    roomSlug: "behavior",
    authorId: "u2",
    title: "Redirecting 3 a.m. couch parkour",
    body: "Two cats, one studio — enrichment ideas that don’t take floor space?",
    createdAt: "2026-04-14T08:05:00Z",
    score: 31,
    commentCount: 3,
    helpfulCommentId: null,
  },
  {
    id: "p7",
    roomSlug: "help",
    authorId: "u1",
    title: "Water fountain cleaning — how often is realistic?",
    body: "I disassemble weekly but still get slime — brand recommendations?",
    createdAt: "2026-04-13T19:40:00Z",
    score: 15,
    commentCount: 1,
    helpfulCommentId: null,
  },
  {
    id: "p8",
    roomSlug: "help",
    authorId: "u5",
    title: "First vet visit checklist — am I missing anything?",
    body: "Kitten is 12 weeks, carrier training going okay but I’m anxious about the waiting room.",
    createdAt: "2026-04-19T12:00:00Z",
    score: 3,
    commentCount: 0,
    helpfulCommentId: null,
  },
];

function C(
  id: string,
  postId: string,
  authorId: string,
  body: string,
  iso: string,
  children: ForumComment[] = [],
): ForumComment {
  return { id, postId, authorId, body, createdAt: iso, children };
}

export const COMMENTS_BY_POST: Record<string, ForumComment[]> = {
  p1: [
    C("c-help-1", "p1", "u1", "Let her set the pace — open one new room at a time after play + meal inside the familiar room. Carrying removes agency; instead toss treats into the next doorway.", "2026-04-18T15:00:00Z", [
      C("c-help-1a", "p1", "u2", "Tried treats — works until the vacuum hum from the kitchen. White noise helped.", "2026-04-18T15:40:00Z"),
    ]),
    C("c-help-2", "p1", "u3", "If freezing lasts more than a couple minutes, end the session and try shorter tomorrow. End on calm.", "2026-04-18T16:10:00Z"),
  ],
  p2: [
    C("c-litter-1", "p2", "u4", "Keep clay in one box until usage is 100% on pine for several days, then fade slowly.", "2026-04-17T10:00:00Z"),
  ],
  p3: [
    C("c-show-1", "p3", "u4", "This is the content I needed today.", "2026-04-18T20:30:00Z"),
    C("c-show-2", "p3", "u5", "Foster win! What’s the chair brand? Looks stable.", "2026-04-18T21:00:00Z"),
  ],
  p4: [
    C("c-diy-1", "p4", "u5", "Would love measurements — ceiling height only 92\" here.", "2026-04-16T12:00:00Z"),
  ],
  p5: [
    C("c-beh-1", "p5", "u1", "Day 9 can still be early — keep sessions under threshold where hissing starts. Try shorter visuals with high-value meals.", "2026-04-15T17:00:00Z", [
      C("c-beh-1a", "p5", "u4", "Lowering light levels helped us — less glare through the gate.", "2026-04-15T17:30:00Z"),
    ]),
  ],
  p6: [
    C("c-park-1", "p6", "u3", "Wall steps + evening wand session 90 minutes before your bedtime.", "2026-04-14T09:00:00Z"),
  ],
  p7: [
    C("c-fount-1", "p7", "u2", "Slime is biofilm — quick daily rinse of the tray helps even if full clean is weekly.", "2026-04-13T20:00:00Z"),
  ],
};

