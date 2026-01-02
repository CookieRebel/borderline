export const generateFantasyName = () => {
    const adjectives = ["charming", "crazy", "juicy", "smart", "wild", "mysterious", "cosmic", "brave", "neon", "heroic"];
    const nouns = ["voyager", "nomad", "maverick", "titan", "phoenix", "cipher", "pilot", "ranger", "scout", "driver"];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    return `${adj.charAt(0).toUpperCase() + adj.slice(1)}${noun.charAt(0).toUpperCase() + noun.slice(1)}${num}`;
};
