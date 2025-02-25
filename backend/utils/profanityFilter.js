const profanityList = [
  'badword1',
  'badword2',
  "amputa",
  "animal ka",
  "bilat",
  "binibrocha",
  "bobo",
  "bogo",
  "boto",
  "brocha",
  "burat",
  "bwesit",
  "bwisit",
  "demonyo ka",
  "diabolical",
  "demonic",
  "engot",
  "etits",
  "gaga",
  "gagi",
  "gago",
  "habal",
  "hayop ka",
  "hayup",
  "hinampak",
  "hinayupak",
  "hindot",
  "hindutan",
  "hudas",
  "iniyot",
  "inutel",
  "inutil",
  "iyot",
  "kagaguhan",
  "kagang",
  "kantot",
  "kantotan",
  "kantut",
  "kantutan",
  "kaululan",
  "kayat",
  "kiki",
  "kikinginamo",
  "kingina",
  "kupal",
  "leche",
  "leching",
  "lechugas",
  "lintik",
  "nakakaburat",
  "nimal",
  "ogag",
  "olok",
  "pakingshet",
  "pakshet",
  "pakyu",
  "pesteng yawa",
  "poke",
  "poki",
  "pokpok",
  "poyet",
  "pu'keng",
  "pucha",
  "puchanggala",
  "puchangina",
  "puke",
  "puki",
  "pukinangina",
  "puking",
  "punyeta",
  "puta",
  "putang",
  "putang ina",
  "putangina",
  "putanginamo",
  "putaragis",
  "putragis",
  "puyet",
  "ratbu",
  "shunga",
  "sira ulo",
  "siraulo",
  "suso",
  "susu",
  "tae",
  "taena",
  "tamod",
  "tanga",
  "tangina",
  "taragis",
  "tarantado",
  "tete",
  "teti",
  "timang",
  "tinil",
  "tite",
  "titi",
  "tungaw",
  "ulol",
  "ulul",
  "ungas"
];

// Words that should be allowed even if they contain bad words
const whitelist = [
  'assembly',
  'class',
  // Add more whitelisted words here
];

const profanityFilter = {
  isProfane(text) {
    if (!text) return false;
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => 
      !whitelist.includes(word) && 
      profanityList.some(badWord => word.includes(badWord))
    );
  },

  clean(text) {
    if (!text) return text;
    let cleaned = text;
    profanityList.forEach(word => {
      const regex = new RegExp(word, 'gi');
      cleaned = cleaned.replace(regex, '*'.repeat(word.length));
    });
    return cleaned;
  }
};

module.exports = profanityFilter;
