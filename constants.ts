
import { Tag } from './types';

export const INITIAL_TAGS: Tag[] = [
  { id: '1', name: 'AI & Tech', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: '2', name: 'Mechanical', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: '3', name: 'Business', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: '4', name: 'Daily', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

export const MOCK_BLOG_POST = {
  title: "The Future of Generative AI in Professional Engineering",
  url: "https://tech-blog.example/generative-ai-engineering",
  content: `Generative Artificial Intelligence is no longer just a buzzword; it is becoming a foundational substrate for modern engineering. Whether it is optimizing structural designs using evolutionary algorithms or synthesizing complex codebases, AI is augmenting human capability at an unprecedented pace. 

However, practitioners must remain vigilant about the hallucinations and stochastic nature of these large language models. The integration of deterministic mechanical principles with probabilistic neural networks represents the next frontier in robust system design. 

As we move forward, the synergy between disparate domains—computer science, fluid dynamics, and thermodynamics—will be facilitated by these advanced cognitive tools. Learning the nomenclature of this new era is the first step for any aspiring professional.`
};
