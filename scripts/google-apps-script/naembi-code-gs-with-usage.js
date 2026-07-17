/**
 * [Code.gs 전체 교체본] 냄비 베타 수집 + Gemini 사용량 수집.
 *
 * 기존에 쓰던 Code.gs 전체를 이 파일 내용으로 교체하면 된다.
 * 구성: (1) 기존 베타 수집 코드 그대로 (findResponseSheet_에 사용량 탭 제외 2줄만 추가)
 *       (2) 맨 아래 "Gemini 사용량 수집" 섹션 추가 (doPost 신규 — 기존 파일에는 doPost가 없었음)
 *
 * 교체 후 순서:
 * 1. setupNaembiUsageTab 실행 → 기존 스프레드시트에 '사용량'·'사용량 요약' 탭 생성 (기존 탭 무접촉)
 * 2. 배포 > 새 배포 > 웹 앱 (실행: 나 / 액세스: 모든 사용자) → .../exec URL 복사
 * 3. 로컬 .env와 Vercel에 NAEMBI_USAGE_WEBHOOK_URL=<그 URL> 추가
 * 4. submitNaembiUsageSmokeTest 실행 → '사용량' 탭에 u-smoke-test 행 확인
 *
 * 주의: setupNaembiBetaCollection은 다시 실행하지 말 것 (새 폼+새 시트가 또 생김).
 */

var NAEMBI_FORM_TITLE = '냄비 베타 신청·레시피 요청·피드백';
var NAEMBI_SHEET_TITLE = '냄비 베타 응답';
var NAEMBI_ENV_SHEET_NAME = 'Vercel env';
var NAEMBI_OPERATING_VIEW_NAME = '운영뷰';
var NAEMBI_OPERATING_HEADERS = [
  '접수구분',
  '이메일',
  '이름/닉네임',
  '사용자유형',
  '테스트상황',
  '피드백유형',
  '내용',
  '요청레시피',
  '유입위치',
  '화면',
  '제출페이지',
  '생성시각',
  '폼접수시각',
  '상태',
  '우선순위',
  '담당자',
  '운영메모'
];

var NAEMBI_FIELDS = [
  {
    key: 'kind',
    title: 'kind',
    help: 'beta-signup 또는 feedback. 앱 API가 자동으로 보냅니다.',
    type: 'text'
  },
  {
    key: 'email',
    title: 'email',
    help: '베타 초대나 피드백 답변을 받을 이메일입니다.',
    type: 'text'
  },
  {
    key: 'name',
    title: 'name',
    help: '이름 또는 닉네임입니다.',
    type: 'text'
  },
  {
    key: 'profile',
    title: 'profile',
    help: '요리 스타일, 사용자 유형, 제출 위치 구분값입니다.',
    type: 'text'
  },
  {
    key: 'note',
    title: 'note',
    help: '베타에서 테스트하고 싶은 상황입니다.',
    type: 'paragraph'
  },
  {
    key: 'type',
    title: 'type',
    help: 'feedback 종류입니다. 예: bug, recipe, voice, video, other',
    type: 'text'
  },
  {
    key: 'message',
    title: 'message',
    help: '피드백 내용 또는 레시피 요청 이유입니다.',
    type: 'paragraph'
  },
  {
    key: 'recipe',
    title: 'recipe',
    help: '요청한 요리 이름입니다.',
    type: 'text'
  },
  {
    key: 'source',
    title: 'source',
    help: '어느 버튼이나 폼에서 들어왔는지 앱이 자동으로 보냅니다.',
    type: 'text'
  },
  {
    key: 'screen',
    title: 'screen',
    help: '제출 당시 앱 화면입니다.',
    type: 'text'
  },
  {
    key: 'page',
    title: 'page',
    help: '제출 당시 페이지 URL입니다.',
    type: 'paragraph'
  },
  {
    key: 'createdAt',
    title: 'createdAt',
    help: '제출 시각입니다. 앱 API가 자동으로 보냅니다.',
    type: 'text'
  }
];

