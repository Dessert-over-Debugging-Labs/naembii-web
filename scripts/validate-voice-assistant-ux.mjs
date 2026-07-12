import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium, webkit, devices } = require(process.env.NAEMBI_PLAYWRIGHT_PATH || 'playwright');

const baseURL = (process.argv[2] || 'http://127.0.0.1:4873').replace(/\/+$/, '');
const defaultOutputDir = `/tmp/naembi-voice-assistant-ux-${new Date().toISOString().slice(0, 10)}`;
const outputDir = resolve(process.argv[3] || defaultOutputDir);
const screenshotDir = resolve(outputDir, 'screenshots');

await mkdir(screenshotDir, { recursive: true });

const profiles = [
  {
    id: 'iphone-safari',
    label: 'iPhone Safari (Playwright WebKit emulation)',
    browserType: webkit,
    context: { ...devices['iPhone 13'], locale: 'ko-KR', timezoneId: 'Asia/Seoul' }
  },
  {
    id: 'android-chrome',
    label: 'Android Chrome (Playwright Chromium emulation)',
    browserType: chromium,
    launch: { args: ['--use-fake-device-for-media-stream'] },
    context: { ...devices['Pixel 7'], locale: 'ko-KR', timezoneId: 'Asia/Seoul' }
  },
  {
    id: 'desktop-chrome',
    label: 'Desktop Chrome',
    browserType: chromium,
    launch: { channel: 'chrome', args: ['--use-fake-device-for-media-stream'] },
    context: { ...devices['Desktop Chrome'], locale: 'ko-KR', timezoneId: 'Asia/Seoul' }
  }
];

function snapshotPath(profileId, name) {
  return resolve(screenshotDir, `${profileId}-${name}.png`);
}

async function appState(page) {
  return page.evaluate(() => {
    const panel = document.getElementById('vpanel');
    const scroll = document.getElementById('vpScroll');
    const activeCard = document.querySelector('#cookTrack3 .scard.active');
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        top: Math.round(value.top),
        right: Math.round(value.right),
        bottom: Math.round(value.bottom),
        left: Math.round(value.left),
        width: Math.round(value.width),
        height: Math.round(value.height)
      };
    };
    const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const isVisibleButton = (button) => {
      if (!button || button.hidden) return false;
      const style = getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const panelRect = rect(panel);
    const cardRect = rect(activeCard);
    const videoRect = rect(document.querySelector('#cook3 .cook-video'));
    const timerRect = rect(document.getElementById('stageTimer'));
    return {
      activeView: document.querySelector('.view.active')?.id || '',
      panelClass: panel?.className || '',
      voiceState: panel?.dataset.voiceState || '',
      liveStatus: document.getElementById('vpLiveStatus')?.textContent.trim() || '',
      liveStatusClass: document.getElementById('vpLiveStatus')?.className || '',
      userText: document.getElementById('vpUser')?.textContent.trim() || '',
      assistantText: document.getElementById('vpAi')?.textContent.trim() || '',
      transcriptVisible: document.getElementById('vpTranscript')?.classList.contains('show') || false,
      transcriptInterim: document.getElementById('vpTranscript')?.classList.contains('interim') || false,
      transcriptText: document.getElementById('vpTranscriptText')?.textContent.trim() || '',
      transcriptHint: document.getElementById('vpTranscriptHint')?.textContent.trim() || '',
      waveDisplay: getComputedStyle(document.querySelector('.vp-wave')).display,
      waveAnimationStates: [...document.querySelectorAll('.vp-wave span')].map((node) => getComputedStyle(node).animationPlayState),
      promptInputExists: Boolean(document.getElementById('vpPromptInput')),
      inputModeText: document.querySelector('.vp-input-mode')?.textContent.trim().replace(/\s+/g, ' ') || '',
      micButtonLabel: panel?.querySelector('.vp-mic')?.getAttribute('aria-label') || '',
      speakButtonText: document.querySelector('.vp-speak-btn')?.textContent.trim() || '',
      quickPromptCount: document.querySelectorAll('#vpQuick button').length,
      hasRetryButton: [...panel.querySelectorAll('button')].some((button) => isVisibleButton(button) && /다시 말|다시 시도|재시도/.test(button.textContent)),
      hasStopMicButton: [...panel.querySelectorAll('button')].some((button) => isVisibleButton(button) && /마이크 끄|듣기 중지|녹음 중지/.test(button.textContent)),
      hasVolumeDuckIndicator: document.getElementById('vpVolumeStatus')?.classList.contains('show') || false,
      micTrackStops: window.__qaMicTrackStops || 0,
      panelRect,
      cardRect,
      videoRect,
      timerRect,
      overlapsCurrentStep: overlaps(panelRect, cardRect),
      overlapsVideo: overlaps(panelRect, videoRect),
      overlapsTimer: overlaps(panelRect, timerRect),
      scroll: scroll ? {
        clientHeight: scroll.clientHeight,
        scrollHeight: scroll.scrollHeight,
        scrollTop: scroll.scrollTop,
        overflowY: getComputedStyle(scroll).overflowY
      } : null
    };
  });
}

