# Fundraising Page Best Practices
## Extracted from Real School & Education Nonprofit Websites
### Compiled for Pear Tree Community School — March 2026

---

## Executive Summary

This document distills actionable fundraising website practices from research across 15+ real schools and education nonprofits. Every recommendation below is grounded in what actual organizations are doing on their live giving pages. The findings are organized to directly inform Pear Tree's `/support` page architecture.

**Key finding:** Pear Tree's current fundraising infrastructure (a paused GoFundMe that raised $4,900 of a $30,000 goal, and no donation page on peartreecs.com) represents a massive missed opportunity. The school's story — 95% students of color, 80% on financial aid, peer-reviewed recognition, 90% literacy proficiency vs. 22% national average for Black/Latino students — is among the most compelling donor narratives in independent school education. What's missing is the mechanism, not the message.

---

## Part 1: URL Structure & Page Architecture

### How Real Schools Organize Their Giving Sections

**Park Day School (Oakland)** — parkdayschool.org
- `/give/` — Main giving landing page
- `/annual-fund/` — Separate annual fund page
- Contact: giving@parkdayschool.org
- Dedicated phone line for giving: (510) 496-5159

**Uncommon Schools** — uncommonschools.org
- `/donate/` — Single-page donation hub

**KIPP NYC** — kippnyc.org
- `/give/` — Main giving page
- `/giving/` — Broader giving information (ways to give, matching, legacy)

**Teach for America** — teachforamerica.org
- `/donate` — Main donation form (one-time and recurring)
- `/donate/the-key` — Monthly giving society page
- `/donate/legacy-giving` — Planned giving
- `/support-us/direct-to-community-giving` — Specific community campaigns

**Punahou School** (exemplary independent school) — punahou.edu
- `/giving` — Main giving landing page
- `/giving/funding-priorities/punahou-fund` — Annual fund
- `/giving/ways-to-give` — All giving vehicles
- `/giving/ways-to-give/endowed-funds` — Endowment giving
- `/giving/donor-community` — Donor recognition and engagement
- `/giving/give-now` — Direct to donation form

**American Montessori Society** — amshq.org
- `/about-montessori/donate/` — Donate page nested under About

### Recommended Structure for Pear Tree

Based on these patterns, here is a practical architecture scaled for a small school:

```
/support                → Main giving landing page (story + impact + CTA)
/support/give           → Direct donation form
/support/annual-fund    → Annual fund details, tuition gap explanation
/support/ways-to-give   → Stock, DAF, matching gifts, planned giving
/support/volunteer      → Volunteer hours, Walk-a-Thon, events
/support/wishlist       → Classroom materials needs (DonorsChoose-style)
```

**Why `/support` instead of `/give` or `/donate`:** The word "support" is broader, warmer, and less transactional. It allows the page to encompass volunteering, advocacy, and financial giving — all of which matter for a community school. Park Day, Uncommon Schools, and KIPP all use various terms, but for a social justice school where community participation is core identity, "support" fits the brand voice.

---

## Part 2: Donation Amount Tiers & Impact Framing

### What Real Organizations Do

**Uncommon Schools** ties specific outcomes to donation levels on their donate page:
- One tier "provides one class with access to cutting-edge education software for a semester"
- Another "stocks one classroom with tools to support socio-emotional wellness"
- Another "sponsors a student's arts or elective education for a semester"
- Another "funds special education services for a month"

(Note: The specific dollar amounts are rendered in their interactive form and were not fully captured in search indexing, but the impact-description model is clear.)

**The Citizens Foundation (education nonprofit)** uses very specific, concrete tiers:
- $168 — Educate a Child for 1 Year
- $1,850 — Educate a Child from KG to Grade 10
- $4,200 — Support a Classroom for 1 Year
- $4,600–$5,750 — Scholarship for Higher Education
- $25,000 — Support a School for 1 Year

**DonorsChoose** uses classroom-level specificity:
- Teachers post exact materials with line-item breakdowns
- Donors give as little as $1 toward specific requests
- Every donor sees exactly where each dollar goes
- Teachers send photos of materials in use

**Mount Paran Christian School** defines leadership giving:
- Gifts of $2,500+ are designated as "leadership" donors
- Leadership donors are invited to an annual dinner hosted by the Head of School and Board of Trustees

