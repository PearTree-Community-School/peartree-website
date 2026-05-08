// Michele Hamilton's Medium articles
// Source: https://medium.com/@thechildrenarealwaysours.com
// Use freely on PTCS sites + link back per Michele.

export interface Article {
  title: string;
  url: string;
  date: string;
  summary: string;
  publication?: string;
}

export const MICHELE_MEDIUM_PROFILE = "https://medium.com/@thechildrenarealwaysours.com";

export const articles: Article[] = [
  {
    title: "When Our Lives Depend on Being Seen: Why BIPOC Families Must Become Medical and Educational Advocates",
    url: "https://medium.com/@thechildrenarealwaysours.com/when-our-lives-depend-on-being-seen-why-bipoc-families-must-become-medical-and-educational-a27a198b35fe",
    date: "2025-11-21",
    summary: "How BIPOC families must advocate within medical and educational systems, beginning with a memory of maternal vulnerability.",
  },
  {
    title: "Calling All The Grandmothers",
    url: "https://medium.com/@thechildrenarealwaysours.com/calling-all-the-grandmothers-283121bbe127",
    date: "2025-11-20",
    summary: "An intergenerational call addressing the role and wisdom of grandmothers.",
  },
  {
    title: "When Gentle Fails: Parenting Beyond the Entitlement Lens",
    url: "https://medium.com/@thechildrenarealwaysours.com/when-gentle-fails-parenting-beyond-the-entitlement-lens-a4bf858f3768",
    date: "2025-11-20",
    summary: "Reframes contemporary parenting beyond the 'gentle parenting' framework.",
  },
  {
    title: "Reframing the Lens: A Story about Vision, Presence, and Parenting Toward Wholeness",
    url: "https://medium.com/@thechildrenarealwaysours.com/reframing-the-lens-a-story-about-vision-presence-and-parenting-toward-wholeness-ed304ccca867",
    date: "2025-11-16",
    summary: "Personal narrative on transformative parenting moments through attentiveness.",
  },
  {
    title: "More Than a Redemption Song",
    url: "https://medium.com/@thechildrenarealwaysours.com/more-than-a-redemption-song-9b244555aa44",
    date: "2025-11-09",
    summary: "Celebrates creation and wholeness beyond merely recovering from past losses.",
  },
  {
    title: "The Children Are Always Ours: Adaptive Mirroring and the Art of Shining Safely",
    url: "https://medium.com/women-write/the-children-are-always-ours-adaptive-mirroring-and-the-art-of-shining-safely-7fd9fda2536a",
    date: "2025-11-02",
    publication: "Women Write",
    summary: "On the impossible balance of teaching BIPOC and neurodiverse children both to shine and to survive.",
  },
  {
    title: "Mirrors, Memory, and Time Travel",
    url: "https://medium.com/@thechildrenarealwaysours.com/mirrors-memory-and-time-travel-8667889d8512",
    date: "2025-10-06",
    summary: "Connects metaphorical reflection to temporal consciousness in relational contexts.",
  },
  {
    title: "Mirrors, Armor, & Vulnerability",
    url: "https://medium.com/@thechildrenarealwaysours.com/mirrors-armor-vulnerability-db4acac159d1",
    date: "2025-09-26",
    summary: "Explores protective mechanisms and emotional openness through reflective frameworks.",
  },
  {
    title: "Mirrors, Myths, and The Sacred Ordinary",
    url: "https://medium.com/@thechildrenarealwaysours.com/mirrors-myths-and-the-sacred-ordinary-5f744b506064",
    date: "2025-09-09",
    summary: "A letter to Pear Tree families on finding the sacred in everyday parenting moments.",
  },
  {
    title: "Mirrors, Malevolence, and the Liberatory Gaze",
    url: "https://medium.com/@thechildrenarealwaysours.com/mirrors-malevolence-and-the-liberatory-gaze-fd36f2d824ae",
    date: "2025-09-05",
    summary: "Examines harmful perception patterns and the transformative power of loving attention.",
  },
];

// Featured pull-quotes from articles, usable as testimonials/excerpts.
export const pullQuotes = [
  {
    quote: "Children learn who they are not only through what we say about them, but through what they see reflected in our eyes, our words, our tones, our gestures.",
    source: "Mirrors, Myths, and The Sacred Ordinary",
    url: "https://medium.com/@thechildrenarealwaysours.com/mirrors-myths-and-the-sacred-ordinary-5f744b506064",
  },
  {
    quote: "The work is to create mirrors where they can see themselves clearly and know that their difference is divine.",
    source: "Adaptive Mirroring and the Art of Shining Safely",
    url: "https://medium.com/women-write/the-children-are-always-ours-adaptive-mirroring-and-the-art-of-shining-safely-7fd9fda2536a",
  },
  {
    quote: "Mistakes are how we learn. Parents need mirrors of grace too.",
    source: "Mirrors, Myths, and The Sacred Ordinary",
    url: "https://medium.com/@thechildrenarealwaysours.com/mirrors-myths-and-the-sacred-ordinary-5f744b506064",
  },
];
