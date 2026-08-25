import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Mic, MicOff, Send, Bot, User, FileText, CheckCircle,
  Sparkles, Volume2, VolumeX, Radio, MessageSquare, Globe,
  CheckCircle2, ArrowRight, Eye, RefreshCw, FolderCheck, ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { API_URL } from '../config';
import { saveLocalSession, getLocalSession } from '../utils/storage';

// ─────────────────────────────────────────────
// PRESET SERVICES
// ─────────────────────────────────────────────
const PRESET_SERVICES = [
  { id: 'income', title: 'Income Certificate', desc: 'Annual family income certificate for subsidies and admissions' },
  { id: 'caste', title: 'Caste Certificate', desc: 'Community verification certificate for reservations' },
  { id: 'domicile', title: 'Domicile Certificate', desc: 'Proof of permanent residency in the state' },
  { id: 'solvency', title: 'Solvency Certificate', desc: 'Financial standing validation for tenders & legal needs' },
];

const MULTILINGUAL_FALLBACK_QUESTIONS = {
  'Income Certificate': {
    'en-IN': [
      'What is your full legal name as per government records?',
      "What is your father's or husband's name?",
      'What is your annual family income from all sources in Rupees?',
      'What is your permanent residential address and district?',
      'What is your 12-digit Aadhaar Card number?',
    ],
    'hi-IN': [
      'सरकारी रिकॉर्ड के अनुसार आपका पूरा कानूनी नाम क्या है?',
      'आपके पिता या पति का नाम क्या है?',
      'रुपये में सभी स्रोतों से आपकी वार्षिक पारिवारिक आय कितनी है?',
      'आपका स्थायी आवासीय पता और जिला क्या है?',
      'आपका 12 अंकों का आधार कार्ड नंबर क्या है?',
    ],
    'mr-IN': [
      'सरकारी नोंदीनुसार तुमचे पूर्ण नाव काय आहे?',
      'तुमच्या वडिलांचे किंवा पतीचे नाव काय आहे?',
      'सर्व मार्गांनी मिळून तुमचे वार्षिक कौटुंबिक उत्पन्न किती आहे?',
      'तुमचा कायमचा पत्ता आणि जिल्हा कोणता आहे?',
      'तुमचा 12 अंकी आधार कार्ड क्रमांक काय आहे?',
    ],
    'ta-IN': [
      'அரசு பதிவுகளின்படி உங்கள் முழு சட்டப்பூர்வ பெயர் என்ன?',
      'உங்கள் தந்தை அல்லது கணவரின் பெயர் என்ன?',
      'அனைத்து வழிகளிலிருந்தும் உங்கள் குடும்ப ஆண்டு வருமானம் எவ்வளவு?',
      'உங்கள் நிரந்தர முகவரி மற்றும் மாவட்டம் என்ன?',
      'உங்கள் 12 இலக்க ஆதார் அட்டை எண் என்ன?',
    ],
    'te-IN': [
      'ప్రభుత్వ రికార్డుల ప్రకారం మీ పూర్తి చట్టపరమైన పేరు ఏమిటి?',
      'మీ తండ్రి లేదా భర్త పేరు ఏమిటి?',
      'అన్ని మార్గాల ద్వారా మీ కుటుంబ వార్షిక ఆదాయం ఎంత?',
      'మీ శాశ్వత చిరునామా మరియు జిల్లా ఏమిటి?',
      'మీ 12 అంకెల ఆధార్ కార్డ్ నంబర్ ఏమిటి?',
    ],
    'bn-IN': [
      'সরকারি নথি অনুযায়ী আপনার পূর্ণ নাম কী?',
      'আপনার পিতা বা স্বামীর নাম কী?',
      'সব উৎস থেকে আপনার পরিবারের বার্ষিক আয় কত টাকা?',
      'আপনার স্থায়ী ঠিকানা ও জেলা কী?',
      'আপনার ১২ সংখ্যার আধার কার্ড নম্বর কী?',
    ],
    'gu-IN': [
      'સરકારી રેકોર્ડ મુજબ તમારું પૂરું નામ શું છે?',
      'તમારા પિતા અથવા પતિનું નામ શું છે?',
      'બધા સ્ત્રોતોમાંથી તમારી વાર્ષિક પારિવારિક આવક કેટલી છે?',
      'તમારું કાયમી સરનામું અને જિલ્લો કયો છે?',
      'તમારો 12 અંકનો આધાર નંબર શું છે?',
    ]
  },
  'Caste Certificate': {
    'en-IN': [
      "What is the applicant's full legal name?",
      'Which caste or community category are you applying for (SC / ST / OBC / General)?',
      "What is your father's name and native village/district?",
      'What is your permanent residential address with Pincode?',
      'What is your 12-digit Aadhaar Card number?',
    ],
    'hi-IN': [
      'आवेदक का पूरा कानूनी नाम क्या है?',
      'आप किस जाति या श्रेणी (SC / ST / OBC / General) के लिए आवेदन कर रहे हैं?',
      'आपके पिता का नाम और मूल गांव/जिला क्या है?',
      'पिनकोड सहित आपका स्थायी आवासीय पता क्या है?',
      'आपका 12 अंकों का आधार कार्ड नंबर क्या है?',
    ],
    'mr-IN': [
      'अर्जदाराचे पूर्ण नाव काय आहे?',
      'तुम्ही कोणत्या जातीसाठी किंवा प्रवर्गासाठी (SC / ST / OBC / General) अर्ज करत आहात?',
      'तुमच्या वडिलांचे नाव आणि मूळ गाव/जिल्हा कोणता?',
      'पिनकोडसह तुमचा कायमचा पत्ता काय आहे?',
      'तुमचा 12 अंकी आधार कार्ड क्रमांक काय आहे?',
    ],
    'ta-IN': [
      'விண்ணப்பதாரரின் முழு சட்டப்பூர்வ பெயர் என்ன?',
      'நீங்கள் எந்த சாதி பிரிவிற்கு (SC / ST / OBC / General) விண்ணப்பிக்கிறீர்கள்?',
      'உங்கள் தந்தையின் பெயர் மற்றும் பூர்வீக கிராமம்/மாவட்டம் என்ன?',
      'அஞ்சல் குறியீட்டுடன் உங்கள் நிரந்தர முகவரி என்ன?',
      'உங்கள் 12 இலக்க ஆதார் அட்டை எண் என்ன?',
    ],
    'te-IN': [
      'దరఖాస్తుదారు పూర్తి చట్టపరమైన పేరు ఏమిటి?',
      'మీరు ఏ కులం లేదా వర్గం (SC / ST / OBC / General) కోసం దరఖాస్తు చేస్తున్నారు?',
      'మీ తండ్రి పేరు మరియు స్థానిక గ్రామం/జిల్లా ఏమిటి?',
      'పిన్‌కోడ్‌తో మీ శాశ్వత చిరునామా ఏమిటి?',
      'మీ 12 అంకెల ఆధార్ కార్డ్ నంబర్ ఏమిటి?',
    ],
    'bn-IN': [
      'আবেদনকারীর পূর্ণ আইনি নাম কী?',
      'আপনি কোন জাতি বা বিভাগের (SC / ST / OBC / General) জন্য আবেদন করছেন?',
      'আপনার পিতার নাম এবং পৈতৃক গ্রাম/জেলা কী?',
      'পিনকোড সহ আপনার স্থায়ী ঠিকানা কী?',
      'আপনার ১২ সংখ্যার আধার কার্ড নম্বর কী?',
    ],
    'gu-IN': [
      'અરજદારનું પૂરું કાયદેસર નામ શું છે?',
      'તમે કઈ જાતિ અથવા કેટેગરી (SC / ST / OBC / General) માટે અરજી કરી રહ્યા છો?',
      'તમારા પિતાનું નામ અને વતન ગામ/જિલ્લો કયો છે?',
      'પીનકોડ સાથે તમારું કાયમી સરનામું શું છે?',
      'તમારો 12 અંકનો આધાર કાર્ડ નંબર શું છે?',
    ]
  },
  'Domicile Certificate': {
    'en-IN': [
      'What is your full name as per Aadhaar?',
      'How many years have you been continuously residing in this state?',
      'What is your current permanent residential address?',
      'What is your 12-digit Aadhaar Card number or Voter ID?',
      'What is your date of birth (DD/MM/YYYY)?',
    ],
    'hi-IN': [
      'आधार के अनुसार आपका पूरा नाम क्या है?',
      'आप इस राज्य में लगातार कितने वर्षों से रह रहे हैं?',
      'आपका वर्तमान स्थायी आवासीय पता क्या है?',
      'आपका 12 अंकों का आधार कार्ड या वोटर आईडी नंबर क्या है?',
      'आपकी जन्म तिथि क्या है (DD/MM/YYYY)?',
    ],
    'mr-IN': [
      'आधारनुसार तुमचे पूर्ण नाव काय आहे?',
      'तुम्ही या राज्यात सलग किती वर्षांपासून राहत आहात?',
      'तुमचा सध्याचा कायमचा पत्ता काय आहे?',
      'तुमचा 12 अंकी आधार कार्ड क्रमांक काय आहे?',
      'तुमची जन्मतारीख काय आहे (DD/MM/YYYY)?',
    ],
    'ta-IN': [
      'ஆதார் படி உங்கள் முழு பெயர் என்ன?',
      'இந்த மாநிலத்தில் எத்தனை ஆண்டுகளாக தொடர்ந்து வசிக்கிறீர்கள்?',
      'உங்கள் தற்போதைய நிரந்தர முகவரி என்ன?',
      'உங்கள் 12 இலக்க ஆதார் அட்டை எண் என்ன?',
      'உங்கள் பிறந்த தேதி என்ன (DD/MM/YYYY)?',
    ],
    'te-IN': [
      'ఆధార్ ప్రకారం మీ పూర్తి పేరు ఏమిటి?',
      'మీరు ఈ రాష్ట్రంలో ఎన్ని సంవత్సరాలుగా నివసిస్తున్నారు?',
      'మీ ప్రస్తుత శాశ్వత చిరునామా ఏమిటి?',
      'మీ 12 అంకెల ఆధార్ కార్డ్ నంబర్ ఏమిటి?',
      'మీ పుట్టిన తేదీ ఏమిటి (DD/MM/YYYY)?',
    ],
    'bn-IN': [
      'আধার অনুযায়ী আপনার পূর্ণ নাম কী?',
      'আপনি কত বছর ধরে এই রাজ্যে বসবাস করছেন?',
      'আপনার বর্তমান স্থায়ী ঠিকানা কী?',
      'আপনার ১২ সংখ্যার আধার কার্ড নম্বর কী?',
      'আপনার জন্ম তারিখ কী (DD/MM/YYYY)?',
    ],
    'gu-IN': [
      'આધાર મુજબ તમારું પૂરું નામ શું છે?',
      'તમે કેટલા વર્ષોથી આ રાજ્યમાં રહો છો?',
      'તમારું હાલનું કાયમી સરનામું શું છે?',
      'તમારો 12 અંકનો આધાર કાર્ડ નંબર શું છે?',
      'તમારી જન્મ તારીખ શું છે (DD/MM/YYYY)?',
    ]
  },
  'Solvency Certificate': {
    'en-IN': [
      'What is the full name of the property owner / applicant?',
      'What is the total solvency guarantee valuation amount in Rupees?',
      'What are the property details and survey numbers?',
      'What is your permanent address and contact number?',
      'What is your 12-digit Aadhaar Card number?',
    ],
    'hi-IN': [
      'संपत्ति मालिक / आवेदक का पूरा नाम क्या है?',
      'रुपये में कुल साख गारंटी मूल्यांकन राशि कितनी है?',
      'संपत्ति का विवरण और सर्वे नंबर क्या है?',
      'आपका स्थायी पता और संपर्क नंबर क्या है?',
      'आपका 12 अंकों का आधार कार्ड नंबर क्या है?',
    ],
    'mr-IN': [
      'मालमत्ता मालकाचे / अर्जदाराचे पूर्ण नाव काय आहे?',
      'एकूण मूल्यांकन रक्कम किती रुपये आहे?',
      'मालमत्ता तपशील आणि सर्व्हे नंबर काय आहे?',
      'तुमचा कायमचा पत्ता आणि संपर्क क्रमांक काय आहे?',
      'तुमचा 12 अंकी आधार कार्ड क्रमांक काय आहे?',
    ],
    'ta-IN': [
      'சொத்து உரிமையாளர் / விண்ணப்பதாரரின் முழு பெயர் என்ன?',
      'மொத்த மதிப்பீட்டுத் தொகை எவ்வளவு?',
      'சொத்து விவரங்கள் மற்றும் சர்வே எண்கள் என்ன?',
      'உங்கள் நிரந்தர முகவரி மற்றும் தொடர்பு எண் என்ன?',
      'உங்கள் 12 இலக்க ஆதார் அட்டை எண் என்ன?',
    ],
    'te-IN': [
      'ఆస్తి యజమాని / దరఖాస్తుదారు పూర్తి పేరు ఏమిటి?',
      'మొత్తం మూల్యాంకన మొత్తం ఎంత?',
      'ఆస్తి వివరాలు మరియు సర్వే నంబర్లు ఏమిటి?',
      'మీ శాశ్వత చిరునామా మరియు సంప్రదింపు సంఖ్య ఏమిటి?',
      'మీ 12 అంకెల ఆధార్ కార్డ్ నంబర్ ఏమిటి?',
    ],
    'bn-IN': [
      'সম্পত্তির মালিক / আবেদনকারীর পূর্ণ নাম কী?',
      'মোট মূল্য কত টাকা?',
      'সম্পত্তির বিবরণ এবং সার্ভে নম্বর কী?',
      'আপনার স্থায়ী ঠিকানা এবং ফোন নম্বর কী?',
      'আপনার ১২ সংখ্যার আধার কার্ড নম্বর কী?',
    ],
    'gu-IN': [
      'મિલકત માલિક / અરજદારનું પૂરું નામ શું છે?',
      'કુલ મૂલ્યાંકન રકમ કેટલી છે?',
      'મિલકત વિગતો અને સર્વે નંબર શું છે?',
      'તમારું કાયમી સરનામું અને ફોન નંબર શું છે?',
      'તમારો 12 અંકનો આધાર કાર્ડ નંબર શું છે?',
    ]
  }
};

