
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

        let detailForError = '';

        if (!media) {
          detailForError = 'The AI model did not return any media content.';
          
          if (generationResponse && Array.isArray(generationResponse.candidates) && generationResponse.candidates.length > 0) {
            const firstCandidate = generationResponse.candidates[0];
            let candidateSpecificMessage = '';
            if (firstCandidate.finishReason && firstCandidate.finishReason !== 'STOP' && firstCandidate.finishReason !== 'UNSPECIFIED') {
              candidateSpecificMessage = `Model processing stopped (reason: ${firstCandidate.finishReason}`;
              if (firstCandidate.finishMessage) {
                candidateSpecificMessage += ` - "${firstCandidate.finishMessage}"`;
              }
              candidateSpecificMessage += ').';
            } else {
              candidateSpecificMessage = 'The model did not provide a specific reason for not returning an image.';
            }
            detailForError += ` ${candidateSpecificMessage} This often relates to safety filters, prompt content, or API/billing issues. Please check server logs for the full AI response.`;
          } else if (generationResponse && Array.isArray(generationResponse.candidates) && generationResponse.candidates.length === 0) {
            detailForError += ' The model returned no candidates/choices in its response. This could indicate a problem with the prompt or service. Check server logs.';
          } else { 
            detailForError += ' The AI response structure was incomplete or unexpected (e.g., missing or invalid \'candidates\' data). Check server logs for the raw response and verify API key/billing.';
          }
        } else if (typeof media.url !== 'string') {
          detailForError = 'The AI model returned media, but its URL is not a string.';
        } else if (!media.url.startsWith('data:image/')) {
          detailForError = `The AI model returned a URL, but it's not a valid image data URI. Received: '${media.url.substring(0,30)}...'`;
        } else {
          detailForError = 'An unknown issue occurred with the media data after it was received.';
        }
        
        throw new Error(`Image Generation Failed: ${detailForError}`);
      }
    } catch (error: any) {
      console.error('An error occurred during the image generation process in the AI flow:', error);
      // If error.message already starts with "Image Generation Failed:", rethrow it directly
      // to avoid double prefixing with "AI Service Error:".
      if (error.message && error.message.startsWith('Image Generation Failed:')) {
          throw error;
      }
      const message = error.message || 'An unknown error occurred while communicating with the AI model.';
      throw new Error(`AI Service Error: ${message}`);
    }
  }
);

