export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Converted";

export type ServiceInterest =
  | "Retirement Planning"
  | "Investment Management"
  | "Insurance"
  | "Estate Planning"
  | "Tax Strategy"
  | "College Savings";

export type LeadSource =
  | "Referral"
  | "Website"
  | "Seminar"
  | "LinkedIn"
  | "Cold Inquiry"
  | "WhatsApp";

export type TimelineEvent = {
  date: string; // ISO date
  label: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  occupation: string;
  age: number;
  status: LeadStatus;
  serviceInterest: ServiceInterest;
  source: LeadSource;
  addedDate: string; // ISO date
  lastContact: string; // ISO date
  estimatedPortfolio: number; // USD
  /** Short teaser shown on the card. */
  situationTeaser: string;
  /** Full background shown in the drawer. */
  situation: string;
  /** Why the lead reached out to the advisor. */
  whyApproached: string;
  notes: string[];
  timeline: TimelineEvent[];
};

export const STATUS_ORDER: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
];

export const leads: Lead[] = [
  {
    id: "ld-001",
    name: "Marcus Chen",
    email: "marcus.chen@gmail.com",
    phone: "(415) 555-0142",
    location: "San Francisco, CA",
    occupation: "Software Engineering Manager",
    age: 41,
    status: "Qualified",
    serviceInterest: "Retirement Planning",
    source: "Referral",
    addedDate: "2026-06-02",
    lastContact: "2026-06-16",
    estimatedPortfolio: 850000,
    situationTeaser:
      "Maxing out 401(k) but unsure how to plan for early retirement at 55.",
    situation:
      "Marcus has spent 15 years in tech and has accumulated significant equity and retirement savings. He maxes out his 401(k) and holds a concentrated position in his employer's stock. He's married with two kids and recently bought a second property.",
    whyApproached:
      "Wants a roadmap to retire by 55 and a strategy to diversify out of his concentrated employer stock without a large tax hit.",
    notes: [
      "Referred by existing client Dana Whitfield.",
      "Concentrated RSU position — flag tax exposure.",
      "Prefers evening calls after 6pm PT.",
    ],
    timeline: [
      { date: "2026-06-02", label: "Lead created from referral" },
      { date: "2026-06-05", label: "Intro call completed" },
      { date: "2026-06-16", label: "Sent retirement questionnaire" },
    ],
  },
  {
    id: "ld-002",
    name: "Priya Nair",
    email: "priya.nair@outlook.com",
    phone: "(206) 555-0188",
    location: "Seattle, WA",
    occupation: "Pediatric Surgeon",
    age: 38,
    status: "New",
    serviceInterest: "Investment Management",
    source: "Website",
    addedDate: "2026-06-15",
    lastContact: "2026-06-15",
    estimatedPortfolio: 1200000,
    situationTeaser:
      "High income, finished residency debt, ready to invest aggressively.",
    situation:
      "Priya recently finished paying off her medical school debt and is now earning a high income. She has a large amount of cash sitting in a savings account and no formal investment strategy. She works long hours and wants a hands-off approach.",
    whyApproached:
      "Has idle cash losing value to inflation and wants a managed portfolio aligned with a long time horizon.",
    notes: [
      "Submitted contact form at 11pm — likely browsing after shifts.",
      "Email is the best way to reach her.",
    ],
    timeline: [{ date: "2026-06-15", label: "Submitted website contact form" }],
  },
  {
    id: "ld-003",
    name: "Robert & Linda Alvarez",
    email: "ralvarez58@gmail.com",
    phone: "(602) 555-0119",
    location: "Phoenix, AZ",
    occupation: "Small Business Owners (Retiring)",
    age: 63,
    status: "Proposal",
    serviceInterest: "Estate Planning",
    source: "Seminar",
    addedDate: "2026-05-20",
    lastContact: "2026-06-17",
    estimatedPortfolio: 2400000,
    situationTeaser:
      "Selling their business, need an estate and income plan for retirement.",
    situation:
      "Robert and Linda are selling the family business they've run for 30 years. The sale will create a large liquidity event. They want to ensure a comfortable retirement income and pass wealth to their three children and grandchildren tax-efficiently.",
    whyApproached:
      "Need help structuring the proceeds from their business sale into retirement income and a multi-generational estate plan.",
    notes: [
      "Business sale expected to close in Q3 2026.",
      "Met at the 'Retire Right' seminar in May.",
      "Wants to involve their adult children in planning.",
    ],
    timeline: [
      { date: "2026-05-20", label: "Met at retirement seminar" },
      { date: "2026-05-28", label: "Discovery meeting" },
      { date: "2026-06-10", label: "Reviewed estate goals" },
      { date: "2026-06-17", label: "Proposal delivered" },
    ],
  },
  {
    id: "ld-004",
    name: "Jasmine Okoye",
    email: "jasmine.okoye@gmail.com",
    phone: "(312) 555-0167",
    location: "Chicago, IL",
    occupation: "Marketing Director",
    age: 34,
    status: "Contacted",
    serviceInterest: "College Savings",
    source: "LinkedIn",
    addedDate: "2026-06-08",
    lastContact: "2026-06-14",
    estimatedPortfolio: 180000,
    situationTeaser:
      "New parent wanting to start a 529 plan and tighten up finances.",
    situation:
      "Jasmine just had her first child and is thinking about long-term financial goals for the first time. She has a 401(k) through work but no other investments. She wants to balance saving for her child's education with her own retirement.",
    whyApproached:
      "Wants to open a 529 college savings plan and get a holistic plan now that she's a parent.",
    notes: [
      "Connected via LinkedIn after a post on 529 plans.",
      "Budget-conscious — interested in fee transparency.",
    ],
    timeline: [
      { date: "2026-06-08", label: "Connected on LinkedIn" },
      { date: "2026-06-14", label: "First phone consultation" },
    ],
  },
  {
    id: "ld-005",
    name: "Tom Bradley",
    email: "tbradley@protonmail.com",
    phone: "(720) 555-0103",
    location: "Denver, CO",
    occupation: "Airline Pilot",
    age: 49,
    status: "Qualified",
    serviceInterest: "Tax Strategy",
    source: "Referral",
    addedDate: "2026-05-30",
    lastContact: "2026-06-12",
    estimatedPortfolio: 640000,
    situationTeaser:
      "Variable income across states, wants to reduce his tax burden.",
    situation:
      "Tom earns a strong but variable income and works across multiple states, creating a complicated tax picture. He has a pension through his employer and a brokerage account he manages himself, with little tax-loss harvesting.",
    whyApproached:
      "Looking for proactive tax strategies and help coordinating his pension with his other investments.",
    notes: [
      "Schedule is irregular — book calls 2 weeks out.",
      "Self-directed investor, open to delegating.",
    ],
    timeline: [
      { date: "2026-05-30", label: "Referred by colleague" },
      { date: "2026-06-04", label: "Intro call" },
      { date: "2026-06-12", label: "Shared last 2 years of returns" },
    ],
  },
  {
    id: "ld-006",
    name: "Sofia Reyes",
    email: "sofia.reyes@gmail.com",
    phone: "(305) 555-0151",
    location: "Miami, FL",
    occupation: "Restaurant Owner",
    age: 45,
    status: "New",
    serviceInterest: "Insurance",
    source: "Cold Inquiry",
    addedDate: "2026-06-18",
    lastContact: "2026-06-18",
    estimatedPortfolio: 310000,
    situationTeaser:
      "Wants life and disability coverage to protect her family and business.",
    situation:
      "Sofia owns two restaurants and is the primary earner for her family. She has minimal insurance coverage and worries about what would happen to her business and family if she were unable to work.",
    whyApproached:
      "Concerned about protecting her family and business with adequate life and disability insurance.",
    notes: [
      "Called the office directly after a Google search.",
      "Busy during lunch/dinner service — mornings are best.",
    ],
    timeline: [{ date: "2026-06-18", label: "Cold inquiry phone call" }],
  },
  {
    id: "ld-007",
    name: "David Kim",
    email: "david.kim@gmail.com",
    phone: "(408) 555-0174",
    location: "San Jose, CA",
    occupation: "Product Designer",
    age: 31,
    status: "Contacted",
    serviceInterest: "Investment Management",
    source: "Website",
    addedDate: "2026-06-10",
    lastContact: "2026-06-15",
    estimatedPortfolio: 95000,
    situationTeaser:
      "Early-career, wants to start investing beyond his company 401(k).",
    situation:
      "David is early in his career with a solid income and good saving habits. He contributes to his 401(k) but keeps the rest in a savings account. He's interested in building a diversified portfolio and learning the basics.",
    whyApproached:
      "Wants guidance to start investing beyond his 401(k) and build long-term wealth.",
    notes: [
      "Engaged and curious — asks a lot of questions.",
      "Good long-term fit as he grows his assets.",
    ],
    timeline: [
      { date: "2026-06-10", label: "Website inquiry" },
      { date: "2026-06-15", label: "Intro email exchange" },
    ],
  },
  {
    id: "ld-008",
    name: "Eleanor Whitfield",
    email: "eleanor.w@gmail.com",
    phone: "(617) 555-0190",
    location: "Boston, MA",
    occupation: "Retired Professor",
    age: 68,
    status: "Proposal",
    serviceInterest: "Retirement Planning",
    source: "Referral",
    addedDate: "2026-05-25",
    lastContact: "2026-06-16",
    estimatedPortfolio: 1750000,
    situationTeaser:
      "Recently widowed, needs help managing income and required distributions.",
    situation:
      "Eleanor recently lost her husband, who managed all of their finances. She now needs to take over their combined accounts, manage required minimum distributions, and ensure her income lasts through retirement.",
    whyApproached:
      "Needs a trusted advisor to take over financial management and simplify her retirement income after losing her spouse.",
    notes: [
      "Sensitive situation — be patient and thorough.",
      "Prefers in-person meetings.",
      "Daughter (an attorney) sits in on calls.",
    ],
    timeline: [
      { date: "2026-05-25", label: "Referred by family friend" },
      { date: "2026-06-01", label: "In-person discovery meeting" },
      { date: "2026-06-16", label: "Income plan proposal sent" },
    ],
  },
];