function setupNaembiBetaCollection() {
  var spreadsheet = SpreadsheetApp.create(NAEMBI_SHEET_TITLE);
  var envSheet = spreadsheet.getSheets()[0];
  envSheet.setName(NAEMBI_ENV_SHEET_NAME);

  var form = FormApp.create(NAEMBI_FORM_TITLE);
  form
    .setDescription('냄비 베타 신청, 레시피 요청, 피드백을 한 곳에 저장하는 운영용 폼입니다. 사용자는 웹앱을 통해 제출하고, 응답은 연결된 Google Sheets에 쌓입니다.')
    .setConfirmationMessage('접수됐습니다. 냄비 베타 운영 목록에 반영할게요.')
    .setAcceptingResponses(true)
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false);

  try {
    form.setRequireLogin(false);
  } catch (error) {
    Logger.log('setRequireLogin(false)를 적용하지 못했습니다. Google Workspace 정책이면 Form 설정에서 외부 응답 허용 여부를 확인하세요: ' + error.message);
  }

  var fieldMap = createQuestions_(form);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
  SpreadsheetApp.flush();
  Utilities.sleep(1200);
  var operatingView = createOperatingView_(spreadsheet);

  var publishedUrl = form.getPublishedUrl();
  var formResponseUrl = toFormResponseUrl_(publishedUrl);
  var fieldMapJson = JSON.stringify(fieldMap);

  PropertiesService.getScriptProperties().setProperties({
    NAEMBI_BETA_GOOGLE_FORM_URL: formResponseUrl,
    NAEMBI_BETA_GOOGLE_FORM_FIELDS: fieldMapJson,
    NAEMBI_FORM_EDIT_URL: form.getEditUrl(),
    NAEMBI_FORM_PUBLIC_URL: publishedUrl,
    NAEMBI_SHEET_URL: spreadsheet.getUrl()
  });

  writeEnvSheet_(envSheet, {
    formResponseUrl: formResponseUrl,
    fieldMapJson: fieldMapJson,
    formEditUrl: form.getEditUrl(),
    formPublicUrl: publishedUrl,
    sheetUrl: spreadsheet.getUrl(),
    operatingViewName: operatingView.getName()
  });

  Logger.log('생성 완료');
  Logger.log('Spreadsheet: ' + spreadsheet.getUrl());
  Logger.log('Form edit: ' + form.getEditUrl());
  Logger.log('Form public: ' + publishedUrl);
  Logger.log('Operating view: ' + operatingView.getName());
  Logger.log('Vercel env');
  Logger.log('NAEMBI_BETA_GOOGLE_FORM_URL=' + formResponseUrl);
  Logger.log('NAEMBI_BETA_GOOGLE_FORM_FIELDS=' + fieldMapJson);

  return {
    sheetUrl: spreadsheet.getUrl(),
    formEditUrl: form.getEditUrl(),
    formPublicUrl: publishedUrl,
    formResponseUrl: formResponseUrl,
    operatingViewName: operatingView.getName(),
    fieldMap: fieldMap
  };
}

function createNaembiOperatingView() {
  var spreadsheet = openConfiguredSpreadsheet_();
  var operatingView = createOperatingView_(spreadsheet);
  Logger.log('운영뷰 생성/갱신 완료: ' + spreadsheet.getUrl() + '#gid=' + operatingView.getSheetId());
  return {
    sheetUrl: spreadsheet.getUrl(),
    operatingViewName: operatingView.getName(),
    operatingViewGid: operatingView.getSheetId()
  };
}