### Industry Research on Optimal Tier Design

From multiple nonprofit fundraising studies:
- Adding suggested donation levels increases average contributions by approximately 12%
- Most organizations offer 3-4 options on their donation pages
- The first tier should be the lowest amount, followed by the amount closest to the average online gift
- Top tiers should stretch but not be "wildly unreasonable"
- If average online gift is $40, consider tiers at $30, $50, $100, and $150
- Always include an "Other Amount" custom field

### Recommended Tiers for Pear Tree

Given Pear Tree's profile (small school, 80% financial aid, community-driven), suggested tiers with mission-aligned impact statements:

| Amount | Impact Statement |
|--------|-----------------|
| $25 | Provides art supplies for one student for a month |
| $50 | Stocks a classroom with culturally affirming books for the MIRROR curriculum |
| $100 | Funds one week of nature-based learning materials for a mixed-age classroom |
| $250 | Sponsors a student's participation in the Black Heritage Month Showcase |
| $500 | Provides a semester of Montessori materials for one Hummingbird, Falcon, or Dolphin classroom |
| $1,000 | Covers one month of financial aid for a family who would otherwise be unable to attend |
| $2,500 | Funds a full semester of financial aid for one student |
| $5,000 | Supports the annual Walk-a-Thon and community events programming for one year |
| Other | "Every gift, of any size, brings us closer to a world where no child is turned away" |

**Critical principle:** Every dollar amount should connect to something a donor can visualize. "$100 funds special education services" is less vivid than "$100 fills a classroom library shelf with books by Black and Indigenous authors." Pear Tree's specific programs (MIRROR framework, nature-based learning, recording studio sessions, Black Heritage Month Showcase) give unusually rich material for impact framing.

---

## Part 3: Trust Signals & Credibility

### What Real Organizations Display

**Tax-Exempt Status (Universal Practice)**
Every organization studied prominently displays their 501(c)(3) status and EIN number:
- Park Day School: Federal Tax ID 94-2368070
- Uncommon Schools: "501(c)(3) tax-exempt nonprofit organization"
- KIPP NYC: EIN 20-3971209
- Teach for America: EIN 13-3541913

**Charity Ratings**
- Uncommon Schools displays its Charity Navigator rating (81%, Three-Star)
- DonorsChoose prominently features its Four-Star Charity Navigator rating and GuideStar Platinum Seal
- Teach for America references independent accountability metrics

**Financial Transparency**
- DonorsChoose reports that 92% of expenses go to program services
- The Citizens Foundation states "approximately 90% of every donation goes towards education programs"
- Punahou School publishes a full "Summary of Gifts" annual report with total gifts ($19.2M from 10,552 gifts in 2023-2024)

**Security Signals (from conversion research)**
- A padlock icon next to payment fields increases conversion by 20%
- 72% of donors say a charity rating badge increases likelihood of giving
- Branded donation pages raise 7x more than generic/third-party pages
- PCI compliance badges and "Secure Checkout" language near the donate button reduce abandonment

### What Pear Tree Should Display

Pear Tree is currently an LLC, not a 501(c)(3). This is a significant consideration for the giving page. Options:

1. **If/when 501(c)(3) status is obtained:** Display EIN, tax-deductibility language, and "Your gift is tax-deductible to the fullest extent of the law" prominently near the donation form.

2. **If operating through a fiscal sponsor (e.g., Seeds to Roots Oakland or another 501(c)(3)):** Display the sponsor's EIN and clearly explain that "Donations to Pear Tree Community School are made through [Fiscal Sponsor Name], a 501(c)(3) nonprofit. Your gift is tax-deductible. EIN: XX-XXXXXXX."

3. **Additional trust signals Pear Tree can deploy now:**
   - London Review of Education peer-reviewed feature (academic credibility)
   - 13+ years of operation (longevity)
   - 90% student literacy proficiency statistic
   - GreatSchools 4.5 rating
   - Specific staff count (20 staff members) and student-to-teacher ratio
   - Published annual impact data, even in a simple format
   - Secure payment processing badges (SSL, PCI compliance)
   - Clear privacy policy language

---

## Part 4: Recurring vs. One-Time Gifts

### How Real Organizations Handle This

