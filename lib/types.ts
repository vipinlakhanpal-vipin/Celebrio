export type Contact = {
  id: string;
  user_id: string;
  full_name: string;
  relationship: string | null;
  date_of_birth: string | null; // YYYY-MM-DD
  anniversary_date: string | null; // YYYY-MM-DD
  email: string | null;
  phone: string | null;
  notes: string | null;
  photo_url: string | null;
  source: "manual" | "csv" | "xlsx";
  created_at: string;
  updated_at: string;
};

export type OccasionType = {
  id: string;
  key: string;
  name: string;
  emoji: string;
  category: string;
  card_icon: string;
  is_variable_date: boolean;
  default_enabled: boolean;
};

export type OccasionPrompt = {
  id: string;
  user_id: string;
  occasion_type_id: string;
  occasion_date: string;
  status: "pending" | "actioned" | "dismissed";
  created_at: string;
  occasion_type?: OccasionType;
};

export type GreetingTemplate = {
  id: string;
  name: string;
  description: string | null;
  palette: { from: string; to: string; accent: string; text: string };
  is_default: boolean;
};

export type ApprovalStatus = "pending" | "approved" | "edited" | "rejected" | "sent" | "failed";

export type Approval = {
  id: string;
  user_id: string;
  contact_id: string;
  template_id: string | null;
  occasion_type: "birthday" | "anniversary" | "holiday";
  occasion_type_id: string | null;
  occasion_label: string | null;
  occasion_date: string;
  message: string;
  channels: string[];
  card_image_url: string | null;
  status: ApprovalStatus;
  send_at: string;
  sent_at: string | null;
  send_error: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
};

export const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Wife",
  "Husband",
  "Partner",
  "Mother",
  "Father",
  "Son",
  "Daughter",
  "Sibling",
  "Brother",
  "Sister",
  "Grandparent",
  "Grandmother",
  "Grandfather",
  "Grandson",
  "Granddaughter",
  "Friend",
  "Best Friend",
  "Colleague",
  "Manager",
  "Client",
  "Coworker",
  "Relative",
  "Cousin",
  "Uncle",
  "Aunt",
  "Niece",
  "Nephew",
  "Neighbor",
  "Other",
];

// Every relationship a contact can have is grouped under one of the four
// category tabs on the Contacts page. Matching is keyword-based rather than
// an exact-string lookup, so a freely typed relationship like "Daughter" or
// "Wife" still lands under Family even though it isn't spelled exactly like
// one of the RELATIONSHIP_OPTIONS suggestions above — the datalist only
// suggests values, it never restricts what someone can type.
const RELATIONSHIP_KEYWORDS: Record<string, string[]> = {
  family: [
    "spouse", "wife", "husband", "partner",
    "mother", "mom", "mum", "father", "dad", "papa", "parent",
    "son", "daughter", "child", "kid",
    "sibling", "brother", "sister",
    "grandparent", "grandmother", "grandma", "grandfather", "grandpa",
    "grandson", "granddaughter", "grandchild",
  ],
  friends: ["friend", "bestie", "buddy", "pal"],
  colleagues: ["colleague", "coworker", "co-worker", "manager", "boss", "client", "teammate"],
  relatives: ["relative", "cousin", "uncle", "aunt", "niece", "nephew", "in-law", "inlaw", "step"],
};

// Contacts whose relationship is empty, or doesn't match any of the keyword
// groups above (e.g. "Neighbor", or something fully custom), fall through to
// null — the Contacts page shows those under the "Others" tab.
export function relationshipCategory(relationship: string | null | undefined): string | null {
  const value = (relationship || "").trim().toLowerCase();
  if (!value) return null;
  for (const key of Object.keys(RELATIONSHIP_KEYWORDS)) {
    const matched = RELATIONSHIP_KEYWORDS[key].some((word) => new RegExp(`\\b${word}\\b`).test(value));
    if (matched) return key;
  }
  return null;
}
