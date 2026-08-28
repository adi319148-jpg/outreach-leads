import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const geminiKey = process.env.GEMINI_API_KEY || '';

async function testGeneration() {
  console.log('Testing generateContent with gemini-3.6-flash...');
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
  const result = await model.generateContent('Write a friendly 30-word cold outreach message to an Italian restaurant.');
  const response = await result.response;
  console.log('\n--- LIVE AI PITCH GENERATED ---');
  console.log(response.text());
  process.exit(0);
}

testGeneration().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