function submitNaembiSmokeTest() {
  var props = PropertiesService.getScriptProperties();
  var formUrl = props.getProperty('NAEMBI_FORM_EDIT_URL') || props.getProperty('NAEMBI_FORM_PUBLIC_URL');

  if (!formUrl) {
    throw new Error('먼저 setupNaembiBetaCollection 함수를 실행하세요.');
  }

  var values = {
    kind: 'feedback',
    email: 'test@example.com',
    type: 'other',
    message: 'Apps Script smoke test',
    source: 'apps-script-smoke-test',
    screen: 'setup',
    page: 'script.google.com',
    createdAt: new Date().toISOString()
  };

  var form = FormApp.openByUrl(formUrl);
  var response = form.createResponse();

  form.getItems().forEach(function (item) {
    var title = item.getTitle();
    if (!Object.prototype.hasOwnProperty.call(values, title)) return;

    var value = values[title];
    var type = item.getType();
    if (type === FormApp.ItemType.TEXT) {
      response.withItemResponse(item.asTextItem().createResponse(value));
    } else if (type === FormApp.ItemType.PARAGRAPH_TEXT) {
      response.withItemResponse(item.asParagraphTextItem().createResponse(value));
    }
  });

  response.submit();
  Logger.log('Smoke test submitted. Google Sheet에서 Apps Script smoke test 행을 확인하세요.');
}

function openConfiguredSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var sheetUrl = props.getProperty('NAEMBI_SHEET_URL');
  if (sheetUrl) return SpreadsheetApp.openByUrl(sheetUrl);

  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;

  throw new Error('Spreadsheet를 찾지 못했습니다. 먼저 setupNaembiBetaCollection을 실행하거나, 같은 Script 프로젝트에서 실행하세요.');
}

function createOperatingView_(spreadsheet) {
  var responseSheet = findResponseSheet_(spreadsheet);
  var view = spreadsheet.getSheetByName(NAEMBI_OPERATING_VIEW_NAME);
  if (!view) {
    view = spreadsheet.insertSheet(NAEMBI_OPERATING_VIEW_NAME);
    ensureRows_(view, 1000);
    ensureColumns_(view, NAEMBI_OPERATING_HEADERS.length);
  } else {
    ensureRows_(view, 1000);
    ensureColumns_(view, NAEMBI_OPERATING_HEADERS.length);
    view.getRange(1, 1, view.getMaxRows(), 13).clear();
    view.getRange(1, 14, 1, 4).clear();
  }

  view.getRange(1, 1, 1, NAEMBI_OPERATING_HEADERS.length).setValues([NAEMBI_OPERATING_HEADERS]);
  view.getRange(2, 1).setFormula(buildOperatingViewFormula_(responseSheet.getName()));

  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['미확인', '확인', '반영중', '반영완료', '보류'], true)
    .setAllowInvalid(false)
    .build();
  var priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['P0', 'P1', 'P2', 'P3'], true)
    .setAllowInvalid(false)
    .build();

  view.getRange(2, 14, 999, 1).setDataValidation(statusRule);
  view.getRange(2, 15, 999, 1).setDataValidation(priorityRule);

  view.setFrozenRows(1);
  view.getRange(1, 1, 1, NAEMBI_OPERATING_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#1E2024')
    .setFontColor('#FFFFFF')
    .setWrap(true);
  view.getRange(1, 1, 1000, NAEMBI_OPERATING_HEADERS.length).setVerticalAlignment('top');
  view.getRange(2, 1, 999, 13).setBackground('#F8F9FB');
  view.getRange(2, 14, 999, 4).setBackground('#FFF7EF');

  var existingFilter = view.getFilter();
  if (existingFilter) existingFilter.remove();
  view.getRange(1, 1, 1000, NAEMBI_OPERATING_HEADERS.length).createFilter();

  view.setColumnWidth(1, 120);
  view.setColumnWidth(2, 220);
  view.setColumnWidth(3, 130);
  view.setColumnWidth(4, 130);
  view.setColumnWidth(5, 260);
  view.setColumnWidth(6, 110);
  view.setColumnWidth(7, 360);
  view.setColumnWidth(8, 180);
  view.setColumnWidth(9, 160);
  view.setColumnWidth(10, 120);
  view.setColumnWidth(11, 320);
  view.setColumnWidth(12, 190);
  view.setColumnWidth(13, 190);
  view.setColumnWidth(14, 110);
  view.setColumnWidth(15, 100);
  view.setColumnWidth(16, 120);
  view.setColumnWidth(17, 320);

  return view;
}