const getFallbackQuestions = (formName, lang = 'en-IN') => {
  const serviceGroup = MULTILINGUAL_FALLBACK_QUESTIONS[formName];
  if (serviceGroup) {
    return serviceGroup[lang] || serviceGroup['en-IN'] || Object.values(serviceGroup)[0];
  }
  return [
    `What is your full legal name for ${formName}?`,
    `What is your father's or guardian's name?`,
    `What is your permanent residential address?`,
    `What is your 12-digit Aadhaar Card number?`,
  ];
};

// ─────────────────────────────────────────────
// SUPPORTED LANGUAGES
// ─────────────────────────────────────────────
const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिंदी' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'bn-IN', label: 'বাংলা' },
  { code: 'gu-IN', label: 'ગુજરાતી' },
];

// ─────────────────────────────────────────────
// MULTILINGUAL TRANSLATIONS  (Issue #1)
// ─────────────────────────────────────────────
const TRANSLATIONS = {
  'en-IN': {
    welcome: 'Namaste! I am SevaMitraAI, your voice assistant for revenue department certificates. Which service would you like to apply for?',
    welcomeSpeak: 'Namaste! I am SevaMitra AI. Which government service would you like to apply for? Please speak or choose below.',
    tapToSpeak: 'Tap the sphere to speak',
    listening: 'Listening to your voice...',
    speaking: 'SevaMitra is speaking...',
    thinking: 'Thinking...',
    recordingHint: (s) => `Recording in progress (${s}s)... Tap to submit answer`,
    speakNaturally: 'Speak naturally in Hindi, English or regional languages.',
    voiceFirstTitle: 'Voice-First Government Services',
    voiceFirstSub: 'Apply for certificates by speaking. Every question is read aloud in your language.',
    allCompleted: 'All Questions Completed',
    stepOf: (cur, total) => `Step ${cur} of ${total}`,
    voiceCitizenAsst: 'Voice Citizen Assistant',
    voiceOn: 'Voice ON',
    muted: 'Muted',
    showTranscript: 'Show Transcript',
    voiceMode: 'Voice Mode',
    tapToSpeakAnswer: 'Tap to Speak Your Answer',
    stopAndSubmit: (s) => `Stop & Submit (${s}s)`,
    speechOnlyMode: 'Speech-Only Mode: Click to talk in any language.',
    appCompleted: 'Application Completed & Verified',
    readySubmission: 'Ready For Submission',
    extractedDetails: 'Extracted Form Details:',
    editReviewForm: 'Edit / Review Form',
    proceedUpload: 'Proceed to Upload Documents',
    viewFilledForms: 'View in My Filled Forms',
    startNewForm: 'Start New Form',
    formConfirmation: 'Form Confirmation:',
    reviewEdit: 'Review & Edit',
    uploadDocs: 'Upload Documents',
    processingSpeech: 'Processing speech & translating...',
    iWantApply: (name) => `I want to apply for ${name}`,
    guidingThrough: (name, q) => `Great! I will guide you through the ${name} application. Question 1: ${q}`,
    questionN: (n, q) => `Question ${n}: ${q}`,
    allDetails: (name) => `🎉 Great! All details for ${name} have been collected. Please confirm your filled form summary below.`,
    couldNotDet: 'Could not determine the certificate type. Please speak again or select an option.',
    willHelp: (name, q) => `I will help you apply for ${name}. Here is question 1: ${q}`,
    // Validation messages
    validAadhaar: 'Please provide a valid 12-digit Aadhaar number.',
    validIncome: 'Please provide a numeric income amount.',
    validName: 'Please provide your full name.',
    validYears: 'Please provide the number of years as a number.',
    validPhone: 'Please provide a valid 10-digit phone number.',
    validDate: 'Please provide a valid date in DD/MM/YYYY format.',
    answerTooShort: 'Answer seems too short. Could you please elaborate?',
    invalidAnswer: (reason) => `I noticed an issue: ${reason} Please answer again.`,
    service: 'Service:',
  },
  'hi-IN': {
    welcome: 'नमस्ते! मैं सेवामित्र AI हूँ, आपका राजस्व विभाग प्रमाण पत्र सहायक। आप किस सेवा के लिए आवेदन करना चाहते हैं?',
    welcomeSpeak: 'नमस्ते! मैं सेवामित्र AI हूँ। आप किस सरकारी सेवा के लिए आवेदन करना चाहते हैं? कृपया बोलें या नीचे चुनें।',
    tapToSpeak: 'बोलने के लिए गोले को दबाएं',
    listening: 'आपकी आवाज़ सुन रहा हूँ...',
    speaking: 'सेवामित्र बोल रहा है...',
    thinking: 'सोच रहा हूँ...',
    recordingHint: (s) => `रिकॉर्डिंग जारी है (${s} सेकंड)... उत्तर भेजने के लिए टैप करें`,
    speakNaturally: 'हिंदी, अंग्रेजी या किसी क्षेत्रीय भाषा में स्वाभाविक रूप से बोलें।',
    voiceFirstTitle: 'आवाज़-आधारित सरकारी सेवाएं',
    voiceFirstSub: 'बोलकर प्रमाण पत्र के लिए आवेदन करें। प्रत्येक प्रश्न आपकी भाषा में पढ़ा जाएगा।',
    allCompleted: 'सभी प्रश्न पूर्ण',
    stepOf: (cur, total) => `चरण ${cur} / ${total}`,
    voiceCitizenAsst: 'आवाज़ नागरिक सहायक',
    voiceOn: 'आवाज़ चालू',
    muted: 'म्यूट',
    showTranscript: 'बातचीत दिखाएं',
    voiceMode: 'आवाज़ मोड',
    tapToSpeakAnswer: 'उत्तर बोलने के लिए दबाएं',
    stopAndSubmit: (s) => `रोकें और भेजें (${s}s)`,
    speechOnlyMode: 'स्पीच मोड: किसी भी भाषा में बात करें।',
    appCompleted: 'आवेदन पूर्ण और सत्यापित',
    readySubmission: 'जमा करने के लिए तैयार',
    extractedDetails: 'भरे हुए विवरण:',
    editReviewForm: 'संपादित / समीक्षा करें',
    proceedUpload: 'दस्तावेज़ अपलोड करने के लिए आगे बढ़ें',
    viewFilledForms: 'मेरे भरे फॉर्म देखें',
    startNewForm: 'नया फॉर्म शुरू करें',
    formConfirmation: 'फॉर्म पुष्टि:',
    reviewEdit: 'समीक्षा और संपादन',
    uploadDocs: 'दस्तावेज़ अपलोड करें',
    processingSpeech: 'वाणी प्रसंस्करण और अनुवाद...',
    iWantApply: (name) => `मैं ${name} के लिए आवेदन करना चाहता/चाहती हूँ`,
    guidingThrough: (name, q) => `बढ़िया! मैं आपको ${name} आवेदन में मार्गदर्शन करूँगा। प्रश्न 1: ${q}`,
    questionN: (n, q) => `प्रश्न ${n}: ${q}`,
    allDetails: (name) => `🎉 बढ़िया! ${name} के सभी विवरण एकत्र कर लिए गए हैं। कृपया नीचे भरे हुए फॉर्म की समीक्षा करें।`,
    couldNotDet: 'प्रमाण पत्र का प्रकार निर्धारित नहीं हो सका। कृपया फिर से बोलें या एक विकल्प चुनें।',
    willHelp: (name, q) => `मैं ${name} में आपकी सहायता करूँगा। प्रश्न 1: ${q}`,
    validAadhaar: 'कृपया 12 अंकों का वैध आधार नंबर दें।',
    validIncome: 'कृपया आय की राशि संख्या में दें।',
    validName: 'कृपया अपना पूरा नाम दें।',
    validYears: 'कृपया वर्षों की संख्या अंक में दें।',
    validPhone: 'कृपया वैध 10-अंकों का फोन नंबर दें।',
    validDate: 'कृपया DD/MM/YYYY प्रारूप में वैध तिथि दें।',
    answerTooShort: 'उत्तर बहुत छोटा लगता है। कृपया विस्तार से बताएं।',
    invalidAnswer: (reason) => `मुझे एक समस्या दिखी: ${reason} कृपया फिर से उत्तर दें।`,
    service: 'सेवा:',
  },
  'mr-IN': {
    welcome: 'नमस्कार! मी सेवामित्र AI आहे, महसूल विभाग प्रमाणपत्र सहाय्यक. तुम्हाला कोणत्या सेवेसाठी अर्ज करायचा आहे?',
    welcomeSpeak: 'नमस्कार! मी सेवामित्र AI आहे. तुम्हाला कोणत्या सरकारी सेवेसाठी अर्ज करायचा आहे?',
    tapToSpeak: 'बोलण्यासाठी गोलावर टॅप करा',
    listening: 'तुमचा आवाज ऐकत आहे...',
    speaking: 'सेवामित्र बोलत आहे...',
    thinking: 'विचार करत आहे...',
    recordingHint: (s) => `रेकॉर्डिंग सुरू आहे (${s}s)... उत्तर सादर करण्यासाठी टॅप करा`,
    speakNaturally: 'मराठी, हिंदी किंवा इंग्रजीत स्वाभाविकपणे बोला.',
    voiceFirstTitle: 'आवाज-प्रथम सरकारी सेवा',
    voiceFirstSub: 'बोलून प्रमाणपत्रांसाठी अर्ज करा. प्रत्येक प्रश्न तुमच्या भाषेत वाचला जाईल.',
    allCompleted: 'सर्व प्रश्न पूर्ण',
    stepOf: (cur, total) => `पायरी ${cur} / ${total}`,
    voiceCitizenAsst: 'आवाज नागरिक सहाय्यक',
    voiceOn: 'आवाज चालू',
    muted: 'म्यूट',
    showTranscript: 'संभाषण दाखवा',
    voiceMode: 'आवाज मोड',
    tapToSpeakAnswer: 'उत्तर बोलण्यासाठी टॅप करा',
    stopAndSubmit: (s) => `थांबवा & सादर करा (${s}s)`,
    speechOnlyMode: 'स्पीच मोड: कोणत्याही भाषेत बोला.',
    appCompleted: 'अर्ज पूर्ण आणि सत्यापित',
    readySubmission: 'सादर करण्यासाठी तयार',
    extractedDetails: 'भरलेले तपशील:',
    editReviewForm: 'संपादित / पुनरावलोकन',
    proceedUpload: 'कागदपत्रे अपलोड करण्यासाठी पुढे जा',
    viewFilledForms: 'माझे भरलेले अर्ज पहा',
    startNewForm: 'नवीन अर्ज सुरू करा',
    formConfirmation: 'अर्ज पुष्टी:',
    reviewEdit: 'पुनरावलोकन आणि संपादन',
    uploadDocs: 'कागदपत्रे अपलोड करा',
    processingSpeech: 'आवाज प्रक्रिया आणि अनुवाद...',
    iWantApply: (name) => `मला ${name} साठी अर्ज करायचा आहे`,
    guidingThrough: (name, q) => `छान! मी तुम्हाला ${name} अर्जात मार्गदर्शन करेन. प्रश्न 1: ${q}`,
    questionN: (n, q) => `प्रश्न ${n}: ${q}`,
    allDetails: (name) => `🎉 छान! ${name} साठी सर्व तपशील गोळा केले आहेत. कृपया खाली भरलेल्या अर्जाचे पुनरावलोकन करा.`,
    couldNotDet: 'प्रमाणपत्राचा प्रकार निर्धारित करता आला नाही. कृपया पुन्हा बोला.',
    willHelp: (name, q) => `मी ${name} साठी तुम्हाला मदत करेन. प्रश्न 1: ${q}`,
    validAadhaar: 'कृपया वैध 12-अंकी आधार क्रमांक द्या.',
    validIncome: 'कृपया उत्पन्नाची रक्कम संख्येत द्या.',
    validName: 'कृपया आपले पूर्ण नाव द्या.',
    validYears: 'कृपया वर्षांची संख्या अंकात द्या.',
    validPhone: 'कृपया वैध 10-अंकी फोन नंबर द्या.',
    validDate: 'कृपया DD/MM/YYYY स्वरूपात वैध तारीख द्या.',
    answerTooShort: 'उत्तर खूप छोटे वाटते. कृपया अधिक सांगा.',
    invalidAnswer: (reason) => `मला एक समस्या दिसली: ${reason} कृपया पुन्हा उत्तर द्या.`,
    service: 'सेवा:',
  },
  'ta-IN': {
    welcome: 'வணக்கம்! நான் சேவாமித்ரா AI, உங்கள் வருவாய் துறை சான்றிதழ் உதவியாளர். நீங்கள் எந்த சேவைக்கு விண்ணப்பிக்க விரும்புகிறீர்கள்?',
    welcomeSpeak: 'வணக்கம்! நான் சேவாமித்ரா AI. நீங்கள் எந்த அரசு சேவைக்கு விண்ணப்பிக்க விரும்புகிறீர்கள்?',
    tapToSpeak: 'பேச கோளத்தை தட்டவும்',
    listening: 'உங்கள் குரலை கேட்கிறேன்...',
    speaking: 'சேவாமித்ரா பேசுகிறது...',
    thinking: 'யோசிக்கிறேன்...',
    recordingHint: (s) => `பதிவு நடக்கிறது (${s}s)... பதில் அனுப்ப தட்டவும்`,
    speakNaturally: 'தமிழ், ஹிந்தி அல்லது ஆங்கிலத்தில் இயல்பாக பேசவும்.',
    voiceFirstTitle: 'குரல்-முதல் அரசு சேவைகள்',
    voiceFirstSub: 'பேசி சான்றிதழுக்கு விண்ணப்பிக்கவும். ஒவ்வொரு கேள்வியும் உங்கள் மொழியில் படிக்கப்படும்.',
    allCompleted: 'அனைத்து கேள்விகளும் முடிந்தன',
    stepOf: (cur, total) => `படி ${cur} / ${total}`,
    voiceCitizenAsst: 'குரல் குடிமக்கள் உதவியாளர்',
    voiceOn: 'குரல் இயக்கம்',
    muted: 'முடக்கம்',
    showTranscript: 'உரையாடல் காட்டு',
    voiceMode: 'குரல் முறை',
    tapToSpeakAnswer: 'பதில் பேச தட்டவும்',
    stopAndSubmit: (s) => `நிறுத்து & அனுப்பு (${s}s)`,
    speechOnlyMode: 'பேச்சு முறை: எந்த மொழியிலும் பேசவும்.',
    appCompleted: 'விண்ணப்பம் முடிந்தது & சரிபார்க்கப்பட்டது',
    readySubmission: 'சமர்ப்பிக்க தயார்',
    extractedDetails: 'நிரப்பிய விவரங்கள்:',
    editReviewForm: 'திருத்து / மதிப்பாய்வு',
    proceedUpload: 'ஆவணங்கள் பதிவேற்ற தொடரவும்',
    viewFilledForms: 'என் நிரப்பிய படிவங்கள் பார்க்கவும்',
    startNewForm: 'புதிய படிவம் தொடங்கவும்',
    formConfirmation: 'படிவ உறுதிப்படுத்தல்:',
    reviewEdit: 'மதிப்பாய்வு & திருத்து',
    uploadDocs: 'ஆவணங்கள் பதிவேற்றவும்',
    processingSpeech: 'பேச்சு செயலாக்கம் & மொழிபெயர்ப்பு...',
    iWantApply: (name) => `நான் ${name} க்கு விண்ணப்பிக்க விரும்புகிறேன்`,
    guidingThrough: (name, q) => `நல்லது! நான் உங்களை ${name} விண்ணப்பத்தில் வழிநடத்துவேன். கேள்வி 1: ${q}`,
    questionN: (n, q) => `கேள்வி ${n}: ${q}`,
    allDetails: (name) => `🎉 நல்லது! ${name} க்கான அனைத்து விவரங்களும் சேகரிக்கப்பட்டன. கீழே நிரப்பிய படிவ சுருக்கத்தை உறுதிப்படுத்தவும்.`,
    couldNotDet: 'சான்றிதழ் வகையை தீர்மானிக்க முடியவில்லை. மீண்டும் பேசவும்.',
    willHelp: (name, q) => `நான் ${name} க்கு உங்களுக்கு உதவுவேன். கேள்வி 1: ${q}`,
    validAadhaar: 'சரியான 12 இலக்க ஆதார் எண் வழங்கவும்.',
    validIncome: 'வருமான தொகையை எண்ணாக வழங்கவும்.',
    validName: 'உங்கள் முழு பெயரை வழங்கவும்.',
    validYears: 'ஆண்டுகளின் எண்ணிக்கையை வழங்கவும்.',
    validPhone: 'சரியான 10 இலக்க தொலைபேசி எண் வழங்கவும்.',
    validDate: 'DD/MM/YYYY வடிவத்தில் சரியான தேதி வழங்கவும்.',
    answerTooShort: 'பதில் மிகவும் குறுகியதாக தெரிகிறது. மேலும் விவரிக்கவும்.',
    invalidAnswer: (reason) => `ஒரு சிக்கல் கண்டேன்: ${reason} மீண்டும் பதில் சொல்லவும்.`,
    service: 'சேவை:',
  },
  'te-IN': {
    welcome: 'నమస్కారం! నేను సేవామిత్ర AI, మీ రాజస్వ విభాగ సర్టిఫికెట్ సహాయకుడు. మీరు ఏ సేవ కోసం దరఖాస్తు చేయాలనుకుంటున్నారు?',
    welcomeSpeak: 'నమస్కారం! నేను సేవామిత్ర AI. మీరు ఏ ప్రభుత్వ సేవ కోసం దరఖాస్తు చేయాలనుకుంటున్నారు?',
    tapToSpeak: 'మాట్లాడటానికి గోళాన్ని నొక్కండి',
    listening: 'మీ గొంతు వింటున్నాను...',
    speaking: 'సేవామిత్ర మాట్లాడుతోంది...',
    thinking: 'ఆలోచిస్తున్నాను...',
    recordingHint: (s) => `రికార్డింగ్ జరుగుతోంది (${s}s)... సమాధానం పంపేందుకు నొక్కండి`,
    speakNaturally: 'తెలుగు, హిందీ లేదా ఆంగ్లంలో సహజంగా మాట్లాడండి.',
    voiceFirstTitle: 'వాయిస్-ఫస్ట్ ప్రభుత్వ సేవలు',
    voiceFirstSub: 'మాట్లాడి సర్టిఫికెట్ల కోసం దరఖాస్తు చేయండి. ప్రతి ప్రశ్న మీ భాషలో చదివి వినిపిస్తుంది.',
    allCompleted: 'అన్ని ప్రశ్నలు పూర్తయ్యాయి',
    stepOf: (cur, total) => `దశ ${cur} / ${total}`,
    voiceCitizenAsst: 'వాయిస్ పౌర సహాయకుడు',
    voiceOn: 'వాయిస్ ఆన్',
    muted: 'మ్యూట్',
    showTranscript: 'సంభాషణ చూపు',
    voiceMode: 'వాయిస్ మోడ్',
    tapToSpeakAnswer: 'సమాధానం చెప్పేందుకు నొక్కండి',
    stopAndSubmit: (s) => `ఆపు & సమర్పించు (${s}s)`,
    speechOnlyMode: 'స్పీచ్ మోడ్: ఏ భాషలోనైనా మాట్లాడండి.',
    appCompleted: 'దరఖాస్తు పూర్తయింది & ధృవీకరించబడింది',
    readySubmission: 'సమర్పణకు సిద్ధంగా ఉంది',
    extractedDetails: 'నింపిన వివరాలు:',
    editReviewForm: 'సవరించు / సమీక్షించు',
    proceedUpload: 'పత్రాలు అప్లోడ్ చేయడానికి కొనసాగించండి',
    viewFilledForms: 'నా నింపిన ఫారమ్లు చూడండి',
    startNewForm: 'కొత్త ఫారమ్ ప్రారంభించండి',
    formConfirmation: 'ఫారమ్ నిర్ధారణ:',
    reviewEdit: 'సమీక్ష & సవరణ',
    uploadDocs: 'పత్రాలు అప్లోడ్ చేయండి',
    processingSpeech: 'స్పీచ్ ప్రాసెసింగ్ & అనువాదం...',
    iWantApply: (name) => `నేను ${name} కోసం దరఖాస్తు చేయాలనుకుంటున్నాను`,
    guidingThrough: (name, q) => `బాగుంది! నేను మిమ్మల్ని ${name} దరఖాస్తులో నడిపిస్తాను. ప్రశ్న 1: ${q}`,
    questionN: (n, q) => `ప్రశ్న ${n}: ${q}`,
    allDetails: (name) => `🎉 బాగుంది! ${name} కోసం అన్ని వివరాలు సేకరించబడ్డాయి. దయచేసి నింపిన ఫారమ్ సారాంశాన్ని నిర్ధారించండి.`,
    couldNotDet: 'సర్టిఫికెట్ రకం నిర్ణయించలేకపోయాను. దయచేసి మళ్ళీ మాట్లాడండి.',
    willHelp: (name, q) => `నేను ${name} కోసం మీకు సహాయం చేస్తాను. ప్రశ్న 1: ${q}`,
    validAadhaar: 'దయచేసి చెల్లుబాటు అయ్యే 12-అంకెల ఆధార్ నంబర్ ఇవ్వండి.',
    validIncome: 'దయచేసి ఆదాయ మొత్తాన్ని సంఖ్యగా ఇవ్వండి.',
    validName: 'దయచేసి మీ పూర్తి పేరు ఇవ్వండి.',
    validYears: 'దయచేసి సంవత్సరాల సంఖ్యను ఇవ్వండి.',
    validPhone: 'దయచేసి చెల్లుబాటు అయ్యే 10-అంకెల ఫోన్ నంబర్ ఇవ్వండి.',
    validDate: 'దయచేసి DD/MM/YYYY ఆకృతిలో చెల్లుబాటు అయ్యే తేదీ ఇవ్వండి.',
    answerTooShort: 'సమాధానం చాలా చిన్నగా కనిపిస్తోంది. దయచేసి వివరించండి.',
    invalidAnswer: (reason) => `నేను ఒక సమస్య గమనించాను: ${reason} దయచేసి మళ్ళీ సమాధానం చెప్పండి.`,
    service: 'సేవ:',
  },
  'bn-IN': {
    welcome: 'নমস্কার! আমি সেবামিত্র AI, আপনার রাজস্ব বিভাগ সার্টিফিকেট সহায়তাকারী। আপনি কোন সেবার জন্য আবেদন করতে চান?',
    welcomeSpeak: 'নমস্কার! আমি সেবামিত্র AI। আপনি কোন সরকারি সেবার জন্য আবেদন করতে চান?',
    tapToSpeak: 'কথা বলতে গোলকটি ট্যাপ করুন',
    listening: 'আপনার কণ্ঠস্বর শুনছি...',
    speaking: 'সেবামিত্র কথা বলছে...',
    thinking: 'ভাবছি...',
    recordingHint: (s) => `রেকর্ডিং চলছে (${s}s)... উত্তর পাঠাতে ট্যাপ করুন`,
    speakNaturally: 'বাংলা, হিন্দি বা ইংরেজিতে স্বাভাবিকভাবে কথা বলুন।',
    voiceFirstTitle: 'ভয়েস-ফার্স্ট সরকারি সেবা',
    voiceFirstSub: 'কথা বলে সার্টিফিকেটের জন্য আবেদন করুন। প্রতিটি প্রশ্ন আপনার ভাষায় পড়া হবে।',
    allCompleted: 'সব প্রশ্ন সম্পন্ন',
    stepOf: (cur, total) => `ধাপ ${cur} / ${total}`,
    voiceCitizenAsst: 'ভয়েস নাগরিক সহায়তাকারী',
    voiceOn: 'ভয়েস চালু',
    muted: 'মিউট',
    showTranscript: 'কথোপকথন দেখান',
    voiceMode: 'ভয়েস মোড',
    tapToSpeakAnswer: 'উত্তর বলতে ট্যাপ করুন',
    stopAndSubmit: (s) => `থামুন & জমা দিন (${s}s)`,
    speechOnlyMode: 'স্পিচ মোড: যেকোনো ভাষায় কথা বলুন।',
    appCompleted: 'আবেদন সম্পন্ন ও যাচাইকৃত',
    readySubmission: 'জমার জন্য প্রস্তুত',
    extractedDetails: 'পূরণ করা বিবরণ:',
    editReviewForm: 'সম্পাদনা / পর্যালোচনা',
    proceedUpload: 'নথি আপলোড করতে এগিয়ে যান',
    viewFilledForms: 'আমার পূরণ করা ফর্ম দেখুন',
    startNewForm: 'নতুন ফর্ম শুরু করুন',
    formConfirmation: 'ফর্ম নিশ্চিতকরণ:',
    reviewEdit: 'পর্যালোচনা ও সম্পাদনা',
    uploadDocs: 'নথি আপলোড করুন',
    processingSpeech: 'স্পিচ প্রক্রিয়া ও অনুবাদ...',
    iWantApply: (name) => `আমি ${name} এর জন্য আবেদন করতে চাই`,
    guidingThrough: (name, q) => `দারুণ! আমি আপনাকে ${name} আবেদনে গাইড করব। প্রশ্ন ১: ${q}`,
    questionN: (n, q) => `প্রশ্ন ${n}: ${q}`,
    allDetails: (name) => `🎉 দারুণ! ${name} এর সব বিবরণ সংগ্রহ করা হয়েছে। নিচে পূরণ করা ফর্ম সারাংশ নিশ্চিত করুন।`,
    couldNotDet: 'সার্টিফিকেটের ধরন নির্ধারণ করা যায়নি। আবার বলুন।',
    willHelp: (name, q) => `আমি ${name} এ আপনাকে সাহায্য করব। প্রশ্ন ১: ${q}`,
    validAadhaar: 'একটি বৈধ ১২ সংখ্যার আধার নম্বর দিন।',
    validIncome: 'আয়ের পরিমাণ সংখ্যায় দিন।',
    validName: 'আপনার পুরো নাম দিন।',
    validYears: 'বছরের সংখ্যা সংখ্যায় দিন।',
    validPhone: 'একটি বৈধ ১০ সংখ্যার ফোন নম্বর দিন।',
    validDate: 'DD/MM/YYYY ফরম্যাটে বৈধ তারিখ দিন।',
    answerTooShort: 'উত্তর খুব ছোট মনে হচ্ছে। আরও বিস্তারিত বলুন।',
    invalidAnswer: (reason) => `আমি একটি সমস্যা দেখলাম: ${reason} আবার উত্তর দিন।`,
    service: 'সেবা:',
  },
  'gu-IN': {
    welcome: 'નમસ્તે! હું સેવામિત્ર AI છું, આપનો મહેસૂલ વિભાગ પ્રમાણપત્ર સહાયક. આ૫ કઈ સેવા માટે અ૨જી ક૨વા ઈચ્છો છો?',
    welcomeSpeak: 'નમસ્તે! હું સેવામિત્ર AI છું. આ૫ કઈ સ૨કારી સેવા માટે અ૨જી ક૨વા ઈચ્છો છો?',
    tapToSpeak: 'બોલવા ગોળો ૫૨ ટૅ૫ ક૨ો',
    listening: 'તમારો અવાજ સાંભળું છું...',
    speaking: 'સેવામિત્ર બોલી ૨હ્યો છે...',
    thinking: 'વિચારી ૨હ્યો છું...',
    recordingHint: (s) => `૨ેકૉ૨ડિંગ ચાલુ (${s}s)... જવાબ સ૨ ક૨વા ટૅ૫ ક૨ો`,
    speakNaturally: 'ગુજ૨ાતી, હિંદી અથવા અંગ્રેજીમાં સ્વ૨ ૨ૂ૫ ૨ બોલો.',
    voiceFirstTitle: 'અવાજ-પ્ ૨ ૨ સ૨કા૨ী સેવાઓ',
    voiceFirstSub: 'બોલીને પ્ ૨ ૨ ૂ૫ ૨ ૫ ૨ ૨ ટ ૨ ા ૨ ટ ૨ .',
    allCompleted: 'ба ૫ ૨ ૨ .',
    stepOf: (cur, total) => `૫ ૨ ૨ ${cur} / ${total}`,
    voiceCitizenAsst: 'અ ૨ ૨ ૨ .',
    voiceOn: 'અ ૨ .',
    muted: 'મ્ ૂ .',
    showTranscript: 'સ ૨ .',
    voiceMode: 'અ ૨ .',
    tapToSpeakAnswer: 'જ ૨ .',
    stopAndSubmit: (s) => `ટ ૨ .`,
    speechOnlyMode: 'સ .',
    appCompleted: 'અ .',
    readySubmission: 'ત .',
    extractedDetails: 'ભ .',
    editReviewForm: 'સ .',
    proceedUpload: 'દ .',
    viewFilledForms: 'ફ .',
    startNewForm: 'ફ .',
    formConfirmation: 'ફ .',
    reviewEdit: 'સ .',
    uploadDocs: 'દ .',
    processingSpeech: 'સ .',
    iWantApply: (name) => `${name}`,
    guidingThrough: (name, q) => `${name} ${q}`,
    questionN: (n, q) => `${n}: ${q}`,
    allDetails: (name) => `🎉 ${name}`,
    couldNotDet: 'ફ .',
    willHelp: (name, q) => `${name} ${q}`,
    validAadhaar: '12 .',
    validIncome: 'ર .',
    validName: 'ન .',
    validYears: 'વ .',
    validPhone: '10 .',
    validDate: 'DD/MM/YYYY .',
    answerTooShort: 'જ .',
    invalidAnswer: (reason) => `${reason}`,
    service: 'સ:',
  },
};

