// Security & Safety Classifier for Indonesian News
// Scores and categorizes news items by relevance to national security, social safety,
// economic stability, and corporate security.

export type SecurityCategory =
  | 'social_unrest'
  | 'economic_crisis'
  | 'crime_terrorism'
  | 'political_crisis'
  | 'disaster_emergency'
  | 'corporate_security'
  | 'cyber_security'
  | 'health_crisis'
  | 'energy_food_security'
  | 'regulatory_legal'
  | 'general'

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

export interface SecurityClassification {
  isRelevant: boolean       // Whether this news is security/safety relevant
  category: SecurityCategory
  severity: SeverityLevel
  confidence: number        // 0.0 to 1.0
  tags: string[]            // Specific security tags (e.g., ['demo', 'inflasi', 'PHK'])
  reason: string            // Brief explanation of why it's relevant
}

// Indonesian security/safety keywords organized by category
// Higher weight = more security-relevant
interface KeywordEntry {
  words: string[]           // Indonesian keywords
  weight: number            // 1-10 (10 = extremely relevant to security)
  tags: string[]            // Associated security tags
}

const SECURITY_KEYWORDS: Record<SecurityCategory, KeywordEntry[]> = {
  social_unrest: [
    { words: ['demo', 'demonstrasi', 'unjuk rasa', 'mogok', 'bentrokan', 'kerusuhan', 'reformasi', 'anarkis', 'brutal'], weight: 9, tags: ['demo', 'kerusuhan', 'konflik-sosial'] },
    { words: ['mahasiswa', 'buruh', 'tuntutan', 'orasi', 'barikade', 'kawal', 'alihkan', 'hindari', 'bundaran hi', 'patung kuda'], weight: 6, tags: ['aksi-massa'] },
    { words: ['provokasi', 'hasut', 'intimidasi', 'teror', 'ancaman', 'konflik'], weight: 8, tags: ['provokasi', 'ancaman'] },
  ],
  economic_crisis: [
    { words: ['inflasi', 'resesi', 'krisis ekonomi', 'krisis moneter', 'hiperinflasi'], weight: 9, tags: ['krisis-ekonomi'] },
    { words: ['phk', 'pemutusan hubungan kerja', 'pengangguran', 'kehilangan pekerjaan'], weight: 8, tags: ['PHK', 'pengangguran'] },
    { words: ['harga bbm', 'kenaikan bbm', 'bensin naik', 'solar naik'], weight: 8, tags: ['energi', 'BBM'] },
    { words: ['harga pangan', 'sembako', 'bahan pokok', 'harga beras', 'minyak goreng'], weight: 7, tags: ['ketahanan-pangan'] },
    { words: ['saham', 'bursa', 'anjlok', 'krisis keuangan', 'bank gagal', 'likuidasi'], weight: 7, tags: ['krisis-keuangan'] },
    { words: ['utang', 'defisit', 'anggaran', 'pembengkakan', 'korupsi', 'triliun'], weight: 7, tags: ['fiskal', 'korupsi'] },
    { words: ['nilai tukar', 'rupiah melemah', 'rupiah anjlok', 'dollar naik'], weight: 6, tags: ['nilai-tukar'] },
    { words: ['pabrik tutup', 'industri tutup', 'perusahaan bangkrut', 'pailit'], weight: 8, tags: ['industri', 'kebangkrutan'] },
  ],
  crime_terrorism: [
    { words: ['teroris', 'terorisme', 'bom', 'ledakan', 'bom bunuh diri', 'jihad'], weight: 10, tags: ['terorisme'] },
    { words: ['penembakan', 'pembunuhan', 'pembacokan', 'pengeroyokan', 'tawuran'], weight: 8, tags: ['kekerasan'] },
    { words: ['narkoba', 'sabu', 'ganja', 'narkotika', 'psikotropika'], weight: 6, tags: ['narkoba', 'kriminal'] },
    { words: ['kejahatan', 'perampokan', 'pencurian', 'begal', 'klitih', 'geng motor'], weight: 7, tags: ['kriminalitas'] },
    { words: ['jaringan', 'sindikat', 'mafia', 'kartel', 'ilegal'], weight: 8, tags: ['kejahatan-terorganisir'] },
    { words: ['penculikan', 'perdagangan orang', 'trafficking', 'human trafficking'], weight: 9, tags: ['perdagangan-orang'] },
    { words: ['kekerasan seksual', 'pemerkosaan', 'pelecehan', 'pencabulan'], weight: 8, tags: ['kekerasan-seksual'] },
  ],
  political_crisis: [
    { words: ['kudeta', 'maklumat', 'darurat', 'militer', 'disiagakan', 'siaga satu'], weight: 10, tags: ['krisis-politik'] },
    { words: ['pemakzulan', 'impeachment', 'jatuhkan', 'lengser', 'turunkan presiden'], weight: 9, tags: ['instabilitas-politik'] },
    { words: ['konflik', 'polarisasi', 'perpecahan', 'disintegrasi'], weight: 8, tags: ['polarisasi'] },
    { words: ['kebijakan kontroversial', 'omnibus law', 'cjk', 'undang-undang kontroversial'], weight: 7, tags: ['kebijakan'] },
    { words: ['pemilu', 'pileg', 'pilpres', 'kecurangan', 'kecurangan pemilu'], weight: 6, tags: ['pemilu'] },
    { words: ['pemberhentian', 'nonaktif', 'tahanan kpk', 'tersangka', 'ditahan'], weight: 7, tags: ['hukum', 'korupsi'] },
  ],
  disaster_emergency: [
    { words: ['gempa', 'tsunami', 'letusan', 'gunung meletus', 'merapi', 'sinabung'], weight: 9, tags: ['bencana-alam'] },
    { words: ['banjir', 'longsor', 'tanah longsor', 'banjir bandang', 'rob'], weight: 8, tags: ['banjir'] },
    { words: ['kebakaran hutan', 'karhutla', 'kebakaran lahan', 'asap'], weight: 8, tags: ['karhutla'] },
    { words: ['kebakaran', 'terbakar', 'ludes', 'si jago merah'], weight: 7, tags: ['kebakaran'] },
    { words: ['angin puting beliung', 'puting beliung', 'siklon', 'badai'], weight: 8, tags: ['cuaca-ekstrem'] },
    { words: ['kekeringan', 'krisis air', 'air bersih'], weight: 7, tags: ['krisis-air'] },
  ],
  corporate_security: [
    { words: ['demo buruh', 'mogok kerja', 'unjuk rasa buruh', 'aliansi buruh'], weight: 8, tags: ['konflik-industri'] },
    { words: ['pemogokan', 'lockout', 'penutupan pabrik', 'relokasi pabrik'], weight: 8, tags: ['gangguan-operasional'] },
    { words: ['PHK massal', 'PHK besar-besaran', 'pemutusan massal'], weight: 9, tags: ['PHK-massal'] },
    { words: ['kecelakaan kerja', 'ledakan pabrik', 'kebakaran pabrik', 'tambang runtuh'], weight: 8, tags: ['keselamatan-kerja'] },
    { words: ['sanksi', 'denda', 'pencabutan izin', 'pembekuan izin'], weight: 6, tags: ['regulasi-perusahaan'] },
  ],
  cyber_security: [
    { words: ['peretasan', 'hacker', 'dibobol', 'bocor data', 'data breach'], weight: 10, tags: ['peretasan'] },
    { words: ['ransomware', 'malware', 'virus', 'serangan siber', 'cyber attack'], weight: 10, tags: ['serangan-siber'] },
    { words: ['kebocoran data', 'data bocor', 'data pribadi', 'informasi bocor'], weight: 9, tags: ['kebocoran-data'] },
    { words: ['serangan siber', 'cyber', 'siber', 'digital', 'server down'], weight: 8, tags: ['keamanan-siber'] },
    { words: ['penipuan online', 'phishing', 'skimming', 'penipuan digital'], weight: 7, tags: ['kejahatan-digital'] },
  ],
  health_crisis: [
    { words: ['pandemi', 'wabah', 'epidemi', 'endemi', 'covid', 'virus baru'], weight: 9, tags: ['pandemi'] },
    { words: ['darurat kesehatan', 'karantina', 'lockdown', 'isolasi'], weight: 8, tags: ['darurat-kesehatan'] },
    { words: ['vaksin', 'imunisasi', 'obat', 'rumah sakit penuh', 'rs rujukan'], weight: 6, tags: ['kesehatan-publik'] },
    { words: ['gizi buruk', 'stunting', 'malnutrisi', 'busung lapar', 'kelaparan'], weight: 8, tags: ['krisis-gizi'] },
  ],
  energy_food_security: [
    { words: ['kelangkaan', 'langka', 'menghilang', 'sulit didapat'], weight: 8, tags: ['kelangkaan'] },
    { words: ['listrik padam', 'pemadaman listrik', 'mati listrik', 'blackout'], weight: 9, tags: ['krisis-energi'] },
    { words: ['bahan bakar', 'bbm', 'subsidi', 'energi', 'migas'], weight: 7, tags: ['energi'] },
    { words: ['pangan', 'beras', 'gandum', 'kedelai', 'impor pangan'], weight: 7, tags: ['ketahanan-pangan'] },
    { words: ['krisis pangan', 'ancaman pangan', 'darurat pangan'], weight: 9, tags: ['krisis-pangan'] },
  ],
  regulatory_legal: [
    { words: ['perpu', 'darurat', 'keadaan darurat', 'keamanan nasional'], weight: 8, tags: ['keadaan-darurat'] },
    { words: ['sanksi ekonomi', 'embargo', 'larangan ekspor', 'larangan impor'], weight: 7, tags: ['sanksi'] },
    { words: ['putusan mk', 'uji materi', 'dibatalkan', 'inkonstitusional'], weight: 6, tags: ['hukum-tata-negara'] },
    { words: ['revisi uu', 'undang-undang baru', 'perppu', 'peraturan pemerintah'], weight: 5, tags: ['regulasi'] },
  ],
  general: [], // Fallback — no relevant keywords matched
}

