function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function formatUsername(adjective, noun, number, style = 'camelCase') {
  const adj = capitalize(adjective);
  const nou = capitalize(noun);
  const num = number ? number.toString() : '';

  switch (style) {
    case 'camelCase':
      return adj + nou + num;
    case 'snake_case':
      return `${adjective.toLowerCase()}_${noun.toLowerCase()}${num}`;
    case 'kebab-case':
      return `${adjective.toLowerCase()}-${noun.toLowerCase()}${num}`;
    case 'UPPERCASE':
      return (adjective + noun + num).toUpperCase();
    default:
      return adj + nou + num;
  }
}

function generateUsername(userInput) {
  const { traits, favoriteAnimal, luckyNumber, style } = userInput;

  if (!traits || traits.length === 0 || !favoriteAnimal) {
    return 'Manglende input';
  }

  const trait = Array.isArray(traits)
    ? traits[Math.floor(Math.random() * traits.length)]
    : traits;

  return formatUsername(trait, favoriteAnimal, luckyNumber, style);
}

export { generateUsername };
