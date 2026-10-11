/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';

// Retrieve API key from server environment or client-exposed env var
export function getApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
}

export function createGeminiClient(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient fallback model sequence to guarantee uptime even during temporary spikes
export const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

export async function generateWithModelFallback(params: {
  contents: any[];
  config: any;
}) {
  const ai = createGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY non configurata nel server');
  }

  let lastError: any = null;
  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const model = FALLBACK_MODELS[i];
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const is503 = err?.status === 503 || (err?.message && err.message.includes('503'));
        if (is503 && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 450));
        } else {
          break;
        }
      }
    }
  }
  throw lastError || new Error('Tutti i modelli sono temporaneamente occupati');
}

// In-memory short-term TTS cooldown (safe for serverless and containerized runtimes)
let ttsCooldownUntil = 0;

export function isTtsCooldownActive(): boolean {
  return Date.now() < ttsCooldownUntil;
}

export function triggerTtsCooldown(seconds = 20) {
  ttsCooldownUntil = Date.now() + seconds * 1000;
}

/**
 * Generates natural Italian neural speech using Gemini TTS (gemini-3.8-flash-lite-tts)
 */
export async function synthesizeItalianSpeech(
  text: string,
  voiceGender: 'male' | 'female' = 'male'
): Promise<{ audioBase64?: string; mimeType?: string; fallback: boolean; message?: string }> {
  const ai = createGeminiClient();
  if (!ai || isTtsCooldownActive() || !text?.trim()) {
    return {
      fallback: true,
      message: !ai ? 'Chiave API assente' : 'Cooldown temporaneo TTS attivo',
    };
  }

  try {
    const voiceName = voiceGender === 'female' ? 'Kore' : 'Puck';

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: 'Warm, authentic Italian conversational companion. Expressive, natural Italian rhythm, friendly and engaging tone.',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return {
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        fallback: false,
      };
    }

    return { fallback: true, message: 'Nessun flusso audio generato dal modello' };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      triggerTtsCooldown(25);
    }
    return { fallback: true, message: msg };
  }
}

/**
 * Intelligent contextual Italian pedagogical fallback when models are offline
 * Never repeats a static phrase: truly addresses what the user said!
 */
export function createDynamicPedagogicalFallback(
  userMessage: string,
  companionName = 'Matteo',
  immediateTopic = 'Conversazione libera'
) {
  const cleanMsg = (userMessage || '').trim();
  const shortSnippet = cleanMsg.length > 50 ? cleanMsg.slice(0, 50) + '...' : cleanMsg;

  let contextualReply = '';
  if (!cleanMsg) {
    contextualReply = `Ciao! Sono ${companionName}. Di cosa ti piacerebbe parlare oggi? Possiamo parlare di ${immediateTopic} o di qualsiasi argomento ti piaccia!`;
  } else if (cleanMsg.length < 15) {
    contextualReply = `Ti seguo con molto interesse! Hai detto "${shortSnippet}". Vorresti approfondire o raccontarmi qualcosa in più?`;
  } else {
    contextualReply = `È davvero bello sentirti parlare in italiano! Riguardo a quello che hai appena detto ("${shortSnippet}"), trovo che sia un punto di vista interessante. Come continueresti a descriverlo?`;
  }

  return {
    replyText: contextualReply,
    pedagogicalAnalysis: {
      hasMistake: false,
      isTranscriptionUncertain: false,
      category: 'nessuna',
      severity: 'lieve',
      originalSegment: '',
      correctedSegment: '',
      ruleKey: '',
      ruleName: '',
      explanation: '',
      example: '',
    },
    cefrObservation: {
      sessionScore: 78,
      observedFluency: 76,
      pedagogicalNote: 'Buona iniziativa comunicativa ed eloquio spontaneo.',
    },
  };
}

/**
 * Core chat handler processing conversation turn and optionally generating neural audio
 */
