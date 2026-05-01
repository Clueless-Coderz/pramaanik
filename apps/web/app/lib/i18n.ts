// ─── PRAMAANIK i18n — Lightweight translation system ─────────────────────
// No external dependency needed for a simple two-locale setup.

export type Locale = "en" | "hi";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    "app.title": "PRAMAANIK",
    "app.subtitle": "Public Fund Transparency Platform",
    "citizen.title": "Citizen Audit Portal",
    "citizen.subtitle": "Track any sanctioned rupee from Consolidated Fund to your doorstep · Gasless transactions via ERC-4337",
    "citizen.search.title": "Follow the Money — Trace a Fund Flow",
    "citizen.search.placeholder": "Enter scheme name, transaction ID, or district...",
    "citizen.search.button": "Trace Fund Flow",
    "citizen.trace.title": "Fund Flow Trace",
    "citizen.trace.verified": "All steps cryptographically verified · Merkle proof anchored to Polygon Amoy & Ethereum Sepolia",
    "citizen.benefits.title": "My Benefits",
    "citizen.benefits.verified": "Verified via Privado ID",
    "citizen.grievance.title": "File an On-Chain Grievance",
    "citizen.grievance.description": "Your grievance is recorded immutably on the blockchain. It cannot be deleted or tampered with. Gas fees are sponsored — you pay nothing.",
    "citizen.grievance.select": "Select Scheme",
    "citizen.grievance.placeholder": "Describe your grievance...",
    "citizen.grievance.submit": "Submit Grievance (Gasless)",
    "citizen.schemes.title": "Active Government Schemes",
    "citizen.schemes.name": "Scheme",
    "citizen.schemes.ministry": "Ministry",
    "citizen.schemes.budget": "Sanctioned Budget",
    "citizen.schemes.beneficiaries": "Beneficiaries",
    "citizen.schemes.disbursed": "Disbursed",
    "citizen.schemes.trace": "Trace",
    "stage.sanctioned": "Sanctioned",
    "stage.releasedToState": "Released to State Treasury",
    "stage.releasedToAgency": "Released to Agency",
    "stage.releasedToBeneficiary": "Released to Beneficiary",
    "status.received": "Received",
    "status.pending": "Pending",
    "lang.switch": "हिंदी",
  },
  hi: {
    "app.title": "प्रमाणिक",
    "app.subtitle": "सार्वजनिक कोष पारदर्शिता मंच",
    "citizen.title": "नागरिक लेखापरीक्षा पोर्टल",
    "citizen.subtitle": "समेकित निधि से आपके द्वार तक — हर स्वीकृत रुपये को ट्रैक करें · ERC-4337 के माध्यम से गैसलेस लेनदेन",
    "citizen.search.title": "पैसे का पीछा करें — फंड फ्लो ट्रेस करें",
    "citizen.search.placeholder": "योजना का नाम, लेनदेन आईडी, या जिला दर्ज करें...",
    "citizen.search.button": "फंड फ्लो ट्रेस करें",
    "citizen.trace.title": "फंड फ्लो ट्रेस",
    "citizen.trace.verified": "सभी चरण क्रिप्टोग्राफ़िक रूप से सत्यापित · मर्कल प्रूफ Polygon Amoy और Ethereum Sepolia पर एंकर किया गया",
    "citizen.benefits.title": "मेरे लाभ",
    "citizen.benefits.verified": "Privado ID द्वारा सत्यापित",
    "citizen.grievance.title": "ऑन-चेन शिकायत दर्ज करें",
    "citizen.grievance.description": "आपकी शिकायत ब्लॉकचेन पर अपरिवर्तनीय रूप से दर्ज की जाती है। इसे हटाया या बदला नहीं जा सकता। गैस शुल्क प्रायोजित है — आपको कुछ भी भुगतान नहीं करना है।",
    "citizen.grievance.select": "योजना चुनें",
    "citizen.grievance.placeholder": "अपनी शिकायत का वर्णन करें...",
    "citizen.grievance.submit": "शिकायत दर्ज करें (गैसलेस)",
    "citizen.schemes.title": "सक्रिय सरकारी योजनाएँ",
    "citizen.schemes.name": "योजना",
    "citizen.schemes.ministry": "मंत्रालय",
    "citizen.schemes.budget": "स्वीकृत बजट",
    "citizen.schemes.beneficiaries": "लाभार्थी",
    "citizen.schemes.disbursed": "वितरित",
    "citizen.schemes.trace": "ट्रेस करें",
    "stage.sanctioned": "स्वीकृत",
    "stage.releasedToState": "राज्य कोषागार को जारी",
    "stage.releasedToAgency": "एजेंसी को जारी",
    "stage.releasedToBeneficiary": "लाभार्थी को जारी",
    "status.received": "प्राप्त",
    "status.pending": "लंबित",
    "lang.switch": "English",
  },
};

export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

export function getLocales(): { code: Locale; label: string }[] {
  return [
    { code: "en", label: "English" },
    { code: "hi", label: "हिंदी" },
  ];
}
