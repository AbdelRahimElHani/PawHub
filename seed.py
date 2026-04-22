import urllib.request, json, urllib.error

BASE = "http://localhost:8080/api"

def post(path, data, token=None):
    body = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def login(email, password):
    r = post("/auth/login", {"email": email, "password": password})
    return r.get("token")

def register(email, password, name, acct, extra=None):
    payload = {"email": email, "password": password, "displayName": name, "accountType": acct}
    if extra:
        payload.update(extra)
    r = post("/auth/register", payload)
    if "token" in r:
        print(f"  + Registered {name}")
        return r["token"]
    r2 = post("/auth/login", {"email": email, "password": password})
    if "token" in r2:
        print(f"  ~ Already exists: {name}")
        return r2["token"]
    print(f"  ! Failed {name}: {r}")
    return None

# Admin token
admin_token = login("admin@pawhub.local", "admin123")
print(f"Admin: {'OK' if admin_token else 'FAILED'}")

# New cat owners
print("\n=== Cat owners ===")
owners = [
    ("maya@pawhub.local",   "cats1234", "Maya Patel"),
    ("liam@pawhub.local",   "cats1234", "Liam Torres"),
    ("zoe@pawhub.local",    "cats1234", "Zoe Nakamura"),
    ("daniel@pawhub.local", "cats1234", "Daniel Osei"),
    ("ava@pawhub.local",    "cats1234", "Ava Brennan"),
    ("noah@pawhub.local",   "cats1234", "Noah Fischer"),
]
owner_tokens = {}
for email, pw, name in owners:
    t = register(email, pw, name, "CAT_OWNER")
    if t:
        owner_tokens[email] = t

# Cats
print("\n=== Cats ===")
cat_batches = {
    "maya@pawhub.local": [
        {"name":"Biscuit",   "breed":"British Shorthair", "ageMonths":28, "gender":"MALE",   "bio":"Chonky and dignified. Judges everyone silently from the top of the fridge."},
        {"name":"Dahlia",    "breed":"Abyssinian",        "ageMonths":14, "gender":"FEMALE", "bio":"Zoomies at 3am, cuddles at 4am. You don't choose the schedule, she does."},
        {"name":"Cosmo",     "breed":"Devon Rex",         "ageMonths":9,  "gender":"MALE",   "bio":"Looks like an alien, acts like a dog. Fetches hair ties on command."},
    ],
    "liam@pawhub.local": [
        {"name":"Pumpkin",   "breed":"American Shorthair","ageMonths":36, "gender":"FEMALE", "bio":"Senior queen who still has kitten energy when tuna is involved."},
        {"name":"Orion",     "breed":"Norwegian Forest",  "ageMonths":22, "gender":"MALE",   "bio":"Massive, majestic, completely unaware of how big he is. Total lap cat."},
    ],
    "zoe@pawhub.local": [
        {"name":"Maple",     "breed":"Siberian",          "ageMonths":18, "gender":"FEMALE", "bio":"Loves snow, hates the vacuum. Will sit on any keyboard you try to use."},
        {"name":"Nugget",    "breed":"Munchkin",          "ageMonths":11, "gender":"MALE",   "bio":"Short legs, huge personality. Runs surprisingly fast."},
        {"name":"Sable",     "breed":"Bombay",            "ageMonths":33, "gender":"FEMALE", "bio":"All black, all attitude, all love. Sits on your chest at 6am."},
    ],
    "daniel@pawhub.local": [
        {"name":"Pistachio", "breed":"Turkish Angora",    "ageMonths":20, "gender":"MALE",   "bio":"White as snow, mischievous as a gremlin. Has knocked over every glass."},
        {"name":"Rumi",      "breed":"Burmese",           "ageMonths":15, "gender":"FEMALE", "bio":"Follows you room to room like a tiny shadow. Never alone."},
    ],
    "ava@pawhub.local": [
        {"name":"Gnocchi",   "breed":"Ragamuffin",        "ageMonths":26, "gender":"FEMALE", "bio":"Soft as a cloud, heavy as a brick. Prefers being carried to walking."},
        {"name":"Espresso",  "breed":"Havana Brown",      "ageMonths":7,  "gender":"MALE",   "bio":"Tiny kitten with a big cat energy. Already bullying the dog next door."},
    ],
    "noah@pawhub.local": [
        {"name":"Fjord",     "breed":"Norwegian Forest",  "ageMonths":40, "gender":"MALE",   "bio":"Battle-scarred explorer who now prefers the sofa. Earned retirement."},
        {"name":"Clover",    "breed":"Calico",            "ageMonths":17, "gender":"FEMALE", "bio":"Tricolor cat who meows differently depending on what she wants."},
        {"name":"Pepper",    "breed":"Tuxedo",            "ageMonths":29, "gender":"MALE",   "bio":"Always looks like he's wearing a tuxedo, always acts like he owns the place."},
    ],
}