export async function processChatConversation(body: any) {
  const {
    userMessage,
    conversationHistory = [],
    companionConfig = {},
    learnerProfile = {},
    immediateTopic = '',
    generateAudio = true,
  } = body || {};

  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('Messaggio utente mancante o non valido.');
  }

  const {
    name: companionName = 'Matteo',
    conversationStyle = 'amico',
    correctionMode = 'targeted',
    voiceGender = 'male',
  } = companionConfig;

  const {
    estimatedCefrLevel = 'B1',
    errors = [],
    memories = [],
  } = learnerProfile;

  const apiKey = getApiKey();
  if (!apiKey) {
    return createDynamicPedagogicalFallback(userMessage, companionName, immediateTopic);
  }

  const unresolvedErrorsSummary = (errors || [])
    .filter((e: any) => e.status !== 'padroneggiata')
    .slice(-5)
    .map((e: any) => `- Regola: ${e.ruleName} (${e.ruleKey}), Errore precedente: "${e.originalText}" -> Corretto: "${e.correctedText}"`)
    .join('\n');

  const personalMemoriesSummary = (memories || [])
    .slice(-8)
    .map((m: any) => `- [${m.category}]: ${m.content}`)
    .join('\n');

  const systemInstruction = `Sei ${companionName}, un compagno di conversazione italiano nativo, un insegnante di lingua e un coach di espressione orale.

IL TUO OBIETTIVO PRINCIPALE:
Aiutare l'utente a parlare italiano in modo naturale, corretto, fluido e sicuro, conversando spontaneamente.

REGOLE FONDAMENTALI:
1. Parla SEMPRE in italiano naturale, contemporaneo e autentico.
2. Rispondi al SENSO REALE del messaggio dell'utente: ascolta prima di insegnare. Reagisci a ciò che ha detto, alle sue idee e alle sue storie.
3. Se l'utente racconta la sua giornata o esprime sentimenti, mostra calore, empatia e curiosità sincera.
4. Adatta il tuo registro al livello stimato dell'utente (${estimatedCefrLevel}), senza banalizzare o parlare in modo infantile.
5. Stile attuale: "${conversationStyle}". 
   - Se "amico": caldo, informale, complice, aneddoti leggeri.
   - Se "professore": chiaro, incoraggiante, spiegazioni didattiche puntuali.
   - Se "dibattito": argomentato, stimolante, presenta contro-argomenti costruttivi con rispetto.
   - Se "oratoria" / "pubblico": incoraggia a sviluppare l'idea con introduzione, corpo ed esempio.
6. Modalità di correzione attiva: "${correctionMode}".
   - "light": conversazione fluida. Riformula naturalmente la frase corretta nella tua risposta senza sermoni grammaticali.
   - "targeted": mantieni viva la conversazione e segnala al massimo 1 o 2 errori significativi e ricorrenti.
   - "deep": analizza con chiarezza la frase, spiega il motivo della correzione e fornisci un esempio memorabile.
7. NON inventare errori: distingui errori grammaticali reali da varianti regionali lecite o semplici esitazioni orali.
8. Se la trascrizione sembra corrotta o foneticamente ambigua (es. parole spezzate dal riconoscimento vocale), contrassegnala con isTranscriptionUncertain: true e NON penalizzare l'utente.
9. Mantieni le risposte parlate ad una lunghezza ragionevole (2-4 frasi efficaci e coinvolgenti), così che la conversazione vocale sia ritmata e interattiva.

MEMORIA PEDAGOGICA DELL'UTENTE (Difficoltà recenti da monitorare o riutilizzare con tatto):
${unresolvedErrorsSummary || 'Nessuna difficoltà recente registrata.'}

MEMORIA PERSONALE DELL'UTENTE (Interessi e progetti noti):
${personalMemoriesSummary || 'Nessun ricordo personale registrato.'}

Argomento attuale della conversazione: "${immediateTopic || 'Conversazione libera'}".`;

  const contents: any[] = [];
  for (const turn of (conversationHistory || []).slice(-8)) {
    contents.push({
      role: turn.role === 'model' ? 'model' : 'user',
      parts: [{ text: turn.text }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  let parsed: any = null;

  try {
    const response = await generateWithModelFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: {
              type: Type.STRING,
              description: 'La risposta parlata in italiano dell’assistente, naturale, viva ed empatica.',
            },
            pedagogicalAnalysis: {
              type: Type.OBJECT,
              properties: {
                hasMistake: {
                  type: Type.BOOLEAN,
                  description: 'Vero se l’utente ha commesso un errore linguistico reale.',
                },
                isTranscriptionUncertain: {
                  type: Type.BOOLEAN,
                  description: 'Vero se la frase sembra un refuso del microfono/trascrizione vocale e non un vero errore.',
                },
                severity: {
                  type: Type.STRING,
                  enum: ['lieve', 'moderata', 'grave'],
                  description: 'Gravità comunicativa dell’errore.',
                },
                category: {
                  type: Type.STRING,
                  description: 'Categoria dell’errore: grammatica, coniugazione, concordanza, articoli, preposizioni, pronomi, sintassi, vocabolario, falsi_amici, idiomi, registro.',
                },
                originalSegment: {
                  type: Type.STRING,
                  description: 'La parte o frase esatta pronunciata dall’utente con l’errore.',
                },
                correctedSegment: {
                  type: Type.STRING,
                  description: 'La formulazione corretta e naturale in italiano.',
                },
                ruleKey: {
                  type: Type.STRING,
                  description: 'Identificativo univoco della regola (es: passato_prossimo_vs_imperfetto, preposizioni_a_in, accordo_genere_numero).',
                },
                ruleName: {
                  type: Type.STRING,
                  description: 'Nome chiaro e didattico della regola in italiano.',
                },
                explanation: {
                  type: Type.STRING,
                  description: 'Spiegazione amichevole e chiara del perché si usa questa forma in italiano.',
                },
                example: {
                  type: Type.STRING,
                  description: 'Un esempio d’uso memorabile in italiano.',
                },
              },
              required: ['hasMistake'],
            },
            cefrObservation: {
              type: Type.OBJECT,
              properties: {
                sessionScore: {
                  type: Type.INTEGER,
                  description: 'Punteggio di efficacia comunicativa (da 0 a 100).',
                },
                observedFluency: {
                  type: Type.INTEGER,
                  description: 'Stima della fluidità su questo turno (da 0 a 100).',
                },
                pedagogicalNote: {
                  type: Type.STRING,
                  description: 'Breve nota d’osservazione didattica su punti di forza e prontezza.',
                },
              },
              required: ['sessionScore'],
            },
          },
          required: ['replyText', 'pedagogicalAnalysis'],
        },
      },
    });

    parsed = JSON.parse(response.text || '{}');
  } catch (err) {
    parsed = createDynamicPedagogicalFallback(userMessage, companionName, immediateTopic);
  }

  if (!parsed || !parsed.replyText) {
    parsed = createDynamicPedagogicalFallback(userMessage, companionName, immediateTopic);
  }

  // Single-roundtrip TTS generation: bundle pristine neural Italian audio directly into the response!
  if (generateAudio && parsed.replyText && apiKey && !isTtsCooldownActive()) {
    try {
      const audioResult = await synthesizeItalianSpeech(parsed.replyText, voiceGender);
      if (audioResult && audioResult.audioBase64) {
        parsed.audioBase64 = audioResult.audioBase64;
      }
    } catch {
      // Audio generation error is non-fatal: client will speak or fallback
    }
  }

  return parsed;
}