// Words/phrases that explicitly indicate LOW security relevance (noise reduction)
const NOISE_PATTERNS = [
  ' resep ', ' cara membuat ', ' tutorial ', ' tips ', ' review ', ' rekomendasi ',
  'wisata', 'liburan', 'kuliner', 'makanan enak', 'fashion', 'gaya hidup',
  'selebriti', 'artis', 'gosip', 'sinetron', 'film terbaru', 'musik',
  'olahraga', 'sepak bola', 'bulutangkis', 'liga', 'pemain bola', 'kemenangan',
  'piala dunia', 'timnas', 'skor', 'pertandingan', 'hasil pertandingan',
  'zodiak', 'ramalan', 'horoskop', 'kecantikan', 'makeup', 'skin care',
  'kucing', 'hewan peliharaan', 'tanaman hias', 'berkebun',
  'promo', 'diskon', 'flash sale', 'belanja', 'e-commerce',
]

export function classifySecurityRelevance(
  headline: string,
  summary: string,
): SecurityClassification {
  const text = `${headline} ${summary}`.toLowerCase()

  // Quick noise check — if the text is mostly entertainment/sports/lifestyle, skip
  const noiseScore = NOISE_PATTERNS.reduce((score, pattern) => {
    return score + (text.includes(pattern) ? 1 : 0)
  }, 0)

  // If 3+ noise patterns matched and minimal security keywords, it's not relevant
  if (noiseScore >= 3) {
    return {
      isRelevant: false,
      category: 'general',
      severity: 'low',
      confidence: 0,
      tags: [],
      reason: 'Non-security content (entertainment/sports/lifestyle)',
    }
  }

  let bestCategory: SecurityCategory = 'general'
  let bestScore = 0
  let bestWeight = 0
  const allTags: Set<string> = new Set()
  const reasons: string[] = []

  for (const [category, entries] of Object.entries(SECURITY_KEYWORDS)) {
    if (category === 'general') continue

    let categoryScore = 0
    let maxWeightInCategory = 0

    for (const entry of entries) {
      for (const word of entry.words) {
        if (text.includes(word)) {
          categoryScore += entry.weight
          maxWeightInCategory = Math.max(maxWeightInCategory, entry.weight)
          entry.tags.forEach((t) => allTags.add(t))
          if (!reasons.includes(word)) {
            reasons.push(word)
          }
        }
      }
    }

    if (categoryScore > bestScore) {
      bestScore = categoryScore
      bestCategory = category as SecurityCategory
      bestWeight = maxWeightInCategory
    }
  }

  // If no security keywords matched at all
  if (bestScore === 0) {
    return {
      isRelevant: false,
      category: 'general',
      severity: 'low',
      confidence: 0,
      tags: [],
      reason: 'No security-related keywords detected',
    }
  }

  // Calculate confidence based on score
  const confidence = Math.min(bestScore / 30, 1.0)

  // Determine severity
  let severity: SeverityLevel = 'low'
  if (bestWeight >= 10 || bestScore >= 25) severity = 'critical'
  else if (bestWeight >= 8 || bestScore >= 15) severity = 'high'
  else if (bestWeight >= 6 || bestScore >= 8) severity = 'medium'

  return {
    isRelevant: true,
    category: bestCategory,
    severity,
    confidence: Math.round(confidence * 100) / 100,
    tags: Array.from(allTags),
    reason: `Matched: ${reasons.slice(0, 4).join(', ')}`,
  }
}