for email, cats in cat_batches.items():
    token = owner_tokens.get(email)
    if not token:
        continue
    existing = get("/cats", token)
    have = {c["name"] for c in existing} if isinstance(existing, list) else set()
    for cat in cats:
        if cat["name"] in have:
            continue
        r = post("/cats", cat, token)
        if "id" in r:
            print(f"  + {r['name']} ({r.get('breed','?')}, {r.get('gender','?')}) id={r['id']}")
        else:
            print(f"  ! cat error: {r}")

# PawMatch — mutual LIKEs create matches + threads; a few one-way PASS swipes for deck testing
print("\n=== PawMatch (swipes & matches) ===")


def cat_name_to_id(token):
    rows = get("/cats", token)
    if not isinstance(rows, list):
        return {}
    m = {}
    for c in rows:
        name = c.get("name")
        if name and name not in m:
            m[name] = c["id"]
    return m


def swipe(token, my_cat_id, target_cat_id, direction):
    return post(
        "/pawmatch/swipes",
        {"myCatId": my_cat_id, "targetCatId": target_cat_id, "direction": direction},
        token,
    )


cat_maps = {email: cat_name_to_id(t) for email, t in owner_tokens.items()}

mutual_pairs = [
    ("maya@pawhub.local", "Biscuit", "liam@pawhub.local", "Pumpkin"),
    ("maya@pawhub.local", "Dahlia", "zoe@pawhub.local", "Maple"),
    ("zoe@pawhub.local", "Nugget", "ava@pawhub.local", "Gnocchi"),
    ("daniel@pawhub.local", "Rumi", "noah@pawhub.local", "Clover"),
]

for ea, na, eb, nb in mutual_pairs:
    ta, tb = owner_tokens.get(ea), owner_tokens.get(eb)
    if not ta or not tb:
        print(f"  ! skip pair ({na}/{nb}): missing token")
        continue
    id_a = cat_maps.get(ea, {}).get(na)
    id_b = cat_maps.get(eb, {}).get(nb)
    if not id_a or not id_b:
        print(f"  ! skip pair ({na}/{nb}): cat id not found")
        continue
    r1 = swipe(ta, id_a, id_b, "LIKE")
    if r1.get("message") and r1.get("message") != "Already swiped":
        print(f"  ! {na} -> {nb}: {r1}")
    r2 = swipe(tb, id_b, id_a, "LIKE")
    if r2.get("matched"):
        print(f"  * Match: {na} <-> {nb} (thread {r2.get('threadId')})")
    elif r2.get("message") == "Already swiped" or "Already swiped" in str(r2):
        print(f"  ~ Already matched or swiped: {na} <-> {nb}")
    else:
        print(f"  ! {nb} -> {na}: {r2}")

pass_one_shot = [
    ("maya@pawhub.local", "Cosmo", "noah@pawhub.local", "Fjord"),
    ("liam@pawhub.local", "Orion", "zoe@pawhub.local", "Sable"),
]

for ea, na, eb, nb in pass_one_shot:
    ta = owner_tokens.get(ea)
    if not ta:
        continue
    id_a = cat_maps.get(ea, {}).get(na)
    id_b = cat_maps.get(eb, {}).get(nb)
    if not id_a or not id_b:
        continue
    rp = swipe(ta, id_a, id_b, "PASS")
    if rp.get("message") == "Already swiped":
        print(f"  ~ PASS {na} -> {nb}: already swiped")
    elif rp.get("message") or rp.get("error"):
        print(f"  ! PASS {na} -> {nb}: {rp}")
    else:
        print(f"  PASS {na} -> {nb}")

# Starter messages on match threads (resolve thread via GET /matches)
print("\n=== PawMatch (starter chat) ===")


def find_match_thread(token, n1, n2):
    mlist = get("/matches", token)
    if not isinstance(mlist, list):
        return None
    for m in mlist:
        a, b = m.get("catAName"), m.get("catBName")
        if a and b and {a, b} == {n1, n2}:
            return m.get("threadId")
    return None


starter_chats = [
    ("maya@pawhub.local", "liam@pawhub.local", "Biscuit", "Pumpkin", "Hey! Biscuit would love a playdate sometime 🐾", "Pumpkin says yes! She loves new friends."),
    ("maya@pawhub.local", "zoe@pawhub.local", "Dahlia", "Maple", "Hi! Dahlia is obsessed with other cats.", "Maple is shy at first but warms up fast!"),
]

