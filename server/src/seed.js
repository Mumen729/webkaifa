import bcrypt from 'bcryptjs';
import { db, getOrCreateTag, now } from './db.js';
import { ensureDefaultCovers, defaultCoverFor } from './covers.js';

function upsertUser(username, password, displayName, role, bio = '') {
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (username, password_hash, display_name, role, bio)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET display_name = excluded.display_name`
  ).run(username, hash, displayName, role, bio);
  return db.prepare('SELECT id FROM users WHERE username = ?').get(username).id;
}

function upsertCategory(name, slug, description, sortOrder = 0) {
  db.prepare(
    `INSERT INTO categories (name, slug, description, sort_order)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, sort_order = excluded.sort_order`
  ).run(name, slug, description, sortOrder);
  return db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug).id;
}

function addPost({ title, excerpt, md, categoryId, authorId, status = 'published', featured = false, top = false, daysAgo = 0, views = 0, tags = [], cover = '', sourceName = null, sourceUrl = null }) {
  const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);

  // idempotent: never duplicate an existing post on re-seed
  if (db.prepare('SELECT id FROM posts WHERE slug = ?').get(slugBase)) return null;

  let slug = slugBase;
  let n = 2;
  while (db.prepare('SELECT id FROM posts WHERE slug = ?').get(slug)) slug = `${slugBase}-${n++}`;

  const published_at = new Date(Date.now() - daysAgo * 86400000).toISOString().replace('T', ' ').slice(0, 19);
  const info = db.prepare(
    `INSERT INTO posts (title, slug, excerpt, content_md, cover_image, category_id, author_id,
                        status, is_featured, is_top, views, published_at, source_name, source_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(title, slug, excerpt, md, cover, categoryId, authorId, status, featured ? 1 : 0, top ? 1 : 0, views, published_at, sourceName, sourceUrl);

  const ins = db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)');
  for (const t of tags) ins.run(info.lastInsertRowid, getOrCreateTag(t));
  return info.lastInsertRowid;
}

// ---------- users ----------
const adminId = upsertUser('admin', 'admin123', 'Site Admin', 'admin', 'Managing editor of Atlas.');
const editorId = upsertUser('editor', 'editor123', 'Atlas Editorial', 'editor', 'The Atlas news desk.');

// ---------- categories ----------
// Press Releases is where the site's own submitted/uploaded content lives;
// everything crawled from external sites goes into the other categories.
// Ordering puts content-rich categories near the front of the nav.
const catPress = upsertCategory('Press Releases', 'press-releases', 'Announcements, press materials and submissions from our own news desk and partners.', 1);
const catArch = upsertCategory('Architecture', 'architecture', 'Buildings, projects and practice from around the world.', 2);
const catNews = upsertCategory('World News', 'world-news', 'Breaking news and global current affairs.', 3);
const catTech = upsertCategory('Technology', 'technology', 'Science, tech and innovation.', 4);
const catBiz = upsertCategory('Business', 'business', 'Markets, companies and the economy.', 5);
const catSci = upsertCategory('Science', 'science', 'Research, discovery and the natural world.', 6);
const catSport = upsertCategory('Sports', 'sports', 'Sport and games from around the world.', 7);
const catTravel = upsertCategory('Travel', 'travel', 'Destinations, escapes and the road less travelled.', 8);
const catInterior = upsertCategory('Interior Design', 'interior-design', 'Spaces, materials and the art of the interior.', 9);
const catLandscape = upsertCategory('Landscape & Urbanism', 'landscape-urbanism', 'Cities, public space and the natural world.', 10);
const catCommercial = upsertCategory('Commercial & Offices', 'commercial-offices', 'Workplaces, retail and hospitality.', 11);
const catSkyscrapers = upsertCategory('Skyscrapers', 'skyscrapers', 'Tall buildings and vertical urbanism.', 12);
const catFuturistic = upsertCategory('Futuristic', 'futuristic', 'Experimental, conceptual and speculative design.', 13);
const catProducts = upsertCategory('Products', 'products', 'Furniture, lighting and design objects.', 14);

// ---------- own published content (Press Releases) ----------
addPost({
  title: 'Atlas Launches Global Architecture Photography Awards 2026',
  excerpt: 'Our new awards programme invites photographers worldwide to capture the built environment. Submissions open today.',
  md: `## Call for entries

**Atlas** today announced the launch of its first Global Architecture Photography Awards, open to professional and emerging photographers worldwide.

### Categories

1. Building & Detail
2. Interior & Atmosphere
3. Public Space & Urbanism
4. Landscape & Environment

Entries close 31 October 2026. Shortlisted work will be exhibited online and featured in the Atlas yearbook.

> "Photography is how most people first experience architecture," said our editor. "We want to celebrate the eyes behind the camera."

Submissions: submit via the contact address below.`,
  categoryId: catPress, authorId: adminId, featured: true, daysAgo: 1, views: 640, tags: ['awards', 'photography', 'announcement'],
  cover: ''
});

