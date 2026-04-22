-- Rich Learn hub FAQ & editorial (PawHub-themed, vet-aligned guidance). Skips if id exists.

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-01', 'new-owners', 'How do I introduce two cats safely?',
'Start with complete separation: each cat gets food, litter, and rest behind a solid door. Swap bedding daily so they learn each other''s scent before any visual contact. Feed both on opposite sides of the door, then use a baby gate for short visuals when meals stay calm. Expect two to four weeks before unsupervised time together—longer for shy adults. Punishment increases fear; use play and distance instead.',
0, 5
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-01');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-02', 'behavior', 'Why does my cat get nighttime zoomies?',
'Cats are crepuscular—wired to hunt most at dawn and dusk. Indoors, that energy often hits your hallway at night. Schedule two interactive wand sessions per day and end with a small meal so the hunt feels finished. If pacing or vocalizing is new, ask your veterinarian to rule out pain or thyroid issues.',
1, 6
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-02');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-03', 'nutrition', 'Wet food, dry food, or both—what helps hydration?',
'Moisture matters: many cats take in more water with wet diets. If you feed dry, add several fresh water stations away from food bowls—some cats prefer wide, shallow dishes. Fountains help some cats. Always confirm diet changes with your vet if your cat has kidney, urinary, or diabetic history.',
1, 7
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-03');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-04', 'litter-box', 'How many litter boxes do I need?',
'The usual rule is one box per cat plus one extra, in different quiet areas—not lined up in one closet. Scoop at least daily; deep-clean monthly with mild soap. Strong perfumes can deter cats; start with unscented clumping litter unless your vet suggests otherwise.',
0, 8
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-04');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-05', 'litter-box', 'My cat peed outside the box—is it spite?',
'Spite is not a useful explanation. Stress, pain, or litter aversion are more common. New inappropriate elimination deserves a veterinary visit first to rule out urinary issues. Then review box size, cleanliness, bully-cat dynamics, and recent changes like new litter brand or construction noise.',
1, 9
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-05');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-06', 'behavior', 'How do I stop play biting on ankles?',
'Never use hands as toys—use a wand that mimics prey. If ambushed, freeze, then toss a toy away from your feet. Add play before the time of day bites usually happen. Everyone in the home should respond the same way so the cat gets a clear signal.',
0, 10
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-06');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-07', 'health', 'How often should indoor cats see a veterinarian?',
'Annual wellness visits are a good baseline; seniors or cats with chronic issues may need more. Even indoor cats need parasite prevention and vaccines per local law and lifestyle—your clinic tailors the plan. Bring appetite, thirst, and litter changes to every visit.',
1, 11
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-07');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-08', 'health', 'Are hairballs normal?',
'Occasional hairballs can happen in long-haired cats, but frequent vomiting is not normal—schedule a visit if it is weekly or comes with weight loss or lethargy. Brushing, hydration, and vet-recommended hairball aids can help when appropriate.',
1, 12
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-08');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-09', 'life-stages', 'When does a kitten become an adult for feeding?',
'Many cats switch from kitten to adult food around 10–12 months; large breeds may differ. Transition over 7–10 days unless your vet prescribes otherwise. Measure meals and track body condition—not just birthday—when deciding portions.',
0, 13
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-09');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-10', 'new-owners', 'What should I buy before my cat comes home?',
'Core supplies: appropriate food, sturdy litter boxes, unscented litter, scratching posts, safe hiding spots, breakaway collar with ID if your vet agrees, and carrier. A wand toy and predictable routine beat a pile of unused gadgets on day one.',
0, 14
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-10');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-11', 'nutrition', 'Is a grain-free diet required for cats?',
'Cats need adequate protein and specific amino acids; marketing terms like grain-free do not equal medical quality. Therapeutic diets are chosen for individual conditions—your veterinarian should guide changes, especially for kittens, seniors, or cats with illnesses.',
1, 15
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-11');

INSERT INTO hub_faq_items (id, category_id, question, answer_text, is_health, sort_order)
SELECT 'faq-pawhub-12', 'behavior', 'How can I enrich an indoor cat''s life?',
'Vertical space, window perches, rotated toys, and predictable play sessions reduce boredom. Puzzle feeders add mental work. Safe outdoor exposure might mean a catio or harness training—never force; build positive associations slowly.',
0, 16
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_faq_items WHERE id = 'faq-pawhub-12');

-- Editorial picks (authoritative external links)
INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-pawhub-1', 'General cat care (ASPCA)', 'https://www.aspca.org/pet-care/cat-care/general-cat-care', 'welfare', 'ASPCA', 'Baseline husbandry, feeding, and safety from a major animal welfare organization.', 'https://images.unsplash.com/photo-1514888288774-7caa1c58b3c9?w=800&q=80&auto=format&fit=crop', 1, 2
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-pawhub-1');

INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-pawhub-2', 'Cornell Feline Health Center', 'https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center', 'health', 'Cornell University', 'Vet-school curated articles on feline diseases, nutrition, and behavior.', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80&auto=format&fit=crop', 0, 3
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-pawhub-2');

INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-pawhub-3', 'International Cat Care — advice library', 'https://icatcare.org/advice/', 'behavior', 'International Cat Care', 'Evidence-leaning behavior, care, and life-stage guides from a UK charity.', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800&q=80&auto=format&fit=crop', 0, 4
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-pawhub-3');

INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-pawhub-4', 'Cat care resources (AVMA)', 'https://www.avma.org/resources-tools/pet-owners/petcare/cats', 'health', 'American Veterinary Medical Association', 'Professional veterinary association overview for cat owners.', NULL, 0, 5
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-pawhub-4');

INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-pawhub-5', 'Feeding your cat (Humane Society)', 'https://www.humanesociety.org/resources/cat-care-feeding', 'nutrition', 'The Humane Society of the United States', 'Practical feeding routines, portions, and food types.', 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80&auto=format&fit=crop', 0, 6
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-pawhub-5');

INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-pawhub-6', 'Indoor cats & enrichment (Cat Friendly / AAFP)', 'https://catfriendly.com/cat-care-at-home/indoor-cats/', 'behavior', 'American Association of Feline Practitioners', 'Indoor living, stress reduction, and home setup for happier cats.', NULL, 0, 7
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-pawhub-6');

INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-pawhub-7', 'Environmental enrichment for cats (AVMA)', 'https://www.avma.org/resources-tools/pet-owners/petcare/environmental-enrichment-cats', 'welfare', 'AVMA', 'Why enrichment matters and how to add it responsibly.', NULL, 0, 8
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-pawhub-7');

INSERT INTO hub_editorial_links (id, title, url, topic_id, source_label, dek, image_url, featured, sort_order)
SELECT 'el-pawhub-8', 'CDC — Healthy pets: cats', 'https://www.cdc.gov/healthypets/pets/cats.html', 'health', 'U.S. CDC', 'Zoonoses and healthy habits around pet cats from a public health perspective.', NULL, 0, 9
FROM (SELECT 1 AS x) d WHERE NOT EXISTS (SELECT 1 FROM hub_editorial_links WHERE id = 'el-pawhub-8');
