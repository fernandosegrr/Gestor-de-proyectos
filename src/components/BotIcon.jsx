// Ícono SVG de bot estilo burbuja
const BotIcon = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="22" r="22" fill="#1673ff"/>
    <g>
      <ellipse cx="22" cy="23" rx="12" ry="10" fill="white"/>
      <ellipse cx="18.5" cy="23" rx="1.5" ry="2" fill="#1673ff"/>
      <ellipse cx="25.5" cy="23" rx="1.5" ry="2" fill="#1673ff"/>
      <rect x="20" y="13" width="4" height="4" rx="2" fill="white"/>
      <rect x="21.5" y="9" width="1" height="6" rx="0.5" fill="white"/>
      <circle cx="22" cy="8" r="1.2" fill="white"/>
    </g>
  </svg>
);

export default BotIcon;
