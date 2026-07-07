/**
 * 냄비 베타 수집용 Google Form + Google Sheets 자동 생성 스크립트.
 * Slack 알림의 "반영완료 체크" 버튼이 호출할 Apps Script Web App도 함께 제공한다.
 *
 * 사용법:
 * 1. https://script.google.com 에서 새 프로젝트를 만든다.
 * 2. 이 파일 전체를 Code.gs에 붙여넣는다.
 * 3. setupNaembiBetaCollection 함수를 실행하고 권한을 승인한다.
 * 4. 생성된 Spreadsheet의 "Vercel env" 탭에서 환경변수를 복사한다.
 * 5. Slack 완료 체크까지 쓰려면 Web app으로 배포한 뒤 refreshNaembiAutomationEnv를 실행한다.
 * 6. 운영뷰는 setup/refresh/webhook/form submit 경로에서 자동 갱신된다.
 */

var NAEMBI_FORM_TITLE = '냄비 베타 신청·레시피 요청·피드백';
var NAEMBI_SHEET_TITLE = '냄비 베타 응답';
var NAEMBI_ENV_SHEET_NAME = 'Vercel env';
var NAEMBI_OPERATING_VIEW_NAME = '운영뷰';
var NAEMBI_OPERATION_TOKEN_PROPERTY = 'NAEMBI_OPERATION_TOKEN';
var NAEMBI_OPERATING_AUTO_COLUMNS = 14;
var NAEMBI_OPERATING_HEADERS = [
  '접수구분',
  '요청ID',
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
  '운영메모',
  '반영완료',
  '반영완료시각',
  '반영자',
  '반영메모'
];

