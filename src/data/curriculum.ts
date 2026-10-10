/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TopicCatalogItem, LearningPathModule } from '../types';

export const TOPIC_CATALOG: TopicCatalogItem[] = [
  // 1. Vita quotidiana & Emozioni
  {
    id: 'vita_1',
    category: 'Vita Quotidiana',
    title: 'La mia giornata tipica e abitudini',
    description: 'Parla dei tuoi ritmi quotidiani, della colazione e delle piccole routine.',
    suggestedLevel: 'A1',
    starterPrompt: 'Ciao! Raccontami com’è iniziata la tua giornata oggi: cosa fai di solito al mattino?',
    iconName: 'Coffee'
  },
  {
    id: 'vita_2',
    category: 'Vita Quotidiana',
    title: 'Gestione dello stress e stanchezza',
    description: 'Come ti rilassi dopo una giornata impegnativa e come stacchi la spina.',
    suggestedLevel: 'A2',
    starterPrompt: 'Quando hai una giornata pesante, qual è la tua ricetta personale per ricaricare le batterie?',
    iconName: 'Smile'
  },
  {
    id: 'vita_3',
    category: 'Relazioni & Famiglia',
    title: 'L’amicizia e i legami autentici',
    description: 'Cosa rende speciale un amico per te? Come mantieni vive le amicizie nel tempo?',
    suggestedLevel: 'B1',
    starterPrompt: 'Si dice che chi trova un amico trovi un tesoro. Secondo te, qual è la qualità più rara in un vero amico?',
    iconName: 'Users'
  },
  {
    id: 'vita_4',
    category: 'Relazioni & Famiglia',
    title: 'Dinamiche familiari e generazioni',
    description: 'Tradizioni familiari, differenze tra generazioni e pranzi della domenica.',
    suggestedLevel: 'B1',
    starterPrompt: 'Come si conciliano le abitudini della tua generazione con quelle dei tuoi genitori o nonni?',
    iconName: 'Heart'
  },
  {
    id: 'cultura_1',
    category: 'Cultura & Cucina Italiana',
    title: 'I segreti della cucina regionale italiana',
    description: 'Dalla pasta fresca dell’Emilia-Romagna ai sapori intensi del Sud.',
    suggestedLevel: 'A2',
    starterPrompt: 'Se dovessi preparare per me un piatto tipico che ami particolarmente, cosa cucineresti?',
    iconName: 'Utensils'
  },
  {
    id: 'cultura_2',
    category: 'Cultura & Cucina Italiana',
    title: 'Il rito del caffè e dell’aperitivo',
    description: 'Perché il bar in Italia è una piazza sociale e un rito irrinunciabile.',
    suggestedLevel: 'B1',
    starterPrompt: 'Il caffè al bar in Italia non è solo una bevanda, è un micromondo. Lo bevi al volo al banco o ti siedi con calma?',
    iconName: 'CupSoda'
  },
  {
    id: 'cultura_3',
    category: 'Cultura & Cucina Italiana',
    title: 'Viaggio tra le regioni: dal Nord al Sud',
    description: 'Dialetti, paesaggi mozzafiato, differenze e bellezze nascoste della penisola.',
    suggestedLevel: 'B1',
    starterPrompt: 'Quale angolo d’Italia ti affascina di più: i borghi storici, le Dolomiti o le coste della Sicilia?',
    iconName: 'MapPin'
  },
  {
    id: 'cultura_4',
    category: 'Cultura & Cucina Italiana',
    title: 'Il cinema italiano: dal Neorealismo a Sorrentino',
    description: 'Fellini, De Sica, Troisi, Sorrentino: le storie che hanno segnato il cinema mondiale.',
    suggestedLevel: 'B2',
    starterPrompt: 'C’è un film o un regista italiano che ti ha colpito per il modo in cui racconta l’animo umano?',
    iconName: 'Film'
  },
  {
    id: 'cultura_5',
    category: 'Cultura & Cucina Italiana',
    title: 'Letteratura e poesia: da Dante a Calvino',
    description: 'Italo Calvino, Primo Levi, Elena Ferrante e la potenza della lingua scritta.',
    suggestedLevel: 'B2',
    starterPrompt: 'Hai mai letto autori italiani o ti piacerebbe scoprire il mondo di Italo Calvino?',
    iconName: 'BookOpen'
  },
  {
    id: 'cultura_6',
    category: 'Cultura & Cucina Italiana',
    title: 'La musica italiana: dai cantautori al pop contemporaneo',
    description: 'De André, Battisti, Battiato, Sanremo e la scena musicale contemporanea.',
    suggestedLevel: 'B1',
    starterPrompt: 'Ascolti canzoni italiane? La musica può essere un acceleratore incredibile per imparare la lingua!',
    iconName: 'Music'
  },
  {
    id: 'arte_1',
    category: 'Arte & Società',
    title: 'Street art vs vandalismo urbano',
    description: 'Dov’è il confine tra espressione artistica e danno ai beni comuni nelle città?',
    suggestedLevel: 'B2',
    starterPrompt: 'Molte città moderne ospitano murales spettacolari ma anche tag improvvisate. Come distingui l’arte autentica dal degrado?',
    iconName: 'Palette'
  },
  {
    id: 'arte_2',
    category: 'Arte & Società',
    title: 'Il patrimonio artistico e il turismo di massa',
    description: 'Firenze, Venezia, Roma: come proteggere la vivibilità dei residenti?',
    suggestedLevel: 'B2',
    starterPrompt: 'Il fenomeno dell’overtourism sta trasformando molti centri storici. Quale equilibrio vedi tra accoglienza e conservazione?',
    iconName: 'Landmark'
  },
  {
    id: 'amb_1',
    category: 'Ambiente & Territorio',
    title: 'Inquinamento e mobilità sostenibile',
    description: 'Biciclette, trasporto pubblico, transizione ecologica e città a 15 minuti.',
    suggestedLevel: 'B1',
    starterPrompt: 'Nella tua città come ti sposti solitamente? Credi che le nostre abitudini di trasporto cambieranno presto?',
    iconName: 'Compass'
  },
  {
    id: 'amb_2',
    category: 'Ambiente & Territorio',
    title: 'Consumo responsabile e spreco alimentare',
    description: 'Spesa a chilometro zero, recupero delle ricette della tradizione contadina.',
    suggestedLevel: 'B1',
    starterPrompt: 'La cucina italiana povera è maestra nel non buttare via nulla. Tu come eviti gli sprechi alimentari?',
    iconName: 'Recycle'
  },
  {
    id: 'lavoro_1',
    category: 'Lavoro & Carriera',
    title: 'Il futuro del lavoro e lo smart working',
    description: 'Flessibilità, lavoro da remoto, confini tra vita privata e ufficio.',
    suggestedLevel: 'B1',
    starterPrompt: 'Lavorare da casa ha rivoluzionato il modo di produrre. Tu preferisci l’ufficio in presenza o la libertà da remoto?',
    iconName: 'Briefcase'
  },
  {
    id: 'lavoro_2',
    category: 'Lavoro & Carriera',
    title: 'Simulazione di colloquio di lavoro in italiano',
    description: 'Presenta te stesso, i tuoi punti di forza, come affronti le sfide complesse.',
    suggestedLevel: 'B2',
    starterPrompt: 'Benvenuto al nostro colloquio! Mi piacerebbe che ti presentassi brevemente: quali sono le tue competenze chiave?',
    iconName: 'UserCheck'
  },
  {
    id: 'lavoro_3',
    category: 'Lavoro & Carriera',
    title: 'Imprenditorialità e spirito di iniziativa',
    description: 'Creare un progetto da zero, gestire i rischi e imparare dagli insuccessi.',
    suggestedLevel: 'B2',
    starterPrompt: 'Se avessi le risorse per lanciare un’attività domani, in quale settore ti metteresti alla prova?',
    iconName: 'TrendingUp'
  },
  {
    id: 'tech_1',
    category: 'Scienza & Tecnologia',
    title: 'L’Intelligenza Artificiale nella vita di tutti i giorni',
    description: 'Opportunità, timori, etica e il futuro della creatività umana.',
    suggestedLevel: 'B2',
    starterPrompt: 'Oggi stiamo parlando proprio grazie all’IA! In quali ambiti pensi che l’IA sarà più utile, e dove ti preoccupa?',
    iconName: 'Cpu'
  },
  {
    id: 'tech_2',
    category: 'Scienza & Tecnologia',
    title: 'Social media: connessione o isolamento?',
    description: 'L’impatto delle notifiche, dell’attenzione frammentata e delle comunità online.',
    suggestedLevel: 'B1',
    starterPrompt: 'Passiamo ore davanti allo schermo. I social network ci avvicinano davvero o aumentano la solitudine?',
    iconName: 'MessageSquare'
  },
  {
    id: 'idee_1',
    category: 'Idee & Filosofia',
    title: 'Il concetto di successo e fallimento',
    description: 'Cosa significa davvero realizzarsi? Perché l’errore è parte essenziale della crescita.',
    suggestedLevel: 'B2',
    starterPrompt: 'Spesso la società misura il successo con denaro o status. Per te, cosa definisce una vita riuscita?',
    iconName: 'Target'
  },
  {
    id: 'idee_2',
    category: 'Idee & Filosofia',
    title: 'La gestione del tempo e l’arte del non far nulla (il dolce far niente)',
    description: 'Correre sempre contro il tempo versus riscoprire la lentezza consapevole.',
    suggestedLevel: 'B1',
    starterPrompt: 'Gli italiani hanno reso celebre l’espressione “il dolce far niente”. Riesci a prenderti momenti di pura calma?',
    iconName: 'Clock'
  },
  {
    id: 'oratoria_1',
    category: 'Oratoria & Comunicazione',
    title: 'Come difendere un’opinione impopolare con garbo',
    description: 'Argomentazione persuasiva, ascolto attivo e diplomazia nelle discussioni.',
    suggestedLevel: 'C1',
    starterPrompt: 'Prendiamo un tema controverso: come esponi il tuo punto di vista quando sai che la maggioranza non è d’accordo?',
    iconName: 'Mic'
  },
  {
    id: 'oratoria_2',
    category: 'Oratoria & Comunicazione',
    title: 'Raccontare una storia avvincente (Storytelling)',
    description: 'Introdurre i personaggi, creare suspense, usare il passato remoto e imperfetto.',
    suggestedLevel: 'B2',
    starterPrompt: 'Raccontami un evento inaspettato o divertente che ti è capitato in passato: voglio che mi trascini nella scena!',
    iconName: 'Sparkles'
  },
  {
    id: 'viaggi_1',
    category: 'Viaggi & Avventura',
    title: 'Il viaggio che mi ha cambiato la prospettiva',
    description: 'Culture diverse, imprevisti memorabili e lezioni di vita on the road.',
    suggestedLevel: 'A2',
    starterPrompt: 'Qual è il posto più lontano o diverso da casa in cui sei mai stato? Cosa ti ha colpito maggiormente?',
    iconName: 'Navigation'
  },
  {
    id: 'simulazione_1',
    category: 'Simulazioni Pratiche',
    title: 'Al ristorante tipico italiano',
    description: 'Chiedere consigli sui piatti del giorno, ordinare vino ed esprimere preferenze.',
    suggestedLevel: 'A1',
    starterPrompt: 'Buonasera e benvenuto alla nostra Osteria! Ha già dato un’occhiata al menù o desidera un consiglio?',
    iconName: 'Wine'
  },
  {
    id: 'simulazione_2',
    category: 'Simulazioni Pratiche',
    title: 'Chiedere indicazioni e orientarsi in città',
    description: 'Muoversi tra vicoli, stazioni, monumenti e orari dei treni.',
    suggestedLevel: 'A1',
    starterPrompt: 'Scusi, buongiorno! Mi sembra che stia cercando qualcosa, posso aiutarla a trovare la strada per il centro?',
    iconName: 'Signpost'
  }
];