function findResponseSheet_(spreadsheet) {
  var ignored = {};
  ignored[NAEMBI_ENV_SHEET_NAME] = true;
  ignored[NAEMBI_OPERATING_VIEW_NAME] = true;
  ignored[NAEMBI_USAGE_TAB_NAME] = true;          // 사용량 탭은 폼 응답 시트가 아님
  ignored[NAEMBI_USAGE_SUMMARY_TAB_NAME] = true;  // 사용량 요약 탭도 제외

  var sheets = spreadsheet.getSheets().filter(function (sheet) {
    return !ignored[sheet.getName()];
  });

  if (!sheets.length) {
    throw new Error('Form 응답 Sheet를 찾지 못했습니다. Form destination 연결을 먼저 확인하세요.');
  }

  var preferred = sheets.filter(function (sheet) {
    var headers = sheet.getRange(1, 1, 1, Math.min(sheet.getMaxColumns(), 20)).getValues()[0];
    return headers.indexOf('kind') >= 0 && headers.indexOf('email') >= 0 && headers.indexOf('createdAt') >= 0;
  });

  return preferred[0] || sheets[0];
}

function buildOperatingViewFormula_(responseSheetName) {
  var raw = quoteSheetName_(responseSheetName);
  return '=IFERROR(ARRAYFORMULA(QUERY({IF(' + raw + '!B2:B="beta-signup","베타 신청",IF(' + raw + '!G2:G="recipe","레시피 요청","피드백")),' + raw + '!C2:M,' + raw + '!A2:A},"select * where Col13 is not null",0)),"")';
}

function quoteSheetName_(name) {
  return "'" + String(name).replace(/'/g, "''") + "'";
}

function ensureRows_(sheet, rowCount) {
  var missing = rowCount - sheet.getMaxRows();
  if (missing > 0) sheet.insertRowsAfter(sheet.getMaxRows(), missing);
}

function ensureColumns_(sheet, columnCount) {
  var missing = columnCount - sheet.getMaxColumns();
  if (missing > 0) sheet.insertColumnsAfter(sheet.getMaxColumns(), missing);
}

function createQuestions_(form) {
  var refs = [];

  NAEMBI_FIELDS.forEach(function (field) {
    var item = field.type === 'paragraph'
      ? form.addParagraphTextItem()
      : form.addTextItem();

    item
      .setTitle(field.title)
      .setHelpText(field.help)
      .setRequired(false);

    refs.push({
      key: field.key,
      item: item,
      marker: '__NAEMBI_' + field.key + '_FIELD__'
    });
  });

  return buildFieldMapFromPrefill_(form, refs);
}

function buildFieldMapFromPrefill_(form, refs) {
  var response = form.createResponse();
  refs.forEach(function (ref) {
    response.withItemResponse(ref.item.createResponse(ref.marker));
  });

  var prefilledUrl = response.toPrefilledUrl();
  var fieldMap = {};
  var query = prefilledUrl.split('?')[1] || '';

  query.split('&').forEach(function (pair) {
    var parts = pair.split('=');
    var name = parts[0] || '';
    var rawValue = parts.slice(1).join('=');
    if (name.indexOf('entry.') !== 0) return;

    var value = decodeURIComponent(rawValue.replace(/\+/g, '%20'));
    refs.forEach(function (ref) {
      if (value === ref.marker) {
        fieldMap[ref.key] = name;
      }
    });
  });

  refs.forEach(function (ref) {
    if (!fieldMap[ref.key]) {
      fieldMap[ref.key] = 'entry.' + ref.item.getId();
    }
  });

  return fieldMap;
}

function writeEnvSheet_(sheet, result) {
  sheet.clear();
  sheet.getRange(1, 1, 1, 3).setValues([['Name', 'Value', 'Memo']]);
  sheet.getRange(2, 1, 7, 3).setValues([
    ['NAEMBI_BETA_GOOGLE_FORM_URL', result.formResponseUrl, 'Vercel Project > Settings > Environment Variables에 추가'],
    ['NAEMBI_BETA_GOOGLE_FORM_FIELDS', result.fieldMapJson, 'Vercel 환경변수에는 한 줄 JSON으로 붙여넣기'],
    ['OPERATING_VIEW', result.operatingViewName || NAEMBI_OPERATING_VIEW_NAME, '베타 신청/레시피 요청/피드백을 한글 컬럼과 필터로 보는 탭'],
    ['FORM_EDIT_URL', result.formEditUrl, '폼 수정용 링크'],
    ['FORM_PUBLIC_URL', result.formPublicUrl, '응답 가능 여부 확인용 링크'],
    ['SHEET_URL', result.sheetUrl, '응답 확인용 시트 링크'],
    ['SMOKE_TEST', 'submitNaembiSmokeTest 실행', 'Form과 Sheet 연결 확인용 테스트 행 1개를 넣고 싶을 때만 실행']
  ]);

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#1E2024').setFontColor('#FFFFFF');
  sheet.getRange(1, 1, 8, 3).setWrap(true).setVerticalAlignment('top');
  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 760);
  sheet.setColumnWidth(3, 360);
}