// Human-readable labels for security categories
export const SECURITY_CATEGORY_LABELS: Record<SecurityCategory, { label: string; description: string; icon: string }> = {
  social_unrest: { label: 'Social Unrest', description: 'Demonstrations, riots, mass protests', icon: 'M12 9v2m0 4h.01' },
  economic_crisis: { label: 'Economic Crisis', description: 'Inflation, layoffs, market crash', icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' },
  crime_terrorism: { label: 'Crime & Terrorism', description: 'Violent crime, terror threats', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  political_crisis: { label: 'Political Crisis', description: 'Government instability, policy change', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  disaster_emergency: { label: 'Disaster Emergency', description: 'Earthquakes, floods, fires', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' },
  corporate_security: { label: 'Corporate Security', description: 'Factory closures, strikes, accidents', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  cyber_security: { label: 'Cyber Security', description: 'Hacking, data breaches, cyber attacks', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  health_crisis: { label: 'Health Crisis', description: 'Pandemic, outbreak, health emergency', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  energy_food_security: { label: 'Energy & Food Security', description: 'Shortages, blackouts, food crisis', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  regulatory_legal: { label: 'Regulatory & Legal', description: 'New laws, sanctions, court rulings', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  general: { label: 'General', description: 'Non-security content', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
}

// Severity labels with colors
export const SEVERITY_LABELS: Record<SeverityLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-gray-400', bgColor: 'bg-gray-900/30 border-gray-700/50' },
  medium: { label: 'Medium', color: 'text-yellow-300', bgColor: 'bg-yellow-900/30 border-yellow-700/50' },
  high: { label: 'High', color: 'text-orange-300', bgColor: 'bg-orange-900/30 border-orange-700/50' },
  critical: { label: 'Critical', color: 'text-red-300', bgColor: 'bg-red-900/30 border-red-700/50' },
}