const SLURS = [
  "nigger",
  "niggers",
  "nigga",
  "niggas",
  "faggot",
  "faggots",
  "chink",
  "chinks",
  "gook",
  "gooks",
  "kike",
  "kikes",
  "wetback",
  "wetbacks",
  "raghead",
  "towelhead",
  "beaner",
  "beaners",
  "tranny",
  "trannies",
  "retard",
  "retarded",
];

const WORDS = ["fuck", "fucking", "fucker", "shit", "shitting", "bitch", "bastard", "cunt", "asshole", "slut", "whore", "fag", "fags", "dyke", "dykes", "spic", "spics"];

function plain(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
}

function fold(value) {
  return plain(value)
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]/g, "");
}

function spaced(value) {
  return plain(value)
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

function hasWord(value, word) {
  const letters = word.split("").join("[^a-z]{0,3}");
  const separated = new RegExp(`(^|[^a-z])${letters}([^a-z]|$)`, "i");
  return new RegExp(`\\b${word}\\b`, "i").test(spaced(value)) || separated.test(plain(value));
}

export function bioError(value) {
  const text = String(value ?? "");
  if (!text.trim()) return "";
  if (text.length > 300) return "Bio must be 300 characters or fewer.";
  if (/[<>]/.test(text) || /(?:javascript|data|vbscript)\s*:/i.test(text) || /\bon\w+\s*=/i.test(text)) {
    return "That bio isn't allowed.";
  }
  if (/:\/\//.test(text) || /\bwww\./i.test(text) || /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|gg|xyz|co|me|link|ly|app|dev|site|info|biz|ru)\b/i.test(text)) {
    return "Links aren't allowed in a bio.";
  }
  if (/seed phrase|private key|secret phrase|recovery phrase|mnemonic|keystore/i.test(text)) {
    return "That bio isn't allowed.";
  }
  const compact = fold(text);
  if (SLURS.some((word) => compact.includes(word)) || WORDS.some((word) => hasWord(text, word))) {
    return "That bio isn't allowed.";
  }
  return "";
}
