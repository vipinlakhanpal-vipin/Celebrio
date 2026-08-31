/**
 * Template-based greeting message generator. This is the default/free path
 * (no API key required). When ANTHROPIC_API_KEY is configured, the
 * "Regenerate with Aria" action in the Approvals screen can produce a more
 * personalized version instead (see lib/greetings/ariaRewrite.ts).
 */

type Bucket = "family" | "romantic" | "close-friend" | "friend" | "work" | "general";

function bucketFor(relationship: string | null): Bucket {
  const r = (relationship || "").toLowerCase();
  if (/spouse|partner|wife|husband|girlfriend|boyfriend|fianc/.test(r)) return "romantic";
  if (/mother|father|mom|dad|sister|brother|sibling|son|daughter|grandma|grandpa|grandparent|aunt|uncle|cousin|relative|family/.test(r))
    return "family";
  if (/best friend|bestie|bff/.test(r)) return "close-friend";
  if (/friend|neighbor/.test(r)) return "friend";
  if (/colleague|manager|boss|client|coworker|co-worker|work/.test(r)) return "work";
  return "general";
}

const BIRTHDAY_TEMPLATES: Record<Bucket, string[]> = {
  romantic: [
    "Happy birthday to the love of my life, {name}! 🎉 Grateful for every single day with you — here's to another year of us.",
    "Happy birthday, {name}! You make every day feel like a celebration. I love you more than words can say. 💛",
  ],
  family: [
    "Happy birthday, {name}! Wishing you a day filled with love, laughter, and everything that makes you happy. Love you always!",
    "Happy birthday to an amazing {relationshipLower}! {name}, thank you for everything you do — hope your day is as wonderful as you are.",
  ],
  "close-friend": [
    "Happy birthday to my favorite person, {name}! 🎂 So lucky to have you in my life — let's celebrate soon!",
    "Happiest of birthdays, {name}! Here's to more laughs, memories, and everything in between. Love you!",
  ],
  friend: [
    "Happy birthday, {name}! Hope your day is filled with all your favorite things. Have a great one! 🎉",
    "Wishing you the happiest birthday, {name}! Hope this year brings you everything you're hoping for.",
  ],
  work: [
    "Happy birthday, {name}! Wishing you a fantastic day and an even better year ahead. 🎉",
    "Happy birthday, {name}! Hope you get to celebrate in style today — enjoy!",
  ],
  general: [
    "Happy birthday, {name}! Wishing you a wonderful day and a great year ahead. 🎉",
    "Happy birthday, {name}! Hope your day is filled with joy and celebration.",
  ],
};

const ANNIVERSARY_TEMPLATES: string[] = [
  "Happy anniversary, {name}! Wishing you both continued love and happiness together. 💕",
  "Happy anniversary, {name}! Celebrating you today — here's to many more years together.",
];

const HOLIDAY_TEMPLATES: Record<Bucket, string[]> = {
  romantic: [
    "Happy {occasion}, {name}! So grateful to celebrate this one with you. Love you.",
    "Happy {occasion}, {name} — you make everything better. Can't wait to celebrate together.",
  ],
  family: [
    "Happy {occasion}, {name}! Sending you so much love today.",
    "Wishing you a wonderful {occasion}, {name} — thinking of you today!",
  ],
  "close-friend": [
    "Happy {occasion}, {name}! Hope your day is amazing — let's celebrate soon!",
    "Happy {occasion} to my favorite person, {name}! 🎉",
  ],
  friend: [
    "Happy {occasion}, {name}! Hope you have a great one.",
    "Wishing you a happy {occasion}, {name}!",
  ],
  work: [
    "Happy {occasion}, {name}! Hope you get to enjoy the day.",
    "Happy {occasion}, {name} — hope it's a great one!",
  ],
  general: [
    "Happy {occasion}, {name}! Wishing you all the best today.",
    "Happy {occasion}, {name}!",
  ],
};

export function generateGreetingMessage(name: string, relationship: string | null): string {
  const bucket = bucketFor(relationship);
  const options = BIRTHDAY_TEMPLATES[bucket];
  const template = options[Math.floor(Math.random() * options.length)];
  return fill(template, name, relationship);
}

export function generateAnniversaryMessage(name: string, relationship: string | null): string {
  const template = ANNIVERSARY_TEMPLATES[Math.floor(Math.random() * ANNIVERSARY_TEMPLATES.length)];
  return fill(template, name, relationship);
}

export function generateHolidayMessage(name: string, relationship: string | null, occasionName: string): string {
  const bucket = bucketFor(relationship);
  const options = HOLIDAY_TEMPLATES[bucket];
  const template = options[Math.floor(Math.random() * options.length)];
  return fill(template, name, relationship).replaceAll("{occasion}", occasionName);
}

function fill(template: string, name: string, relationship: string | null): string {
  const firstName = name.split(" ")[0];
  return template
    .replaceAll("{name}", firstName)
    .replaceAll("{relationshipLower}", (relationship || "person").toLowerCase());
}
