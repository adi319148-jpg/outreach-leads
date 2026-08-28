import { GoogleGenerativeAI } from '@google/generative-ai';
import { setSetting } from './services/settingsService';
import dotenv from 'dotenv';
dotenv.config();

const geminiKey = process.env.GEMINI_API_KEY || '';

async function test() {
  console.log('1. Saving Gemini Key in database...');
  await setSetting('geminiApiKey', geminiKey);
  console.log('Saved to DB.');

  console.log('\n2. Testing Gemini API call with key...');
  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Write a 1-sentence hello outreach greeting.');
    const response = await result.response;
    console.log('Gemini API response success:');
    console.log(response.text());
  } catch (err: any) {
    console.error('Gemini API test error:', err.message);
  }
  process.exit(0);
}

test().catch(console.error);