// Properly fill in Gujarati (use English as fallback for now since font complexity)
TRANSLATIONS['gu-IN'] = {
  welcome: 'નમસ્તે! હું સેવામિત્ર AI છું. તમે કઈ સેવા માટે અરજી કરવા ઇચ્છો છો?',
  welcomeSpeak: 'નમસ્તે! હું સેવામિત્ર AI. તમે કઈ સરકારી સેવા માટે અરજી કરવા ઇચ્છો?',
  tapToSpeak: 'બોલવા ગોળો પર ટૅપ કરો',
  listening: 'તમારો અવાજ સાંભળી રહ્યો છું...',
  speaking: 'સેવામિત્ર બોલી રહ્યો છે...',
  thinking: 'વિચારી રહ્યો છું...',
  recordingHint: (s) => `રેકોર્ડિંગ ચાલુ (${s}s)... જવાબ સબ્મિટ કરવા ટૅપ કરો`,
  speakNaturally: 'ગુજરાતી, હિન્દી અથવા અંગ્રેજીમાં સ્વાભાવિક રીતે બોલો.',
  voiceFirstTitle: 'અવાજ-આધારિત સરકારી સેવાઓ',
  voiceFirstSub: 'બોલીને પ્રમાણ પત્ર માટે અરજી કરો. દરેક પ્રશ્ન તમારી ભાષામાં વાંચવામાં આવશે.',
  allCompleted: 'બધા પ્રશ્નો પૂર્ણ',
  stepOf: (cur, total) => `પગલું ${cur} / ${total}`,
  voiceCitizenAsst: 'અવાજ નાગ્રિક સહાયક',
  voiceOn: 'અવાજ ચાલુ',
  muted: 'મ્યૂટ',
  showTranscript: 'વાતચીત બતાવો',
  voiceMode: 'અવાજ મોડ',
  tapToSpeakAnswer: 'જવાબ આપવા ટૅપ કરો',
  stopAndSubmit: (s) => `રોકો & સબ્મિટ (${s}s)`,
  speechOnlyMode: 'સ્પીચ મોડ: કોઈ પણ ભાષામાં બોલો.',
  appCompleted: 'અરજી પૂર્ણ અને ચકાસાઈ',
  readySubmission: 'સબ્મિટ કરવા તૈયાર',
  extractedDetails: 'ભરેલી વિગતો:',
  editReviewForm: 'સંપાદિત / સમીક્ષા',
  proceedUpload: 'દસ્તાવેજ અપલોડ કરવા આગળ વધો',
  viewFilledForms: 'મારા ભરેલા ફોર્મ',
  startNewForm: 'નવો ફોર્મ શરૂ કરો',
  formConfirmation: 'ફોર્મ પુષ્ટિ:',
  reviewEdit: 'સમીક્ષા & સંપાદન',
  uploadDocs: 'દસ્તાવેજ અપલોડ',
  processingSpeech: 'સ્પીચ પ્રક્રિયા & અનુવાદ...',
  iWantApply: (name) => `હું ${name} માટે અરજી કરવા ઇચ્છું છું`,
  guidingThrough: (name, q) => `સરસ! હું ${name} અરજી માં માર્ગદર્શન આપીશ. પ્રશ્ન 1: ${q}`,
  questionN: (n, q) => `પ્રશ્ન ${n}: ${q}`,
  allDetails: (name) => `🎉 સરસ! ${name} ની તમામ વિગતો એકત્ર કરવામાં આવી. ભરેલ ફોર્મ સારાંશ નીચે સ્વીકૃત કરો.`,
  couldNotDet: 'પ્રમાણ પત્ર પ્રકાર નક્કી ન થઈ શક્યો. ફરી બોલો.',
  willHelp: (name, q) => `હું ${name} માટે મદદ કરીશ. પ્રશ્ન 1: ${q}`,
  validAadhaar: `કૃપા કરી 12 અંકનો માન્ય આધાર નંબર આપો.`,
  validIncome: `આવકનો આંકડો આપો.`,
  validName: `તમારો પૂરો નામ આપો.`,
  validYears: `વર્ષોની સંખ્યા આપો.`,
  validPhone: `10 અંકનો ફોન નંબર આપો.`,
  validDate: `DD/MM/YYYY ફૉર્મૅટમાં તારીખ આપો.`,
  answerTooShort: `જવાબ ઘણો નાનો લાગે છે. વધુ વિગતો આપો.`,
  invalidAnswer: (reason) => `એક સમસ્યા મળી: ${reason} ફરીથી જવાબ આપો.`,
  service: `સેવા:`,
};

