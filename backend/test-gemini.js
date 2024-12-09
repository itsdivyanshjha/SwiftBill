require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genai.getGenerativeModel({ model: "gemini-1.5-pro" });

  try {
    const result = await model.generateContent('Hello, can you hear me?');
    console.log('Response:', result.response.text());
  } catch (error) {
    console.error('Error:', error);
  }
}

testGemini(); 