import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const jsonOutput = process.argv.includes('--json');
const requestedFiles = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const files = requestedFiles.length ? requestedFiles : ['index.html'];

const rules = [
  {
    id: 'implementation-narration',
    severity: 'error',
    message: '사용자가 할 행동보다 음성 인식 구현 방식을 먼저 설명합니다.',
    pattern: /브라우저가 음성을 텍스트로|브라우저 음성 인식을 사용/
  },
  {
    id: 'internal-term',
    severity: 'error',
    message: '사용자 화면에 개발 내부 용어가 노출됩니다.',
    pattern: /localStorage|SpeechRecognition|CDP|테스트 더블|스텁/
  },
  {
    id: 'old-assistant-copy',
    severity: 'error',
    message: '교체하기로 한 이전 음성비서 안내 문구가 남아 있습니다.',
    pattern: /무엇이 궁금해요\?|말하기를 시작하거나 추천 질문을 선택해보세요/
  },
  {
    id: 'old-review-copy',
    severity: 'error',
    message: '후기 안내가 예시 감탄사를 직접 설명하는 이전 말투입니다.',
    pattern: /“와, 이거 꿀맛!”처럼|맛있었던 순간이나 “와, 이거 꿀맛!”/
  },
  {
    id: 'command-tone',
    severity: 'warning',
    message: '명령조 대신 사용자가 선택할 수 있는 제안형 문구인지 확인하세요.',
    pattern: /(선택|입력|클릭)하세요[.!]?$/
  },
  {
    id: 'technical-guidance',
    severity: 'warning',
    message: '기술 용어가 꼭 필요한 오류 안내인지, 쉬운 행동 안내로 바꿀 수 있는지 확인하세요.',
    pattern: /HTTPS|네트워크|브라우저 주소창|사이트 설정/
  },
  {
    id: 'planner-centered',
    severity: 'warning',
    message: '사용자 가치보다 내부 기획·준비 상황을 설명하는 문구인지 확인하세요.',
    pattern: /베타용 요청 수집 단계|목표로 합니다|준비합니다/
  }
];

const requiredCopy = [
  {
    id: 'assistant-direct-prompt',
    pattern: /직접 말로 물어보거나, 추천 질문을 선택해보세요!/
  },
  {
    id: 'input-limit',
    pattern: /현재는 음성 또는 추천 질문만 지원해요/
  },
  {
    id: 'review-guidance',
    pattern: /요리를 완주한 후 느낀 가벼운 감상을 남겨보세요/
  },
  {
    id: 'voice-state-sequence',
    patterns: [/마이크 OFF/, /마이크 ON · 듣는 중/, /인식 완료/, /응답 완료/]
  }
];

function visibleText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\n|\\t/g, ' ')
    .replace(/\\(['"`])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function addCandidate(candidates, seen, file, line, raw) {
  const text = visibleText(raw);
  if (!/[가-힣]/.test(text) || text.length < 2) return;
  const key = `${file}:${line}:${text}`;
  if (seen.has(key)) return;
  seen.add(key);
  candidates.push({ file, line, text });
}

function collectCandidates(file, source) {
  const candidates = [];
  const seen = new Set();
  source.split(/\r?\n/).forEach((lineText, index) => {
    const line = index + 1;
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    for (const quote of ["'", '"', '`']) {
      const escaped = quote === '"' ? '"' : quote;
      const expression = new RegExp(`${escaped}((?:\\\\.|[^${escaped}\\\\])*)${escaped}`, 'g');
      for (const match of lineText.matchAll(expression)) addCandidate(candidates, seen, file, line, match[1]);
    }

    if (lineText.includes('<') && lineText.includes('>')) {
      addCandidate(candidates, seen, file, line, lineText.replace(/<script[^>]*>.*$/i, '').replace(/<style[^>]*>.*$/i, ''));
    }
  });
  return candidates;
}

const sources = [];
const candidates = [];
for (const input of files) {
  const absolute = resolve(root, input);
  const source = await readFile(absolute, 'utf8');
  const file = relative(root, absolute) || input;
  sources.push({ file, source });
  candidates.push(...collectCandidates(file, source));
}

const findings = [];
for (const candidate of candidates) {
  for (const rule of rules) {
    if (!rule.pattern.test(candidate.text)) continue;
    findings.push({
      rule: rule.id,
      severity: rule.severity,
      message: rule.message,
      ...candidate
    });
  }
}

const combinedSource = sources.map(({ source }) => source).join('\n');
const missing = [];
for (const requirement of requiredCopy) {
  const patterns = requirement.patterns || [requirement.pattern];
  if (patterns.some((pattern) => !pattern.test(combinedSource))) missing.push(requirement.id);
}

const errors = findings.filter((finding) => finding.severity === 'error');
const warnings = findings.filter((finding) => finding.severity === 'warning');
const failed = errors.length > 0 || missing.length > 0 || (strict && warnings.length > 0);
const result = {
  status: failed ? 'FAIL' : 'PASS',
  strict,
  files: sources.map(({ file }) => file),
  checkedCopyCount: candidates.length,
  errors,
  warnings,
  missing
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`[copy-tone] ${result.status} · 문구 ${candidates.length}개 · 오류 ${errors.length}개 · 검토 ${warnings.length}개`);
  for (const finding of findings) {
    console.log(`${finding.severity === 'error' ? 'ERROR' : 'WARN'} ${finding.file}:${finding.line} [${finding.rule}] ${finding.text}`);
  }
  for (const id of missing) console.log(`ERROR [required-copy] ${id} 문구가 없습니다.`);
}

if (failed) process.exitCode = 1;
