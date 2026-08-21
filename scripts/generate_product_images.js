const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Database = require('better-sqlite3');

const UPLOAD_DIR = path.resolve(__dirname, '../data/uploads/produk');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// AI generated image paths from artifact directory
const aiImages = {
  'Tepung Terigu 1kg': 'C:\\Users\\telkom\\.gemini\\antigravity-ide\\brain\\aad904cf-702f-4198-8273-ae5aaec441b0\\tepung_terigu_1787233094990.png',
  'Gula Pasir 1kg': 'C:\\Users\\telkom\\.gemini\\antigravity-ide\\brain\\aad904cf-702f-4198-8273-ae5aaec441b0\\gula_pasir_1787233112585.png',
  'Minyak Goreng 2L': 'C:\\Users\\telkom\\.gemini\\antigravity-ide\\brain\\aad904cf-702f-4198-8273-ae5aaec441b0\\minyak_goreng_1787233128686.png',
  'Telur Ayam': 'C:\\Users\\telkom\\.gemini\\antigravity-ide\\brain\\aad904cf-702f-4198-8273-ae5aaec441b0\\telur_ayam_1787233145161.png',
  'Beras Pandan Wangi 5kg': 'C:\\Users\\telkom\\.gemini\\antigravity-ide\\brain\\aad904cf-702f-4198-8273-ae5aaec441b0\\beras_5kg_1787233159562.png',
  'Susu Kental Manis': 'C:\\Users\\telkom\\.gemini\\antigravity-ide\\brain\\aad904cf-702f-4198-8273-ae5aaec441b0\\susu_kental_1787233173482.png',
};