**Teach for America — "The Key" Monthly Giving Society**
- Dedicated page at `/donate/the-key`
- Named program with identity branding ("Members of The Key")
- Benefits: Exclusive quarterly impact emails
- Messaging: "Monthly gifts add up quickly, ensuring teachers can expand educational opportunity over the entire school year"
- Platform: Classy, with easy dashboard management for recurring donors
- Framing: Positioned as membership in a community, not just a payment schedule

**DonorsChoose — Monthly Classroom Gift**
- Donors choose their monthly amount
- Charged on the 17th of each month
- Credits accumulate in donor's account to apply to projects
- Notification system when credits are available

**American Montessori Society**
- Offers one-time, monthly, quarterly, or annual recurring gift options
- Toggle between frequencies directly on the form

**Punahou School**
- Distinguishes between "pledges" (specific amount, specific schedule, up to 5 years) and "recurring gifts" (continues as long as donor wishes)
- Also offers payroll deduction for affiliated employers

### Industry Data on Recurring Giving

- Recurring donors give 42% more per year than one-time donors
- Monthly donors retain at 80-90% rates; one-time donors retain at ~45%
- Revenue from recurring gifts accounts for 31% of all online nonprofit revenue (M+R Benchmarks 2025)
- 86% of public media organizations now pre-select the monthly giving option on their forms
- Pre-selecting the monthly option is "one of the simplest changes you can make"

### Recommended Approach for Pear Tree

1. **Toggle design:** Place a prominent one-time / monthly toggle at the top of the donation form. Consider pre-selecting "monthly" (or at minimum making it equally prominent).

2. **Name the monthly program:** Create a named giving circle aligned with Pear Tree's identity. Examples:
   - "The Orchard" (monthly supporters growing the community)
   - "Roots & Branches" (sustaining the tree)
   - "The Pear Tree Circle"

3. **Show monthly math:** "$25/month = $300/year = one semester of art supplies for a whole classroom." Make the annual impact of small monthly gifts tangible.

4. **Monthly tier suggestions:** $10, $25, $50, $100/month with corresponding annual impact descriptions.

5. **Stewardship:** Send quarterly impact emails to monthly donors showing how their sustained support is being used — photos from classrooms, student quotes, event highlights.

---

## Part 5: Visual Design & Emotional Storytelling

### What the Best Sites Do

**Photography & Visual Approach**
- Images of beneficiaries increase donations by an average of 43% compared to text-only appeals
- Videos showing impact in action increase conversion rates by over 80%
- Stone Ridge School of the Sacred Heart is cited as exemplary for featuring video on its giving page
- Rowland Hall tells its story "in a visually dynamic and engaging way" through its Impact Report
- Finalsite recommends: "If giving is about people, why are so many Giving pages 100% text and zero people?"

**"Why I Give" Testimonials**
- Germantown Friends School is recognized for its "Why I Give" donor testimonial feature
- Images, quotes, and success stories from real donors let prospective donors see themselves as part of a community
- Multiple donor segments represented: grandparents, alumni, teachers, parents

**Real Beneficiary Stories**
- Tell the story of a real beneficiary to create emotional connection
- Donors connect emotionally with specific individuals rather than abstract groups
- Personal stories activate different brain regions than statistical information
- One clean photo paired with one emotionally grounded sentence can be powerful

**Progress & Urgency**
- Show real-time donation progress with a visual meter (thermometer or progress bar)
- "Help us reach 1,000 students before year-end"
- "We are 73% to our goal"
- Simple phrases like "Help today" or "Give now" create momentum without pressure

### What This Means for Pear Tree

Pear Tree has an extraordinary visual storytelling advantage that most schools lack. The school's community events — Black Heritage Month Showcase, recording studio sessions, Walk-a-Thon, art galleries, nature-based learning — are visually rich and emotionally powerful. The challenge is that this content currently lives on ParentSquare, invisible to donors.

**Specific visual content for the giving page:**
- Hero image: A real student engaged in Montessori work or nature-based exploration (not a stock photo)
- Short video (60-90 seconds): Michele Hamilton speaking about why Pear Tree exists, intercut with classroom footage
- 2-3 rotating "Why I Give" parent testimonials with photos
- A single compelling statistic presented large: "90% of our students exceed literacy benchmarks. The national average for Black and Latino students is 22%."
- Event photos from the Black Heritage Month Showcase, Walk-a-Thon, and classroom life
- A progress bar for the current annual fund campaign