addPost({
  title: 'Partner Announcement: New Sustainable Timber Source Registered by Atlas Certification',
  excerpt: 'Atlas Certification adds its first Nordic mass-timber producer to the verified supplier register.',
  md: `## Verified supplier added

Atlas Certification has registered **Nordic Frame Works AB** as its first verified mass-timber producer in the Nordic region, following a full chain-of-custody audit.

The register now lists suppliers across 12 countries. Producers added to the register may display the Atlas verified mark on project documentation.

For media enquiries contact our press desk.`,
  categoryId: catPress, authorId: editorId, featured: false, daysAgo: 1, views: 310, tags: ['certification', 'timber', 'announcement'],
  cover: ''
});

// ---------- posts ----------
addPost({
  title: 'Rivera Paradise: A Courtyard House Rising Between Party Walls in Buenos Aires',
  excerpt: 'On a small infill lot in the Coghlan neighborhood, AtelierM carves light and landscape into a dense urban block.',
  md: `## A house for a narrow lot

Set on a small infill lot between party walls in the historic preservation district of Coghlan, **Rivera Paradise** emerges from a precise operation of subtraction and light.

The project begins with a courtyard — a void that pulls daylight deep into a plan only six meters wide. Each room addresses the garden, while a double-height living space connects the ground floor to a rooftop terrace that frames the city skyline.

> The courtyard is not a leftover. It is the organizing device of the entire house.

### Materials

- Exposed concrete and white brick for thermal mass
- Reclaimed timber for floors and ceilings
- Steel-framed glazing with low-iron glass

The architects describe the result as "a house that breathes inward," turning the constraint of the party walls into an opportunity for a private, planted world.`,
  categoryId: catArch, authorId: adminId, featured: true, top: true, daysAgo: 2, views: 3215, tags: ['residential', 'courtyard', 'timber'],
  cover: ''
});

addPost({
  title: 'The Grove: A Vibrant Mixed-Use Market Hall in Bend, Oregon',
  excerpt: 'Hacker Architects transform a downtown block into a community anchor where food, craft and gathering share one roof.',
  md: `## A new town square

**The Grove** has quickly established itself as a beloved destination in Bend, Oregon — a mixed-use market hall wrapped around a sunken courtyard.

The design mixes heavy timber structure with a translucent polycarbonate skin, so the hall glows at night like a lantern at the center of the block. Local makers, coffee roasters and a year-round farmers market share the ground plane, while a second floor holds community meeting rooms.

### Key moves

1. A central daylight court that organizes the plan
2. Post-and-beam timber frame, exposed throughout
3. Plug-and-play stalls that keep rents affordable

"The building behaves like infrastructure," say the architects. "It lets a neighborhood grow around it."`,
  categoryId: catCommercial, authorId: editorId, featured: true, daysAgo: 2, views: 2840, tags: ['timber', 'market', 'community'],
  cover: ''
});

addPost({
  title: 'Small Spaces, Big Ideas: 30 Compact Homes That Rethink Domestic Life',
  excerpt: 'From 24 m² apartments in Tokyo to micro-cabins in the Alps, we round up the tiny homes rewriting the rules of living.',
  md: `## Living smaller, living better

Tiny living is no longer a niche trend. Across Asia and Europe, architects are proving that good design can make 30 square meters feel generous.

This roundup covers five continents and a dozen strategies: sliding partitions, split-level lofting, fold-down furniture and, above all, light — the cheapest material in any project.

- **Tokyo, 24 m²** — a stair-shaped interior where every step stores something
- **Zurich, 32 m²** — a courtyard micro-apartment with a full-height glazed wall
- **Oslo, 28 m²** — a cabin on stilts that expands onto the landscape

Read on for the full survey and plans.`,
  categoryId: catInterior, authorId: adminId, featured: true, daysAgo: 3, views: 1980, tags: ['tiny-house', 'minimal', 'japan'],
  cover: ''
});

addPost({
  title: 'Wood Returns to the Skyline: The Case for Mass Timber Towers',
  excerpt: 'A new generation of timber high-rises claims carbon savings, faster construction and better workplaces. Is the era of the wooden skyscraper here?',
  md: `## Beyond the brick-and-mortar cliché

Mass timber has quietly moved from campus pavilions to the urban skyline. With record heights falling every year, engineers are now debating how high wood can realistically go.

Proponents point to three advantages: embodied carbon up to 45% lower than concrete, prefabrication that cuts build times by a third, and a warm material quality that tenants demonstrably prefer.

### The open questions

- Fire safety: encapsulation rules are converging globally
- Sourcing: can supply chains scale without deforestation?
- Cost: timber premiums shrink as factories scale

Whatever the answers, the wooden skyscraper is no longer a drawing-board fantasy.`,
  categoryId: catArch, authorId: editorId, featured: false, daysAgo: 4, views: 1560, tags: ['timber', 'skyscraper', 'sustainability'],
  cover: ''
});

