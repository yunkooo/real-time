const {
  DEFAULT_STATE,
  STORAGE_KEYS,
  normalizeLanguage,
  normalizePanelPosition
} = window.RealtimeSettings;

const enabledInput = document.querySelector("#enabled");
const languageSelect = document.querySelector("#language");
const panelPositionInputs = [...document.querySelectorAll('input[name="panel-position"]')];

const translations = {
  en: {
    documentTitle: "Real Time Options",
    enableDescription: "Show adjusted remaining time while watching videos.",
    enableTitle: "Enable Real Time",
    languageDescription: "Choose the language used on this options page.",
    languageTitle: "Language",
    pageTitle: "Real Time Settings",
    positionBottomCenter: "Bottom center",
    positionBottomLeft: "Bottom left",
    positionBottomRight: "Bottom right",
    positionCenterCenter: "Center",
    positionCenterLeft: "Center left",
    positionCenterRight: "Center right",
    positionDescription: "Choose where the panel appears inside the video frame.",
    positionTitle: "Panel position",
    positionTopCenter: "Top center",
    positionTopLeft: "Top left",
    positionTopRight: "Top right"
  },
  ko: {
    documentTitle: "Real Time 설정",
    enableDescription: "영상을 볼 때 배속이 반영된 실제 남은 시간을 표시합니다.",
    enableTitle: "Real Time 켜기",
    languageDescription: "이 설정 페이지에서 사용할 언어를 선택합니다.",
    languageTitle: "언어",
    pageTitle: "Real Time 설정",
    positionBottomCenter: "중앙 하단",
    positionBottomLeft: "좌측 하단",
    positionBottomRight: "우측 하단",
    positionCenterCenter: "중앙",
    positionCenterLeft: "좌측 중앙",
    positionCenterRight: "우측 중앙",
    positionDescription: "패널이 영상 프레임 안에서 표시될 위치를 선택합니다.",
    positionTitle: "패널 위치",
    positionTopCenter: "중앙 상단",
    positionTopLeft: "좌측 상단",
    positionTopRight: "우측 상단"
  },
  ja: {
    documentTitle: "Real Time 設定",
    enableDescription: "動画視聴中に再生速度を反映した残り時間を表示します。",
    enableTitle: "Real Time を有効にする",
    languageDescription: "この設定ページで使用する言語を選択します。",
    languageTitle: "言語",
    pageTitle: "Real Time 設定",
    positionBottomCenter: "下中央",
    positionBottomLeft: "左下",
    positionBottomRight: "右下",
    positionCenterCenter: "中央",
    positionCenterLeft: "左中央",
    positionCenterRight: "右中央",
    positionDescription: "動画フレーム内でパネルを表示する位置を選択します。",
    positionTitle: "パネルの位置",
    positionTopCenter: "上中央",
    positionTopLeft: "左上",
    positionTopRight: "右上"
  },
  "zh-CN": {
    documentTitle: "Real Time 设置",
    enableDescription: "观看视频时显示根据播放速度调整后的剩余时间。",
    enableTitle: "启用 Real Time",
    languageDescription: "选择此设置页面使用的语言。",
    languageTitle: "语言",
    pageTitle: "Real Time 设置",
    positionBottomCenter: "底部居中",
    positionBottomLeft: "左下",
    positionBottomRight: "右下",
    positionCenterCenter: "居中",
    positionCenterLeft: "左侧居中",
    positionCenterRight: "右侧居中",
    positionDescription: "选择面板在视频画面内显示的位置。",
    positionTitle: "面板位置",
    positionTopCenter: "顶部居中",
    positionTopLeft: "左上",
    positionTopRight: "右上"
  },
  es: {
    documentTitle: "Configuración de Real Time",
    enableDescription: "Muestra el tiempo restante ajustado según la velocidad de reproducción mientras ves videos.",
    enableTitle: "Activar Real Time",
    languageDescription: "Elige el idioma usado en esta página de configuración.",
    languageTitle: "Idioma",
    pageTitle: "Configuración de Real Time",
    positionBottomCenter: "Abajo al centro",
    positionBottomLeft: "Abajo a la izquierda",
    positionBottomRight: "Abajo a la derecha",
    positionCenterCenter: "Centro",
    positionCenterLeft: "Centro a la izquierda",
    positionCenterRight: "Centro a la derecha",
    positionDescription: "Elige dónde aparece el panel dentro del fotograma del video.",
    positionTitle: "Posición del panel",
    positionTopCenter: "Arriba al centro",
    positionTopLeft: "Arriba a la izquierda",
    positionTopRight: "Arriba a la derecha"
  },
  fr: {
    documentTitle: "Paramètres Real Time",
    enableDescription: "Affiche le temps restant ajusté selon la vitesse de lecture pendant que vous regardez des vidéos.",
    enableTitle: "Activer Real Time",
    languageDescription: "Choisissez la langue utilisée sur cette page de paramètres.",
    languageTitle: "Langue",
    pageTitle: "Paramètres Real Time",
    positionBottomCenter: "En bas au centre",
    positionBottomLeft: "En bas à gauche",
    positionBottomRight: "En bas à droite",
    positionCenterCenter: "Centre",
    positionCenterLeft: "Au centre à gauche",
    positionCenterRight: "Au centre à droite",
    positionDescription: "Choisissez où le panneau apparaît dans le cadre de la vidéo.",
    positionTitle: "Position du panneau",
    positionTopCenter: "En haut au centre",
    positionTopLeft: "En haut à gauche",
    positionTopRight: "En haut à droite"
  },
  de: {
    documentTitle: "Real Time Einstellungen",
    enableDescription: "Zeigt beim Ansehen von Videos die an die Wiedergabegeschwindigkeit angepasste Restzeit an.",
    enableTitle: "Real Time aktivieren",
    languageDescription: "Wähle die Sprache für diese Einstellungsseite.",
    languageTitle: "Sprache",
    pageTitle: "Real Time Einstellungen",
    positionBottomCenter: "Unten mittig",
    positionBottomLeft: "Unten links",
    positionBottomRight: "Unten rechts",
    positionCenterCenter: "Mitte",
    positionCenterLeft: "Mitte links",
    positionCenterRight: "Mitte rechts",
    positionDescription: "Wähle, wo das Panel innerhalb des Videobildes angezeigt wird.",
    positionTitle: "Panelposition",
    positionTopCenter: "Oben mittig",
    positionTopLeft: "Oben links",
    positionTopRight: "Oben rechts"
  },
  "pt-BR": {
    documentTitle: "Configurações do Real Time",
    enableDescription: "Mostra o tempo restante ajustado pela velocidade de reprodução enquanto você assiste a vídeos.",
    enableTitle: "Ativar Real Time",
    languageDescription: "Escolha o idioma usado nesta página de configurações.",
    languageTitle: "Idioma",
    pageTitle: "Configurações do Real Time",
    positionBottomCenter: "Inferior central",
    positionBottomLeft: "Inferior esquerdo",
    positionBottomRight: "Inferior direito",
    positionCenterCenter: "Centro",
    positionCenterLeft: "Centro esquerdo",
    positionCenterRight: "Centro direito",
    positionDescription: "Escolha onde o painel aparece dentro do quadro do vídeo.",
    positionTitle: "Posição do painel",
    positionTopCenter: "Superior central",
    positionTopLeft: "Superior esquerdo",
    positionTopRight: "Superior direito"
  }
};

