// The rules that decide what enters the corpus, in one testable place.
//
// WHY THIS EXISTS. Measured 2026-08-06: build-want-list.mjs gained two rules in
// one day — an age-based rights upgrade and an archival-correspondence filter —
// and NEITHER could be tested. Both lived inside a script that fetches from the
// Internet Archive at import time, so there was no way to assert their behaviour
// without a network round-trip.
//
// These are the highest-consequence rules in the repo: one decides the RIGHTS
// BASIS on which a book is admitted, the other decides whether an item is a book
// at all. "Cannot be pointed at a fixture" is the defect class that has cost the
// most here, and it had reached the rights layer.
//
// PRECEDENT: lib/vault-paths.mjs after eight hardcoded paths, lib/claim-paths.mjs
// after five claim mis-keys, lib/snapshot-paths.mjs after four snapshot mis-keys.
// Same mechanism, fourth application.

// A work published before 1929 is public domain in the US whatever an uploader
// typed in the rights field.
export const PD_BY_AGE_BEFORE = 1929;

// Upgrades ONLY bare-assertion — a grade that already means "the metadata says
// public domain, with no formal designation behind it". It never promotes
// 'none' (metadata says nothing) or 'not-a-designation' (metadata says something
// that is not a rights grant), because age cannot substitute for evidence that
// was never offered.
//
// Deliberately conservative on missing data: no year means no upgrade.
//
// Measured on the ninth want-list: 538 of 1,076 bare-assertion items were
// pre-1929, ranging 1611-1928. On the eighth list only 15 of 2,761 were — so
// this admits a real population without touching the modern uploads the grade
// exists to catch.
export function ageSettled(year, grade) {
  if (grade !== 'bare-assertion') return grade;
  if (!Number.isFinite(year) || year <= 0) return grade;
  return year < PD_BY_AGE_BEFORE ? 'age-settled' : grade;
}

// Archival correspondence: "Letter(s) to/from ... <year>".
//
// Requires a YEAR, not merely the word "letter". Measured 2026-08-06:
// "Vegetable Growers' News Letter" is a printed periodical and must survive,
// while "William Cheyney Letter to son 1892-05-16" is a handwritten page with no
// usable OCR layer.
//
// Validated against two real manifests: 87 correct skips, 1 miss, and the 13
// apparent false positives were all Cheyney letters that should be skipped too.
// Zero real books excluded.
export const CORRESPONDENCE_TITLE = /\bletters?\s+(to|from)\b.*(\d{4}-\d{2}-\d{2}|\b\d{4}\b)/i;

// KNOWN LIMIT, measured rather than assumed. A published epistolary work titled
// "Letters from an American Farmer 1782" would match this and be skipped. That
// shape does NOT occur in the data: of 121 items the rule excluded on the ninth
// want-list, ZERO have a title beginning "Letters from/to" — every one is the
// archival form, "<Name> Letter to <person> <date>".
//
// So the narrower rule that would fix it (requiring the letter phrase not to
// start the title) is unnecessary today. Recorded here so that if a published
// epistolary work is ever wrongly skipped, the fix is already identified rather
// than rediscovered.
export function isCorrespondence(title) {
  return CORRESPONDENCE_TITLE.test(String(title || ''));
}

// A STREET ADDRESS IS A PHOTOGRAPH, NOT A BOOK. Measured 2026-08-06: a batch of
// 200 returned 123 OK and 77 NO_TEXT, and every one of the 77 was either a court
// filing or a property photograph — "3733 Chevy Chase Drive, La Cañada
// Flintridge, California (front view)". The Architecture subject pulled in a
// photographic survey.
//
// 91 of 579 eligible items (15%) carry a street-address title. Checked for false
// positives across the whole list: 365 matches, and ZERO are books — every one
// belongs to the same survey.
//
// Anchored at the START and requiring a street-type word, so "84 Charing Cross
// Road" as a book title would still need a leading house number AND a street
// word to match — and a title like "Roads and Bridges of Devon" cannot, because
// it does not begin with a number.
const STREET_ADDRESS_TITLE = /^\d+\s+\w.*\b(street|drive|boulevard|avenue|road|lane|court|place|way)\b/i;

export function isStreetAddress(title) {
  return STREET_ADDRESS_TITLE.test(String(title || '').trim());
}

// One predicate for every caller: an item that is not a book, whatever the
// reason. Callers should use this rather than the individual rules, so a new
// exclusion reaches every call site by construction — the mistake made with the
// correspondence rule, which had to be added to the index builder separately
// after it was already in the want-list builder.
// A COURT DOCKET SPLIT ACROSS 52 PARTS IS NOT 52 BOOKS. Measured 2026-08-06:
// "People v. Gold Run (Part 49 of 52) - Order Extending time" and 48 siblings.
// Requires BOTH the "v." case-name form and an explicit part-of-N, so a book
// titled "Part 2 of the Gardener's Kalendar" cannot match.
const COURT_FILING_TITLE = /\bv\.\s+\w+.*\(part \d+ of \d+\)/i;

// A PHOTOGRAPH DESCRIBED BY ITS VIEW. The street-address rule missed these:
// "Mediterranean Style Home, Flintridge, California (front view)" names a style,
// not an address. The tell is the parenthetical view-note that a catalogue adds
// to a photograph and never to a book.
//
// Checked across the whole want-list: 17 matches, every one a California home
// from the same survey. Zero books.
const PHOTO_VIEW_TITLE = /\((front|side|rear|interior|exterior|view|detail)[^)]*\)/i;

export function isCourtFiling(title) {
  return COURT_FILING_TITLE.test(String(title || ''));
}

export function isPhotograph(title) {
  return PHOTO_VIEW_TITLE.test(String(title || ''));
}

// COLLECTIONS THAT HAVE NEVER YIELDED A USABLE TEXT.
//
// Measured 2026-08-06 across every manifest, by identifier prefix:
//
//   calcflh    0 usable of 128 attempted    ( 0%)
//   caggljhs  13 usable of 100 attempted    (13%)  — and all 13 are OCR of
//                                                    handwriting, excluded by
//                                                    the correspondence rule
//
// This is a stronger signal than any title pattern, and I reached it only after
// writing FOUR title rules that each removed one shape of the same collection
// and revealed the next: correspondence, street address, court filing, photo
// view-note. Titles describe items; a prefix describes the SOURCE — and the
// source is what has no text layer.
//
// Empirical, not a guess: each prefix is here because its measured success rate
// over 100+ real fetch attempts is at or near zero. A collection that starts
// producing usable text should be removed, and the count above is the evidence
// to re-check.
const BARREN_COLLECTIONS = ['calcflh', 'caggljhs'];

export function isBarrenCollection(identifier) {
  const id = String(identifier || '');
  return BARREN_COLLECTIONS.some((p) => id.startsWith(p));
}

// TITLE-BASED rules only. Callers with an identifier should ALSO check
// isBarrenCollection — kept separate because one takes a title and the other an
// identifier, and merging them would make the argument ambiguous.
export function isNotABook(title) {
  return isCorrespondence(title) || isStreetAddress(title)
    || isCourtFiling(title) || isPhotograph(title);
}
