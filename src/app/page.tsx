
"use client";

import { useState } from "react";
import NextImage from "next/image";
import { Download, Loader2, Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { generateImage, type GenerateImageInput, type GenerateImageOutput } from "@/ai/flows/generate-image-from-text";
import { useToast } from "@/hooks/use-toast";

type AspectRatioOption = "1:1" | "16:9" | "9:16";

// Explicitly define props to make it clear what this component expects (nothing in this case)
// This is a speculative attempt to address the 'params enumeration' warning.
interface VisionaryAIPageProps {};

export default function VisionaryAIPage(props: VisionaryAIPageProps) {
  const [prompt, setPrompt] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("1:1");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a description for the image.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const input: GenerateImageInput = { prompt, aspectRatio };
      const result: GenerateImageOutput = await generateImage(input);
      if (result.imageUrl) {
        if (result.imageUrl.startsWith('data:image/')) {
          setImageUrl(result.imageUrl);
        } else {
          console.warn("Received image URL is not a data URI:", result.imageUrl);
          throw new Error("AI returned an unexpected image format.");
        }
      } else {
        throw new Error("AI did not return an image URL.");
      }
    } catch (e: any) {
      console.error("Error generating image:", e);
      const errorMessage = e.message || "Failed to generate image. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error Generating Image",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;
    const filename = prompt.substring(0, 30).replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'visionary_ai_image';
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 sm:p-6 md:p-8 selection:bg-accent selection:text-accent-foreground">
      <Card className="w-full max-w-2xl shadow-2xl rounded-lg overflow-hidden">
        <CardHeader className="text-center bg-card p-6 sm:p-8 border-b">
          <div className="flex justify-center items-center mb-3">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-headline tracking-tight text-primary">Visionary AI</CardTitle>
          <CardDescription className="text-md sm:text-lg text-muted-foreground pt-2">
            Transform your text prompts into stunning visuals.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="block text-sm font-medium text-foreground">
                Describe the image you want to create:
              </Label>
              <Input
                id="prompt"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A majestic lion wearing a crown in a fantasy forest"
                className="text-base py-3 px-4 focus:ring-accent focus:border-accent"
                disabled={isLoading}
                aria-label="Image description prompt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aspectRatio" className="block text-sm font-medium text-foreground">
                Select Aspect Ratio:
              </Label>
              <Select
                value={aspectRatio}
                onValueChange={(value) => setAspectRatio(value as AspectRatioOption)}
                disabled={isLoading}
              >
                <SelectTrigger id="aspectRatio" className="w-full text-base py-3 px-4 focus:ring-accent focus:border-accent" aria-label="Select aspect ratio">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">Square (1:1)</SelectItem>
                  <SelectItem value="16:9">Landscape (16:9)</SelectItem>
                  <SelectItem value="9:16">Portrait (9:16)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading}
              aria-live="polite"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Your Vision...
                </>
              ) : (
                "Generate Image"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="p-6 sm:p-8 flex flex-col items-center space-y-4 bg-card border-t">
          {isLoading && (
            <div className="w-full aspect-video flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8 text-center min-h-[300px]">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="mt-4 text-lg text-muted-foreground">Crafting your masterpiece...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="w-full aspect-video flex flex-col items-center justify-center bg-destructive/10 rounded-lg p-8 text-center min-h-[300px]">
               <ImageIcon className="h-16 w-16 text-destructive" />
              <p className="mt-4 text-lg font-semibold text-destructive">Oops! Something went wrong.</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          )}

          {!isLoading && !error && imageUrl && (
            <>
              <div className="w-full aspect-video relative rounded-lg overflow-hidden border border-border shadow-md bg-muted/20">
                <NextImage
                  src={imageUrl}
                  alt={prompt || "Generated by Visionary AI"}
                  fill
                  style={{ objectFit: "contain" }}
                  sizes="(max-width: 672px) 100vw, 672px"
                  data-ai-hint="generated art"
                  className="transition-opacity duration-500 opacity-0"
                  onLoadingComplete={(image) => image.classList.remove("opacity-0")}
                />
              </div>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full sm:w-auto py-3 text-base border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                aria-label="Download generated image"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Image
              </Button>
            </>
          )}

          {!isLoading && !error && !imageUrl && (
            <div className="w-full aspect-video flex flex-col items-center justify-center bg-muted/30 rounded-lg p-8 text-center min-h-[300px]">
              <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg text-muted-foreground">Your generated image will appear here.</p>
              <p className="text-sm text-muted-foreground/80">Enter a prompt above and click "Generate Image".</p>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