function toFormResponseUrl_(publishedUrl) {
  if (!publishedUrl) {
    throw new Error('Form published URL을 가져오지 못했습니다.');
  }

  if (publishedUrl.indexOf('/viewform') !== -1) {
    return publishedUrl.replace(/\/viewform.*$/, '/formResponse');
  }

  return publishedUrl.replace(/\?.*$/, '') + '/formResponse';
}

// =====================================================================
// ===== 여기부터 Gemini 사용량 수집 (신규 추가) =====
// /api/usage가 보내는 {kind:'usage', payload} POST를 받아 '사용량' 탭에 기록한다.
// 같은 usageId(요리 세션)의 스냅샷이 여러 번 와도 seq가 큰 최신 값으로 한 행만 유지한다(upsert).
// =====================================================================

var NAEMBI_USAGE_TAB_NAME = '사용량';
var NAEMBI_USAGE_SUMMARY_TAB_NAME = '사용량 요약';

// /api/usage payload 필드 순서 그대로. 앞에 수신 시각(receivedAt)만 추가.
var NAEMBI_USAGE_HEADERS = [
  'receivedAt',            // A
  'requestId',             // B
  'usageId',               // C
  'uid',                   // D
  'seq',                   // E
  'final',                 // F
  'reason',                // G
  'model',                 // H
  'recipe',                // I
  'recipeId',              // J
  'sessionStartedAt',      // K
  'cookStartedAt',         // L
  'cookEndedAt',           // M
  'cookCompleted',         // N
  'connectCount',          // O
  'goAwayCount',           // P
  'totalOpenMs',           // Q
  'sentAudioSeconds',      // R
  'estInputAudioTokens',   // S
  'turns',                 // T
  'promptTokensLast',      // U
  'promptTokensMax',       // V
  'promptTokensSum',       // W
  'responseTokensLast',    // X
  'responseTokensMax',     // Y
  'responseTokensSum',     // Z
  'totalTokensLast',       // AA
  'totalTokensMax',        // AB
  'promptAudioTokensSum',  // AC
  'promptTextTokensSum',   // AD
  'responseAudioTokensSum',// AE
  'responseTextTokensSum', // AF
  'page',                  // AG
  'createdAt'              // AH
];