let currentLanguage = DEFAULT_STATE[STORAGE_KEYS.LANGUAGE];

function getCopy(key) {
  return translations[currentLanguage][key] || translations.en[key] || "";
}

function applyLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  document.documentElement.lang = currentLanguage;
  document.title = getCopy("documentTitle");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = getCopy(element.dataset.i18n);
  });
}

function updateEnabled(enabled) {
  enabledInput.checked = enabled;
}

function updateLanguage(language) {
  const nextLanguage = normalizeLanguage(language);
  languageSelect.value = nextLanguage;
  applyLanguage(nextLanguage);
}

function updatePanelPosition(position) {
  const nextPosition = normalizePanelPosition(position);
  panelPositionInputs.forEach((input) => {
    input.checked = input.value === nextPosition;
  });
}

function updateState(items) {
  updateLanguage(items[STORAGE_KEYS.LANGUAGE]);
  updateEnabled(items[STORAGE_KEYS.ENABLED] !== false);
  updatePanelPosition(items[STORAGE_KEYS.PANEL_POSITION]);
}

chrome.storage.sync.get(DEFAULT_STATE, updateState);

enabledInput.addEventListener("change", () => {
  const enabled = enabledInput.checked;
  updateEnabled(enabled);
  chrome.storage.sync.set({ [STORAGE_KEYS.ENABLED]: enabled });
});

languageSelect.addEventListener("change", () => {
  const language = normalizeLanguage(languageSelect.value);
  updateLanguage(language);
  chrome.storage.sync.set({ [STORAGE_KEYS.LANGUAGE]: language });
});

panelPositionInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) {
      return;
    }

    const panelPosition = normalizePanelPosition(input.value);
    updatePanelPosition(panelPosition);
    chrome.storage.sync.set({ [STORAGE_KEYS.PANEL_POSITION]: panelPosition });
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.LANGUAGE)) {
    updateLanguage(changes[STORAGE_KEYS.LANGUAGE].newValue);
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.ENABLED)) {
    updateEnabled(changes[STORAGE_KEYS.ENABLED].newValue !== false);
  }
  if (Object.prototype.hasOwnProperty.call(changes, STORAGE_KEYS.PANEL_POSITION)) {
    updatePanelPosition(changes[STORAGE_KEYS.PANEL_POSITION].newValue);
  }
});