addPost({
  title: 'A Civic Library as a Lantern: Reading the New Municipal Library of Turku',
  excerpt: 'A sculptural timber-clad form rethinks what a public library can be for a city of 200,000.',
  md: `## A civic gesture

Turku's new central library turns the classic reading room inside out. Instead of a quiet hall buried in the block, the architects pushed the program into a series of stacked terraces that cascade toward the river.

The facade is a double skin of spruce battens and glass — timber outside, books inside — giving the building a warm, breathing presence on the waterfront.

> A library should feel like the city's living room, not its archive.

Opening hours, café programming and a ground-floor exhibition space keep the building active from early morning to late evening.`,
  categoryId: catArch, authorId: editorId, featured: false, daysAgo: 5, views: 1240, tags: ['library', 'timber', 'public'],
  cover: ''
});

addPost({
  title: 'The Vertical Garden Skyscraper: Greening the Desert at 400 Metres',
  excerpt: 'A conceptual tower for Riyadh proposes terraced gardens on every floor — and asks hard questions about water in the desert.',
  md: `## Can a skyscraper be a forest?

A speculative competition entry for Riyadh proposes a 400-metre tower wrapped in terraced gardens — a vertical oasis in a city that averages 90 millimetres of rain a year.

The scheme couples greywater recycling with a fog-harvesting facade and drip-fed planters. Its authors admit the ambition is as much provocation as proposal.

- **Fog nets** on the windward facade collect several cubic metres of water daily
- **Thermal flues** pull cool air up through the planted terraces
- **Evapotranspiration** from foliage cuts facade temperatures by up to 12 °C

Whether or not it is ever built, the project reframes desert verticality as an ecological, not just structural, problem.`,
  categoryId: catSkyscrapers, authorId: adminId, featured: false, daysAgo: 6, views: 1130, tags: ['skyscraper', 'sustainability', 'concept'],
  cover: ''
});

addPost({
  title: 'Studio Visit: Inside the Workshop of a Finnish Furniture Maker',
  excerpt: 'Ritva Laine talks tools, timber and the slow economics of making chairs by hand in the 2020s.',
  md: `## The 40-year chair

In a converted creamery outside Helsinki, Ritva Laine has been making the same chair — in four variations — for four decades. Her workshop smells of spruce shavings and linseed oil, and her order book runs two years deep.

"I don't compete with factories," she says, sanding a leg by hand. "Factories compete with each other. I compete with the chair itself."

The interview covers steam bending, the collapse of the local apprentice system, and why she refuses to offer a "luxury" line.`,
  categoryId: catProducts, authorId: editorId, featured: false, daysAgo: 7, views: 980, tags: ['furniture', 'craft', 'interview'],
  cover: ''
});

addPost({
  title: 'After the Flood: How Rotterdam Is Turning Water into Public Space',
  excerpt: 'Climate-adaptive design has moved from pilot projects to city policy. Rotterdam shows what "living with water" looks like at scale.',
  md: `## The city that learned to float

Rotterdam has spent two decades turning its vulnerability to water into a design identity. The results — floating parks, water plazas that double as storm reservoirs, and green roofs by the hectare — are now being studied by cities from Jakarta to Miami.

The city's "water plaza" typology is the most transferable idea: a public square that becomes a detention basin during heavy rain, then drains back to normal within hours.

For planners, the lesson is less about engineering than about choreography — designing spaces that are useful in all weather, not just emergencies.`,
  categoryId: catLandscape, authorId: adminId, featured: false, daysAgo: 8, views: 870, tags: ['urbanism', 'climate', 'water'],
  cover: ''
});

// ---------- backfill covers ----------
// any post without a cover gets a branded default cover (like the reference site's default_featured)
ensureDefaultCovers();
{
  const noCover = db.prepare("SELECT id, slug FROM posts WHERE cover_image = '' OR cover_image IS NULL").all();
  const setCover = db.prepare('UPDATE posts SET cover_image = ? WHERE id = ?');
  for (const r of noCover) setCover.run(defaultCoverFor(r.slug), r.id);
  if (noCover.length) console.log(`[seed] backfilled ${noCover.length} default covers`);
}

// ---------- settings ----------
const settings = {
  site_name: 'Atlas',
  site_tagline: 'Architecture & design from around the world',
  site_footer: '© Atlas — Architecture & Design Magazine',
  contact_email: 'hello@atlas.example.com'
};
const set = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(settings)) set.run(k, v);

const counts = {
  users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
  categories: db.prepare('SELECT COUNT(*) AS n FROM categories').get().n,
  tags: db.prepare('SELECT COUNT(*) AS n FROM tags').get().n,
  posts: db.prepare('SELECT COUNT(*) AS n FROM posts').get().n
};
console.log('[seed] done:', counts);
console.log('[seed] admin login → username: admin / password: admin123');