function doPost(event) {
  try {
    var body = JSON.parse(event.postData && event.postData.contents ? event.postData.contents : '{}');
    var kind = body.kind || (body.payload && body.payload.kind) || '';
    var payload = body.payload || body;
    if (kind === 'usage' || (payload && payload.usageId)) {
      return jsonOutput_(upsertNaembiUsageRow_(payload));
    }
    return jsonOutput_({ ok: false, error: '지원하지 않는 요청입니다. kind=usage만 처리합니다.' });
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  }
}

function doGet() {
  return jsonOutput_({ ok: true, service: 'naembi-usage-webhook', hint: 'POST {kind:"usage", payload:{...}}' });
}

function setupNaembiUsageTab() {
  var spreadsheet = openConfiguredSpreadsheet_();
  var usageSheet = ensureNaembiUsageTab_(spreadsheet);
  ensureNaembiUsageSummaryTab_(spreadsheet);

  Logger.log('사용량 탭 준비 완료: ' + spreadsheet.getUrl() + '#gid=' + usageSheet.getSheetId());
  Logger.log('다음 순서: 배포 > 새 배포 > 웹 앱으로 배포한 뒤 아래 환경변수를 설정하세요.');
  Logger.log('NAEMBI_USAGE_WEBHOOK_URL=<Web app URL(.../exec)>');

  return {
    sheetUrl: spreadsheet.getUrl(),
    usageTab: usageSheet.getName()
  };
}