var NAEMBI_FIELDS = [
  {
    key: 'kind',
    title: 'kind',
    help: 'beta-signup 또는 feedback. 앱 API가 자동으로 보냅니다.',
    type: 'text'
  },
  {
    key: 'requestId',
    title: 'requestId',
    help: 'Slack 알림과 운영뷰에서 같은 요청을 찾기 위한 자동 추적 ID입니다.',
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
  var operationToken = ensureOperationToken_();
  var webAppUrl = getWebAppUrl_();

  PropertiesService.getScriptProperties().setProperties({
    NAEMBI_BETA_GOOGLE_FORM_URL: formResponseUrl,
    NAEMBI_BETA_GOOGLE_FORM_FIELDS: fieldMapJson,
    NAEMBI_FORM_EDIT_URL: form.getEditUrl(),
    NAEMBI_FORM_PUBLIC_URL: publishedUrl,
    NAEMBI_SHEET_URL: spreadsheet.getUrl(),
    NAEMBI_BETA_COMPLETION_URL: webAppUrl
  });
  var automation = ensureOperatingViewAutomation_(spreadsheet);

  writeEnvSheet_(envSheet, {
    formResponseUrl: formResponseUrl,
    fieldMapJson: fieldMapJson,
    formEditUrl: form.getEditUrl(),
    formPublicUrl: publishedUrl,
    sheetUrl: spreadsheet.getUrl(),
    operatingViewName: operatingView.getName(),
    operatingViewAutomation: automation.summary,
    operationToken: operationToken,
    webAppUrl: webAppUrl
  });

  Logger.log('생성 완료');
  Logger.log('Spreadsheet: ' + spreadsheet.getUrl());
  Logger.log('Form edit: ' + form.getEditUrl());
  Logger.log('Form public: ' + publishedUrl);
  Logger.log('Operating view: ' + operatingView.getName());
  Logger.log('Operating view automation: ' + automation.summary);
  Logger.log('Vercel env');
  Logger.log('NAEMBI_BETA_GOOGLE_FORM_URL=' + formResponseUrl);
  Logger.log('NAEMBI_BETA_GOOGLE_FORM_FIELDS=' + fieldMapJson);
  Logger.log('NAEMBI_BETA_COMPLETION_URL=' + (webAppUrl || 'Apps Script를 Web app으로 배포한 뒤 refreshNaembiAutomationEnv를 실행하세요.'));
  Logger.log('NAEMBI_BETA_COMPLETION_TOKEN=' + operationToken);

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
  var automation = ensureOperatingViewAutomation_(spreadsheet);
  Logger.log('운영뷰 생성/갱신 완료: ' + spreadsheet.getUrl() + '#gid=' + operatingView.getSheetId());
  Logger.log('운영뷰 자동 갱신 트리거: ' + automation.summary);
  return {
    sheetUrl: spreadsheet.getUrl(),
    operatingViewName: operatingView.getName(),
    operatingViewGid: operatingView.getSheetId(),
    automation: automation.summary
  };
}

function refreshNaembiAutomationEnv() {
  var spreadsheet = openConfiguredSpreadsheet_();
  var envSheet = spreadsheet.getSheetByName(NAEMBI_ENV_SHEET_NAME) || spreadsheet.insertSheet(NAEMBI_ENV_SHEET_NAME);
  var operatingView = createOperatingView_(spreadsheet);
  var automation = ensureOperatingViewAutomation_(spreadsheet);
  var props = PropertiesService.getScriptProperties();
  var result = {
    formResponseUrl: props.getProperty('NAEMBI_BETA_GOOGLE_FORM_URL') || '',
    fieldMapJson: props.getProperty('NAEMBI_BETA_GOOGLE_FORM_FIELDS') || '',
    formEditUrl: props.getProperty('NAEMBI_FORM_EDIT_URL') || '',
    formPublicUrl: props.getProperty('NAEMBI_FORM_PUBLIC_URL') || '',
    sheetUrl: spreadsheet.getUrl(),
    operatingViewName: operatingView.getName(),
    operatingViewAutomation: automation.summary,
    operationToken: ensureOperationToken_(),
    webAppUrl: getWebAppUrl_()
  };

  props.setProperty('NAEMBI_BETA_COMPLETION_URL', result.webAppUrl || '');
  writeEnvSheet_(envSheet, result);
  Logger.log('자동화 환경변수 갱신 완료');
  Logger.log('운영뷰 자동 갱신 트리거: ' + automation.summary);
  Logger.log('NAEMBI_BETA_COMPLETION_URL=' + (result.webAppUrl || 'Apps Script 배포 URL 없음'));
  Logger.log('NAEMBI_BETA_COMPLETION_TOKEN=' + result.operationToken);
  return result;
}

function installNaembiOperatingViewAutomation() {
  var spreadsheet = openConfiguredSpreadsheet_();
  createOperatingView_(spreadsheet);
  var automation = ensureOperatingViewAutomation_(spreadsheet);
  Logger.log('운영뷰 자동 갱신 설치 완료: ' + automation.summary);
  return {
    ok: true,
    sheetUrl: spreadsheet.getUrl(),
    automation: automation.summary
  };
}

function syncNaembiOperatingView(event) {
  var spreadsheet = event && event.source && typeof event.source.getSheets === 'function'
    ? event.source
    : openConfiguredSpreadsheet_();
  var operatingView = createOperatingView_(spreadsheet);
  Logger.log('운영뷰 자동 갱신 완료: ' + spreadsheet.getUrl() + '#gid=' + operatingView.getSheetId());
  return {
    ok: true,
    sheetUrl: spreadsheet.getUrl(),
    operatingViewName: operatingView.getName(),
    operatingViewGid: operatingView.getSheetId()
  };
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('냄비 운영')
      .addItem('운영뷰 지금 갱신', 'syncNaembiOperatingView')
      .addItem('운영뷰 자동 갱신 설치', 'installNaembiOperatingViewAutomation')
      .addToUi();
  } catch (error) {
    Logger.log('onOpen 메뉴를 만들지 못했습니다: ' + error.message);
  }
}

function doGet(event) {
  var params = event && event.parameter ? event.parameter : {};
  if (params.action !== 'complete') {
    return renderHtml_('냄비 운영 자동화', '지원하지 않는 요청입니다.');
  }

  try {
    validateOperationToken_(params.token);
    var result = markNaembiReflected(params.requestId, {
      by: params.by || 'slack',
      note: params.note || '',
      status: '반영완료'
    });
    return renderHtml_('반영완료 처리됨', '요청ID ' + result.requestId + ' 행에 체크 표시를 완료했습니다.');
  } catch (error) {
    return renderHtml_('처리 실패', error.message);
  }
}

