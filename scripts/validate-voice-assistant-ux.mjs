import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const baseURL = (process.argv[2] || 'http://127.0.0.1:4873').replace(/\/+$/, '');
const defaultOutputDir = `/tmp/naembi-voice-assistant-ux-${new Date().toISOString().slice(0, 10)}`;
const outputDir = resolve(process.argv[3] || defaultOutputDir);
const cdpPort = Number(process.env.NAEMBI_GEMINI_LIVE_RECONNECT_CDP_PORT || 9474);

await mkdir(outputDir, { recursive: true });

function runScript(script, args) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code, signal) => {
      resolveRun({ code, signal, stdout, stderr });
    });
  });
}

function parseJsonOutput(stdout) {
  const lines = stdout.trim().split(/\n+/).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {}
  }
  return null;
}

function addScore(name, ok, detail) {
  return { name, score: ok ? 10 : 0, detail };
}

function buildScorecard(result) {
  return [
    addScore(
      'Gemini Live 세션 재연결',
      result.socketCount >= 2 && result.tokenRequestCount >= 2 && result.sameLiveAfterReconnect,
      `sockets=${result.socketCount}, tokenRequests=${result.tokenRequestCount}`
    ),
    addScore(
      '마이크 수명주기 보존',
      Boolean(result.micAfterClose?.sameLive && result.micAfterClose?.sameTrack && result.pageSuspend?.micReleased && result.pageResume?.micLive),
      `afterClose=${JSON.stringify(result.micAfterClose || {})}`
    ),
    addScore(
      '16 kHz PCM 전송',
      result.sentAudioFrames > 0 && result.sentAudioBytes > 1000,
      `frames=${result.sentAudioFrames}, bytes=${result.sentAudioBytes}`
    ),
    addScore(
      '세션 복원 핸들',
      Boolean(result.contextCompression && result.resumedPayloadHandle && result.resumedPayloadHandle === result.resumedHandle),
      `payload=${result.resumedPayloadHandle || ''}, setup=${result.resumedHandle || ''}`
    ),
    addScore(
      '도구 실행 연결',
      result.replayToolDedupe?.firstDelta === 10 && result.replayToolDedupe?.secondDelta === 0,
      `toolDelta=${JSON.stringify(result.replayToolDedupe || {})}`
    ),
    addScore(
      '잘못된 resume fallback',
      Boolean(result.invalidResumeFallback?.handleCleared && result.invalidResumeFallback?.ready),
      `fallback=${JSON.stringify(result.invalidResumeFallback || {})}`
    )
  ];
}

function buildFailures(run, result, scorecard) {
  const failures = [];
  if (run.code !== 0) {
    failures.push({
      severity: 'P0',
      item: 'Gemini Live 브라우저 하네스 실행 실패',
      detail: (run.stderr || run.stdout || `exit ${run.code}${run.signal ? ` / ${run.signal}` : ''}`).trim()
    });
    return failures;
  }
  if (!result?.ok) {
    failures.push({
      severity: 'P0',
      item: 'Gemini Live 결과 파싱 실패',
      detail: 'verify-gemini-live-reconnect-browser.mjs가 ok:true JSON을 출력하지 않았습니다.'
    });
    return failures;
  }
  for (const item of scorecard) {
    if (item.score < 10) {
      failures.push({
        severity: 'P1',
        item: item.name,
        detail: item.detail
      });
    }
  }
  return failures;
}

function markdownReport({ generatedAt, baseURL, note, scorecard, failures, result }) {
  const lines = [
    '# Naembi Gemini Live 음성비서 검증 리포트',
    '',
    `- 생성 시각: ${generatedAt}`,
    `- 대상 URL: ${baseURL}/app`,
    `- 판정: ${failures.length ? 'FAIL' : 'PASS'}`,
    `- 한계: ${note}`,
    '',
    '## 점수표',
    '',
    '| 항목 | 점수 | 근거 |',
    '| --- | ---: | --- |',
    ...scorecard.map((item) => `| ${item.name} | ${item.score} / 10 | ${String(item.detail).replace(/\|/g, '/')} |`),
    '',
    '## 핵심 결과',
    '',
    '| 항목 | 값 |',
    '| --- | --- |',
    `| WebSocket 생성 수 | ${result?.socketCount ?? '-'} |`,
    `| 토큰 요청 수 | ${result?.tokenRequestCount ?? '-'} |`,
    `| 전송 오디오 프레임 | ${result?.sentAudioFrames ?? '-'} |`,
    `| 전송 오디오 바이트 | ${result?.sentAudioBytes ?? '-'} |`,
    `| resume handle | ${result?.resumedHandle || '-'} |`,
    `| 도구 실행 delta | ${JSON.stringify(result?.replayToolDedupe || {})} |`,
    '',
    '## 문제 목록',
    ''
  ];

  if (failures.length) {
    lines.push('| 심각도 | 항목 | 내용 |', '| --- | --- | --- |');
    for (const failure of failures) {
      lines.push(`| ${failure.severity} | ${failure.item} | ${String(failure.detail).replace(/\n/g, '<br>').replace(/\|/g, '/')} |`);
    }
  } else {
    lines.push('P0/P1 실패 항목 없음. Headless Chrome 하네스 기준으로 Gemini Live 재연결, 마이크 유지/해제, PCM 전송, 도구 실행 중복 방지가 통과했다.');
  }

  lines.push(
    '',
    '## 결론',
    '',
    failures.length
      ? '현재 상태는 Gemini Live 음성비서 회귀 확인이 통과하지 못했다. 위 항목을 먼저 해결해야 한다.'
      : 'PR의 Gemini Live 음성비서 핵심 동작은 충돌 해결 후에도 유지된다. 실제 Gemini API 왕복은 로컬/배포 환경에 API 키가 있을 때 별도 실사용 검증이 필요하다.'
  );
  return `${lines.join('\n')}\n`;
}

const generatedAt = new Date().toISOString();
const run = await runScript('scripts/verify-gemini-live-reconnect-browser.mjs', [baseURL, String(cdpPort)]);
const result = parseJsonOutput(run.stdout);
const scorecard = result ? buildScorecard(result) : [];
const failures = buildFailures(run, result, scorecard);
const output = {
  generatedAt,
  baseURL,
  note: 'Headless Chrome 하네스가 Gemini Live 토큰/API/WebSocket을 테스트 더블로 대체합니다. 실제 Gemini API 왕복과 실기기 마이크 권한 UI는 별도 수동 검증이 필요합니다.',
  scorecard,
  failures,
  result,
  stderr: run.stderr.trim()
};

await writeFile(resolve(outputDir, 'results.json'), `${JSON.stringify(output, null, 2)}\n`);
await writeFile(resolve(outputDir, 'REPORT_ko.md'), markdownReport(output));
console.log(JSON.stringify(output, null, 2));

if (failures.some((failure) => failure.severity === 'P0' || failure.severity === 'P1')) process.exitCode = 1;