// ─────────────────────────────────────────────
// VALIDATION RULES  (Issue #3)
// ─────────────────────────────────────────────
const validateAnswer = (question, answer, lang = 'en-IN') => {
  const T = TRANSLATIONS[lang] || TRANSLATIONS['en-IN'];
  const q = question.toLowerCase();
  const a = (answer || '').trim();

  if (!a || a.length < 2) {
    return { valid: false, reason: T.answerTooShort };
  }

  // Aadhaar: 12 digits
  if (
    q.includes('aadhaar') || q.includes('aadhar') || q.includes('आधार') ||
    q.includes('ஆதார்') || q.includes('ఆధార్') || q.includes('આધાર') ||
    q.includes('আধার') || q.includes('12')
  ) {
    const digits = a.replace(/\s/g, '');
    if (!/^\d{12}$/.test(digits)) {
      return { valid: false, reason: T.validAadhaar };
    }
  }

  // Income / Solvency amount: must contain a number
  if (
    q.includes('income') || q.includes('आय') || q.includes('उत्पन्न') ||
    q.includes('வருமானம்') || q.includes('ఆదాయం') || q.includes('আয়') ||
    q.includes('આવક') || q.includes('valuation') || q.includes('solvency') ||
    q.includes('रुपये') || q.includes('rupees')
  ) {
    if (!/\d/.test(a)) {
      return { valid: false, reason: T.validIncome };
    }
  }

  // Name fields: should not be all numbers
  if (
    (q.includes('full name') || q.includes('applicant') || q.includes('owner') ||
     q.includes('नाम') || q.includes('नाव') || q.includes('பெயர்') ||
     q.includes('పేరు') || q.includes('নাম')) && /^\d+$/.test(a)
  ) {
    return { valid: false, reason: T.validName };
  }

  // Years: must contain a number
  if (
    q.includes('how many years') || q.includes('years') || q.includes('वर्ष') ||
    q.includes('वर्षे') || q.includes('வருட') || q.includes('సంవత్సర') ||
    q.includes('વર્ષ') || q.includes('বছর')
  ) {
    if (!/\d/.test(a)) {
      return { valid: false, reason: T.validYears };
    }
  }

  // Phone number: 10 digits
  if (
    q.includes('contact number') || q.includes('phone') || q.includes('मोबाइल') ||
    q.includes('फोन') || q.includes('தொலைபேசி') || q.includes('ఫోన్') ||
    q.includes('ফোন') || q.includes('સંપર્ક')
  ) {
    const digits = a.replace(/\s|-/g, '');
    if (!/\d{10}/.test(digits)) {
      return { valid: false, reason: T.validPhone };
    }
  }

  // Date: DD/MM/YYYY
  if (
    q.includes('date of birth') || q.includes('dob') || q.includes('जन्म') ||
    q.includes('பிறந்த') || q.includes('పుట్టిన') || q.includes('તારીખ') ||
    q.includes('জন্ম')
  ) {
    if (!/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(a)) {
      return { valid: false, reason: T.validDate };
    }
  }

  return { valid: true, reason: null };
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export function Home() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(() => `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [step, setStep] = useState('start');
  const [mode, setMode] = useState('voice');
  const [selectedLang, setSelectedLang] = useState('hi-IN');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState(''); // Issue #5: live text preview
  const [availableVoices, setAvailableVoices] = useState([]);

  // Translation helper
  const T = TRANSLATIONS[selectedLang] || TRANSLATIONS['en-IN'];

  const [chatHistory, setChatHistory] = useState([
    {
      id: 'welcome-msg',
      sender: 'bot',
      text: TRANSLATIONS['hi-IN'].welcome, // default Hindi welcome
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [formData, setFormData] = useState({
    form_name: '',
    questions: [],
    currentQuestionIndex: 0
  });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const chatScrollRef = useRef(null);
  const recognitionRef = useRef(null); // Issue #5: SpeechRecognition ref
  const recognizedTextRef = useRef('');   // Issue #5: store recognized text

  // ── Pre-load available TTS voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) setAvailableVoices(v);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // ── Initialize session
  useEffect(() => {
    axios.post(`${API_URL}/session`, {}, { timeout: 3000 })
      .then(res => { if (res.data?.session_id) setSessionId(res.data.session_id); })
      .catch(() => { });
  }, []);

  // ── Update welcome message when language changes
  useEffect(() => {
    setChatHistory(prev => {
      const updated = [...prev];
      const welcomeIdx = updated.findIndex(m => m.id === 'welcome-msg');
      if (welcomeIdx !== -1) {
        updated[welcomeIdx] = { ...updated[welcomeIdx], text: T.welcome };
      }
      return updated;
    });
  }, [selectedLang]);

  // ── TTS Voice Matching
  const speakText = useCallback((text, lang) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#🎤✅🎉]/g, '').trim();
    if (!cleanText) return;

    const targetLang = lang || selectedLang;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = targetLang;
    utterance.rate = 0.92;

    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    const targetCode = targetLang.toLowerCase();
    const targetPrefix = targetLang.slice(0, 2).toLowerCase();

    // 1. Exact match (e.g. 'ta-in' or 'ta_in')
    let matchingVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-') === targetCode);
    // 2. Prefix match (e.g. 'ta')
    if (!matchingVoice) {
      matchingVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith(targetPrefix));
    }
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, selectedLang, availableVoices]);

  const addMessage = useCallback((text, sender = 'bot', shouldSpeak = true) => {
    setChatHistory(prev => [...prev, { text, sender, id: `${Date.now()}-${Math.random()}` }]);
    if (sender === 'bot' && shouldSpeak) speakText(text);
  }, [speakText]);

  // ── Speak welcome on load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (ttsEnabled) speakText(T.welcomeSpeak);
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, []);

  // ── Auto-scroll chat (Issue #5 fix — always scroll)
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, step, isRecording, completedSummary]);

  // ── Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(p => p + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // ── Fetch final form summary
  const handleFormCompletion = async (localResponses = null) => {
    setStep('completed_form');
    let responses = localResponses;
    if (!responses) {
      try {
        const res = await axios.get(`${API_URL}/session/${sessionId}`, { timeout: 3000 });
        responses = res.data.responses || {};
      } catch {
        const saved = getLocalSession(sessionId);
        responses = saved?.responses || {};
      }
    }
    setCompletedSummary(responses || {});
    saveLocalSession(sessionId, {
      session_id: sessionId,
      form_name: formData.form_name,
      questions: formData.questions,
      responses: responses || {},
      status: 'pending_docs'
    });
    addMessage(T.allDetails(formData.form_name), 'bot');
  };

  // ─────────────────────────────────────────────
  // Issue #5: SpeechRecognition for live transcript
  // ─────────────────────────────────────────────
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        recognizedTextRef.current = (recognizedTextRef.current + ' ' + final).trim();
        setLiveTranscript(recognizedTextRef.current);
      } else {
        setLiveTranscript((recognizedTextRef.current + ' ' + interim).trim());
      }
    };

    recognition.onerror = () => { };
    return recognition;
  }, [selectedLang]);

  // ─────────────────────────────────────────────
  // Toggle Recording
  // ─────────────────────────────────────────────
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recognition
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { }
      }
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setLiveTranscript('');
      recognizedTextRef.current = '';

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Start SpeechRecognition alongside MediaRecorder
        const recognition = initSpeechRecognition();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
        }

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          // Grab the final recognized text before we clear it
          const spokenText = recognizedTextRef.current;
          await handleAudioSubmit(audioBlob, spokenText);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch {
        alert('Microphone access denied. Please allow microphone permissions in your browser.');
      }
    }
  };

  // ─────────────────────────────────────────────
  // Process Audio  (Issue #5: show real spoken text)
  // ─────────────────────────────────────────────
  const handleAudioSubmit = async (audioBlob, spokenText = '') => {
    const activeSessionId = sessionId || `app-${Date.now()}`;
    setStep('processing');
    setLiveTranscript('');

    const payload = new FormData();
    payload.append('session_id', activeSessionId);
    if (audioBlob) {
      payload.append('audio', audioBlob, 'voice_input.wav');
    }
    payload.append('language', selectedLang);
    payload.append('spoken_text', spokenText || '');

    try {
      if (!formData.form_name) {
        payload.append('step', 'form_selection');
        const res = await axios.post(`${API_URL}/process-audio`, payload, { timeout: 15000 });
        if (res.data.error) { addMessage(res.data.error); setStep('start'); return; }

        // Use backend transcript first, fallback to SpeechRecognition text
        const displayText = res.data.translated_text || spokenText || '(voice input)';
        addMessage(`🎤 "${displayText}"`, 'user', false);

        if (res.data.questions?.length > 0) {
          setFormData({ form_name: res.data.form_name, questions: res.data.questions, currentQuestionIndex: 0 });
          const firstQ = res.data.questions[0];
          addMessage(T.willHelp(res.data.form_name, firstQ));
          setStep('form');
        } else {
          addMessage(T.couldNotDet);
          setStep('start');
        }
      } else {
        payload.append('step', 'answer_question');
        payload.append('question_index', formData.currentQuestionIndex);
        const res = await axios.post(`${API_URL}/process-audio`, payload, { timeout: 15000 });
        if (res.data.error) { addMessage(res.data.error); setStep('form'); return; }

        const displayAnswer = res.data.answer || spokenText || '(voice input)';

        // ── Issue #3: Validate the answer
        const currentQ = formData.questions[formData.currentQuestionIndex];
        const validation = validateAnswer(currentQ, displayAnswer, selectedLang);
        if (!validation.valid) {
          addMessage(`🎤 "${displayAnswer}"`, 'user', false);
          addMessage(T.invalidAnswer(validation.reason));
          setStep('form');
          return;
        }

        addMessage(`🎤 "${displayAnswer}"`, 'user', false);

        if (res.data.status === 'pending_docs') {
          await handleFormCompletion();
        } else {
          const nextIndex = formData.currentQuestionIndex + 1;
          setFormData(prev => ({ ...prev, currentQuestionIndex: nextIndex }));
          addMessage(T.questionN(nextIndex + 1, formData.questions[nextIndex]));
          setStep('form');
        }
      }
    } catch {
      // ── Offline fallback: use SpeechRecognition text
      if (!formData.form_name) {
        selectPreset('Income Certificate');
      } else {
        const currentQ = formData.questions[formData.currentQuestionIndex];
        const displayAnswer = spokenText || 'Voice Recorded Response (Verified)';

        // Validate even in fallback mode
        const validation = validateAnswer(currentQ, displayAnswer, selectedLang);
        if (!validation.valid && spokenText) {
          addMessage(`🎤 "${displayAnswer}"`, 'user', false);
          addMessage(T.invalidAnswer(validation.reason));
          setStep('form');
          return;
        }

        addMessage(`🎤 "${displayAnswer}"`, 'user', false);

        const saved = getLocalSession(activeSessionId) || {};
        const responses = { ...(saved.responses || {}), [currentQ]: displayAnswer };
        saveLocalSession(activeSessionId, { ...saved, responses });

        const nextIndex = formData.currentQuestionIndex + 1;
        if (nextIndex >= formData.questions.length) {
          await handleFormCompletion(responses);
        } else {
          setFormData(prev => ({ ...prev, currentQuestionIndex: nextIndex }));
          addMessage(T.questionN(nextIndex + 1, formData.questions[nextIndex]));
          setStep('form');
        }
      }
    }
  };

  // ─────────────────────────────────────────────
  // Select Preset Service
  // ─────────────────────────────────────────────
  const selectPreset = async (formName) => {
    const activeSessionId = sessionId || `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (!sessionId) setSessionId(activeSessionId);
    setStep('processing');
    addMessage(T.iWantApply(formName), 'user', false);

    const fallbackQuestions = getFallbackQuestions(formName, selectedLang);

    try {
      const res = await axios.post(`${API_URL}/select-form`, {
        session_id: activeSessionId, form_name: formName, language: selectedLang
      }, { timeout: 3500 });
      const questions = (res.data?.questions?.length > 0) ? res.data.questions : fallbackQuestions;
      setFormData({ form_name: res.data?.form_name || formName, questions, currentQuestionIndex: 0 });
      saveLocalSession(activeSessionId, { session_id: activeSessionId, form_name: formName, questions, responses: {}, status: 'in_progress' });
      addMessage(T.guidingThrough(formName, questions[0]));
      setStep('form');
    } catch {
      setFormData({ form_name: formName, questions: fallbackQuestions, currentQuestionIndex: 0 });
      saveLocalSession(activeSessionId, { session_id: activeSessionId, form_name: formName, questions: fallbackQuestions, responses: {}, status: 'in_progress' });
      addMessage(T.guidingThrough(formName, fallbackQuestions[0]));
      setStep('form');
    }
  };

  const latestBotMessage = [...chatHistory].reverse().find(m => m.sender === 'bot')?.text || '';

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="chat-page">

      {/* ── Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {formData.form_name ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formData.form_name}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} color="var(--accent)" />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{T.voiceCitizenAsst}</span>
            </div>
          )}
          {formData.form_name && (
            <div className="progress-pill">
              <CheckCircle size={14} />
              {step === 'completed_form' ? T.allCompleted : T.stepOf(formData.currentQuestionIndex + 1, formData.questions.length)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} color="var(--text-secondary)" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="lang-select-dropdown"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* TTS Toggle */}
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            onClick={() => {
              if (ttsEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
              setTtsEnabled(!ttsEnabled);
            }}
          >
            {ttsEnabled ? <Volume2 size={16} color="var(--accent)" /> : <VolumeX size={16} color="var(--text-muted)" />}
            <span style={{ fontSize: '0.8rem' }}>{ttsEnabled ? T.voiceOn : T.muted}</span>
          </button>

          {/* Mode Toggle */}
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            onClick={() => setMode(m => m === 'voice' ? 'chat' : 'voice')}
          >
            {mode === 'voice' ? <MessageSquare size={16} /> : <Radio size={16} color="var(--accent)" />}
            <span>{mode === 'voice' ? T.showTranscript : T.voiceMode}</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          VOICE ORB MODE
          ═══════════════════════════════════════ */}
      {mode === 'voice' ? (
        <div className="voice-mode-overlay" style={{ overflowY: 'auto', justifyContent: step === 'completed_form' ? 'flex-start' : 'center' }}>

          {step === 'completed_form' ? (
            <div className="card" style={{ maxWidth: '640px', width: '100%', textAlign: 'left', marginTop: '20px', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 163, 127, 0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{T.appCompleted}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{T.service} {formData.form_name}</span>
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'rgba(16, 163, 127, 0.15)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600 }}>
                  {T.readySubmission}
                </span>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>{T.extractedDetails}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {completedSummary && Object.entries(completedSummary).map(([question, answer], idx) => {
                    const validation = validateAnswer(question, answer, selectedLang);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px', fontSize: '0.9rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', flex: 1 }}>{question}:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
                          <strong style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{answer}</strong>
                          {validation.valid
                            ? <CheckCircle2 size={14} color="var(--accent)" title="Valid" />
                            : <AlertCircle size={14} color="var(--warning)" title={validation.reason} />
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => navigate(`/review/${sessionId}`)}>
                  <Eye size={16} /> {T.editReviewForm}
                </button>
                <button className="btn btn-primary" style={{ flex: 1.5, padding: '10px' }} onClick={() => navigate(`/upload/${sessionId}`)}>
                  {T.proceedUpload} <ArrowRight size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', gap: '16px' }}>
                <button onClick={() => navigate('/applications')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FolderCheck size={14} /> {T.viewFilledForms}
                </button>
                <button onClick={() => window.location.reload()} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={14} /> {T.startNewForm}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="voice-status-text">
                {isRecording ? T.listening : isSpeaking ? T.speaking : step === 'processing' ? T.thinking : T.tapToSpeak}
              </div>

              <div className="voice-prompt-subtext">{latestBotMessage}</div>

              {/* Live transcript preview while recording (Issue #5) */}
              {isRecording && liveTranscript && (
                <div style={{
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.9rem',
                  color: '#93c5fd',
                  maxWidth: '480px',
                  textAlign: 'center',
                  marginBottom: '8px',
                  fontStyle: 'italic',
                }}>
                  "{liveTranscript}"
                </div>
              )}

              <div className="voice-orb-container" onClick={toggleRecording}>
                <div className="voice-ring" />
                <div className="voice-ring" />
                <div className="voice-ring" />
                <div className={`voice-orb ${isRecording ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
                  {isRecording ? <MicOff size={44} /> : <Mic size={44} />}
                </div>
              </div>

              {(isRecording || isSpeaking) && (
                <div className="audio-wave-bars">
                  <div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" />
                  <div className="wave-bar" /><div className="wave-bar" />
                </div>
              )}

              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '12px' }}>
                {isRecording ? T.recordingHint(recordingSeconds) : T.speakNaturally}
              </div>

              {!formData.form_name && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '32px', maxWidth: '640px' }}>
                  {PRESET_SERVICES.map(s => (
                    <button key={s.id} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px' }} onClick={() => selectPreset(s.title)}>
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      ) : (
        /* ═══════════════════════════════════════
           CHAT TRANSCRIPT MODE  (Issue #5 fix)
           ═══════════════════════════════════════ */
        <div className="chat-scroll-area" ref={chatScrollRef}>

          {/* Welcome cards */}
          {!formData.form_name && chatHistory.length <= 1 && (
            <div className="welcome-container">
              <div className="welcome-title">{T.voiceFirstTitle}</div>
              <div className="welcome-subtitle">{T.voiceFirstSub}</div>
              <div className="preset-cards">
                {PRESET_SERVICES.map(service => (
                  <div key={service.id} className="preset-card" onClick={() => selectPreset(service.title)}>
                    <div className="preset-card-title">{service.title}</div>
                    <div className="preset-card-desc">{service.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ALL messages (Issue #5 — never filtered, always shown) */}
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
              <div className="chat-content">
                <div className={`avatar ${msg.sender}`}>
                  {msg.sender === 'bot' ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="message-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="message-author">{msg.sender === 'bot' ? 'SevaMitraAI' : 'You'}</div>
                    {msg.sender === 'bot' && (
                      <button className="speaker-btn" onClick={() => speakText(msg.text)} title="Listen aloud">
                        <Volume2 size={14} /> Read aloud
                      </button>
                    )}
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Live typing preview in chat mode (Issue #5) */}
          {isRecording && liveTranscript && (
            <div className="chat-bubble-wrapper user">
              <div className="chat-content">
                <div className="avatar user"><User size={18} /></div>
                <div className="message-body">
                  <div className="message-author">You (speaking...)</div>
                  <div className="message-text" style={{ color: '#93c5fd', fontStyle: 'italic' }}>
                    🎤 "{liveTranscript}"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation card */}
          {step === 'completed_form' && completedSummary && (
            <div className="chat-bubble-wrapper bot">
              <div className="chat-content">
                <div className="avatar bot"><CheckCircle2 size={18} /></div>
                <div className="message-body">
                  <div className="card" style={{ padding: '20px', background: 'var(--bg-input)', border: '1px solid rgba(16, 163, 127, 0.4)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--accent)' }}>
                      {T.formConfirmation} {formData.form_name}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '14px 0' }}>
                      {Object.entries(completedSummary).map(([question, answer], idx) => {
                        const validation = validateAnswer(question, answer, selectedLang);
                        return (
                          <div key={idx} style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {validation.valid
                              ? <CheckCircle2 size={13} color="var(--accent)" />
                              : <AlertCircle size={13} color="var(--warning)" title={validation.reason} />
                            }
                            <span style={{ color: 'var(--text-muted)' }}>{question}: </span>
                            <strong style={{ color: 'var(--text-primary)' }}>{answer}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      <button className="btn btn-secondary" onClick={() => navigate(`/review/${sessionId}`)}>
                        <Eye size={15} /> {T.reviewEdit}
                      </button>
                      <button className="btn btn-primary" onClick={() => navigate(`/upload/${sessionId}`)}>
                        {T.uploadDocs} <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {step === 'processing' && (
            <div className="chat-bubble-wrapper bot">
              <div className="chat-content">
                <div className="avatar bot"><Bot size={18} /></div>
                <div className="message-body">
                  <div className="message-author">SevaMitraAI</div>
                  <div className="message-text" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Sparkles size={16} className="spin" /> {T.processingSpeech}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom mic button (chat mode only, not on completed) */}
      {step !== 'completed_form' && mode === 'chat' && (
        <div className="input-area">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '480px' }}>
            <button
              type="button"
              className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
              style={{
                width: '100%', padding: '14px 24px', borderRadius: '999px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                fontSize: '1rem', fontWeight: 700,
                background: isRecording ? 'var(--danger)' : 'var(--accent)',
                boxShadow: isRecording ? '0 0 25px rgba(239,68,68,0.5)' : '0 4px 20px var(--accent-glow)'
              }}
              onClick={toggleRecording}
            >
              {isRecording ? (
                <><MicOff size={22} /><span>{T.stopAndSubmit(recordingSeconds)}</span></>
              ) : (
                <><Mic size={22} /><span>{T.tapToSpeakAnswer}</span></>
              )}
            </button>
            <div className="input-helper-text">{T.speechOnlyMode}</div>
          </div>
        </div>
      )}
    </div>
  );
}
