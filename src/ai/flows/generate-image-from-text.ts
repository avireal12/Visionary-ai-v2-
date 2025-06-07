
'use server';
/**
 * @fileOverview An AI agent that generates an image from a text prompt.
 *
 * - generateImage - A function that generates an image from a text prompt.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
  aspectRatio: z.enum(["1:1", "16:9", "9:16"]).optional().default("1:1").describe('The desired aspect ratio for the generated image.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input: GenerateImageInput) => {
    try {
      // Construct the full prompt including aspect ratio information
      const fullPrompt = `${input.prompt}, aspect ratio ${input.aspectRatio || '1:1'}`;

      const generationResponse = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: fullPrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      const media = generationResponse.media;

      if (media && typeof media.url === 'string' && media.url.startsWith('data:image/')) {
        return { imageUrl: media.url };
      } else {
        console.error(
          'Image generation did not produce a valid media object. Full AI response:',
          JSON.stringify(generationResponse, null, 2)
        );

        let specificErrorDetail = 'The AI model did not return a valid image result.';

        if (!media) {
          specificErrorDetail = 'The AI model did not return any media content.';
          const candidates = generationResponse.candidates;
          if (candidates && candidates.length > 0) {
            const firstCandidate = candidates[0];
            if (firstCandidate.finishReason && firstCandidate.finishReason !== 'STOP' && firstCandidate.finishReason !== 'UNSPECIFIED') {
              specificErrorDetail += ` Model processing stopped due to: ${firstCandidate.finishReason}.`;
              if (firstCandidate.finishMessage) {
                  specificErrorDetail += ` Details: "${firstCandidate.finishMessage}".`;
              }
            }
             specificErrorDetail += ' This may be due to safety filters, the nature of the prompt, or API configuration issues (e.g., API key, billing). Please check server logs for the full AI response, which may include safety ratings or other indicators.';
          } else if (candidates && candidates.length === 0) {
              specificErrorDetail += ' The model returned no candidates. This could indicate a problem with the request formatting or the service itself.';
          } else {
              specificErrorDetail += ' The response from the AI model was unexpected. Check server logs for details.';
          }
        } else if (typeof media.url !== 'string') {
          specificErrorDetail = 'The AI model returned media content, but its URL is not in the expected string format.';
        } else if (!media.url.startsWith('data:image/')) {
          specificErrorDetail = `The AI model returned a URL, but it was not a valid image data URI (e.g., starting with 'data:image/...'). Received prefix: '${media.url.substring(0, 30)}...'`;
        }
        throw new Error(`Image Generation Failed: ${specificErrorDetail}`);
      }
    } catch (error: any) {
      console.error('An error occurred during the image generation process in the AI flow:', error);
      const message = error.message || 'An unknown error occurred while communicating with the AI model.';
      throw new Error(`AI Service Error: ${message}`);
    }
  }
);