**Design principles drawn from research:**
- Single-column layout
- Mobile-first (8% of mobile visitors convert vs. 11% desktop — but the gap is narrowing and mobile traffic is growing)
- Consistent branding (earth tones, organic elements — never use a generic Donorbox/GoFundMe template that breaks from site design)
- Branded pages raise 7x more than generic ones
- Minimize text; maximize visuals and clear CTAs
- White space matters — avoid cluttered pages

---

## Part 6: Separating Fund Types

### How Schools Structure Multiple Giving Streams

**Punahou School** (exemplary model):
- **Punahou Fund** (annual fund) — Flexible funds for current critical needs, tuition support, programming innovation
- **PunsUnited** (student financial aid) — Named fund specifically for aid
- **Endowed Funds** — Permanent endowment ($425M market value)
- **Capital Campaign** — Ku'u Punahou Campaign raised $176M+ from 12,800 donors
- **Alumni Class Gifts** — Reunion-year giving supporting financial aid

**Mount Paran Christian School:**
- Annual Fund (the primary ask, 5-day blitz campaign)
- Leadership Giving ($2,500+)
- "Tradition of Generosity" (overarching giving culture page)
- Capital and facility projects handled separately

**Teach for America:**
- Direct donations (one-time and recurring)
- The Key (monthly giving society)
- Legacy Giving (planned gifts, bequests, trusts)
- Direct to Community Giving (specific regional campaigns)
- Corporate Partnerships

**Park Day School (Oakland):**
- Annual Fund
- Special Projects (Meadow Pavilion, Art Studio)
- Matching Gifts
- Donor-Advised Funds
- Gifts of Securities
- Planned Giving (50th anniversary focus)

### Industry Guidance on Separating vs. Combining

From capital campaign and annual fund research:
- The annual fund should never stop during a capital campaign
- Annual fund giving is the single greatest predictor of capital campaign giving
- Organizations should see annual fund and capital campaigns as interdependent, not competing
- Some campaigns create separate categories for planned gift commitments
- The donor journey flows: annual giver > major gift donor > capital campaign contributor > planned giving/legacy donor

### Recommended Approach for Pear Tree

As a small school without an endowment, Pear Tree should keep its giving architecture simple but forward-looking:

**Now (Year 1 of new website):**
- Annual Fund (the primary ask — "Bridge the Gap")
- Walk-a-Thon & Events (community fundraising)
- Classroom Wishlist (specific materials needs, DonorsChoose-style transparency)
- Matching Gifts (encourage corporate matches)

**Future (as capacity grows):**
- Named scholarship fund (e.g., "The Liberation Scholars Fund")
- Planned giving / legacy page
- Capital campaign (when facility needs arise)

**Do not overwhelm donors with too many options on a small school's site.** The annual fund should be the clear primary call to action. Other giving streams should be secondary links for donors who want to explore deeper.

---

## Part 7: Integrating Giving CTAs Across Non-Fundraising Pages

### Best Practices from Finalsite and Exemplary Schools

**Persistent "Donate" or "Give" Button**
- Link in the main site navigation (header)
- Link in the footer of every page
- Link in the site's search results
- On mobile: Easily accessible from the mobile menu

**Cross-Engagement Prompts**
- Finalsite asks: "While an alumna is registering for an event, why not prompt her to make her annual fund gift at the same time?"
- At the end of blog posts, add a clear CTA: "Donate now" or "Make your gift today" with a direct link to the donation page
- After reading an impact story or testimonial, prompt: "Help us continue this work"

**Content-Triggered CTAs**
- On the Financial Aid page: "80% of our families receive aid. Your gift makes this possible. [Support a student]"
- On the Programs page: "Our Montessori classrooms need materials every year. [See our wishlist]"
- On the About / Michele Hamilton page: "Michele founded Pear Tree so no family would be turned away. [Help us keep that promise]"
- On the Impact page (outcomes data): "90% of our students exceed benchmarks. [Invest in what works]"
- On the Events page (Walk-a-Thon, Showcase): "Can't attend? You can still support. [Make a gift]"
- On the Summer Camp page: "Scholarships make summer learning possible. [Fund a camper]"

**Social Sharing on Giving Pages**
- Add social media sharing buttons
- Encourage supporters to spread the word through email, text, or peer-to-peer
- After a donation is completed, offer a shareable "I just gave to Pear Tree" graphic or message

