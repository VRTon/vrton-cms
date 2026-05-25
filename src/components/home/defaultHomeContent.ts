import type { EventItem, CollaboratorItem, FAQItem } from '../../types';

export const EVENTS_DEFAULT_DATA: Record<string, EventItem[]> = {
  2025: [
    { src: '/Eventos/2025/event-2025-1.webp', alt: 'VRTon 2025 Event' },
    { src: '/Eventos/2025/event-2025-2.webp', alt: 'VRTon 2025 Event' },
    { src: '/Eventos/2025/event-2025-3.webp', alt: 'VRTon 2025 Event' },
  ],
  2024: [
    { src: '/Eventos/2024/event-2024-1.webp', alt: 'VRTon 2024 Event' },
    { src: '/Eventos/2024/event-2024-2.webp', alt: 'VRTon 2024 Event' },
    { src: '/Eventos/2024/event-2024-3.webp', alt: 'VRTon 2024 Event' },
  ],
  2023: [
    { src: '/Eventos/2023/event-2023-1.webp', alt: 'VRTon 2023 Event' },
    { src: '/Eventos/2023/event-2023-2.webp', alt: 'VRTon 2023 Event' },
    { src: '/Eventos/2023/event-2023-3.webp', alt: 'VRTon 2023 Event' },
  ],
};

interface EventMeta {
  amount: string
  collaborators: CollaboratorItem[]
}

export const EVENTS_DEFAULT_META: Record<string, EventMeta> = {
  2025: {
    amount: 'U$D 3.255',
    collaborators: [
      { src: '/Comunidades/ElPecado.webp', alt: 'El Pecado' },
      { src: '/Comunidades/Furality.webp', alt: 'Furality' },
      { src: '/Comunidades/BurlyNoir.webp', alt: 'Burly Noir' },
      { src: '/Comunidades/CultOfSecrets.webp', alt: 'Cult Of Secrets' },
      { src: '/Comunidades/CalamityLogo.webp', alt: 'Calamity' },
      { src: '/Comunidades/CopaCabana.webp', alt: 'Copa Cabana' },
      { src: '/Comunidades/Xtasis.webp', alt: 'Xtasis' },
      { src: '/Comunidades/PIVR.webp', alt: 'PIVR' },
      { src: '/Comunidades/GohanTrackers.webp', alt: 'Gohan Trackers' },
      { src: '/Comunidades/valenvrc.webp', alt: 'ValenVRC' },
      { src: '/Comunidades/VRChateando.webp', alt: 'VRChateando' },
      { src: '/Comunidades/CafeMononita.webp', alt: 'Cafe Mononita' },
    ],
  },
  2024: {
    amount: 'U$D 1458',
    collaborators: [
      { src: '/Comunidades/ElPecado.webp', alt: 'El Pecado' },
      { src: '/Comunidades/Xtasis.webp', alt: 'Xtasis' },
      { src: '/Comunidades/50ajolopesos.webp', alt: '50 Ajolo Pesos' },
      { src: '/Comunidades/CalamityLogo.webp', alt: 'Calamity' },
      { src: '/Comunidades/CultOfSecrets.webp', alt: 'Cult Of Secrets' },
      { src: '/Comunidades/ElAlba.webp', alt: 'El Alba' },
      { src: '/Comunidades/TeamLatam.webp', alt: 'Team Latam' },
      { src: '/Comunidades/5DAcademy.webp', alt: '5D Academy' },
    ],
  },
  2023: {
    amount: 'U$D 474',
    collaborators: [
      { src: '/Comunidades/Xtasis.webp', alt: 'Xtasis' },
      { src: '/Comunidades/ElPecado.webp', alt: 'El Pecado' },
      { src: '/Comunidades/CultOfSecrets.webp', alt: 'Cult Of Secrets' },
    ],
  },
};

export const FAQ_DEFAULT_ITEMS_LEFT: FAQItem[] = [
  {
    question: 'Que es VRTon?',
    answer_html: 'VRTon es una iniciativa voluntaria que une comunidades del metaverso de realidad virtual para lograr objetivos solidarios. Nos enfocamos en educacion, inspiracion, empatia y filantropia, usando la tecnologia para ayudar a otros y mejorar vidas.',
  },
  {
    question: 'Como puedo asistir al evento?',
    answer_html: "El evento de este ano se realizara el <b>6 y 7 de noviembre</b>. Podes asistir uniendote a nuestro <a href='https://vrc.group/VRTON.0659'>grupo de VRChat</a>. El evento es completamente gratuito.",
  },
  {
    question: 'Necesito equipo VR para participar?',
    answer_html: 'No. Aunque un visor VR brinda la experiencia mas inmersiva, podes participar desde una computadora o incluso desde tu telefono.',
  },
  {
    question: 'Como puedo ser voluntario?',
    answer_html: "Siempre estamos buscando personas apasionadas para sumarse al equipo. Hace click <a href='VOLUNTEERING_URL'>aca</a> para conocer mas sobre oportunidades de voluntariado.",
  },
];

