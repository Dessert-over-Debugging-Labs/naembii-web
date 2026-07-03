// Figma 노드를 브리지 WebSocket(relay :3055)로 직접 export → PNG 파일 저장.
// MCP 툴은 base64를 image 콘텐츠 블록으로만 반환해 파일로 못 받으므로, 동일 프로토콜을 재현한다.
// 사용: node export_node.mjs <channel> <nodeId> <scale> <outPath>
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const [channel, nodeId, scaleArg, outPath] = process.argv.slice(2);
const scale = Number(scaleArg) || 2;
const ws = new WebSocket('ws://localhost:3055');

function send(command, params) {
  const id = randomUUID();
  const req = {
    id,
    type: command === 'join' ? 'join' : 'message',
    ...(command === 'join' ? { channel: params.channel } : { channel }),
    message: { id, command, params: { ...params, commandId: id } },
  };
  ws.send(JSON.stringify(req));
  return id;
}

let joinId, exportId;
ws.addEventListener('open', () => { joinId = send('join', { channel }); });

ws.addEventListener('message', (ev) => {
  let json;
  try { json = JSON.parse(ev.data); } catch { return; }
  if (json.type === 'progress_update') return;
  const m = json.message;
  if (!m || !m.id) return;
  if (m.id === joinId) {
    exportId = send('export_node_as_image', { nodeId, format: 'PNG', scale });
    return;
  }
  if (m.id === exportId) {
    if (m.error) { console.error('ERROR', m.error); process.exit(1); }
    let data = m.result?.imageData;
    if (!data) { console.error('NO_IMAGE_DATA', JSON.stringify(m.result).slice(0,200)); process.exit(1); }
    const comma = data.indexOf(',');
    if (data.startsWith('data:') && comma !== -1) data = data.slice(comma + 1);
    const buf = Buffer.from(data, 'base64');
    writeFileSync(outPath, buf);
    console.log('WROTE', outPath, buf.length, 'bytes', 'mime', m.result?.mimeType);
    process.exit(0);
  }
});

ws.addEventListener('error', (e) => { console.error('WS_ERROR', e.message || e); process.exit(1); });
setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 45000);