**Post-Donation Experience**
- Redirect to a custom thank-you page (not a generic payment confirmation)
- Thank-you page includes a heartfelt message, impactful photo, or short video
- Communicate that "your school values all gifts, no matter the size"
- Follow up with a personal email within 48 hours

---

## Part 8: The Tuition Gap Message

### How Schools Explain Why Donations Are Needed

This is one of the most universal practices across all schools studied. Nearly every independent school explains that tuition does not cover the full cost of education.

**Washington Montessori School:**
"Tuition alone does not cover the cost of educating a student. For the past few years, the gap between tuition income and expenses was around $2,000 per student, and the Annual Fund helps to bridge this gap."

**Hollis Montessori School:**
"Full tuition only covers about 85% of the cost of educating each student. Funds received from Annual Giving are the school's most important source of revenue other than tuition."

**Five Oaks Academy Montessori:**
"Like most independent schools, tuition alone does not fully cover the cost of a student's education. Approximately 10% of the cost of a student's education is met through the Annual Fund."

**Amherst Montessori School:**
"Tuition income does not cover the full cost of operating the school, and we rely on philanthropy of alumni, parents, and friends to make up the difference."

**Mount Paran Christian School:**
"While tuition covers 90% of a student's education and serves to maintain the basic program, Annual Fund resources go each year toward enhancements such as technology upgrades, campus improvements, staff development, and financial assistance."

**Industry average:** At 90% of independent schools, tuition is 10-25% less than total expenses. The annual fund bridges this gap.

### What This Means for Pear Tree

Pear Tree has an even more compelling version of this story because of its 80% financial aid rate. The tuition gap is not just "tuition doesn't cover costs" — it's "most of our families cannot pay full tuition, and we refuse to turn anyone away."

**Suggested messaging:**

> "At Pear Tree, 80% of our families receive financial aid because we believe every child deserves a liberatory education — regardless of what their family can pay. Tuition alone covers only a fraction of what it costs to deliver our Montessori, social justice, and nature-based curriculum. Your gift directly bridges the gap between what families can pay and what it costs to educate each child. When you give to Pear Tree, you are not supplementing a budget — you are making it possible for a child to stay."

---

## Part 9: Participation Rate Strategy

### The Mount Paran Model

Mount Paran Christian School grew parent participation from 28% in 2004 to 88% in 2022 — one of the highest rates in independent school fundraising. Their approach:

1. **Focus on participation, not dollars.** "The focus for the development team has always been on parent participation, versus amount raised."

2. **Five-day blitz campaign.** A concentrated, schoolwide fundraising push in mid-September. No competing asks during this time. It is the one and only time parents are solicited for the Annual Fund for the entire school year.

3. **Strategic timing.** Moved the campaign close to the start of school, reinforcing the message that the Annual Fund should be "a family's first and most important gift to the school, above all others."

4. **Multi-channel daily outreach.** During the 5-day blitz:
   - Daily emails highlighting Annual Fund impact
   - Lead story in weekly school e-newsletter
   - Facebook campaign (reached 12,000 people, 1,300 engagements)
   - Instagram posts (1,000 likes, 3,000 views)

5. **Why participation matters beyond dollars.** Multiple schools note that foundations are more likely to help a school that demonstrates support from its own community. "The health of a school is measured in part by the support generated by all its constituents." High participation rates (75%+ is the "magic number") unlock foundation grants and signal institutional health.

### Application to Pear Tree

Pear Tree already has a strong community culture (required volunteer hours, Walk-a-Thon, potlucks, showcases). A participation-focused annual fund campaign could achieve very high rates:

- Frame it as "100% participation, any amount" — $5 counts
- Use the Walk-a-Thon as a vehicle: every family participates or donates
- Leverage ParentSquare for daily campaign communications during a focused giving week
- Track and celebrate participation percentage publicly on the website
- Position it to foundations and major donors: "100% of our families give — this is what belief looks like"

---

## Part 10: Named Giving Societies & Donor Recognition

### How Schools Create Belonging Through Naming

**Teach for America — "The Key"**
- Named monthly giving society
- Members "united by the deep belief that education is the key to unlocking opportunity"
- Mission-aligned naming

