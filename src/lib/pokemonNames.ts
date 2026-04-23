/**
 * Canonical list of Pokémon character names used for portfolio indexing.
 * Only includes names that are commonly found on TCG cards.
 * Sorted alphabetically for binary-search friendly usage.
 */
export const POKEMON_NAMES: string[] = [
  'Absol','Aerodactyl','Aggron','Alakazam','Alolan Exeggutor','Alolan Ninetales','Alolan Raichu','Alolan Vulpix',
  'Altaria','Ampharos','Arbok','Arcanine','Arceus','Articuno','Azumarill',
  'Banette','Bastiodon','Bayleef','Beartic','Beautifly','Beedrill','Bellossom','Bewear','Bisharp','Blacephalon',
  'Blastoise','Blaziken','Blissey','Boldore','Boltund','Bruxish','Bulbasaur',
  'Buzzwole','Cacturne','Camerupt','Celebi','Centiskorch','Ceruledge','Chandelure',
  'Chansey','Charizard','Charjabug','Charmander','Charmeleon','Chesnaught','Chikorita','Chimchar',
  'Cinderace','Clefable','Clefairy','Coalossal','Cobalion','Comfey','Copperajah','Corviknight',
  'Crabominable','Cresselia','Croconaw','Crobat','Crustle','Cyndaquil',
  'Darkrai','Decidueye','Dedenne','Deoxys','Dewgong','Dialga','Diancie','Diglett','Ditto',
  'Dodrio','Donphan','Dragonair','Dragonite','Drampa','Drapion','Dratini','Drednaw',
  'Drifblim','Druddigon','Dugtrio','Duraludon','Dusknoir',
  'Eelektross','Eevee','Electivire','Electrode','Emboar','Empoleon','Entei','Espeon',
  'Eternatus','Excadrill','Exeggutor',
  'Falinks','Farigiraf','Fearow','Feraligatr','Flaaffy','Flareon','Flygon','Forretress','Frosmoth','Froslass',
  'Gabite','Gallade','Garchomp','Gardevoir','Gastly','Gastrodon','Gengar','Geodude','Giratina',
  'Glaceon','Glalie','Golduck','Golem','Goodra','Gorebyss','Gothitelle','Granbull','Greninja',
  'Grookey','Groudon','Grovyle','Growlithe','Grumpig','Guzzlord','Gyarados',
  'Hatterene','Haunter','Hawlucha','Haxorus','Heracross','Hitmonchan','Hitmonlee','Hitmontop',
  'Ho-Oh','Honchkrow','Hoopa','Houndoom','Hydreigon','Hypno',
  'Igglybuff','Inceroar','Infernape','Inteleon','Ivysaur',
  'Jigglypuff','Jirachi','Jolteon','Jumpluff','Jynx',
  'Kabutops','Kadabra','Kangaskhan','Kartana','Keldeo','Kingdra','Kingler','Kirlia','Kleavor',
  'Klefki','Kommo-o','Koraidon','Kyogre','Kyurem',
  'Lanturn','Lapras','Latias','Latios','Leafeon','Lickitung','Lilligant','Lopunny',
  'Lucario','Ludicolo','Lugia','Lumineon','Lunala','Luxray',
  'Machamp','Machoke','Machop','Magcargo','Magikarp','Magmortar','Magnemite','Magneton','Magnezone',
  'Malamar','Mamoswine','Manaphy','Manectric','Mantine','Mareep','Marill','Marshadow','Mawile',
  'Medicham','Meganium','Melmetal','Meloetta','Meowscarada','Meowth','Mesprit','Metagross',
  'Metang','Mew','Mewtwo','Mienshao','Mightyena','Milotic','Miltank','Mimikyu','Miraidon',
  'Misdreavus','Mismagius','Moltres','Morpeko','Mr. Mime','Mudkip','Muk','Munchlax','Murkrow','Musharna',
  'Naganadel','Natu','Necrozma','Ninetales','Noctowl','Noivern',
  'Obstagoon','Octillery','Omastar','Onix','Oranguru','Orbeetle','Origin Forme Dialga','Origin Forme Palkia',
  'Palkia','Palossand','Pangoro','Parasect','Pawmot','Persian','Pecharunt','Pheromosa',
  'Pichu','Pidgeot','Pidgey','Pikachu','Pincurchin','Piplup','Politoed','Poliwrath',
  'Polteageist','Porygon','Porygon-Z','Primeape','Primarina','Psyduck',
  'Quagsire','Quaquaval',
  'Raichu','Raikou','Ralts','Rapidash','Rayquaza','Regice','Regieleki','Regirock','Registeel',
  'Reshiram','Reuniclus','Rhydon','Rhyperior','Ribombee','Rillaboom','Roaring Moon','Roserade','Rotom',
  'Sableye','Salamence','Samurott','Sandaconda','Sandslash','Sceptile','Scizor','Scolipede',
  'Scorbunny','Scyther','Seismitoad','Serperior','Seviper','Sharpedo','Shaymin','Shedinja',
  'Sinnoh','Skarmory','Skeledirge','Slowbro','Slowking','Slugma','Smeargle','Sneasel',
  'Snorlax','Snorunt','Sobble','Solgaleo','Spearow','Spiritomb','Squirtle','Staraptor',
  'Starmie','Steelix','Sudowoodo','Suicune','Sunflora','Swalot','Swampert','Sylveon',
  'Tangrowth','Tauros','Teddiursa','Tentacruel','Terrakion','Thundurus','Tinkaton',
  'Togekiss','Togepi','Torterra','Totodile','Toxicroak','Toxtricity','Treecko','Tropius',
  'Turtwig','Typhlosion','Tyranitar','Tyrantrum',
  'Umbreon','Unfezant','Urshifu','Ursaring','Uxie',
  'Vaporeon','Venusaur','Vespiquen','Victini','Vikavolt','Vileplume','Virizion','Volcanion','Volcarona',
  'Wailord','Walrein','Wartortle','Weavile','Weezing','Whimsicott','Whiscash','Wigglytuff','Wobbuffet','Wooloo',
  'Xatu','Xerneas',
  'Yveltal',
  'Zamazenta','Zacian','Zangoose','Zapdos','Zarude','Zekrom','Zeraora','Zoroark','Zygarde',
];

/** Set for O(1) lookup */
export const POKEMON_NAME_SET = new Set(POKEMON_NAMES.map(n => n.toLowerCase()));

/**
 * Extract a known Pokémon character name from a card name.
 * Returns null if no known Pokémon is found.
 */
export function matchPokemonCharacter(cardName: string): string | null {
  if (!cardName) return null;
  const lower = cardName.toLowerCase().trim();

  // Exclude non-Pokemon cards
  if (/\b(code\s*card|energy|trainer|stadium|supporter|item|tool)\b/i.test(lower)) return null;

  // Try matching multi-word names first (longest match)
  // Check for two-word Pokemon at the start of the name
  const words = lower.split(/\s+/);

  // Try 3-word match
  if (words.length >= 3) {
    const three = words.slice(0, 3).join(' ');
    for (const name of POKEMON_NAMES) {
      if (name.toLowerCase() === three) return name;
    }
  }

  // Try 2-word match
  if (words.length >= 2) {
    const two = words.slice(0, 2).join(' ');
    for (const name of POKEMON_NAMES) {
      if (name.toLowerCase() === two) return name;
    }
  }

  // Try first word
  if (words.length >= 1) {
    const first = words[0].replace(/[^a-z'-]/g, '');
    if (first.length < 3) return null;
    for (const name of POKEMON_NAMES) {
      if (name.toLowerCase() === first) return name;
    }
  }

  return null;
}
