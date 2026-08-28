import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const geminiKey = process.env.GEMINI_API_KEY || '';

async function listModels() {
  console.log('Querying available models with key...');
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
    console.log('Available models:', res.data.models?.map((m: any) => m.name));
  } catch (err: any) {
    console.error('List models error:', err.response?.data || err.message);
  }
  process.exit(0);
}

listModels();