**American Montessori Society — "The 1870 Society"**
- Named for the year of Maria Montessori's birth
- Legacy/planned giving community
- Connects donors to historical mission roots

**Brown University — "1764 Society"**
- Named for founding year
- Recognizes consecutive years of giving (3-4, 5-9, 10-24, 25+ years)
- Physical recognition (lapel pins at different levels)

**Punahou School — "Donor Community"**
- Segmented: alumni giving, parent/family giving, faculty/staff giving
- Donor events, donor stories published on website
- Annual summary of gifts report

**Big Brothers Big Sisters** (nonprofit example):
- Mission-named tiers: "Match Makers," "Big Givers," "Match Defenders," "Champions of Potential"
- Names directly relate to the organization's core program

### Recommended Naming for Pear Tree

Given Pear Tree's nature-based philosophy, the pear tree metaphor, and classroom names (Dragonfly, Butterfly, Hummingbird, Falcon, Dolphin), potential giving society names:

**Annual Fund Tiers (by dollar level):**
| Tier Name | Amount | Rationale |
|-----------|--------|-----------|
| Seeds | Up to $99 | Every gift starts growth |
| Roots | $100–$499 | The foundation that holds everything |
| Branches | $500–$999 | Reaching further, supporting more |
| Canopy | $1,000–$2,499 | Sheltering the whole community |
| Orchard | $2,500–$4,999 | Creating abundance |
| Founders' Circle | $5,000+ | Sustaining the vision |

**Recurring Giving Program:**
- "The Orchard" or "Roots & Branches" monthly giving circle

**Loyalty Recognition (consecutive years):**
- 3+ years: "Perennial Supporter"
- 5+ years: "Deep Roots"
- 10+ years: "Founding Tree" (for those who have given since the early years)

---

## Part 11: The DonorsChoose Transparency Model — Lessons for Small Schools

### What Makes DonorsChoose Exceptional

DonorsChoose has funded over 2 million classroom projects across 68% of U.S. public schools, with 1.9 million donors. Their model succeeds because of radical transparency:

1. **Line-item specificity.** Every project shows an exact breakdown of requested resources, processing costs, and suggested donation amounts.

2. **Direct connection.** Donors choose which classroom and teacher to support. The gift is not abstract.

3. **Accountability loop.** DonorsChoose vets every request, purchases each item, and ships materials directly to teachers. No cash changes hands between donor and teacher.

4. **Thank-you package requirement.** Teachers must submit:
   - An impact letter with specific examples of how students used materials
   - 6 photographs of the project in action
   - Student thank-you notes
   - DonorsChoose assembles these into a slideshow sent to donors

5. **Post-funding reporting.** Every donor gets a thank-you from the teacher AND a report of how each dollar was spent.

6. **Trust architecture.** Four-star Charity Navigator rating, GuideStar Platinum Seal, dedicated Trust & Safety team, 92% of expenses to program services.

### How Pear Tree Can Adapt This Model

Pear Tree doesn't need to build DonorsChoose. But it can borrow the transparency principles:

**Classroom Wishlist Page (/support/wishlist)**
- Each classroom (Dragonfly, Butterfly, Hummingbird, Falcon, Dolphin) posts specific material needs
- Line items with costs: "Falcon Classroom needs 15 copies of 'Stamped' by Jason Reynolds — $12 each, $180 total"
- Donors can fund specific items or contribute any amount to a classroom
- When funded, post a photo of students with the materials and a thank-you note

**Impact Reporting**
- After each giving campaign or quarter, email donors with:
  - Photos from classrooms (with permission)
  - A brief narrative from a teacher about how funds were used
  - One student quote or achievement highlight
  - Next quarter's needs preview
- Publish an annual "Impact Report" page on the website (even a single-page version)

**The thank-you experience is the single greatest predictor of whether a donor gives again.** DonorsChoose has proven this at scale. Pear Tree can do it with warmth and authenticity at a small-school scale.

---

## Part 12: Technical Form Design & Conversion Optimization

### Conversion Data from Industry Research

- Donation pages convert at 11% on desktop, 8% on mobile (M+R Benchmarks)
- Every additional form field reduces conversion by approximately 4%
- Multi-step forms (requiring "Next" clicks) cause up to 52% drop-off
- Streamlined forms boost conversions by up to 39%
- Branded donation pages raise 7x more than generic ones
- Adding a padlock icon + "Your information is secure" increases conversion by 20%