function doPost(event) {
  try {
    var body = JSON.parse(event.postData && event.postData.contents ? event.postData.contents : '{}');
    if (body.action === 'complete') {
      validateOperationToken_(body.token);
      return jsonOutput_(markNaembiReflected(body.requestId, {
        by: body.by || 'api',
        note: body.note || '',
        status: body.status || '반영완료'
      }));
    }

    var kind = body.kind || (body.payload && body.payload.kind) || 'feedback';
    var payload = body.payload || body;
    return jsonOutput_(appendNaembiWebhookSubmission_(kind, payload));
  } catch (error) {
    return jsonOutput_({ ok: false, error: error.message });
  }
}

function markNaembiReflected(requestId, options) {
  return markNaembiReflected_(requestId, options || {});
}

function submitNaembiSmokeTest() {
  var props = PropertiesService.getScriptProperties();
  var formUrl = props.getProperty('NAEMBI_FORM_EDIT_URL') || props.getProperty('NAEMBI_FORM_PUBLIC_URL');

  if (!formUrl) {
    throw new Error('먼저 setupNaembiBetaCollection 함수를 실행하세요.');
  }

  var values = {
    kind: 'feedback',
    requestId: 'smoke_' + new Date().getTime(),
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

function appendNaembiWebhookSubmission_(kind, payload) {
  var spreadsheet = openConfiguredSpreadsheet_();
  var responseSheet = findResponseSheet_(spreadsheet);
  ensureResponseSheetColumns_(responseSheet);

  var requestId = payload.requestId || ('nb_' + new Date().getTime());
  var row = responseSheet.getLastRow() + 1;
  responseSheet.getRange(row, 1).setValue(new Date());
  setByHeader_(responseSheet, row, 'kind', kind);
  setByHeader_(responseSheet, row, 'requestId', requestId);
  setByHeader_(responseSheet, row, 'email', payload.email || '');
  setByHeader_(responseSheet, row, 'name', payload.name || '');
  setByHeader_(responseSheet, row, 'profile', payload.profile || '');
  setByHeader_(responseSheet, row, 'note', payload.note || '');
  setByHeader_(responseSheet, row, 'type', payload.type || '');
  setByHeader_(responseSheet, row, 'message', payload.message || '');
  setByHeader_(responseSheet, row, 'recipe', payload.recipe || '');
  setByHeader_(responseSheet, row, 'source', payload.source || '');
  setByHeader_(responseSheet, row, 'screen', payload.screen || '');
  setByHeader_(responseSheet, row, 'page', payload.page || '');
  setByHeader_(responseSheet, row, 'createdAt', payload.createdAt || new Date().toISOString());
  SpreadsheetApp.flush();
  createOperatingView_(spreadsheet);
  return {
    ok: true,
    requestId: requestId,
    sheetUrl: spreadsheet.getUrl(),
    row: row
  };
}

function markNaembiReflected_(requestId, options) {
  requestId = String(requestId || '').trim();
  if (!requestId) throw new Error('requestId가 필요합니다.');

  var spreadsheet = openConfiguredSpreadsheet_();
  var responseSheet = findResponseSheet_(spreadsheet);
  ensureResponseSheetColumns_(responseSheet);
  createOperatingView_(spreadsheet);

  var responseRow = findRowByHeader_(responseSheet, 'requestId', requestId);
  if (!responseRow) throw new Error('요청ID를 찾지 못했습니다: ' + requestId);

  var reflectedAt = new Date();
  var reflectedBy = options.by || 'slack';
  var reflectedNote = options.note || '';
  setByHeader_(responseSheet, responseRow, 'reflected', true);
  setByHeader_(responseSheet, responseRow, 'reflectedAt', reflectedAt);
  setByHeader_(responseSheet, responseRow, 'reflectedBy', reflectedBy);
  setByHeader_(responseSheet, responseRow, 'reflectedNote', reflectedNote);

  var view = spreadsheet.getSheetByName(NAEMBI_OPERATING_VIEW_NAME);
  if (view) {
    SpreadsheetApp.flush();
    var viewRow = findRowByHeader_(view, '요청ID', requestId);
    if (viewRow) {
      setByHeader_(view, viewRow, '상태', options.status || '반영완료');
      setByHeader_(view, viewRow, '반영완료', true);
      setByHeader_(view, viewRow, '반영완료시각', reflectedAt);
      setByHeader_(view, viewRow, '반영자', reflectedBy);
      if (reflectedNote) setByHeader_(view, viewRow, '반영메모', reflectedNote);
    }
  }

  return {
    ok: true,
    requestId: requestId,
    reflectedAt: reflectedAt.toISOString(),
    reflectedBy: reflectedBy
  };
}

function createOperatingView_(spreadsheet) {
  var responseSheet = findResponseSheet_(spreadsheet);
  ensureResponseSheetColumns_(responseSheet);
  var view = spreadsheet.getSheetByName(NAEMBI_OPERATING_VIEW_NAME);
  if (!view) {
    view = spreadsheet.insertSheet(NAEMBI_OPERATING_VIEW_NAME);
    ensureRows_(view, 1000);
    ensureColumns_(view, NAEMBI_OPERATING_HEADERS.length);
  } else {
    ensureRows_(view, 1000);
    ensureColumns_(view, NAEMBI_OPERATING_HEADERS.length);
    view.getRange(1, 1, view.getMaxRows(), NAEMBI_OPERATING_AUTO_COLUMNS).clear();
    view.getRange(1, NAEMBI_OPERATING_AUTO_COLUMNS + 1, 1, NAEMBI_OPERATING_HEADERS.length - NAEMBI_OPERATING_AUTO_COLUMNS).clear();
  }

  view.getRange(1, 1, 1, NAEMBI_OPERATING_HEADERS.length).setValues([NAEMBI_OPERATING_HEADERS]);
  view.getRange(2, 1).setFormula(buildOperatingViewFormula_(responseSheet));

  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['미확인', '확인', '반영중', '반영완료', '보류'], true)
    .setAllowInvalid(false)
    .build();
  var priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['P0', 'P1', 'P2', 'P3'], true)
    .setAllowInvalid(false)
    .build();

  view.getRange(2, 15, 999, 1).setDataValidation(statusRule);
  view.getRange(2, 16, 999, 1).setDataValidation(priorityRule);
  view.getRange(2, 19, 999, 1).insertCheckboxes();

  view.setFrozenRows(1);
  view.getRange(1, 1, 1, NAEMBI_OPERATING_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#1E2024')
    .setFontColor('#FFFFFF')
    .setWrap(true);
  view.getRange(1, 1, 1000, NAEMBI_OPERATING_HEADERS.length).setVerticalAlignment('top');
  view.getRange(2, 1, 999, NAEMBI_OPERATING_AUTO_COLUMNS).setBackground('#F8F9FB');
  view.getRange(2, 15, 999, 8).setBackground('#FFF7EF');

  var existingFilter = view.getFilter();
  if (existingFilter) existingFilter.remove();
  view.getRange(1, 1, 1000, NAEMBI_OPERATING_HEADERS.length).createFilter();

  view.setColumnWidth(1, 120);
  view.setColumnWidth(2, 170);
  view.setColumnWidth(3, 220);
  view.setColumnWidth(4, 130);
  view.setColumnWidth(5, 130);
  view.setColumnWidth(6, 260);
  view.setColumnWidth(7, 110);
  view.setColumnWidth(8, 360);
  view.setColumnWidth(9, 180);
  view.setColumnWidth(10, 160);
  view.setColumnWidth(11, 120);
  view.setColumnWidth(12, 320);
  view.setColumnWidth(13, 190);
  view.setColumnWidth(14, 190);
  view.setColumnWidth(15, 110);
  view.setColumnWidth(16, 100);
  view.setColumnWidth(17, 120);
  view.setColumnWidth(18, 320);
  view.setColumnWidth(19, 95);
  view.setColumnWidth(20, 190);
  view.setColumnWidth(21, 120);
  view.setColumnWidth(22, 260);

  return view;
}

function ensureOperatingViewAutomation_(spreadsheet) {
  var spreadsheetId = spreadsheet.getId();
  var handler = 'syncNaembiOperatingView';
  var removed = 0;

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(trigger);
      removed += 1;
    }
  });

  ScriptApp.newTrigger(handler)
    .forSpreadsheet(spreadsheetId)
    .onFormSubmit()
    .create();

  var formUrl = PropertiesService.getScriptProperties().getProperty('NAEMBI_FORM_EDIT_URL');
  var installed = 1;
  if (formUrl) {
    try {
      ScriptApp.newTrigger(handler)
        .forForm(FormApp.openByUrl(formUrl))
        .onFormSubmit()
        .create();
      installed += 1;
    } catch (error) {
      Logger.log('Form submit 트리거를 추가로 설치하지 못했습니다: ' + error.message);
    }
  }

  return {
    ok: true,
    removed: removed,
    installed: installed,
    summary: 'form submit trigger installed for ' + spreadsheetId + (removed ? ' (replaced ' + removed + ')' : '')
  };
}

