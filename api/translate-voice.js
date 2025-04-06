import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import multer from 'multer';
import nextConnect from 'next-connect';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const apiRoute = nextConnect({
  onError(error, req, res) {
    console.error(error);
    res.status(500).end("Something went wrong.");
  },
  onNoMatch(req, res) {
    res.status(405).end("Method Not Allowed");
  },
});

apiRoute.use(upload.single("audio"));

apiRoute.post(async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No audio file uploaded.");
  }

  try {
    const tempFilePath = path.join(os.tmpdir(), 'temp_audio.webm');
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
    });

    const transcript = transcription.text || "No transcription available.";
    const brailleTranslation = await translateTextToBraille(transcript);

    fs.unlinkSync(tempFilePath);

    res.status(200).json({ braille: brailleTranslation });
  } catch (error) {
    console.error("Error processing audio:", error.message);
    res.status(500).send("Error processing audio.");
  }
});

async function translateTextToBraille(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a Braille translator. Only respond with the translated text." },
        { role: "user", content: `Translate the following text into Braille: ${text}` },
      ],
    });

    return response.choices[0]?.message?.content || "No translation available.";
  } catch (error) {
    console.error("Error translating text to Braille:", error.message);
    throw new Error("Error translating text to Braille.");
  }
}

export default apiRoute;
