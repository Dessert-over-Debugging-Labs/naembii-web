import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const { _test: tokenPolicy } = require('../api/gemini-live-token');
const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const guardSource = html.match(/  function authorizeGeminiToolCall[\s\S]*?(?=\n  function noteVpToolDecision)/)?.[0];
assert.ok(guardSource, 'Gemini tool schema guard source was not found in app.html');

const context = vm.createContext({
  currentGeminiCookingContext: () => ({ key: 'recipe:cooking:1', stepIndex: 2, totalSteps: 5 })
});
vm.runInContext(`${guardSource}\nthis.authorize = authorizeGeminiToolCall;`, context);

function decision(name, args, contextKey = 'recipe:cooking:1') {
  return context.authorize(name, args, contextKey);
}

// Gemini가 판단한 자연어 의도를 브라우저 정규식으로 다시 해석하지 않는다.
assert.equal(decision('move_cooking_step', { direction: 'next' }).allowed, true);
assert.equal(decision('move_cooking_step', { direction: 'previous' }).allowed, true);
assert.equal(decision('move_cooking_step', { direction: 'later' }).code, 'INVALID_TOOL_CALL');

assert.equal(decision('go_to_cooking_step', { step: 1 }).allowed, true);
assert.equal(decision('go_to_cooking_step', { step: 5 }).allowed, true);
assert.equal(decision('go_to_cooking_step', { step: 0 }).allowed, false);
assert.equal(decision('go_to_cooking_step', { step: 6 }).allowed, false);
assert.equal(decision('go_to_cooking_step', { step: '3' }).allowed, false);
assert.equal(decision('go_to_cooking_step', { step: 3 }, 'recipe:cooking:0').code, 'COOKING_CONTEXT_CHANGED');

assert.equal(decision('set_cooking_timer', { seconds: 1 }).allowed, true);
assert.equal(decision('set_cooking_timer', { seconds: 7200 }).allowed, true);
assert.equal(decision('set_cooking_timer', { seconds: 0 }).allowed, false);
assert.equal(decision('set_cooking_timer', { seconds: 7201 }).allowed, false);
assert.equal(decision('set_cooking_timer', { seconds: '180' }).allowed, false);
assert.equal(decision('set_cooking_timer_state', { state: 'pause' }).allowed, true);
assert.equal(decision('set_cooking_timer_state', { state: 'resume' }).allowed, true);
assert.equal(decision('set_cooking_timer_state', { state: 'cancel' }).allowed, true);
assert.equal(decision('set_cooking_timer_state', { state: 'stop' }).allowed, false);

assert.equal(decision('set_video_playback', { state: 'play' }).allowed, true);
assert.equal(decision('set_video_playback', { state: 'pause' }).allowed, true);
assert.equal(decision('set_video_playback', { state: 'toggle' }).allowed, false);
assert.equal(decision('seek_video', { direction: 'forward', seconds: 10 }).allowed, true);
assert.equal(decision('seek_video', { direction: 'backward', seconds: 60 }).allowed, true);
assert.equal(decision('seek_video', { direction: 'sideways', seconds: 10 }).allowed, false);
assert.equal(decision('seek_video', { direction: 'forward', seconds: 61 }).allowed, false);
assert.equal(decision('seek_video', { direction: 'forward', seconds: 1.5 }).allowed, false);
assert.equal(decision('set_video_speed', { speed: '1.5' }).allowed, true);
assert.equal(decision('set_video_speed', { speed: 2 }).allowed, true);
assert.equal(decision('set_video_speed', { speed: 3 }).allowed, false);
assert.equal(decision('set_video_repeat', { enabled: true }).allowed, true);
assert.equal(decision('set_video_repeat', { enabled: false }).allowed, true);
assert.equal(decision('set_video_repeat', { enabled: 'false' }).allowed, false);
assert.equal(decision('show_cooking_ingredients', {}).allowed, true);
assert.equal(decision('delete_recipe', {}).allowed, false);

const handler = html.match(/  function handleGeminiToolCall[\s\S]*?(?=\n  function bufferedGeminiResponseBytes)/)?.[0] || '';
assert.match(handler, /authorizeGeminiToolCall/);
assert.match(handler, /if\(!decision\.allowed\)/);
assert.ok(handler.indexOf('if(!decision.allowed)') < handler.indexOf('runGeminiTool('));
assert.match(handler, /STALE_USER_COMMAND/);
assert.match(handler, /COMMAND_NOT_READY/);
assert.match(handler, /EXTRA_TOOL_CALL/);
assert.match(handler, /active\?\.toolActionKey/);
assert.match(handler, /active\.toolActionKey=actionKey/);
assert.match(handler, /transcriptReady/);
assert.match(handler, /audioReady/);
assert.match(handler, /hasInputTranscript/);
assert.match(handler, /inputTranscriptTrusted/);
assert.match(handler, /active\.audioEndedAt/);
assert.match(handler, /toolCallResults/);
assert.match(handler, /toolCommandResults/);
assert.match(handler, /active\.toolExecuted=true/);
assert.match(handler, /noteVpToolDecision/);
assert.doesNotMatch(handler, /TOOL_INTENT_MISMATCH|NON_COMMAND_UTTERANCE|explicitGemini/);
assert.doesNotMatch(html, /function explicitGemini|geminiCommandIsReportedQuestionOrNegated|geminiRequestSuffixPattern/);
assert.match(html, /hideCookHint\(\{startPlayback:false\}\)/);
assert.match(html, /cook3Car\.next\(\{startPlayback:false\}\)/);
assert.match(html, /live\.responseCommandEpoch=command\.epoch/);
assert.match(html, /bufferGeminiServerResponse/);
assert.match(html, /flushPendingGeminiResponse/);
assert.match(html, /ignoreInterruptedTurnComplete/);
assert.match(html, /activeCommand\.toolExecuted/);
assert.match(html, /if\(geminiLive\?\.closingRequested\)return/);

const liveConfig = tokenPolicy.liveConfig({ recipe: '순두부찌개', step: '2/5 · 양파 넣기', totalSteps: 5 });
assert.equal(liveConfig.temperature, 0.2);
assert.equal(liveConfig.inputAudioTranscription.adaptationPhrases.includes('다음 단계'), false);
assert.equal(liveConfig.inputAudioTranscription.adaptationPhrases.includes('이전 단계'), false);
assert.match(liveConfig.systemInstruction, /자연스러운 구어체와 음성 인식의 사소한 종결형 차이에도 같은 의도로 처리한다/);
assert.match(liveConfig.systemInstruction, /도구를 먼저 호출하고 결과를 받은 뒤에만 성공 여부를 답한다/);
assert.match(liveConfig.systemInstruction, /도구 실행 오류를 듣기 실패로 표현하지 않는다/);
assert.match(liveConfig.systemInstruction, /한 발화에서는 가장 명확한 핵심 조작 하나만 호출한다/);
assert.match(liveConfig.systemInstruction, /예약 실행은 지원하지 않는다/);
assert.match(liveConfig.systemInstruction, /영상 일시 정지만 호출하며 단계 이동은 절대 호출하지 않는다/);
assert.match(liveConfig.systemInstruction, /“안녕”, “냄비야” 같은 인사에는 짧게 한국어로 답한다/);
assert.match(liveConfig.systemInstruction, /“마지막 단계로 이동해 줘”에는 go_to_cooking_step/);
assert.match(liveConfig.systemInstruction, /전체 조리 단계 수: 5/);
assert.doesNotMatch(liveConfig.systemInstruction, /잘 못 들었어요|한국어로 다시 말해/);

console.log('Gemini tool schema guard validation passed.');