### Form Design Checklist

Based on what the highest-performing organizations do:

- [ ] Single-step form (no multi-page flow)
- [ ] Single-column layout
- [ ] Mobile-responsive (test on iPhone and Android)
- [ ] Branded to match website (colors, fonts, logo — not a generic Donorbox widget)
- [ ] One-time / Monthly toggle at the top
- [ ] 4 suggested amounts + "Other" custom field
- [ ] Impact statement below each suggested amount
- [ ] Minimum required fields: Name, Email, Card info, Amount
- [ ] Conditional fields: Show "Employer" only if "Match my gift" is checked
- [ ] SSL padlock icon visible near payment fields
- [ ] "Your information is secure" or "Secure checkout" text near the submit button
- [ ] 501(c)(3) status and EIN displayed below the form
- [ ] "Your gift is tax-deductible" language
- [ ] No competing navigation or distracting links on the form page
- [ ] Custom thank-you page after submission (not a generic confirmation)
- [ ] Employer matching gift search tool (or link to Double the Donation)

### Recommended Platforms for Small Schools

Based on what the researched organizations use:
- **Donorbox** — Popular with small nonprofits, embeddable, branded forms, recurring support
- **Classy** — Used by Teach for America and KIPP Foundation; more robust but higher cost
- **Give Lively** — Free for nonprofits, modern design, recurring giving support
- **Stripe / Square** — Direct payment processing, maximum branding control, requires more setup

---

## Part 13: Ways to Give — The Full Menu

### Comprehensive Giving Vehicles Observed Across All Sites

Every major education organization offers multiple giving vehicles beyond simple online credit card donations:

| Vehicle | Who Offers It | Notes |
|---------|--------------|-------|
| Online donation (credit/debit) | All | Universal — the baseline |
| Recurring/monthly giving | TFA, KIPP, AMS, DonorsChoose, Punahou | Named programs perform best |
| Check by mail | All | Always include mailing address and payee name |
| Stock/securities transfer | Park Day, Uncommon, KIPP, TFA, Punahou | Morgan Stanley is common brokerage; requires DTC# and account info |
| Donor-Advised Funds (DAF) | Park Day, Citizen Schools, KIPP | DAF Direct integration where possible |
| Employer matching gifts | All | "Double your impact" language; search tool for employer programs |
| Planned giving/bequests | Park Day, Citizen Schools, TFA, KIPP, Punahou | Estate planning, wills, trusts |
| IRA Qualified Charitable Distributions | TFA, KIPP NYC, Punahou | For donors 70.5+ years old |
| Cryptocurrency | KIPP NYC, KIPP Foundation, Punahou | BTC, ETH, DOGE accepted; processed by Crypto for Charity or The Giving Block |
| Vehicle donations | Park Day School | Niche but mentioned — "donate a vehicle taking up space" |
| Payroll deduction | Punahou | For affiliated employers |
| Wire transfer | Park Day, KIPP NYC | Banking info provided on request |

### Priority for Pear Tree (Phase 1)

Start with these and add more as capacity grows:

1. Online donation (credit/debit card) — essential
2. Recurring/monthly giving — high-impact, low-effort
3. Check by mail — low-tech but many older donors prefer it
4. Employer matching gifts — mention it on the form, link to Double the Donation
5. Donor-Advised Funds — include EIN and DAF language for donors who already have one

---

## Part 14: Key Messaging Patterns

### Phrases and Framings That Appear Across the Most Effective Sites

**The Tuition Gap:**
- "Tuition alone does not cover the full cost of educating each student"
- "Your gift bridges the gap"
- "The Annual Fund is our most important source of revenue other than tuition"

**Impact / Urgency:**
- "Every dollar you give has an outsized impact on our students' academic success"
- "Your support helps us go the extra mile"
- "When you give, you invest in a future where every student can dream without limits"

**Community / Participation:**
- "The health of a school is measured in part by the support generated by all its constituents"
- "Foundations are more likely to help a school that demonstrates support from its own community"
- "100% participation matters — every gift, no matter the size, signals belief in our mission"

**No-Family-Turned-Away (unique to equity-focused schools):**
- This is Pear Tree's most powerful message and should appear on the giving page
- "No family will be turned away due to lack of funds — your gift makes this possible"

