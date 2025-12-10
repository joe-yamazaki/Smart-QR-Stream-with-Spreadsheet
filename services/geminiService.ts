import { GoogleGenAI } from "@google/genai";
import { ScannedItem } from "../types";

export const analyzeScannedItems = async (items: ScannedItem[]): Promise<string> => {
  if (!process.env.API_KEY) {
    return "API Key not configured. Unable to analyze.";
  }

  if (items.length === 0) {
    return "No items to analyze.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare the list for the prompt
    const contentList = items.map(item => `- ${item.content} (scanned at ${new Date(item.timestamp).toLocaleTimeString()})`).join("\n");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `I have scanned the following list of QR codes/Barcodes. Please provide a concise summary of what these items likely are. 
      Are they URLs, product codes, inventory IDs, or mixed? 
      If they are URLs, what kind of sites? 
      Format the response as a helpful insight for the user.
      
      List:
      ${contentList}`,
      config: {
        systemInstruction: "You are a helpful assistant analyzing a batch of scanned QR codes.",
      }
    });

    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Failed to analyze items. Please try again.";
  }
};