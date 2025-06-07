
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
      // Capture the full response from ai.generate for comprehensive logging if issues occur.
      const generationResponse = await ai.generate({
        // IMPORTANT: ONLY the googleai/gemini-2.0-flash-exp model is able to generate images. You MUST use exactly this model to generate images.
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: input.prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
        },
      });

      const media = generationResponse.media;

      if (media && typeof media.url === 'string' && media.url.startsWith('data:image/')) {
        return { imageUrl: media.url };
      } else {
        // Log the entire response from ai.generate for detailed debugging.
        console.error(
          'Image generation did not produce a valid media object. Full AI response:',
          JSON.stringify(generationResponse, null, 2)
        );

        let specificErrorDetail = 'The AI model did not return a valid image data URI.';
        if (!media) {
          specificErrorDetail = 'The AI model did not return any media content. This could be due to safety filters, an issue with the prompt, or a service problem.';
        } else if (typeof media.url !== 'string') {
          specificErrorDetail = 'The AI model returned media content, but its URL is not in the expected string format.';
        } else if (!media.url.startsWith('data:image/')) {
          specificErrorDetail = `The AI model returned a URL, but it was not a valid image data URI (e.g., starting with 'data:image/...'). Received prefix: '${media.url.substring(0, 30)}...'`;
        }
        throw new Error(`Image Generation Failed: ${specificErrorDetail}`);
      }
    } catch (error: any) {
      console.error('An error occurred during the image generation process in the AI flow:', error);
      // Propagate a user-friendly message, including the original one if available.
      const message = error.message || 'An unknown error occurred while communicating with the AI model.';
      throw new Error(`AI Service Error: ${message}`);
    }
  }
);

