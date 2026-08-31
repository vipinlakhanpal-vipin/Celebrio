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
  "Spouse / Partner",
  "Mother",
  "Father",
  "Sibling",
  "Child",
  "Grandparent",
  "Friend",
  "Best Friend",
  "Colleague",
  "Manager",
  "Client",
  "Relative",
  "Neighbor",
  "Other",
];

export const RELATIONSHIP_CATEGORIES: Record<string, string[]> = {
    family: ["Spouse / Partner", "Mother", "Father", "Sibling", "Child", "Grandparent"],
    friends: ["Friend", "Best Friend"],
    colleagues: ["Colleague", "Manager", "Client"],
    relatives: ["Relative"],
};

export function relationshipCategory(relationship: string | null | undefined): string | null {
    if (!relationship) return null;
    const value = relationship.trim().toLowerCase();
    for (const key of Object.keys(RELATIONSHIP_CATEGORIES)) {
          if (RELATIONSHIP_CATEGORIES[key].some((option) => option.toLowerCase() === value)) {
                  return key;
          }
    }
    return null;
}
