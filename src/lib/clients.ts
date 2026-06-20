import type { ServiceInterest } from "./leads";
import type { Doc } from "../../convex/_generated/dataModel";

export type RiskTolerance =
  | "Conservative"
  | "Moderate"
  | "Moderate-Aggressive"
  | "Aggressive";

export type ClientStatus = "Active" | "Onboarding" | "Review due";

export type Account = {
  type:
    | "401(k)"
    | "Roth IRA"
    | "Traditional IRA"
    | "Brokerage"
    | "529 Plan"
    | "HSA"
    | "Pension";
  institution: string;
  balance: number;
};

export type AllocationSlice = {
  label: "Stocks" | "Bonds" | "Cash" | "Alternatives" | "Real Estate";
  percent: number;
};

export type Goal = {
  name: string;
  detail: string;
  /** Optional progress toward the goal, 0–100. */
  progress?: number;
};

export type Dependent = {
  name: string;
  relation: string;
};

export type Client = {
  id: string;
  slug: string;
  name: string;
  age: number;
  occupation: string;
  location: string;
  email: string;
  phone: string;
  status: ClientStatus;

  // Relationship
  clientSince: string; // ISO date
  advisor: string;
  cadence: string;
  nextReview: string; // ISO date

  // Household
  spouse?: string;
  dependents: Dependent[];

  // Financial snapshot
  aum: number;
  netWorth: number;
  riskTolerance: RiskTolerance;
  timeHorizon: string;
  accounts: Account[];
  allocation: AllocationSlice[];
  goals: Goal[];
  serviceTopics: ServiceInterest[];

  // Narrative
  description: string;
  situation: string;
  whyApproached: string;
  notes: string[];
};