// SVG templates for remaining 20 products
function createSvg(type, title, category) {
  const width = 600;
  const height = 600;

  // Custom themes per category
  let bgGradient = ['#f8fafc', '#edf2f7'];
  if (category === 'Sembako') bgGradient = ['#fefce8', '#fef9c3'];
  if (category === 'Minuman') bgGradient = ['#f0fdf4', '#dcfce7'];
  if (category === 'Makanan Ringan') bgGradient = ['#fff7ed', '#ffedd5'];
  if (category === 'Kebutuhan Rumah') bgGradient = ['#f0f9ff', '#e0f2fe'];

  let graphic = '';

  switch (type) {
    case 'kopi_sachet':
      graphic = `
        <!-- Coffee Bag -->
        <defs>
          <linearGradient id="coffeeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#78350f"/>
            <stop offset="50%" stop-color="#451a03"/>
            <stop offset="100%" stop-color="#292524"/>
          </linearGradient>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#ca8a04"/>
          </linearGradient>
        </defs>
        <!-- Shadow -->
        <ellipse cx="300" cy="490" rx="140" ry="25" fill="#000" opacity="0.15"/>
        <!-- Sachet body -->
        <path d="M 200 130 L 400 130 L 380 470 L 220 470 Z" fill="url(#coffeeGrad)" rx="10"/>
        <!-- Top seal -->
        <rect x="195" y="130" width="210" height="24" fill="#9a3412" rx="4"/>
        <line x1="200" y1="142" x2="400" y2="142" stroke="#ea580c" stroke-width="2" stroke-dasharray="6,4"/>
        <!-- Bottom seal -->
        <rect x="215" y="450" width="170" height="20" fill="#9a3412" rx="4"/>
        <!-- Label Badge -->
        <rect x="230" y="210" width="140" height="180" fill="url(#goldGrad)" rx="16"/>
        <circle cx="300" cy="270" r="40" fill="#451a03"/>
        <text x="300" y="280" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#fff" text-anchor="middle">☕</text>
        <text x="300" y="340" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#451a03" text-anchor="middle">KOPI</text>
        <text x="300" y="365" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#78350f" text-anchor="middle">MANTAP SACHET</text>
      `;
      break;

    case 'teh_celup':
      graphic = `
        <defs>
          <linearGradient id="teaGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#15803d"/>
            <stop offset="100%" stop-color="#166534"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="480" rx="160" ry="20" fill="#000" opacity="0.12"/>
        <rect x="170" y="190" width="260" height="270" fill="url(#teaGrad)" rx="16" />
        <rect x="170" y="190" width="260" height="50" fill="#16a34a" rx="16"/>
        <circle cx="300" cy="320" r="55" fill="#fef08a"/>
        <text x="300" y="333" font-family="Arial" font-size="44" text-anchor="middle">🍵</text>
        <text x="300" y="415" font-family="Arial" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">TEH CELUP</text>
        <text x="300" y="438" font-family="Arial" font-size="14" fill="#bbf7d0" text-anchor="middle">ASLI WANGI • 25 POCKET</text>
      `;
      break;

    case 'air_mineral':
      graphic = `
        <defs>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
            <stop offset="50%" stop-color="#bae6fd" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.8"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="495" rx="60" ry="14" fill="#000" opacity="0.2"/>
        <!-- Cap -->
        <rect x="275" y="100" width="50" height="35" fill="#0284c7" rx="6"/>
        <!-- Bottle Neck -->
        <path d="M 280 135 L 320 135 L 330 180 L 270 180 Z" fill="url(#waterGrad)"/>
        <!-- Bottle Body -->
        <rect x="250" y="180" width="100" height="300" fill="url(#waterGrad)" rx="20"/>
        <!-- Label -->
        <rect x="248" y="270" width="104" height="100" fill="#ffffff" rx="6" opacity="0.95"/>
        <text x="300" y="315" font-family="Arial" font-size="32" text-anchor="middle">💧</text>
        <text x="300" y="345" font-family="Arial" font-size="14" font-weight="bold" fill="#0369a1" text-anchor="middle">PURE WATER</text>
        <text x="300" y="360" font-family="Arial" font-size="11" fill="#0284c7" text-anchor="middle">600 ml</text>
      `;
      break;

    case 'sirup_marjan':
      graphic = `
        <defs>
          <linearGradient id="syrupGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#dc2626"/>
            <stop offset="50%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="500" rx="55" ry="15" fill="#000" opacity="0.18"/>
        <!-- Cap -->
        <rect x="278" y="90" width="44" height="40" fill="#15803d" rx="6"/>
        <!-- Bottle Body -->
        <path d="M 285 130 L 315 130 L 335 220 L 335 480 L 265 480 L 265 220 Z" fill="url(#syrupGrad)"/>
        <!-- Label -->
        <rect x="263" y="250" width="74" height="160" fill="#fff" rx="8"/>
        <text x="300" y="295" font-family="Arial" font-size="34" text-anchor="middle">🍹</text>
        <text x="300" y="335" font-family="Arial" font-size="16" font-weight="900" fill="#b91c1c" text-anchor="middle">SIRUP</text>
        <text x="300" y="355" font-family="Arial" font-size="13" font-weight="bold" fill="#15803d" text-anchor="middle">MANIS</text>
        <text x="300" y="385" font-family="Arial" font-size="10" fill="#666" text-anchor="middle">MANIS SEGAR</text>
      `;
      break;

    case 'keripik_singkong':
      graphic = `
        <defs>
          <linearGradient id="snackGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ea580c"/>
            <stop offset="100%" stop-color="#c2410c"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="485" rx="140" ry="22" fill="#000" opacity="0.15"/>
        <path d="M 180 150 C 240 130 360 130 420 150 L 400 460 C 340 480 260 480 200 460 Z" fill="url(#snackGrad)"/>
        <circle cx="300" cy="270" r="55" fill="#fef08a"/>
        <text x="300" y="285" font-family="Arial" font-size="44" text-anchor="middle">🥔</text>
        <text x="300" y="365" font-family="Arial" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">KERIPIK</text>
        <text x="300" y="395" font-family="Arial" font-size="18" font-weight="bold" fill="#fef08a" text-anchor="middle">SINGKONG RENYAH</text>
      `;
      break;

    case 'biskuit_kaleng':
      graphic = `
        <defs>
          <linearGradient id="tinGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#b91c1c"/>
            <stop offset="50%" stop-color="#991b1b"/>
            <stop offset="100%" stop-color="#450a0a"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="475" rx="170" ry="30" fill="#000" opacity="0.2"/>
        <rect x="140" y="200" width="320" height="260" fill="url(#tinGrad)" rx="30"/>
        <!-- Gold Trim -->
        <rect x="140" y="200" width="320" height="25" fill="#eab308" rx="10"/>
        <rect x="140" y="435" width="320" height="25" fill="#eab308" rx="10"/>
        <circle cx="300" cy="330" r="65" fill="#fef08a" stroke="#eab308" stroke-width="6"/>
        <text x="300" y="345" font-family="Arial" font-size="52" text-anchor="middle">🍪</text>
        <text x="300" y="420" font-family="Arial" font-size="16" font-weight="bold" fill="#fef08a" text-anchor="middle">BISKUIT ASSORTED</text>
      `;
      break;

    case 'roti_tawar':
      graphic = `
        <ellipse cx="300" cy="480" rx="150" ry="20" fill="#000" opacity="0.12"/>
        <rect x="170" y="160" width="260" height="300" fill="#fde68a" rx="30" stroke="#d97706" stroke-width="6"/>
        <path d="M 150 190 Q 300 120 450 190 L 430 460 L 170 460 Z" fill="#fef3c7" opacity="0.6"/>
        <circle cx="300" cy="280" r="50" fill="#ffffff"/>
        <text x="300" y="295" font-family="Arial" font-size="44" text-anchor="middle">🍞</text>
        <text x="300" y="375" font-family="Arial" font-size="26" font-weight="900" fill="#92400e" text-anchor="middle">ROTI TAWAR</text>
        <text x="300" y="405" font-family="Arial" font-size="16" font-weight="bold" fill="#b45309" text-anchor="middle">LEMBUT &amp; SPESIAL</text>
      `;
      break;

    case 'sabun_mandi':
      graphic = `
        <defs>
          <linearGradient id="soapGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f472b6"/>
            <stop offset="100%" stop-color="#db2777"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="460" rx="140" ry="20" fill="#000" opacity="0.12"/>
        <rect x="160" y="190" width="280" height="240" fill="url(#soapGrad)" rx="24"/>
        <circle cx="300" cy="300" r="50" fill="#ffffff"/>
        <text x="300" y="315" font-family="Arial" font-size="42" text-anchor="middle">🧼</text>
        <text x="300" y="385" font-family="Arial" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">SABUN MANDI</text>
        <text x="300" y="410" font-family="Arial" font-size="14" fill="#fce7f3" text-anchor="middle">HARUM &amp; SEGAR</text>
      `;
      break;

    case 'deterjen_800g':
      graphic = `
        <defs>
          <linearGradient id="detGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2563eb"/>
            <stop offset="100%" stop-color="#1d4ed8"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="485" rx="150" ry="22" fill="#000" opacity="0.15"/>
        <path d="M 170 140 L 430 140 L 400 460 L 200 460 Z" fill="url(#detGrad)"/>
        <circle cx="300" cy="270" r="55" fill="#facc15"/>
        <text x="300" y="285" font-family="Arial" font-size="44" text-anchor="middle">🧴</text>
        <text x="300" y="365" font-family="Arial" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">DETERJEN</text>
        <text x="300" y="395" font-family="Arial" font-size="18" font-weight="bold" fill="#facc15" text-anchor="middle">BERSIH HARUM 800G</text>
      `;
      break;

    case 'tisu_gulung':
      graphic = `
        <ellipse cx="300" cy="470" rx="120" ry="25" fill="#000" opacity="0.12"/>
        <rect x="190" y="160" width="220" height="280" fill="#ffffff" rx="40" stroke="#e2e8f0" stroke-width="4"/>
        <ellipse cx="300" cy="160" rx="110" ry="35" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4"/>
        <ellipse cx="300" cy="160" rx="35" ry="12" fill="#94a3b8"/>
        <text x="300" y="320" font-family="Arial" font-size="44" text-anchor="middle">🧻</text>
        <text x="300" y="380" font-family="Arial" font-size="22" font-weight="bold" fill="#334155" text-anchor="middle">TISU GULUNG</text>
      `;
      break;

    case 'mie_instan':
      graphic = `
        <defs>
          <linearGradient id="noodleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#eab308"/>
            <stop offset="100%" stop-color="#ca8a04"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="480" rx="150" ry="20" fill="#000" opacity="0.15"/>
        <rect x="160" y="170" width="280" height="290" fill="url(#noodleGrad)" rx="20"/>
        <circle cx="300" cy="285" r="55" fill="#dc2626"/>
        <text x="300" y="300" font-family="Arial" font-size="44" text-anchor="middle">🍜</text>
        <text x="300" y="380" font-family="Arial" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">MIE GORENG</text>
        <text x="300" y="410" font-family="Arial" font-size="16" font-weight="bold" fill="#dc2626" text-anchor="middle">LEZAT &amp; GURIH</text>
      `;
      break;

    case 'garam_dapur':
      graphic = `
        <ellipse cx="300" cy="480" rx="130" ry="20" fill="#000" opacity="0.12"/>
        <path d="M 190 160 L 410 160 L 390 460 L 210 460 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
        <rect x="190" y="240" width="220" height="120" fill="#0284c7"/>
        <text x="300" y="290" font-family="Arial" font-size="40" text-anchor="middle">🧂</text>
        <text x="300" y="335" font-family="Arial" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">GARAM DAPUR</text>
        <text x="300" y="410" font-family="Arial" font-size="14" font-weight="bold" fill="#0369a1" text-anchor="middle">BERYODIUM HIGH QUALITY</text>
      `;
      break;

    case 'kecap_manis':
      graphic = `
        <defs>
          <linearGradient id="kecapGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#18181b"/>
            <stop offset="50%" stop-color="#27272a"/>
            <stop offset="100%" stop-color="#09090b"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="495" rx="55" ry="15" fill="#000" opacity="0.2"/>
        <rect x="275" y="90" width="50" height="40" fill="#dc2626" rx="6"/>
        <path d="M 280 130 L 320 130 L 340 220 L 340 480 L 260 480 L 260 220 Z" fill="url(#kecapGrad)"/>
        <rect x="258" y="250" width="84" height="150" fill="#facc15" rx="6"/>
        <text x="300" y="295" font-family="Arial" font-size="36" text-anchor="middle">🥫</text>
        <text x="300" y="340" font-family="Arial" font-size="18" font-weight="900" fill="#7f1d1d" text-anchor="middle">KECAP</text>
        <text x="300" y="365" font-family="Arial" font-size="16" font-weight="bold" fill="#991b1b" text-anchor="middle">MANIS</text>
        <text x="300" y="385" font-family="Arial" font-size="11" fill="#78350f" text-anchor="middle">600 ml</text>
      `;
      break;

    case 'saos_sambal':
      graphic = `
        <defs>
          <linearGradient id="saosGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#b91c1c"/>
            <stop offset="50%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#7f1d1d"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="495" rx="55" ry="15" fill="#000" opacity="0.2"/>
        <rect x="275" y="90" width="50" height="40" fill="#facc15" rx="6"/>
        <path d="M 280 130 L 320 130 L 340 220 L 340 480 L 260 480 L 260 220 Z" fill="url(#saosGrad)"/>
        <rect x="258" y="250" width="84" height="150" fill="#ffffff" rx="6"/>
        <text x="300" y="295" font-family="Arial" font-size="36" text-anchor="middle">🌶️</text>
        <text x="300" y="340" font-family="Arial" font-size="16" font-weight="900" fill="#991b1b" text-anchor="middle">SAOS</text>
        <text x="300" y="365" font-family="Arial" font-size="14" font-weight="bold" fill="#dc2626" text-anchor="middle">SAMBAL</text>
      `;
      break;

    case 'teh_botol':
      graphic = `
        <defs>
          <linearGradient id="tbGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#92400e"/>
            <stop offset="50%" stop-color="#b45309"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="495" rx="55" ry="15" fill="#000" opacity="0.18"/>
        <rect x="278" y="90" width="44" height="40" fill="#15803d" rx="6"/>
        <path d="M 282 130 L 318 130 L 335 220 L 335 480 L 265 480 L 265 220 Z" fill="url(#tbGrad)"/>
        <rect x="263" y="250" width="74" height="150" fill="#fef08a" rx="6"/>
        <text x="300" y="295" font-family="Arial" font-size="36" text-anchor="middle">🧃</text>
        <text x="300" y="340" font-family="Arial" font-size="16" font-weight="900" fill="#15803d" text-anchor="middle">TEH</text>
        <text x="300" y="365" font-family="Arial" font-size="14" font-weight="bold" fill="#b45309" text-anchor="middle">BOTOL</text>
      `;
      break;

    case 'kopi_susu_kaleng':
      graphic = `
        <defs>
          <linearGradient id="canGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#94a3b8"/>
            <stop offset="30%" stop-color="#f8fafc"/>
            <stop offset="70%" stop-color="#e2e8f0"/>
            <stop offset="100%" stop-color="#64748b"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="485" rx="100" ry="20" fill="#000" opacity="0.2"/>
        <rect x="200" y="160" width="200" height="310" fill="url(#canGrad)" rx="20"/>
        <rect x="200" y="220" width="200" height="190" fill="#451a03"/>
        <text x="300" y="280" font-family="Arial" font-size="44" text-anchor="middle">🥤</text>
        <text x="300" y="335" font-family="Arial" font-size="20" font-weight="900" fill="#fde047" text-anchor="middle">KOPI SUSU</text>
        <text x="300" y="365" font-family="Arial" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">ICED COFFEE CAN</text>
      `;
      break;

    case 'wafer_cokelat':
      graphic = `
        <defs>
          <linearGradient id="waferGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#78350f"/>
            <stop offset="100%" stop-color="#3f2305"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="470" rx="150" ry="18" fill="#000" opacity="0.15"/>
        <rect x="150" y="200" width="300" height="240" fill="url(#waferGrad)" rx="16"/>
        <circle cx="300" cy="290" r="50" fill="#facc15"/>
        <text x="300" y="305" font-family="Arial" font-size="44" text-anchor="middle">🍫</text>
        <text x="300" y="380" font-family="Arial" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">WAFER COKELAT</text>
      `;
      break;

    case 'kerupuk_udang':
      graphic = `
        <defs>
          <linearGradient id="krupukGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fdba74"/>
            <stop offset="100%" stop-color="#f97316"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="480" rx="140" ry="20" fill="#000" opacity="0.12"/>
        <rect x="170" y="160" width="260" height="300" fill="url(#krupukGrad)" rx="24"/>
        <circle cx="300" cy="275" r="55" fill="#ffffff"/>
        <text x="300" y="290" font-family="Arial" font-size="44" text-anchor="middle">🍤</text>
        <text x="300" y="370" font-family="Arial" font-size="24" font-weight="900" fill="#7c2d12" text-anchor="middle">KERUPUK UDANG</text>
        <text x="300" y="400" font-family="Arial" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle">GURIH &amp; RENYAH</text>
      `;
      break;

    case 'pasta_gigi':
      graphic = `
        <defs>
          <linearGradient id="pasteGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="470" rx="160" ry="18" fill="#000" opacity="0.12"/>
        <rect x="140" y="220" width="320" height="200" fill="url(#pasteGrad)" rx="16"/>
        <rect x="140" y="220" width="60" height="200" fill="#ef4444" rx="8"/>
        <circle cx="310" cy="320" r="45" fill="#ffffff"/>
        <text x="310" y="333" font-family="Arial" font-size="40" text-anchor="middle">🪥</text>
        <text x="310" y="395" font-family="Arial" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">PASTA GIGI MINT</text>
      `;
      break;

    case 'sampo_sachet':
      graphic = `
        <defs>
          <linearGradient id="shampooGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0d9488"/>
            <stop offset="100%" stop-color="#0f766e"/>
          </linearGradient>
        </defs>
        <ellipse cx="300" cy="480" rx="120" ry="20" fill="#000" opacity="0.15"/>
        <path d="M 200 150 L 400 150 L 380 460 L 220 460 Z" fill="url(#shampooGrad)"/>
        <rect x="195" y="150" width="210" height="20" fill="#14b8a6" rx="4"/>
        <circle cx="300" cy="275" r="50" fill="#ffffff"/>
        <text x="300" y="290" font-family="Arial" font-size="40" text-anchor="middle">🧴</text>
        <text x="300" y="365" font-family="Arial" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">SAMPO KILAU</text>
        <text x="300" y="390" font-family="Arial" font-size="14" fill="#ccfbf1" text-anchor="middle">LEMBUT &amp; HARUM</text>
      `;
      break;

    default:
      graphic = `<circle cx="300" cy="300" r="100" fill="#cbd5e1"/>`;
  }

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${bgGradient[0]}"/>
          <stop offset="100%" stop-color="${bgGradient[1]}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
      ${graphic}
    </svg>
  `;
}

// Product mapping to filename and svg key
const productsConfig = [
  { name: 'Tepung Terigu 1kg', key: 'tepung_terigu', ext: 'webp', category: 'Sembako' },
  { name: 'Gula Pasir 1kg', key: 'gula_pasir', ext: 'webp', category: 'Sembako' },
  { name: 'Minyak Goreng 2L', key: 'minyak_goreng', ext: 'webp', category: 'Sembako' },
  { name: 'Telur Ayam', key: 'telur_ayam', ext: 'webp', category: 'Sembako' },
  { name: 'Beras Pandan Wangi 5kg', key: 'beras_5kg', ext: 'webp', category: 'Sembako' },
  { name: 'Susu Kental Manis', key: 'susu_kental', ext: 'webp', category: 'Sembako' },
  { name: 'Kopi Sachet', key: 'kopi_sachet', ext: 'png', category: 'Minuman' },
  { name: 'Teh Celup Kotak', key: 'teh_celup', ext: 'png', category: 'Minuman' },
  { name: 'Air Mineral 600ml', key: 'air_mineral', ext: 'png', category: 'Minuman' },
  { name: 'Sirup Marjan', key: 'sirup_marjan', ext: 'png', category: 'Minuman' },
  { name: 'Keripik Singkong', key: 'keripik_singkong', ext: 'png', category: 'Makanan Ringan' },
  { name: 'Biskuit Kaleng', key: 'biskuit_kaleng', ext: 'png', category: 'Makanan Ringan' },
  { name: 'Roti Tawar', key: 'roti_tawar', ext: 'png', category: 'Makanan Ringan' },
  { name: 'Sabun Mandi', key: 'sabun_mandi', ext: 'png', category: 'Kebutuhan Rumah' },
  { name: 'Deterjen 800g', key: 'deterjen_800g', ext: 'png', category: 'Kebutuhan Rumah' },
  { name: 'Tisu Gulung', key: 'tisu_gulung', ext: 'png', category: 'Kebutuhan Rumah' },
  { name: 'Mie Instan Goreng', key: 'mie_instan', ext: 'png', category: 'Sembako' },
  { name: 'Garam Dapur', key: 'garam_dapur', ext: 'png', category: 'Sembako' },
  { name: 'Kecap Manis 600ml', key: 'kecap_manis', ext: 'png', category: 'Sembako' },
  { name: 'Saos Sambal', key: 'saos_sambal', ext: 'png', category: 'Sembako' },
  { name: 'Teh Botol', key: 'teh_botol', ext: 'png', category: 'Minuman' },
  { name: 'Kopi Susu Kaleng', key: 'kopi_susu_kaleng', ext: 'png', category: 'Minuman' },
  { name: 'Wafer Cokelat', key: 'wafer_cokelat', ext: 'png', category: 'Makanan Ringan' },
  { name: 'Kerupuk Udang', key: 'kerupuk_udang', ext: 'png', category: 'Makanan Ringan' },
  { name: 'Pasta Gigi', key: 'pasta_gigi', ext: 'png', category: 'Kebutuhan Rumah' },
  { name: 'Sampo Sachet', key: 'sampo_sachet', ext: 'png', category: 'Kebutuhan Rumah' },
];

async function main() {
  console.log('Generating product images...');

  const db = new Database('./data/synona.db');

  for (const p of productsConfig) {
    const filename = `${p.key}.${p.ext}`;
    const destPath = path.join(UPLOAD_DIR, filename);

    if (aiImages[p.name] && fs.existsSync(aiImages[p.name])) {
      console.log(`Processing AI image for: ${p.name}`);
      await sharp(aiImages[p.name])
        .resize(600, 600, { fit: 'cover' })
        .toFormat(p.ext === 'webp' ? 'webp' : 'png')
        .toFile(destPath);
    } else {
      console.log(`Rendering graphic image for: ${p.name}`);
      const svg = createSvg(p.key, p.name, p.category);
      await sharp(Buffer.from(svg))
        .resize(600, 600)
        .toFormat(p.ext === 'webp' ? 'webp' : 'png')
        .toFile(destPath);
    }

    // Update database
    db.prepare('UPDATE products SET image_url = ? WHERE name = ?').run(filename, p.name);
  }

  console.log('Done generating images and updating database!');
}

main().catch(console.error);