export const FAQ_DEFAULT_ITEMS_RIGHT: FAQItem[] = [
  {
    question: 'A donde va el dinero?',
    answer_html: 'El 100% de los fondos recaudados va directamente a las organizaciones y causas aliadas. Promovemos las donaciones a traves de enlaces oficiales y no recaudamos dinero directamente.',
  },
  {
    question: 'Que tipo de actividades habra en VRTon?',
    answer_html: 'Vas a encontrar actividades para distintos intereses y edades, incluyendo conciertos y shows en vivo, talleres educativos, campanas de concientizacion y encuentros comunitarios.',
  },
  {
    question: 'Como me mantengo al dia con los eventos?',
    answer_html: 'Segui nuestras redes sociales (Discord, Instagram, X, TikTok, YouTube y Twitch) para enterarte de novedades, anuncios y contenido detras de escena.',
  },
];

export const FAQ_DEFAULT_ITEMS_LEFT_EN: FAQItem[] = [
  {
    question: 'What is VRTon?',
    answer_html: 'VRTon is a voluntary initiative that brings together communities from the virtual reality metaverse to achieve solidarity goals. We focus on education, inspiration, empathy, and philanthropy while using technology to help others and improve lives.',
  },
  {
    question: 'How can I attend an event?',
    answer_html: "This year's event will be held on the <b>6th and 7th of November</b>. You can attend by joining our <a href='https://vrc.group/VRTON.0659'>VRChat Group</a>. The event is completely free.",
  },
  {
    question: 'Do I need VR equipment to participate?',
    answer_html: 'No! While VR headsets provide the most immersive experience, you can join our events using a computer or even your phone!',
  },
  {
    question: 'How can I volunteer?',
    answer_html: "We're always looking for passionate individuals to join our team! Click <a href='VOLUNTEERING_URL'>here</a> to learn more about the volunteer opportunities available.",
  },
];

export const FAQ_DEFAULT_ITEMS_RIGHT_EN: FAQItem[] = [
  {
    question: 'Where does the money go?',
    answer_html: "100% of the funds raised go directly to our partner charities and causes. We promote donating using the official links provided by the organizations and don't collect money ourselves.",
  },
  {
    question: 'What kind of activities can we expect on VRTon?',
    answer_html: 'You can expect a variety of activities on VRTon catering to different interests and age groups, including live concerts and shows, educational workshops, awareness campaigns, and community gatherings.',
  },
  {
    question: 'How can I stay updated on upcoming events?',
    answer_html: 'Follow us on our social media channels (Discord, Instagram, X, TikTok, YouTube, and Twitch) for the latest news, event announcements, and behind-the-scenes content.',
  },
];

interface EventRow {
  year: string
  amount: string
  events: EventItem[]
  collaborators: CollaboratorItem[]
}

export function buildDefaultEventsRows(): EventRow[] {
  return Object.keys(EVENTS_DEFAULT_DATA)
    .map((year) => ({
      year: String(year),
      amount: EVENTS_DEFAULT_META[year]?.amount || '',
      events: Array.isArray(EVENTS_DEFAULT_DATA[year]) ? EVENTS_DEFAULT_DATA[year].map((item) => ({ ...item })) : [],
      collaborators: Array.isArray(EVENTS_DEFAULT_META[year]?.collaborators)
        ? EVENTS_DEFAULT_META[year].collaborators.map((item) => ({ ...item }))
        : [],
    }))
    .sort((a, b) => Number(b.year) - Number(a.year));
}

interface FaqConfig {
  leftItems: FAQItem[]
  rightItems: FAQItem[]
}

export function buildDefaultFaqConfig(lang = 'es'): FaqConfig {
  const isEnglish = String(lang || '').toLowerCase() === 'en';
  const leftSource = isEnglish ? FAQ_DEFAULT_ITEMS_LEFT_EN : FAQ_DEFAULT_ITEMS_LEFT;
  const rightSource = isEnglish ? FAQ_DEFAULT_ITEMS_RIGHT_EN : FAQ_DEFAULT_ITEMS_RIGHT;

  return {
    leftItems: leftSource.map((entry) => ({ ...entry })),
    rightItems: rightSource.map((entry) => ({ ...entry })),
  };
}