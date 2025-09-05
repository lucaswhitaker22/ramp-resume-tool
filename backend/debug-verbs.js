// Debug action verb detection
const nlp = require('compromise');

const strongVerbText = 'Architected scalable solutions and spearheaded development initiatives. Delivered high-performance applications. Optimized system performance. Transformed legacy codebase.';

const doc = nlp(strongVerbText);
const verbs = doc.verbs().out('array');

console.log('Text:', strongVerbText);
console.log('Extracted verbs:', verbs);

const strongActionVerbs = new Set([
  'achieved', 'accelerated', 'accomplished', 'advanced', 'analyzed', 'architected',
  'automated', 'built', 'created', 'delivered', 'designed', 'developed', 'directed',
  'drove', 'enhanced', 'established', 'executed', 'expanded', 'generated', 'implemented',
  'improved', 'increased', 'initiated', 'innovated', 'launched', 'led', 'managed',
  'optimized', 'orchestrated', 'pioneered', 'produced', 'reduced', 'resolved',
  'spearheaded', 'streamlined', 'strengthened', 'transformed', 'upgraded'
]);

const strongVerbs = [];
for (const verb of verbs) {
  const baseVerb = verb.toLowerCase().replace(/ed$|ing$|s$/, '');
  console.log(`Verb: ${verb}, Base: ${baseVerb}, Is strong: ${strongActionVerbs.has(baseVerb)}`);
  
  if (strongActionVerbs.has(baseVerb)) {
    strongVerbs.push(verb);
  }
}

console.log('Strong verbs found:', strongVerbs);