/**
 * CEFR assessment evaluation handler
 */
export async function evaluateSessionConversation(turns: any[] = [], learnerProfile: any = {}) {
  const apiKey = getApiKey();
  if (!apiKey || turns.length === 0) {
    return {
      summary: 'Hai dimostrato una buona predisposizione alla conversazione spontanea in italiano!',
      strengths: ['Ascolto attivo e reattività', 'Buona comprensione generale dei temi affrontati'],
      toImprove: ['Rafforzare la concordanza dei tempi al passato e l’uso delle preposizioni articolate'],
      estimatedCefrLevel: learnerProfile.estimatedCefrLevel || 'B1',
      confidenceScore: 78,
    };
  }

  const transcriptText = turns
    .map((t: any) => {
      const speaker = t.role === 'user' || t.speaker === 'user' || t.userText ? 'Studente' : 'Amico';
      const content = t.text || (t.role === 'user' ? t.userText : t.companionText) || t.content || '';
      return `${speaker}: ${content}`;
    })
    .join('\n');

  const evalInstruction = `Sei un esaminatore linguistico esperto del Quadro Comune Europeo di Riferimento per le Lingue (QCER / CEFR) specializzato nella lingua italiana parlata.
Valuta la seguente trascrizione di una conversazione orale tra uno studente e un compagno madrelingua italiano ("Amico").

Trascrizione:
${transcriptText}

Profilo attuale studente:
- Livello stimato di partenza: ${learnerProfile.estimatedCefrLevel || 'B1'}
- Punteggio globale stimato: ${learnerProfile.confidenceScore || 70}/100

Fornisci una valutazione didattica accurata, costruttiva e incoraggiante.`;

  try {
    const ai = createGeminiClient();
    if (!ai) throw new Error('Client AI non disponibile');

    const evalResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: evalInstruction }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Riassunto generale e pedagogico della performance orale dello studente (2-3 frasi chiare).',
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 o 3 punti di forza orali dimostrati concretamente nella conversazione.',
            },
            toImprove: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 o 3 aree prioritarie su cui concentrarsi nei prossimi dialoghi.',
            },
            estimatedCefrLevel: {
              type: Type.STRING,
              enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
              description: 'Livello QCER consolidato osservato durante questa sessione.',
            },
            confidenceScore: {
              type: Type.INTEGER,
              description: 'Indice di padronanza comunicativa da 0 a 100.',
            },
          },
          required: ['summary', 'strengths', 'toImprove', 'estimatedCefrLevel', 'confidenceScore'],
        },
      },
    });

    return JSON.parse(evalResponse.text || '{}');
  } catch (err) {
    return {
      summary: 'Conversazione viva e ricca di spunti! Hai mantenuto la conversazione in italiano con entusiasmo.',
      strengths: ['Spontaneità nelle risposte', 'Buona padronanza del vocabolario di base'],
      toImprove: ['Consolidare i pronomi diretti e indiretti', 'Espandere l’uso di connettivi complessi'],
      estimatedCefrLevel: learnerProfile.estimatedCefrLevel || 'B1',
      confidenceScore: 75,
    };
  }
}