export const LEARNING_PATHS: LearningPathModule[] = [
  {
    id: 'path_grammatica',
    title: 'Padronanza Grammaticale Spontanea',
    description: 'Supera le insidie di passato prossimo vs imperfetto, congiuntivo e preposizioni parlando.',
    category: 'Grammatica in Azione',
    targetSkill: 'grammaticalAccuracy',
    level: 'B1',
    exercisesCount: 8,
    completed: false,
    starterPrompt: 'Oggi alleniamo l’uso naturale del passato. Raccontami cosa facevi spesso durante le vacanze estive da bambino!'
  },
  {
    id: 'path_vocabolario',
    title: 'Vocabolario Ricco e Modi di Dire',
    description: 'Passa dalle parole base a sinonimi precisi, metafore e proverbi italiani d’uso comune.',
    category: 'Lessico & Sfumature',
    targetSkill: 'vocabularyRichness',
    level: 'B2',
    exercisesCount: 10,
    completed: false,
    starterPrompt: 'Esploriamo espressioni idiomatiche come “in bocca al lupo”, “avere le mani in pasta” o “costare un occhio della testa”. Ne conosci qualcuna?'
  },
  {
    id: 'path_pronuncia',
    title: 'Pronuncia, Intonazione e Ritmo',
    description: 'Lavora su doppie consonanti, suoni duri e dolci (C/CH, G/GH), vocali aperte e chiuse.',
    category: 'Fonetica & Melodia',
    targetSkill: 'pronunciationIntelligibility',
    level: 'A2',
    exercisesCount: 6,
    completed: false,
    starterPrompt: 'Ascolta bene la melodia della frase italiana. Proviamo a ripetere e confrontare frasi con suoni come “chitarra”, “gelato”, “famiglia” e “notte”.'
  },
  {
    id: 'path_fluidita',
    title: 'Fluidità Orale e Resilienza',
    description: 'Impara a superare le pause, connettori discorsivi (infatti, tuttavia, d’altronde) e parafrasi.',
    category: 'Parlato Continuo',
    targetSkill: 'fluency',
    level: 'B1',
    exercisesCount: 7,
    completed: false,
    starterPrompt: 'La regola d’oro di oggi: non fermarti anche se ti manca una parola esatta. Prova a spiegarmi il concetto con altre parole!'
  },
  {
    id: 'path_storie',
    title: 'L’Arte di Raccontare Storie',
    description: 'Costruisci narrazioni avvincenti con ordine cronologico, descrizioni vive e colpi di scena.',
    category: 'Narrazione',
    targetSkill: 'discourseCoherence',
    level: 'B2',
    exercisesCount: 5,
    completed: false,
    starterPrompt: 'Oggi ti sfido a inventare una storia breve: un personaggio misterioso trova una chiave antica su una panchina a Roma...'
  },
  {
    id: 'path_dibattito',
    title: 'Argomentazione e Dibattito',
    description: 'Struttura tesi, antitesi, contro-esempi e conclusioni logiche senza perdere il filo.',
    category: 'Pensiero Critico',
    targetSkill: 'argumentation',
    level: 'C1',
    exercisesCount: 8,
    completed: false,
    starterPrompt: 'Mettiamoci alla prova: difendi una posizione a tua scelta sul ruolo della tecnologia nella scuola. Io porterò obiezioni costruttive!'
  },
  {
    id: 'path_oratoria',
    title: 'Public Speaking in Italiano',
    description: 'Espressione chiara, tono autorevole ma empatico, gestione del ritmo e delle pause enfatiche.',
    category: 'Discorso Pubblico',
    targetSkill: 'interaction',
    level: 'C1',
    exercisesCount: 6,
    completed: false,
    starterPrompt: 'Immagina di dover presentare un’idea innovativa davanti a una platea di 50 persone a Milano. Fai la tua introduzione di un minuto!'
  },
  {
    id: 'path_situazioni',
    title: 'Scenari di Vita Reale & Spontaneità',
    description: 'Ristoranti, uffici postali, stazioni, visite mediche, contrattazioni e piccole compravendite.',
    category: 'Simulazioni Pratiche',
    targetSkill: 'spontaneousVocabulary',
    level: 'A2',
    exercisesCount: 9,
    completed: false,
    starterPrompt: 'Siamo alla stazione di Bologna e devi cambiare il tuo biglietto del Frecciarossa con urgenza. Vai, sono il capotreno allo sportello!'
  }
];