for ea, eb, na, nb, msg_a, msg_b in starter_chats:
    ta, tb = owner_tokens.get(ea), owner_tokens.get(eb)
    if not ta or not tb:
        continue
    tid = find_match_thread(ta, na, nb) or find_match_thread(tb, na, nb)
    if tid:
        post(f"/chat/threads/{tid}/messages", {"body": msg_a}, ta)
        post(f"/chat/threads/{tid}/messages", {"body": msg_b}, tb)
        print(f"  + Messages in thread {tid} ({na} <-> {nb})")
    else:
        print(f"  ~ No match thread for {na} <-> {nb}")

# Shelter accounts
print("\n=== Shelters ===")
shelter_defs = [
    ("paws@pawhub.local",    "shelter123", "Paws and Hearts Rescue",
     {"shelterOrgName":"Paws and Hearts Rescue","shelterCity":"Austin","shelterRegion":"TX",
      "shelterPhone":"512-555-0101","shelterEmailContact":"info@pawshearts.org",
      "shelterBio":"Non-profit rescue focused on senior cats and special-needs kitties since 2010."}),
    ("whiskers@pawhub.local","shelter123", "Whiskers Haven",
     {"shelterOrgName":"Whiskers Haven","shelterCity":"Portland","shelterRegion":"OR",
      "shelterPhone":"503-555-0188","shelterEmailContact":"adopt@whiskershaven.org",
      "shelterBio":"Foster-based rescue network operating across the Pacific Northwest."}),
    ("catsafe@pawhub.local", "shelter123", "CatSafe Sanctuary",
     {"shelterOrgName":"CatSafe Sanctuary","shelterCity":"Chicago","shelterRegion":"IL",
      "shelterPhone":"312-555-0222","shelterEmailContact":"hello@catsafe.org",
      "shelterBio":"No-kill shelter with over 200 cats finding new homes every year."}),
]

shelter_tokens = {}
for email, pw, name, extra in shelter_defs:
    t = register(email, pw, name, "SHELTER", extra)
    if t:
        shelter_tokens[email] = t

# Approve shelters via admin
shelters_list = get("/admin/shelters", admin_token)
if isinstance(shelters_list, list):
    for s in shelters_list:
        if s.get("status") == "PENDING":
            sid = s["id"]
            post(f"/admin/shelters/{sid}/approve", {}, admin_token)
            print(f"  Approved shelter id={sid}: {s.get('name','?')}")
else:
    print(f"  Could not list shelters: {shelters_list}")

# Adoption listings
print("\n=== Adoption listings ===")
adoption_batches = {
    "paws@pawhub.local": [
        {"title":"Senior sweetie needs a quiet home",
         "petName":"Duchess","breed":"Domestic Longhair","ageMonths":96,
         "description":"Duchess is 8 years old and looking for a calm, loving home. She wants a warm lap and a sunny window."},
        {"title":"Bonded pair, must go together",
         "petName":"Salt and Pepper","breed":"Tuxedo Mix","ageMonths":24,
         "description":"These two brothers have never been apart. Salt is the brave one, Pepper is the shy one. Together they are a complete cat."},
        {"title":"Shy boy needs a patient family",
         "petName":"Theo","breed":"Russian Blue Mix","ageMonths":18,
         "description":"Theo was found as a stray and is still learning to trust. Once he does, he is endlessly affectionate."},
    ],
    "whiskers@pawhub.local": [
        {"title":"Playful tabby, great with kids",
         "petName":"Freckles","breed":"Tabby","ageMonths":12,
         "description":"Freckles has been fostered with three kids under 10 and loves every second. Energetic, gentle, obsessed with feather toys."},
        {"title":"Declawed senior seeking indoor-only home",
         "petName":"Velvet","breed":"Persian","ageMonths":84,
         "description":"Velvet came to us after her owner passed away. She is healthy, affectionate, and just needs someone to love her."},
        {"title":"FIV positive cat, perfectly healthy, needs love",
         "petName":"Bruno","breed":"Orange Tabby","ageMonths":48,
         "description":"Bruno is FIV positive but otherwise completely healthy. Needs to be the only cat. Big personality, loves belly rubs."},
    ],
    "catsafe@pawhub.local": [
        {"title":"Mama cat and kittens ready for homes",
         "petName":"Hazel","breed":"Calico","ageMonths":30,
         "description":"Hazel and her three 10-week-old kittens are vaccinated and ready. Kittens can go separately, Hazel needs her own home."},
        {"title":"Blind cat, navigates perfectly fine",
         "petName":"Echo","breed":"Siamese Mix","ageMonths":36,
         "description":"Echo lost her sight at 2 and adapted completely. She maps every room and is fully independent. Total sweetheart."},
        {"title":"Hyperactive kitten for an active home",
         "petName":"Bolt","breed":"Bengal Mix","ageMonths":5,
         "description":"Bolt has more energy than your entire household combined. Needs a large home or another playful cat."},
    ],
}