async function installAllowedMicMock(page) {
  await page.evaluate(() => {
    window.__qaMicTrackStops = 0;
    const fakeStream = {
      getTracks() {
        return [{ stop() { window.__qaMicTrackStops += 1; } }];
      }
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => fakeStream }
    });
    class QaSpeechRecognition {
      start() {
        window.__qaRecognition = this;
        setTimeout(() => this.onstart?.(), 30);
      }
      stop() {
        setTimeout(() => this.onend?.(), 30);
      }
      abort() {
        window.__qaRecognition = null;
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: QaSpeechRecognition });
    window.__qaEmitInterimSpeech = (text) => {
      const recognition = window.__qaRecognition;
      if (!recognition) return;
      const result = { 0: { transcript: text }, length: 1, isFinal: false };
      recognition.onresult?.({ resultIndex: 0, results: [result] });
    };
    window.__qaEmitFinalSpeech = (text) => {
      const recognition = window.__qaRecognition;
      if (!recognition) return;
      const result = { 0: { transcript: text }, length: 1, isFinal: true };
      recognition.onresult?.({ resultIndex: 0, results: [result] });
      setTimeout(() => recognition.onend?.(), 40);
    };
  });
}

async function installDeniedMicMock(page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => {
          throw new DOMException('Permission denied', 'NotAllowedError');
        }
      }
    });
  });
}

async function installUnsupportedSpeechMock(page) {
  await page.evaluate(() => {
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
  });
}

async function openCookAssistant(page) {
  await page.goto(`${baseURL}/app`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof show === 'function' && document.getElementById('detail'));
  await page.evaluate(() => show('detail'));
  await page.locator('#detail .cta-bar button').click();
  await page.waitForFunction(() => document.getElementById('cook3')?.classList.contains('active'));
  await page.evaluate(() => hideCookHint());
  await page.locator('#hf3').click();
  await page.waitForFunction(() => document.getElementById('vpanel')?.classList.contains('open'));
  await page.waitForTimeout(250);
}