function upsertNaembiUsageRow_(payload) {
  if (!payload || !payload.usageId || !payload.uid) {
    return { ok: false, error: 'usageId와 uid가 필요합니다.' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var spreadsheet = openConfiguredSpreadsheet_();
    var sheet = ensureNaembiUsageTab_(spreadsheet);

    var row = findNaembiRowByHeader_(sheet, 'usageId', payload.usageId);
    if (row) {
      var seqColumn = naembiHeaderMap_(sheet).seq;
      var existingSeq = seqColumn ? Number(sheet.getRange(row, seqColumn).getValue()) || 0 : 0;
      if ((Number(payload.seq) || 0) < existingSeq) {
        return { ok: true, skipped: 'stale-seq', row: row };
      }
      writeNaembiUsageRow_(sheet, row, payload);
      return { ok: true, updated: true, row: row };
    }

    var newRow = sheet.getLastRow() + 1;
    writeNaembiUsageRow_(sheet, newRow, payload);
    return { ok: true, appended: true, row: newRow };
  } finally {
    lock.releaseLock();
  }
}

function writeNaembiUsageRow_(sheet, row, payload) {
  var values = NAEMBI_USAGE_HEADERS.map(function (header) {
    if (header === 'receivedAt') return new Date();
    var value = payload[header];
    if (value === undefined || value === null) return '';
    return value;
  });
  sheet.getRange(row, 1, 1, values.length).setValues([values]);
}

function ensureNaembiUsageTab_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(NAEMBI_USAGE_TAB_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(NAEMBI_USAGE_TAB_NAME);
  ensureColumns_(sheet, NAEMBI_USAGE_HEADERS.length);

  var firstHeader = String(sheet.getRange(1, 1).getValue() || '').trim();
  if (firstHeader !== NAEMBI_USAGE_HEADERS[0]) {
    sheet.getRange(1, 1, 1, NAEMBI_USAGE_HEADERS.length).setValues([NAEMBI_USAGE_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, NAEMBI_USAGE_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1E2024')
      .setFontColor('#FFFFFF');
  }
  return sheet;
}

function ensureNaembiUsageSummaryTab_(spreadsheet) {
  var view = spreadsheet.getSheetByName(NAEMBI_USAGE_SUMMARY_TAB_NAME);
  if (!view) view = spreadsheet.insertSheet(NAEMBI_USAGE_SUMMARY_TAB_NAME);
  view.clear();

  var usage = quoteSheetName_(NAEMBI_USAGE_TAB_NAME);

  // 단가(1M 토큰당 USD). 가격표가 바뀌면 이 셀만 고치면 된다.
  view.getRange('A1:B4').setValues([
    ['단가 ($/1M tokens)', ''],
    ['오디오 입력', 3.0],
    ['텍스트 입력', 0.75],
    ['오디오 출력', 12.0]
  ]);

  view.getRange('A6:B11').setValues([
    ['전체 합계', ''],
    ['오디오 입력 토큰', '=SUM(' + usage + '!AC2:AC)'],
    ['텍스트 입력 토큰', '=SUM(' + usage + '!AD2:AD)'],
    ['오디오 출력 토큰', '=SUM(' + usage + '!AE2:AE)'],
    ['입력 토큰 합(전체)', '=SUM(' + usage + '!W2:W)'],
    ['추정 비용($)', '=ROUND((B7*B2+B8*B3+B9*B4)/1000000,3)']
  ]);

  // 사용자별 집계. 사용량 탭은 세션당 1행(upsert)이라 그대로 합산하면 된다.
  view.getRange('D1').setValue('사용자별 집계');
  view.getRange('D2').setFormula(
    '=IFERROR(QUERY(' + usage + '!A2:AH,' +
    '"select D, count(C), sum(W), sum(Z), sum(R), sum(O) where D is not null group by D ' +
    'label D \'사용자\', count(C) \'세션수\', sum(W) \'입력토큰합\', sum(Z) \'출력토큰합\', sum(R) \'발화초합\', sum(O) \'연결횟수합\'",0),"아직 데이터가 없습니다")'
  );

  view.setFrozenRows(1);
  view.getRange('A1').setFontWeight('bold');
  view.getRange('A6').setFontWeight('bold');
  view.getRange('D1').setFontWeight('bold');
  view.setColumnWidth(1, 170);
  view.setColumnWidth(4, 180);
  return view;
}

function naembiHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
  var map = {};
  headers.forEach(function (header, index) {
    var key = String(header || '').trim();
    if (key) map[key] = index + 1;
  });
  return map;
}

function findNaembiRowByHeader_(sheet, header, value) {
  var map = naembiHeaderMap_(sheet);
  var column = map[header];
  if (!column) return 0;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  var values = sheet.getRange(2, column, lastRow - 1, 1).getValues();
  value = String(value || '').trim();
  for (var i = 0; i < values.length; i += 1) {
    if (String(values[i][0] || '').trim() === value) return i + 2;
  }
  return 0;
}

function jsonOutput_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function submitNaembiUsageSmokeTest() {
  var result = upsertNaembiUsageRow_({
    requestId: 'gu-smoke-1',
    usageId: 'gu-smoke',
    uid: 'u-smoke-test',
    seq: 1,
    final: true,
    reason: 'smoke-test',
    model: 'gemini-3.1-flash-live-preview',
    recipe: 'Apps Script smoke test',
    recipeId: 'smoke',
    sessionStartedAt: new Date().toISOString(),
    cookStartedAt: new Date().toISOString(),
    cookEndedAt: new Date().toISOString(),
    cookCompleted: true,
    connectCount: 1,
    goAwayCount: 0,
    totalOpenMs: 60000,
    sentAudioSeconds: 30,
    estInputAudioTokens: 960,
    turns: 3,
    promptTokensLast: 1200,
    promptTokensMax: 1200,
    promptTokensSum: 3000,
    responseTokensLast: 100,
    responseTokensMax: 150,
    responseTokensSum: 300,
    totalTokensLast: 1300,
    totalTokensMax: 1350,
    promptAudioTokensSum: 1800,
    promptTextTokensSum: 900,
    responseAudioTokensSum: 290,
    responseTextTokensSum: 0,
    page: '/app',
    createdAt: new Date().toISOString()
  });
  Logger.log('Smoke test 완료: ' + JSON.stringify(result));
  Logger.log("'사용량' 탭에서 u-smoke-test 행을 확인한 뒤 지워도 됩니다.");
}