export const clients: Client[] = [
  {
    id: "cl-001",
    slug: "marcus-chen",
    name: "Marcus Chen",
    age: 41,
    occupation: "Software Engineering Manager",
    location: "San Francisco, CA",
    email: "marcus.chen@gmail.com",
    phone: "(415) 555-0142",
    status: "Active",
    clientSince: "2025-09-12",
    advisor: "You",
    cadence: "Quarterly",
    nextReview: "2026-09-15",
    spouse: "Dana Chen",
    dependents: [
      { name: "Ethan", relation: "Son, 9" },
      { name: "Mia", relation: "Daughter, 6" },
    ],
    aum: 850000,
    netWorth: 1650000,
    riskTolerance: "Moderate-Aggressive",
    timeHorizon: "14 years to target retirement",
    accounts: [
      { type: "401(k)", institution: "Fidelity", balance: 420000 },
      { type: "Roth IRA", institution: "Vanguard", balance: 180000 },
      { type: "Brokerage", institution: "Schwab", balance: 250000 },
    ],
    allocation: [
      { label: "Stocks", percent: 70 },
      { label: "Bonds", percent: 15 },
      { label: "Alternatives", percent: 10 },
      { label: "Cash", percent: 5 },
    ],
    goals: [
      {
        name: "Retire by 55",
        detail: "Build enough to step back from full-time work in ~14 years.",
        progress: 48,
      },
      {
        name: "Diversify RSUs",
        detail: "Unwind concentrated employer stock tax-efficiently.",
        progress: 30,
      },
      {
        name: "College funds",
        detail: "Fund education for Ethan and Mia.",
        progress: 22,
      },
    ],
    serviceTopics: ["Retirement Planning", "Tax Strategy"],
    description:
      "A 15-year tech veteran with significant equity compensation and strong savings discipline. Married with two young children and a recently purchased second property.",
    situation:
      "Marcus maxes out his 401(k) and holds a large concentrated position in his employer's stock. He has a strong income but limited diversification and an aggressive desire to retire early.",
    whyApproached:
      "Wants a clear roadmap to retire by 55 and a strategy to diversify out of his concentrated employer stock without triggering a large tax bill.",
    notes: [
      "Concentrated RSU position — monitor tax exposure each quarter.",
      "Prefers evening reviews after 6pm PT.",
      "Originally referred by Eleanor Whitfield's family.",
    ],
  },
  {
    id: "cl-002",
    slug: "robert-linda-alvarez",
    name: "Robert & Linda Alvarez",
    age: 63,
    occupation: "Small Business Owners (Retiring)",
    location: "Phoenix, AZ",
    email: "ralvarez58@gmail.com",
    phone: "(602) 555-0119",
    status: "Active",
    clientSince: "2025-11-02",
    advisor: "You",
    cadence: "Monthly",
    nextReview: "2026-07-10",
    spouse: "Married (joint household)",
    dependents: [
      { name: "Three adult children", relation: "Beneficiaries" },
      { name: "Five grandchildren", relation: "Legacy planning" },
    ],
    aum: 2400000,
    netWorth: 4100000,
    riskTolerance: "Moderate",
    timeHorizon: "Retiring now — income & legacy focus",
    accounts: [
      { type: "Brokerage", institution: "Schwab", balance: 1400000 },
      { type: "Traditional IRA", institution: "Fidelity", balance: 700000 },
      { type: "Roth IRA", institution: "Fidelity", balance: 300000 },
    ],
    allocation: [
      { label: "Stocks", percent: 45 },
      { label: "Bonds", percent: 35 },
      { label: "Cash", percent: 10 },
      { label: "Alternatives", percent: 10 },
    ],
    goals: [
      {
        name: "Reliable retirement income",
        detail: "Convert the business-sale proceeds into stable income.",
        progress: 60,
      },
      {
        name: "Multi-generational estate plan",
        detail: "Pass wealth to children and grandchildren tax-efficiently.",
        progress: 40,
      },
    ],
    serviceTopics: ["Estate Planning", "Retirement Planning"],
    description:
      "A married couple selling the family business they ran for 30 years. The sale creates a major liquidity event and a shift from earning to drawing income.",
    situation:
      "Robert and Linda are transitioning into retirement with a large, soon-to-be-liquid estate. They want dependable income and a clear plan to pass wealth to three children and five grandchildren.",
    whyApproached:
      "Need help structuring the proceeds from their business sale into retirement income and a tax-efficient, multi-generational estate plan.",
    notes: [
      "Business sale expected to close Q3 2026 — coordinate cash deployment.",
      "Wants adult children involved in legacy planning.",
      "Prefers in-person meetings at the downtown office.",
    ],
  },
  {
    id: "cl-003",
    slug: "eleanor-whitfield",
    name: "Eleanor Whitfield",
    age: 68,
    occupation: "Retired Professor",
    location: "Boston, MA",
    email: "eleanor.w@gmail.com",
    phone: "(617) 555-0190",
    status: "Review due",
    clientSince: "2025-12-01",
    advisor: "You",
    cadence: "Monthly",
    nextReview: "2026-06-22",
    spouse: "Widowed",
    dependents: [{ name: "Claire Whitfield", relation: "Daughter (attorney)" }],
    aum: 1750000,
    netWorth: 2300000,
    riskTolerance: "Conservative",
    timeHorizon: "In retirement — capital preservation",
    accounts: [
      { type: "Traditional IRA", institution: "Vanguard", balance: 900000 },
      { type: "Brokerage", institution: "Fidelity", balance: 650000 },
      { type: "Roth IRA", institution: "Vanguard", balance: 200000 },
    ],
    allocation: [
      { label: "Bonds", percent: 45 },
      { label: "Stocks", percent: 35 },
      { label: "Cash", percent: 20 },
    ],
    goals: [
      {
        name: "Simplify finances",
        detail: "Consolidate accounts she inherited and reduce complexity.",
        progress: 55,
      },
      {
        name: "Sustainable income",
        detail: "Ensure income lasts through a long retirement.",
        progress: 70,
      },
      {
        name: "Manage RMDs",
        detail: "Handle required minimum distributions efficiently.",
        progress: 65,
      },
    ],
    serviceTopics: ["Retirement Planning"],
    description:
      "Recently widowed retired professor who is taking over the household finances her late husband used to manage entirely.",
    situation:
      "Eleanor inherited a sizeable but scattered set of accounts and is unfamiliar with day-to-day financial management. She needs simplification, dependable income, and help with required minimum distributions.",
    whyApproached:
      "Needs a trusted advisor to take over financial management and simplify her retirement income after losing her spouse.",
    notes: [
      "Sensitive situation — keep communication patient and thorough.",
      "Daughter Claire (attorney) sits in on every review.",
      "Strongly prefers in-person or phone over video.",
    ],
  },
  {
    id: "cl-004",
    slug: "tom-bradley",
    name: "Tom Bradley",
    age: 49,
    occupation: "Airline Pilot",
    location: "Denver, CO",
    email: "tbradley@protonmail.com",
    phone: "(720) 555-0103",
    status: "Active",
    clientSince: "2026-01-20",
    advisor: "You",
    cadence: "Semi-annual",
    nextReview: "2026-08-04",
    spouse: "Partner, Alex",
    dependents: [],
    aum: 640000,
    netWorth: 980000,
    riskTolerance: "Moderate",
    timeHorizon: "16 years to retirement",
    accounts: [
      { type: "401(k)", institution: "Empower", balance: 260000 },
      { type: "Brokerage", institution: "Schwab", balance: 230000 },
      { type: "Pension", institution: "Airline Plan", balance: 150000 },
    ],
    allocation: [
      { label: "Stocks", percent: 60 },
      { label: "Bonds", percent: 25 },
      { label: "Cash", percent: 10 },
      { label: "Alternatives", percent: 5 },
    ],
    goals: [
      {
        name: "Reduce tax burden",
        detail: "Proactive tax strategy across his multi-state income.",
        progress: 35,
      },
      {
        name: "Coordinate pension",
        detail: "Integrate the airline pension with the rest of the plan.",
        progress: 45,
      },
    ],
    serviceTopics: ["Tax Strategy", "Investment Management"],
    description:
      "An airline pilot with strong but variable income earned across multiple states, plus an employer pension.",
    situation:
      "Tom's multi-state income creates a complex tax picture, and he has been self-managing a brokerage account with little tax-loss harvesting. He's open to delegating more.",
    whyApproached:
      "Looking for proactive tax strategies and help coordinating his pension with his other investments.",
    notes: [
      "Irregular schedule — book reviews ~2 weeks out.",
      "Self-directed background; explain the 'why' behind recommendations.",
    ],
  },
  {
    id: "cl-005",
    slug: "jasmine-okoye",
    name: "Jasmine Okoye",
    age: 34,
    occupation: "Marketing Director",
    location: "Chicago, IL",
    email: "jasmine.okoye@gmail.com",
    phone: "(312) 555-0167",
    status: "Onboarding",
    clientSince: "2026-06-10",
    advisor: "You",
    cadence: "Quarterly",
    nextReview: "2026-09-08",
    spouse: "Married",
    dependents: [{ name: "Newborn", relation: "Child (0)" }],
    aum: 180000,
    netWorth: 240000,
    riskTolerance: "Moderate-Aggressive",
    timeHorizon: "30+ years to retirement",
    accounts: [
      { type: "401(k)", institution: "Principal", balance: 120000 },
      { type: "529 Plan", institution: "Bright Start", balance: 12000 },
      { type: "Brokerage", institution: "Fidelity", balance: 48000 },
    ],
    allocation: [
      { label: "Stocks", percent: 80 },
      { label: "Bonds", percent: 10 },
      { label: "Cash", percent: 10 },
    ],
    goals: [
      {
        name: "Fund a 529 plan",
        detail: "Start and grow college savings for her newborn.",
        progress: 15,
      },
      {
        name: "Holistic plan",
        detail: "Balance education savings with her own retirement.",
        progress: 20,
      },
    ],
    serviceTopics: ["College Savings", "Investment Management"],
    description:
      "A new parent and marketing director thinking seriously about long-term goals for the first time.",
    situation:
      "Jasmine has a solid 401(k) but no broader strategy. As a new parent she wants to balance saving for her child's education with her own retirement, and she's budget- and fee-conscious.",
    whyApproached:
      "Wants to open a 529 college savings plan and build a holistic financial plan now that she's a parent.",
    notes: [
      "Onboarding paperwork in progress.",
      "Values fee transparency — keep cost conversations explicit.",
    ],
  },
  {
    id: "cl-006",
    slug: "david-kim",
    name: "David Kim",
    age: 31,
    occupation: "Product Designer",
    location: "San Jose, CA",
    email: "david.kim@gmail.com",
    phone: "(408) 555-0174",
    status: "Onboarding",
    clientSince: "2026-06-16",
    advisor: "You",
    cadence: "Quarterly",
    nextReview: "2026-09-16",
    dependents: [],
    aum: 95000,
    netWorth: 130000,
    riskTolerance: "Aggressive",
    timeHorizon: "35+ years to retirement",
    accounts: [
      { type: "401(k)", institution: "Guideline", balance: 60000 },
      { type: "Roth IRA", institution: "Fidelity", balance: 20000 },
      { type: "Brokerage", institution: "Schwab", balance: 15000 },
    ],
    allocation: [
      { label: "Stocks", percent: 85 },
      { label: "Cash", percent: 10 },
      { label: "Bonds", percent: 5 },
    ],
    goals: [
      {
        name: "Start investing",
        detail: "Build a diversified portfolio beyond his 401(k).",
        progress: 25,
      },
      {
        name: "Build financial literacy",
        detail: "Understand the fundamentals as his assets grow.",
        progress: 40,
      },
    ],
    serviceTopics: ["Investment Management"],
    description:
      "Early-career product designer with a solid income and good saving habits, new to investing beyond his 401(k).",
    situation:
      "David keeps most of his savings in cash and wants to put it to work. He's engaged, curious, and a strong long-term fit as his assets grow.",
    whyApproached:
      "Wants guidance to start investing beyond his 401(k) and build long-term wealth.",
    notes: [
      "Highly engaged — sends thoughtful questions between meetings.",
      "Good candidate for educational content.",
    ],
  },
];

export function getClient(slug: string): Client | undefined {
  return clients.find((c) => c.slug === slug);
}

export function mapClient(client: Doc<"clients">): Client {
  return {
    id: client._id,
    slug: client.slug,
    name: client.name,
    age: client.age,
    occupation: client.occupation,
    location: client.location,
    email: client.email,
    phone: client.phone,
    status: client.status,
    clientSince: client.clientSince,
    advisor: client.advisorName,
    cadence: client.cadence,
    nextReview: client.nextReview,
    spouse: client.spouse,
    dependents: client.dependents,
    aum: client.aum,
    netWorth: client.netWorth,
    riskTolerance: client.riskTolerance,
    timeHorizon: client.timeHorizon,
    accounts: client.accounts,
    allocation: client.allocation,
    goals: client.goals,
    serviceTopics: client.serviceTopics,
    description: client.description,
    situation: client.situation,
    whyApproached: client.whyApproached,
    notes: client.notes,
  };
}