async function capture(page, profileId, name) {
  const path = snapshotPath(profileId, name);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function runProfile(profile) {
  const browser = await profile.browserType.launch({ headless: true, ...(profile.launch || {}) });
  try {
  const context = await browser.newContext(profile.context);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await openCookAssistant(page);
  const nativeCapability = await page.evaluate(() => ({
    secureContext: window.isSecureContext,
    mediaDevices: Boolean(navigator.mediaDevices),
    getUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
    speechRecognition: Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  }));
  const commandMapping = await page.evaluate(() => ({
    timer: answerForVpPrompt('타이머 3분 맞춰줘'),
    next: answerForVpPrompt('다음 단계로 넘어가줘'),
    previous: answerForVpPrompt('이전 단계로 돌아가줘'),
    ingredient: answerForVpPrompt('고추참치 없으면 어떻게 해')
  }));

  const screenshots = {};
  screenshots.beforePermission = await capture(page, profile.id, '01-before-permission');
  const beforePermission = await appState(page);

  await installAllowedMicMock(page);
  await page.evaluate(() => {
    window.__qaVolumeCommands = [];
    window.__qaOriginalPostCookYoutube = postCookYoutube;
    postCookYoutube = (func, args) => {
      if (func === 'setVolume') window.__qaVolumeCommands.push(args?.[0]);
      return true;
    };
    cookYoutubeMuted = false;
    setVsVol(80);
  });
  await page.locator('.vp-speak-btn').click();
  await page.waitForFunction(() => document.getElementById('vpanel')?.dataset.voiceState === 'listening');
  screenshots.afterPermission = await capture(page, profile.id, '02-after-permission');
  const afterPermission = await appState(page);

  await page.waitForTimeout(500);
  screenshots.listening = await capture(page, profile.id, '03-listening');
  const afterListeningWait = await appState(page);

  await page.evaluate(() => window.__qaEmitInterimSpeech('고추참치 없으면'));
  await page.waitForFunction(() => document.getElementById('vpTranscriptText')?.textContent.includes('고추참치'));
  await page.waitForTimeout(120);
  const interimTranscript = await appState(page);
  await page.evaluate(() => window.__qaEmitFinalSpeech('고추참치 없으면 어떻게 해'));
  await page.waitForFunction(() => document.getElementById('vpanel')?.dataset.voiceState === 'recognized');
  screenshots.transcript = await capture(page, profile.id, '04-transcript');
  const afterTranscriptWait = await appState(page);

  await page.waitForFunction(() => document.getElementById('vpanel')?.dataset.voiceState === 'responding');
  await page.waitForTimeout(520);
  screenshots.generating = await capture(page, profile.id, '05-response-generating');
  const generating = await appState(page);
  const duckedCommands = await page.evaluate(() => [...(window.__qaVolumeCommands || [])]);

  await page.waitForFunction(() => document.getElementById('vpanel')?.dataset.voiceState === 'complete');
  await page.waitForFunction(() => (window.__vpVideoDuckRestores || 0) >= 1);
  screenshots.complete = await capture(page, profile.id, '06-response-complete');
  const complete = await appState(page);
  const volumeCommands = await page.evaluate(() => [...(window.__qaVolumeCommands || [])]);

  await page.locator('#vpSizeHandle').click();
  await page.waitForTimeout(220);
  const expanded = await appState(page);
  await page.evaluate(() => {
    const node = document.getElementById('vpAi');
    node.textContent = Array(12).fill('양념이 타면 불을 낮추고 물을 한 숟갈씩 더해 농도를 확인하세요.').join(' ');
    const scroll = document.getElementById('vpScroll');
    scroll.scrollTop = scroll.scrollHeight;
  });
  await page.waitForTimeout(120);
  const longAnswerScrolled = await appState(page);

  await page.evaluate(() => resetVpPromptPanel());
  await installAllowedMicMock(page);
  await page.locator('.vp-speak-btn').click();
  await page.waitForFunction(() => document.getElementById('vpanel')?.dataset.voiceState === 'listening');
  await page.locator('.vp-speak-btn').click();
  await page.waitForFunction(() => document.getElementById('vpanel')?.dataset.voiceState === 'ready');
  const stopped = await appState(page);

  await page.evaluate(() => resetVpPromptPanel());
  await installDeniedMicMock(page);
  await page.locator('.vp-speak-btn').click();
  await page.waitForFunction(() => document.getElementById('vpLiveStatus')?.classList.contains('bad'));
  screenshots.denied = await capture(page, profile.id, '07-permission-denied');
  const denied = await appState(page);

  await page.evaluate(() => {
    resetVpPromptPanel();
    showVpRecognitionError({ error: 'no-speech' });
  });
  screenshots.noSpeech = await capture(page, profile.id, '08-no-speech');
  const noSpeech = await appState(page);

  await installUnsupportedSpeechMock(page);
  await page.evaluate(() => resetVpPromptPanel());
  await page.waitForFunction(() => document.getElementById('vpLiveStatus')?.classList.contains('bad'));
  screenshots.unsupported = await capture(page, profile.id, '09-browser-unsupported');
  const unsupported = await appState(page);

  const failures = [];
  if (beforePermission.voiceState !== 'ready' || beforePermission.liveStatus !== '마이크 OFF' || beforePermission.micButtonLabel !== '말하기 시작') failures.push('ready-state');
  if (afterPermission.voiceState !== 'listening' || afterPermission.waveDisplay === 'none' || !afterPermission.hasStopMicButton || afterPermission.micTrackStops !== 1) failures.push('listening-state');
  if (!interimTranscript.transcriptVisible || !interimTranscript.transcriptInterim || !interimTranscript.transcriptText.includes('고추참치')) failures.push('interim-transcript');
  if (afterTranscriptWait.voiceState !== 'recognized' || afterTranscriptWait.transcriptInterim || !afterTranscriptWait.transcriptText.includes('어떻게 해')) failures.push('final-transcript');
  if (generating.voiceState !== 'responding' || !generating.hasVolumeDuckIndicator || !generating.transcriptText.includes('고추참치')) failures.push('responding-state');
  if (complete.voiceState !== 'complete' || complete.liveStatus !== '응답 완료' || !complete.assistantText.includes('일반 참치') || complete.speakButtonText !== '다시 말하기') failures.push('complete-state');
  if (stopped.voiceState !== 'ready' || stopped.liveStatus !== '마이크 OFF') failures.push('stop-listening-state');
  if (denied.liveStatus !== '마이크 OFF' || !denied.assistantText.includes('사이트 설정') || !denied.hasRetryButton) failures.push('permission-denied-state');
  if (!noSpeech.liveStatus.includes('알아듣지 못했어요') || !noSpeech.hasRetryButton) failures.push('no-speech-state');
  if (!unsupported.liveStatus.includes('지원하지 않아요') || unsupported.speakButtonText !== '음성 미지원' || unsupported.hasRetryButton) failures.push('unsupported-state');
  if (expanded.overlapsCurrentStep || expanded.overlapsVideo || expanded.overlapsTimer) failures.push('expanded-overlap');
  if (longAnswerScrolled.scroll.scrollHeight <= longAnswerScrolled.scroll.clientHeight || longAnswerScrolled.scroll.scrollTop <= 0) failures.push('long-answer-scroll');
  if (!duckedCommands.some((value) => value > 0 && value < 80) || volumeCommands.at(-1) !== 80) failures.push('video-volume-duck');
  if (commandMapping.timer.timer !== 180 || !commandMapping.next.next || !commandMapping.previous.prev || !commandMapping.ingredient.a.includes('일반 참치')) failures.push('voice-command-mapping');
  if (failures.length) {
    throw new Error(`${profile.id}: ${failures.join(', ')}`);
  }

  return {
    id: profile.id,
    label: profile.label,
    nativeCapability,
    commandMapping,
    states: {
      beforePermission,
      afterPermission,
      afterListeningWait,
      interimTranscript,
      afterTranscriptWait,
      generating,
      complete,
      expanded,
      longAnswerScrolled,
      stopped,
      denied,
      noSpeech,
      unsupported
    },
    duckedCommands,
    volumeCommands,
    screenshots,
    consoleErrors
  };
  } finally {
    await browser.close().catch(() => {});
  }
}

function addFailure(list, profile, severity, item, detail) {
  list.push({ profile: profile.id, label: profile.label, severity, item, detail });
}

function hasLowVolumeCommand(commands) {
  return commands.some((value) => Number(value) > 0 && Number(value) < 80);
}

function hasRestoredVolumeCommand(commands) {
  return commands.includes(80);
}

function isKnownConsoleNoise(message) {
  return /Unable to post message to https:\/\/www\.youtube\.com/.test(message);
}

function validateProfile(result) {
  const failures = [];
  const warnings = [];
  if (result.fatalError) {
    addFailure(failures, result, 'P0', '브라우저 프로필 실행 실패', result.fatalError);
    return { failures, warnings };
  }

  const s = result.states;
  if (s.beforePermission.voiceState !== 'ready' || s.beforePermission.liveStatus !== '마이크 OFF') {
    addFailure(failures, result, 'P1', '권한 요청 전 대기 상태', '마이크 OFF 상태가 명확히 보이지 않습니다.');
  }
  if (s.beforePermission.promptInputExists || !s.beforePermission.inputModeText.includes('음성 또는 추천 질문')) {
    addFailure(failures, result, 'P1', '입력 방식 안내', '직접 입력처럼 보이거나 음성/추천 질문 제한 안내가 없습니다.');
  }

  if (s.afterPermission.voiceState !== 'listening' || !s.afterPermission.liveStatus.includes('듣는 중')) {
    addFailure(failures, result, 'P1', '권한 허용 후 듣는 중 상태', '권한 허용 뒤 3초 안에 듣는 중 상태로 전환되지 않았습니다.');
  }
  if (!s.afterPermission.transcriptVisible || !s.afterPermission.transcriptInterim || !s.afterPermission.transcriptText.includes('듣고')) {
    addFailure(failures, result, 'P1', '듣는 중 transcript 피드백', '음성 인식 대기 중임을 사용자가 화면에서 확인하기 어렵습니다.');
  }
  if (s.afterPermission.waveDisplay === 'none' || !s.afterPermission.hasStopMicButton) {
    addFailure(failures, result, 'P1', '녹음 중 시각 피드백과 중지 제어', '파형 또는 듣기 중지 버튼이 보이지 않습니다.');
  }

  if (s.interimTranscript.voiceState !== 'listening' || !s.interimTranscript.transcriptInterim || !s.interimTranscript.transcriptText.includes('고추참치')) {
    addFailure(failures, result, 'P1', '중간 음성 인식 표시', '사용자가 말한 중간 문장이 transcript에 표시되지 않았습니다.');
  }
  if (s.afterTranscriptWait.voiceState !== 'recognized' || s.afterTranscriptWait.transcriptInterim || !s.afterTranscriptWait.transcriptText.includes('어떻게 해')) {
    addFailure(failures, result, 'P1', '최종 음성 인식 표시', '최종 인식 문장이 확정 상태로 표시되지 않았습니다.');
  }

  if (s.generating.voiceState !== 'responding' || !s.generating.liveStatus.includes('응답') || !s.generating.hasVolumeDuckIndicator) {
    addFailure(failures, result, 'P1', '응답 생성 중 상태', '응답 중 상태 또는 영상 소리 자동 낮춤 표시가 없습니다.');
  }
  if (s.complete.voiceState !== 'complete' || !s.complete.liveStatus.includes('응답 완료') || s.complete.hasVolumeDuckIndicator) {
    addFailure(failures, result, 'P1', '응답 완료 상태', '응답 완료 상태와 볼륨 표시 복구가 명확하지 않습니다.');
  }
  if (!s.complete.assistantText || !s.complete.transcriptText.includes('고추참치')) {
    addFailure(failures, result, 'P1', '음성 질문 기반 답변 연결', 'final transcript가 비서 응답으로 이어지지 않았습니다.');
  }

  if (s.denied.voiceState !== 'error' || s.denied.liveStatus !== '마이크 OFF' || !s.denied.assistantText.includes('사이트 설정') || !s.denied.hasRetryButton) {
    addFailure(failures, result, 'P1', '권한 거부 오류 안내', '권한 거부 상태가 재시도 가능한 한국어 오류로 보이지 않습니다.');
  }
  if (s.noSpeech.voiceState !== 'error' || !s.noSpeech.liveStatus.includes('알아듣지 못했어요') || !s.noSpeech.hasRetryButton) {
    addFailure(failures, result, 'P1', '음성 인식 실패 안내', '인식 실패 상태가 다시 말하기 가능한 한국어 오류로 보이지 않습니다.');
  }
  if (s.unsupported.voiceState !== 'error' || !s.unsupported.liveStatus.includes('지원하지') || s.unsupported.quickPromptCount < 3) {
    addFailure(failures, result, 'P1', '브라우저 미지원 대체 흐름', '미지원 상태에서 추천 질문 대체 흐름이 충분하지 않습니다.');
  }

  if (!/auto|scroll/.test(s.longAnswerScrolled.scroll?.overflowY || '') || s.longAnswerScrolled.scroll.scrollHeight <= s.longAnswerScrolled.scroll.clientHeight || s.longAnswerScrolled.scroll.scrollTop <= 0) {
    addFailure(failures, result, 'P1', '긴 답변 내부 스크롤', '긴 답변이 패널 내부에서 스크롤되지 않습니다.');
  }

  const criticalStates = ['beforePermission', 'afterPermission', 'afterListeningWait', 'interimTranscript', 'afterTranscriptWait', 'generating', 'complete', 'stopped', 'denied', 'noSpeech', 'unsupported'];
  for (const name of criticalStates) {
    const state = s[name];
    if (state.overlapsVideo || state.overlapsTimer || state.overlapsCurrentStep) {
      addFailure(failures, result, 'P1', '모바일 조리 화면 가림', `${name} 상태에서 영상/타이머/현재 단계와 패널이 겹칩니다.`);
      break;
    }
  }

  if (!hasLowVolumeCommand(result.volumeCommands || []) || !hasRestoredVolumeCommand(result.volumeCommands || [])) {
    addFailure(failures, result, 'P1', '영상 볼륨 낮춤/복구', `setVolume 명령이 기대대로 호출되지 않았습니다: ${(result.volumeCommands || []).join(', ')}`);
  }

  const unexpectedConsole = (result.consoleErrors || []).filter((message) => !isKnownConsoleNoise(message));
  if (unexpectedConsole.length) {
    addFailure(failures, result, 'P2', '콘솔 오류', unexpectedConsole.slice(0, 3).join('\n'));
  }
  const knownConsole = (result.consoleErrors || []).filter(isKnownConsoleNoise);
  if (knownConsole.length) {
    warnings.push({ profile: result.id, item: 'YouTube iframe postMessage origin noise', count: knownConsole.length });
  }

  return { failures, warnings };
}

function scoreResults(results, failures) {
  const failedItems = new Set(failures.map((failure) => failure.item));
  return [
    ['권한 흐름 명확성', failedItems.has('권한 요청 전 대기 상태') || failedItems.has('권한 허용 후 듣는 중 상태') ? 0 : 10],
    ['음성 인식 확인 가능성', failedItems.has('듣는 중 transcript 피드백') || failedItems.has('중간 음성 인식 표시') || failedItems.has('최종 음성 인식 표시') ? 0 : 10],
    ['비서 응답 연결성', failedItems.has('음성 질문 기반 답변 연결') || failedItems.has('응답 생성 중 상태') || failedItems.has('응답 완료 상태') ? 0 : 10],
    ['모바일 사용성', failedItems.has('모바일 조리 화면 가림') || failedItems.has('긴 답변 내부 스크롤') ? 0 : 10],
    ['영상 볼륨 연동', failedItems.has('영상 볼륨 낮춤/복구') ? 0 : 10],
    ['오류 상태 안내', failedItems.has('권한 거부 오류 안내') || failedItems.has('음성 인식 실패 안내') || failedItems.has('브라우저 미지원 대체 흐름') ? 0 : 10],
    ['전체 베타테스트 적합성', failures.some((failure) => failure.severity === 'P0' || failure.severity === 'P1') ? 6 : 10]
  ].map(([name, score]) => ({ name, score }));
}

function screenshotLink(profileId, name, label) {
  return `[${label}](./screenshots/${profileId}-${name}.png)`;
}

function markdownReport({ generatedAt, baseURL, note, results, failures, warnings, scorecard }) {
  const lines = [
    '# Naembi 음성비서 UX 검증 리포트',
    '',
    `- 생성 시각: ${generatedAt}`,
    `- 대상 URL: ${baseURL}/app`,
    `- 판정: ${failures.length ? 'FAIL' : 'PASS'}`,
    `- 한계: ${note}`,
    '',
    '## 점수표',
    '',
    '| 항목 | 점수 |',
    '| --- | ---: |',
    ...scorecard.map((item) => `| ${item.name} | ${item.score} / 10 |`),
    '',
    '## 필수 흐름 판정',
    '',
    '| 프로필 | 권한 전 | 듣는 중 | 중간 transcript | 최종 transcript | 응답 중 | 완료 | 권한 거부 | 미지원 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...results.map((result) => {
      if (result.fatalError) return `| ${result.label} | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL |`;
      const s = result.states;
      const cells = [
        result.label,
        s.beforePermission.voiceState,
        `${s.afterPermission.voiceState} / ${s.afterPermission.transcriptText}`,
        `${s.interimTranscript.voiceState} / ${s.interimTranscript.transcriptText}`,
        `${s.afterTranscriptWait.voiceState} / ${s.afterTranscriptWait.transcriptText}`,
        `${s.generating.voiceState} / 볼륨표시 ${s.generating.hasVolumeDuckIndicator ? 'ON' : 'OFF'}`,
        `${s.complete.voiceState} / 볼륨표시 ${s.complete.hasVolumeDuckIndicator ? 'ON' : 'OFF'}`,
        s.denied.liveStatus,
        s.unsupported.liveStatus
      ].map((cell) => String(cell).replace(/\|/g, '/'));
      return `| ${cells.join(' | ')} |`;
    }),
    '',
    '## 문제 목록',
    ''
  ];

  if (failures.length) {
    lines.push('| 심각도 | 프로필 | 항목 | 내용 |', '| --- | --- | --- | --- |');
    for (const failure of failures) {
      lines.push(`| ${failure.severity} | ${failure.label} | ${failure.item} | ${String(failure.detail).replace(/\n/g, '<br>').replace(/\|/g, '/')} |`);
    }
  } else {
    lines.push('P0/P1 실패 항목 없음. 헤드리스 테스트 더블 기준으로 베타 전 핵심 UI 흐름은 통과했다.');
  }

  lines.push('', '## 경고');
  if (warnings.length) {
    lines.push('', '| 프로필 | 항목 | 횟수 |', '| --- | --- | ---: |');
    for (const warning of warnings) lines.push(`| ${warning.profile} | ${warning.item} | ${warning.count} |`);
  } else {
    lines.push('', '경고 없음.');
  }

  lines.push('', '## 스크린샷');
  for (const result of results) {
    if (result.fatalError) continue;
    lines.push(
      '',
      `### ${result.label}`,
      '',
      '| 상태 | 스크린샷 |',
      '| --- | --- |',
      `| 권한 요청 전 | ${screenshotLink(result.id, '01-before-permission', '보기')} |`,
      `| 권한 허용 후 | ${screenshotLink(result.id, '02-after-permission', '보기')} |`,
      `| 듣는 중 | ${screenshotLink(result.id, '03-listening', '보기')} |`,
      `| transcript | ${screenshotLink(result.id, '04-transcript', '보기')} |`,
      `| 응답 생성 중 | ${screenshotLink(result.id, '05-response-generating', '보기')} |`,
      `| 응답 완료 | ${screenshotLink(result.id, '06-response-complete', '보기')} |`,
      `| 권한 거부 | ${screenshotLink(result.id, '07-permission-denied', '보기')} |`,
      `| 음성 인식 실패 | ${screenshotLink(result.id, '08-no-speech', '보기')} |`,
      `| 브라우저 미지원 | ${screenshotLink(result.id, '09-browser-unsupported', '보기')} |`
    );
  }

  lines.push(
    '',
    '## 결론',
    '',
    failures.length
      ? '현재 상태는 음성비서 베타 테스트 전에 보완이 필요하다. 위 P1 항목을 먼저 해결해야 한다.'
      : '권한 허용 후 듣는 중 표시, 사용자의 음성 transcript, 응답 생성/완료, 권한 거부/미지원 대체 흐름이 모두 화면에서 확인된다. 실제 마이크 음성과 Gemini Live 오디오 왕복은 실기기 수동 검증이 추가로 필요하다.'
  );

  return `${lines.join('\n')}\n`;
}

const results = [];
for (const profile of profiles) {
  try {
    results.push(await runProfile(profile));
  } catch (error) {
    results.push({ id: profile.id, label: profile.label, fatalError: error.stack || error.message });
  }
}

const generatedAt = new Date().toISOString();
const validations = results.map(validateProfile);
const failures = validations.flatMap((validation) => validation.failures);
const warnings = validations.flatMap((validation) => validation.warnings);
const scorecard = scoreResults(results, failures);
const output = {
  generatedAt,
  baseURL,
  note: 'Microphone permission and SpeechRecognition events are deterministic test doubles. Native browser permission chrome and real microphone audio are not captured by headless Playwright.',
  scorecard,
  failures,
  warnings,
  results
};
await writeFile(resolve(outputDir, 'results.json'), `${JSON.stringify(output, null, 2)}\n`);
await writeFile(resolve(outputDir, 'REPORT_ko.md'), markdownReport(output));
console.log(JSON.stringify(output, null, 2));

if (failures.some((failure) => failure.severity === 'P0' || failure.severity === 'P1')) process.exitCode = 1;