for email, listings in adoption_batches.items():
    token = shelter_tokens.get(email)
    if not token:
        print(f"  No token for {email}, skipping")
        continue
    for listing in listings:
        r = post("/adopt/listings", listing, token)
        if "id" in r:
            print(f"  + '{r['title'][:50]}' id={r['id']}")
        else:
            print(f"  ! adoption error: {r}")

# Market listings
print("\n=== Market listings ===")
market_batches = [
    ("maya@pawhub.local", [
        {"title":"Automatic cat feeder, 6-meal timer",
         "description":"Works great, switching to wet food. Holds up to 2kg of dry kibble. Batteries included.",
         "priceCents":4500,"city":"Austin","region":"TX"},
        {"title":"Cat wheel, large with silent bearing",
         "description":"Solid wood running wheel, almost silent. My cats prefer napping. Barely used, no scratches.",
         "priceCents":12000,"city":"Austin","region":"TX"},
        {"title":"Furminator deShedding tool Large",
         "description":"The original, not a knockoff. Used maybe 5 times. Still sharp. Great for Maine Coons.",
         "priceCents":1800,"city":"Austin","region":"TX"},
    ]),
    ("liam@pawhub.local", [
        {"title":"IKEA Kallax cat insert bundle x4",
         "description":"4 soft cushion inserts for Kallax shelving. Washable covers. Light grey. Cat approved.",
         "priceCents":3200,"city":"Portland","region":"OR"},
        {"title":"Litter-Robot 3, fully working",
         "description":"Moved to a smaller apartment, no room. Includes ramp and mat. Cleaned and sanitized.",
         "priceCents":28000,"city":"Portland","region":"OR"},
        {"title":"Cat harness and bungee leash set",
         "description":"Escape-proof H-harness, size M. Perfect for adventurous cats. Used twice, cat hated it.",
         "priceCents":1200,"city":"Portland","region":"OR"},
    ]),
    ("zoe@pawhub.local", [
        {"title":"72 inch tall cat tree, barely used",
         "description":"Multi-level with 3 condos, 2 hammocks, and 4 scratching posts. Disassembles for pickup.",
         "priceCents":8500,"city":"Seattle","region":"WA"},
        {"title":"Royal Canin Indoor Adult 4kg sealed bag",
         "description":"Bought wrong formula. Sealed bag, not expired. Best before Jan 2026.",
         "priceCents":2200,"city":"Seattle","region":"WA"},
        {"title":"Interactive laser and feather combo toy",
         "description":"USB rechargeable, auto-rotate, 3 speed settings. Kept my cats busy for months.",
         "priceCents":2800,"city":"Seattle","region":"WA"},
    ]),
    ("daniel@pawhub.local", [
        {"title":"Cat water fountain, stainless steel",
         "description":"Pioneer Pet fountain, stainless bowl with quiet pump. Extra filters included.",
         "priceCents":3500,"city":"Chicago","region":"IL"},
        {"title":"Scratching post bundle, 3 types",
         "description":"Sisal rope post tall, cardboard horizontal, and angled cardboard. All lightly used.",
         "priceCents":2000,"city":"Chicago","region":"IL"},
        {"title":"Heated cat bed, machine washable",
         "description":"Thermostatically controlled. Perfect temperature for senior cats. Size L.",
         "priceCents":4200,"city":"Chicago","region":"IL"},
        {"title":"Feline Greenies dental treats 3 pack",
         "description":"Unopened. Bought in bulk. Ocean fish flavour. Best before March 2026.",
         "priceCents":900,"city":"Chicago","region":"IL"},
    ]),
    ("ava@pawhub.local", [
        {"title":"PetSafe ScoopFree automatic litter box",
         "description":"Self-cleaning with crystal litter trays. Includes 3 disposable trays. Works perfectly.",
         "priceCents":9500,"city":"Denver","region":"CO"},
        {"title":"Jackson Galaxy Cat Crawl tunnel set",
         "description":"3-piece crinkle tunnel with peek holes. Cats went crazy for it, now they ignore it.",
         "priceCents":2500,"city":"Denver","region":"CO"},
    ]),
    ("noah@pawhub.local", [
        {"title":"Modular cat wall shelves, full set",
         "description":"8 wall-mounted shelves with carpet steps. Holds cats up to 8kg. Minimal wall damage.",
         "priceCents":6800,"city":"Boston","region":"MA"},
        {"title":"Feliway Classic diffuser and refills x3",
         "description":"Two diffusers and 3 refill bottles, all sealed. Moving to Feliway Optimum instead.",
         "priceCents":3800,"city":"Boston","region":"MA"},
    ]),
]

for email, listings in market_batches:
    token = owner_tokens.get(email)
    if not token:
        continue
    for listing in listings:
        r = post("/market/listings", {**listing, "catId": None}, token)
        if "id" in r:
            print(f"  + '{r['title'][:50]}' ${r['priceCents']//100}")
        else:
            print(f"  ! market error: {r}")

print("\nDone!")