function findResponseSheet_(spreadsheet) {
  var ignored = {};
  ignored[NAEMBI_ENV_SHEET_NAME] = true;
  ignored[NAEMBI_OPERATING_VIEW_NAME] = true;

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

function buildOperatingViewFormula_(responseSheet) {
  var raw = quoteSheetName_(responseSheet.getName());
  var map = headerMap_(responseSheet);
  var kindRange = rangeForHeader_(raw, map, 'kind', 2);
  var typeRange = rangeForHeader_(raw, map, 'type', 8);
  var requestIdRange = map.requestId ? rangeForHeader_(raw, map, 'requestId', 3) : blankRange_(kindRange);

  return '=IFERROR(ARRAYFORMULA(QUERY({IF(' + kindRange + '="beta-signup","베타 신청",IF(' + typeRange + '="recipe","레시피 요청","피드백")),' +
    requestIdRange + ',' +
    rangeForHeader_(raw, map, 'email', 4) + ',' +
    rangeForHeader_(raw, map, 'name', 5) + ',' +
    rangeForHeader_(raw, map, 'profile', 6) + ',' +
    rangeForHeader_(raw, map, 'note', 7) + ',' +
    typeRange + ',' +
    rangeForHeader_(raw, map, 'message', 9) + ',' +
    rangeForHeader_(raw, map, 'recipe', 10) + ',' +
    rangeForHeader_(raw, map, 'source', 11) + ',' +
    rangeForHeader_(raw, map, 'screen', 12) + ',' +
    rangeForHeader_(raw, map, 'page', 13) + ',' +
    rangeForHeader_(raw, map, 'createdAt', 14) + ',' +
    rangeForColumn_(raw, 1) + '},"select * where Col14 is not null",0)),"")';
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

function rangeForHeader_(rawSheetName, map, header, fallbackColumn) {
  return rangeForColumn_(rawSheetName, map[header] || fallbackColumn);
}

function rangeForColumn_(rawSheetName, column) {
  var letter = columnLetter_(column);
  return rawSheetName + '!' + letter + '2:' + letter;
}

function blankRange_(anchorRange) {
  return 'IF(' + anchorRange + '<>"","",)';
}

function columnLetter_(column) {
  var letter = '';
  while (column > 0) {
    var modulo = (column - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    column = Math.floor((column - modulo) / 26);
  }
  return letter;
}

function ensureResponseSheetColumns_(sheet) {
  var required = ['Timestamp'].concat(NAEMBI_FIELDS.map(function (field) {
    return field.title;
  })).concat(['reflected', 'reflectedAt', 'reflectedBy', 'reflectedNote']);

  ensureColumns_(sheet, required.length);
  var headers = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
  var hasAnyHeader = headers.some(function (header) {
    return String(header || '').trim() !== '';
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, required.length).setValues([required]);
    return;
  }

  var cursor = headers.filter(function (header) {
    return String(header || '').trim() !== '';
  }).length + 1;

  required.forEach(function (header) {
    if (headers.indexOf(header) >= 0) return;
    sheet.getRange(1, cursor).setValue(header);
    headers[cursor - 1] = header;
    cursor += 1;
  });
}

function headerMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getMaxColumns()).getValues()[0];
  var map = {};
  headers.forEach(function (header, index) {
    var key = String(header || '').trim();
    if (key) map[key] = index + 1;
  });
  return map;
}

function findRowByHeader_(sheet, header, value) {
  var map = headerMap_(sheet);
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

function setByHeader_(sheet, row, header, value) {
  var map = headerMap_(sheet);
  var column = map[header];
  if (!column) return;
  sheet.getRange(row, column).setValue(value);
}

function ensureOperationToken_() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty(NAEMBI_OPERATION_TOKEN_PROPERTY);
  if (token) return token;

  token = Utilities.getUuid().replace(/-/g, '');
  props.setProperty(NAEMBI_OPERATION_TOKEN_PROPERTY, token);
  return token;
}

function validateOperationToken_(token) {
  var expected = ensureOperationToken_();
  if (!token || token !== expected) {
    throw new Error('운영 토큰이 올바르지 않습니다.');
  }
}

function getWebAppUrl_() {
  try {
    return ScriptApp.getService().getUrl() || '';
  } catch (error) {
    return '';
  }
}

function jsonOutput_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function renderHtml_(title, message) {
  var html = [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>', escapeHtml_(title), '</title>',
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#F7F4EF;color:#202225;padding:32px;line-height:1.55}main{max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5DDD4;border-radius:16px;padding:28px;box-shadow:0 18px 46px rgba(33,35,38,.1)}h1{font-size:24px;margin:0 0 12px}.ok{color:#1F8A61}</style>',
    '</head><body><main><h1 class="ok">', escapeHtml_(title), '</h1><p>', escapeHtml_(message), '</p></main></body></html>'
  ].join('');
  return HtmlService.createHtmlOutput(html);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  sheet.getRange(2, 1, 13, 3).setValues([
    ['NAEMBI_BETA_GOOGLE_FORM_URL', result.formResponseUrl, 'Vercel Project > Settings > Environment Variables에 추가'],
    ['NAEMBI_BETA_GOOGLE_FORM_FIELDS', result.fieldMapJson, 'Vercel 환경변수에는 한 줄 JSON으로 붙여넣기'],
    ['NAEMBI_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/...', '선택. Slack Incoming Webhook URL. 제출 도착 알림을 받을 때 추가'],
    ['NAEMBI_BETA_COMPLETION_URL', result.webAppUrl || 'Apps Script를 Web app으로 배포한 뒤 refreshNaembiAutomationEnv 실행', '선택. Slack의 반영완료 버튼이 호출할 Apps Script Web App URL'],
    ['NAEMBI_BETA_COMPLETION_TOKEN', result.operationToken || ensureOperationToken_(), '선택. 반영완료 링크 보호용 토큰. Vercel과 Apps Script Script Properties가 같은 값을 써야 함'],
    ['OPERATING_VIEW', result.operatingViewName || NAEMBI_OPERATING_VIEW_NAME, '베타 신청/레시피 요청/피드백을 한글 컬럼과 필터로 보는 탭'],
    ['OPERATING_VIEW_AUTOMATION', result.operatingViewAutomation || 'installNaembiOperatingViewAutomation 실행', 'Form 제출과 Sheet 변경 때 운영뷰를 자동 갱신하는 Apps Script 트리거'],
    ['FORM_EDIT_URL', result.formEditUrl, '폼 수정용 링크'],
    ['FORM_PUBLIC_URL', result.formPublicUrl, '응답 가능 여부 확인용 링크'],
    ['SHEET_URL', result.sheetUrl, '응답 확인용 시트 링크'],
    ['WEB_APP_DEPLOY', 'Deploy > New deployment > Web app', '반영완료 자동 체크를 쓰려면 Apps Script를 Web app으로 배포'],
    ['SMOKE_TEST', 'submitNaembiSmokeTest 실행', 'Form과 Sheet 연결 확인용 테스트 행 1개를 넣고 싶을 때만 실행'],
    ['COMPLETE_TEST', 'markNaembiReflected("요청ID", {by:"test"}) 실행', '요청ID 행에 반영완료 체크가 되는지 확인']
  ]);

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#1E2024').setFontColor('#FFFFFF');
  sheet.getRange(1, 1, 14, 3).setWrap(true).setVerticalAlignment('top');
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
