
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
      const desiredQualities = [
        "outstanding",
        "eye-catching",
        "vibrant",
        "youthful",
        "attention-grabbing",
        "attractive",
        "hookable",
        "photorealistic",
        "highly detailed",
        "high quality",
        "professional photography",
        "dynamic composition",
        "cinematic lighting"
      ].join(", ");

      const fullPrompt = `Image requirements: ${desiredQualities}. User prompt: "${input.prompt}". Aspect ratio: ${input.aspectRatio || '1:1'}`;
      console.log("Full prompt being sent to AI:", fullPrompt);


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
        let detailForError = '';

        if (generationResponse && typeof generationResponse === 'object' && (generationResponse as any).error) {
          const errDetails = (generationResponse as any).error;
          let message = errDetails.message || 'Unknown error from AI service';
          if (errDetails.status) message += ` (Status: ${errDetails.status})`;
          if (errDetails.code) message += ` (Code: ${errDetails.code})`;
          detailForError = `The AI service returned a direct error: ${message}. Please critically review your GOOGLE_API_KEY, ensure billing is active, and required Google Cloud APIs (like Vertex AI) are enabled. Check server logs for the full response.`;
        } else if (!media) {
          detailForError = 'The AI model did not return any media content.';
          if (generationResponse && Array.isArray(generationResponse.candidates)) {
            if (generationResponse.candidates.length > 0) {
              const firstCandidate = generationResponse.candidates[0];
              let candidateSpecificMessage = '';
              if (firstCandidate.finishReason && firstCandidate.finishReason !== 'STOP' && firstCandidate.finishReason !== 'UNSPECIFIED') {
                candidateSpecificMessage = `Model processing stopped (reason: ${firstCandidate.finishReason}`;
                if (firstCandidate.finishMessage) {
                  candidateSpecificMessage += ` - "${firstCandidate.finishMessage}"`;
                }
                candidateSpecificMessage += ').';
              } else {
                candidateSpecificMessage = 'The model provided candidate(s) but no specific error/finish reason for not returning an image.';
              }
              detailForError += ` ${candidateSpecificMessage} This often relates to safety filters or prompt content. Also, re-verify API key/billing. Please check server logs.`;
            } else {
              detailForError += ' The model returned no candidates/choices in its response (e.g., all candidates might have been filtered by safety settings). This could indicate a problem with the prompt content or very strict safety settings. Check server logs.';
            }
          } else {
            detailForError += ' The AI response was incomplete or structured unexpectedly (e.g., missing \'candidates\' data). This strongly suggests an issue with your GOOGLE_API_KEY, billing status, or enabled Google Cloud APIs. Please verify these and check server logs for the raw response.';
          }
        } else if (media && typeof media.url !== 'string') {
          detailForError = 'The AI model returned media, but its URL is not a string. Check server logs for the response structure.';
        } else if (media && !media.url.startsWith('data:image/')) {
          detailForError = `The AI model returned a URL, but it's not a valid image data URI. Received: '${media.url.substring(0,60)}...'. Check server logs.`;
        } else {
          detailForError = 'An unknown issue occurred with the image data after it was received from the AI. Check server logs.';
        }
        
        console.error(
          'Image generation did not produce a valid media object or the response was unexpected. Full AI response:',
          JSON.stringify(generationResponse, null, 2)
        );
        throw new Error(`Image Generation Failed: ${detailForError}`);
      }
    } catch (error: any) {
      console.error('An error occurred during the image generation process in the AI flow:', error);
      if (error.message && error.message.startsWith('Image Generation Failed:')) {
          throw error;
      }
      const message = error.message || 'An unknown error occurred while communicating with the AI model.';
      throw new Error(`AI Service Error: ${message}`);
    }
  }
);