**Tax Deductibility:**
- "Your gift is 100% tax-deductible to the fullest extent of the law"
- Display EIN prominently

**Matching:**
- "Many companies will match your gift — double your impact"
- "Check if your employer matches"

---

## Part 15: Annual Calendar & Campaign Timing

### When Schools Ask (and How Often)

**Mount Paran Christian School:** One concentrated 5-day blitz in mid-September. No other annual fund solicitation all year. Result: 88% participation.

**Punahou School:** Year-round giving page, with reunion-year and end-of-fiscal-year pushes.

**Teach for America:** Year-round online giving with seasonal campaigns (Teacher Appreciation Week, end-of-year, Giving Tuesday).

**Industry data:** Nonprofits send an average of 66 emails per subscriber per year, with 25 being fundraising-related. Email generates approximately 28% of all online nonprofit revenue.

### Recommended Calendar for Pear Tree

| When | What | Channel |
|------|------|---------|
| September (back-to-school) | Annual Fund launch — 5-day blitz | ParentSquare, email, social media |
| Late November (Giving Tuesday) | Targeted online campaign | Email, social media, website banner |
| February (Black Heritage Month) | Showcase-linked giving appeal | In-person at Showcase, email follow-up |
| April (Walk-a-Thon) | Community fundraiser + peer-to-peer | In-person, pledge forms, online giving |
| June (year-end) | Year-end appeal with impact report | Email, mail to donor list |
| Year-round | Website giving page always active | Website |

---

## Appendix: Source Organizations & URLs

### Schools Researched

| Organization | Giving Page URL | Key Takeaway |
|-------------|----------------|--------------|
| Park Day School (Oakland) | parkdayschool.org/give/ | Multiple giving vehicles, securities, DAF, planned giving, dedicated giving email/phone |
| Uncommon Schools | uncommonschools.org/donate/ | Impact-tied giving tiers, matching gift promotion, 501(c)(3) display |
| KIPP NYC | kippnyc.org/give/ | Multiple ways to give including crypto and IRA, legacy giving, matching |
| KIPP Foundation | donate.kipp.org/give/186999/ | National donation page on Classy platform |
| Citizen Schools | citizenschools.org/donate | Bequests, stock gifts, DAF Direct integration |
| Teach for America | teachforamerica.org/donate | "The Key" monthly society, legacy giving, regional campaigns |
| DonorsChoose | donorschoose.org | Radical transparency, line-item budgets, thank-you packages with photos |
| Punahou School | punahou.edu/giving | Exemplary architecture, $19.2M raised, endowment, donor community |
| Mount Paran Christian School | mtparanschool.com/support-mpcs | 88% participation via 5-day blitz, leadership giving at $2,500+ |
| American Montessori Society | amshq.org/about-montessori/donate/ | The 1870 Society for legacy giving, fund selection |
| Amherst Montessori | amherstmontessori.org/support/annual-fund | Tuition gap messaging, employer matching |
| Washington Montessori | washingtonmontessori.org | $2,000 per-student gap, participation rate importance |
| Hollis Montessori | hollismontessori.org/annual-fund | 85% tuition coverage, annual giving as #1 non-tuition revenue |
| Five Oaks Academy Montessori | fiveoaksacademy.com/giving/annual-fund-faq | Funds split among Program, Faculty, Student Excellence |
| Austin Montessori | austinmontessori.org/giving/annual-fund | Annual fund as community philanthropy vehicle |

### Industry Sources

| Source | Key Data Point |
|--------|---------------|
| M+R Benchmarks 2025 | 11% desktop / 8% mobile conversion; 31% revenue from recurring |
| Bloomerang | 80-90% monthly donor retention vs. 45% one-time |
| Network for Good | Branded pages raise 7x more than generic |
| Nonprofit Tech for Good | 72% of donors say charity ratings increase likelihood of giving |
| Donately | 4% conversion drop per additional form field |
| Finalsite | CTA integration, mobile giving, form design for schools |
| Graham-Pelton | Annual fund = 10-30% of independent school operating budgets |
| CASE (Council for Advancement & Support of Education) | Donor trends for independent schools |
| Double the Donation | Suggested tiers increase average gifts by 12% |

---

*Document prepared March 7, 2026, for Pear Tree Community School website project.*
