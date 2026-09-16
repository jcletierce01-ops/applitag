export const WallpaperBg = () => (
  <svg viewBox="0 0 1080 1920" overflow="hidden" preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:0,pointerEvents:"none"}}>
    <defs>
      <style>{`
        @keyframes nodePulse{0%,100%{opacity:1}50%{opacity:.45}}
        @keyframes chainFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-56}}
        @keyframes chainSlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-56}}
        .wbg-n1{animation:nodePulse 3.8s ease-in-out infinite 0s}
        .wbg-n2{animation:nodePulse 3.8s ease-in-out infinite 1.27s}
        .wbg-n3{animation:nodePulse 3.8s ease-in-out infinite 2.53s}
        .wbg-f1{animation:chainFlow 5s linear infinite}
        .wbg-f2{animation:chainSlow 9s linear infinite}
      `}</style>
      <linearGradient id="wbg-bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%"   stopColor="#6DC49A"/>
        <stop offset="28%"  stopColor="#3D9B68"/>
        <stop offset="55%"  stopColor="#1E6A42"/>
        <stop offset="100%" stopColor="#0F3C22"/>
      </linearGradient>
      <radialGradient id="wbg-moon" cx="50%" cy="15%" r="38%">
        <stop offset="0%"   stopColor="#A8E8C8" stopOpacity=".65"/>
        <stop offset="60%"  stopColor="#5DB887" stopOpacity=".30"/>
        <stop offset="100%" stopColor="transparent"/>
      </radialGradient>
      <linearGradient id="wbg-chain" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#2CA860" stopOpacity=".25"/>
        <stop offset="35%"  stopColor="#3EE878" stopOpacity=".90"/>
        <stop offset="65%"  stopColor="#3EE878" stopOpacity=".90"/>
        <stop offset="100%" stopColor="#2CA860" stopOpacity=".25"/>
      </linearGradient>
      <radialGradient id="wbg-vig" cx="50%" cy="50%" r="72%">
        <stop offset="40%" stopColor="transparent"/>
        <stop offset="100%" stopColor="#020504" stopOpacity=".35"/>
      </radialGradient>
      <filter id="wbg-nglow" x="-120%" y="-120%" width="340%" height="340%">
        <feGaussianBlur stdDeviation="12" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="wbg-lglow" x="-12%" y="-12%" width="124%" height="124%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <pattern id="wbg-dots" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
        <circle cx="24" cy="24" r="1" fill="#5AAA78" opacity=".22"/>
      </pattern>
    </defs>

    {/* Fond */}
    <rect width="1080" height="1920" fill="url(#wbg-bg)"/>
    <ellipse cx="540" cy="240" rx="500" ry="380" fill="url(#wbg-moon)"/>

    {/* Lignes topographiques */}
    <g fill="none" stroke="#2A7A50" strokeWidth="1.6" strokeLinecap="round" opacity=".45">
      <path d="M0,1665 C150,1645 300,1673 450,1655 C600,1637 750,1665 900,1655 C1050,1645 1068,1661 1080,1655"/>
      <path d="M0,1718 C170,1696 320,1726 470,1707 C620,1688 770,1718 920,1708 C1070,1698 1072,1714 1080,1708"/>
      <path d="M0,1771 C190,1747 340,1779 490,1759 C640,1739 790,1771 940,1761 C1070,1753 1074,1767 1080,1761"/>
      <path d="M0,1824 C210,1798 360,1832 510,1811 C660,1790 810,1824 960,1814 C1070,1806 1076,1820 1080,1814"/>
    </g>

    {/* Arbres gauche */}
    <path d="M 55,310 L 88,555 L 77,555 L 118,800 L 105,800 L 148,1045 L 133,1045 L 172,1920 L -62,1920 L -28,1045 L -13,1045 L 17,800 L 30,800 L 58,555 L 47,555 Z" fill="#1A5E30"/>
    <path d="M 140,175 L 185,455 L 169,455 L 228,735 L 210,735 L 271,1015 L 251,1015 L 314,1295 L 292,1295 L 352,1920 L -72,1920 L -34,1295 L -12,1295 L 29,1015 L 49,1015 L 92,735 L 110,735 L 151,455 L 135,455 Z" fill="#14502A"/>
    <path d="M 310,680 L 341,875 L 331,875 L 367,1070 L 356,1070 L 393,1265 L 381,1265 L 414,1920 L 206,1920 L 227,1265 L 239,1265 L 253,1070 L 264,1070 L 279,875 L 289,875 Z" fill="#1A5E30"/>

    {/* Arbres droite */}
    <path d="M 1025,310 L 1058,555 L 1047,555 L 1088,800 L 1075,800 L 1118,1045 L 1103,1045 L 1142,1920 L 908,1920 L 942,1045 L 957,1045 L 987,800 L 1000,800 L 997,555 L 986,555 Z" fill="#1A5E30"/>
    <path d="M 940,175 L 985,455 L 969,455 L 1028,735 L 1010,735 L 1071,1015 L 1051,1015 L 1114,1295 L 1092,1295 L 1152,1920 L 728,1920 L 766,1295 L 788,1295 L 829,1015 L 849,1015 L 892,735 L 910,735 L 951,455 L 935,455 Z" fill="#14502A"/>
    <path d="M 770,680 L 801,875 L 791,875 L 827,1070 L 816,1070 L 853,1265 L 841,1265 L 874,1920 L 666,1920 L 687,1265 L 699,1265 L 713,1070 L 724,1070 L 739,875 L 749,875 Z" fill="#1A5E30"/>

    {/* Grumes */}
    <g transform="translate(295,1820) rotate(-9)" filter="url(#wbg-lglow)" opacity=".82">
      <ellipse rx="138" ry="106" fill="#0E1E14" stroke="#48A870" strokeWidth="2.2"/>
      <ellipse rx="116" ry="89"  fill="none" stroke="#48A870" strokeWidth="1.7"/>
      <ellipse rx="94"  ry="72"  fill="none" stroke="#48A870" strokeWidth="1.3"/>
      <ellipse rx="72"  ry="55"  fill="none" stroke="#5AB882" strokeWidth="1.1"/>
      <ellipse rx="50"  ry="38"  fill="none" stroke="#5AB882" strokeWidth="0.9"/>
      <ellipse rx="28"  ry="21"  fill="none" stroke="#6ACC96" strokeWidth="0.8"/>
      <ellipse rx="10"  ry="8"   fill="#1A3426" stroke="#80DEAA" strokeWidth="0.6"/>
    </g>
    <g transform="translate(125,1885) rotate(-18)" opacity=".74">
      <ellipse rx="95" ry="73" fill="#0C1A12" stroke="#3E9860" strokeWidth="1.9"/>
      <ellipse rx="75" ry="58" fill="none"   stroke="#3E9860" strokeWidth="1.4"/>
      <ellipse rx="55" ry="43" fill="none"   stroke="#4AAC6E" strokeWidth="1.1"/>
      <ellipse rx="35" ry="27" fill="none"   stroke="#56BA7C" strokeWidth="0.9"/>
      <ellipse rx="16" ry="12" fill="none"   stroke="#62C88A" strokeWidth="0.7"/>
      <ellipse rx="6"  ry="5"  fill="#182E22"/>
    </g>
    <g transform="translate(518,1875) rotate(7)" opacity=".68">
      <ellipse rx="70" ry="54" fill="#0C1A12" stroke="#388C56" strokeWidth="1.7"/>
      <ellipse rx="53" ry="41" fill="none"   stroke="#388C56" strokeWidth="1.3"/>
      <ellipse rx="36" ry="28" fill="none"   stroke="#44A062" strokeWidth="1.0"/>
      <ellipse rx="19" ry="15" fill="none"   stroke="#50B070" strokeWidth="0.8"/>
      <ellipse rx="7"  ry="5"  fill="#182E22"/>
    </g>

    {/* Chaîne traçabilité — sens Forêt (haut) → Bord route → Chaufferie (bas) */}
    <path className="wbg-f1" d="M 340,380 C 440,670 540,960 720,1580" fill="none" stroke="#3EE878" strokeWidth="18" opacity=".06"/>
    <path className="wbg-f1" d="M 340,380 C 440,670 540,960 720,1580" fill="none" stroke="url(#wbg-chain)" strokeWidth="2.2" strokeDasharray="12,10"/>
    <path className="wbg-f2" d="M 345,382 C 445,672 545,962 725,1582" fill="none" stroke="#28C860" strokeWidth="1.0" strokeDasharray="4,20" opacity=".35"/>

    {/* Nœud Forêt — haut */}
    <g className="wbg-n1">
      <circle cx="340" cy="380" r="18" fill="#154530" filter="url(#wbg-nglow)"/>
      <circle cx="340" cy="380" r="10" fill="#3EE878"/>
      <circle cx="340" cy="380" r="25" fill="none" stroke="#3EE878" strokeWidth="1.6" opacity=".55"/>
      <circle cx="340" cy="380" r="40" fill="none" stroke="#3EE878" strokeWidth="0.7" opacity=".22"/>
    </g>
    <text x="372" y="376" fontFamily="'Courier New',monospace" fontSize="16" fill="#80EAB0" letterSpacing="3" opacity=".88">FORÊT</text>

    {/* Nœud Bord route — centre, renforcé */}
    <g className="wbg-n2">
      <circle cx="540" cy="960" r="22" fill="#154530" filter="url(#wbg-nglow)"/>
      <circle cx="540" cy="960" r="13" fill="#3EE878"/>
      <circle cx="540" cy="960" r="30" fill="none" stroke="#3EE878" strokeWidth="2.0" opacity=".65"/>
      <circle cx="540" cy="960" r="50" fill="none" stroke="#3EE878" strokeWidth="0.9" opacity=".28"/>
    </g>
    <rect x="562" y="941" width="272" height="28" rx="5" fill="#0B2E18" opacity=".55"/>
    <text x="572" y="959" fontFamily="'Courier New',monospace" fontSize="15" fill="#A8F0C8" letterSpacing="3" opacity=".92">BORD ROUTE</text>

    {/* Nœud Chaufferie — bas */}
    <g className="wbg-n3">
      <circle cx="720" cy="1580" r="16" fill="#154530" filter="url(#wbg-nglow)"/>
      <circle cx="720" cy="1580" r="9"  fill="#3EE878"/>
      <circle cx="720" cy="1580" r="22" fill="none" stroke="#3EE878" strokeWidth="1.5" opacity=".55"/>
      <circle cx="720" cy="1580" r="36" fill="none" stroke="#3EE878" strokeWidth="0.6" opacity=".22"/>
    </g>
    <text x="752" y="1576" fontFamily="'Courier New',monospace" fontSize="15" fill="#80EAB0" letterSpacing="3" opacity=".88">CHAUFFERIE</text>

    <rect width="1080" height="1920" fill="url(#wbg-dots)"/>
    <rect width="1080" height="1920" fill="url(#wbg-vig)"/>
  </svg>
);
