// src/generator/generator.js

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function leetify(word) {
  return word
    .replace(/a/gi, '4')
    .replace(/e/gi, '3')
    .replace(/i/gi, '1')
    .replace(/o/gi, '0')
    .replace(/s/gi, '$');
}

function shuffleArray(array) {
  return array
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function generateCoolName({ trait, animal, hobby, color, number }) {
  const prefixes = ['X', 'Pro', 'Neo', 'Dark', 'Mega', 'Ultra', 'Cyber', 'Shadow', 'Alpha'];
  const suffixes = ['X', 'ify', 'Nova', 'zy', 'ox', 'tron', 'byte', 'core', 'storm'];

  let baseWords = [trait, animal, hobby, color].filter(Boolean);
  baseWords = shuffleArray(baseWords);

  const chosenWords = baseWords.slice(0, Math.floor(Math.random() * 2) + 1);

  let core = chosenWords.join('');
  core = leetify(core);

  core = core.charAt(0).toUpperCase() + core.slice(1);

  const name =
    getRandomElement(prefixes) +
    core +
    (number || '') +
    getRandomElement(suffixes);

  return name;
}

function generateMultipleUsernames(userInput, count = 5) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(generateCoolName(userInput));
  }
  return results;
}

export { generateMultipleUsernames };

