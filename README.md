# Smart QR Stream

A continuous QR code scanner built with React and Gemini API.

## Features

- **Continuous Scanning**: Quickly scan multiple QR codes in succession.
- **Batch Metadata**: Set School Name, Grade, Class, and Inputter Name once, and it applies to all subsequent scans.
- **AI Analysis**: Analyze the scanned list using Google's Gemini 2.5 Flash model.
- **CSV Export**: Download scan history as a CSV file compatible with Excel (BOM included).
- **Mobile Optimized**: Designed for handheld use with camera selection and beep feedback.

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Gemini API Key:
   ```
   API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment (Vercel)

1. Push this code to GitHub.
2. Import the project in Vercel.
3. In Vercel Project Settings > Environment Variables, add:
   - Key: `API_KEY`
   - Value: `Your Gemini API Key`
4. Deploy.
