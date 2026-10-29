import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { useEditor, useEditorState } from '../hooks';
import { Icon } from './Icons';
import { VERIFY_URL } from '../paint/oauth';
import { imageEditEndpoint } from '../paint/api-config';

function Modal({ title, children, onClose, actions, width }: { title: string; children: ReactNode; onClose: () => void; actions: ReactNode; width?: number }): JSX.Element {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(box.current?.querySelectorAll<HTMLElement>('input, button, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((el) => !el.hasAttribute('disabled'));
    if (!box.current?.contains(document.activeElement)) focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        // Keep focus inside the dialog.
        const list = focusables();
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={width ? { width } : undefined} ref={box}>
        <div className="modal-title">
          <span>{title}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="关闭"><Icon name="close" size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
const SHORTCUTS: [string, string][] = [
  ['W S E F I M P B A T L C R G O U', '工具：套索、矩形选择、橡皮擦、填充、取色器、放大镜、铅笔、画笔、喷枪、文字、直线、曲线、矩形、多边形、椭圆、圆角矩形'],
  ['⇧+拖动', '直线限制为 45°，形状限制为正方形或圆形'],
  ['⌥+单击', '使用绘图工具时拾取颜色'],
  ['⌥+拖动', '移动选区副本'],
  ['↑ ↓ ← →', '移动选区 1 像素（⇧ 为 10 像素）'],
  [`${MOD}+drag`, 'Disable snapping while moving'],
  [`${MOD}+D`, 'Duplicate selection'],
  ['⇧+H ⇧+V', 'Flip selection horizontally / vertically'],
  ['[ ]', '向左/向右旋转选区'],
  ['↵', '放置浮动选区；从提示词开始重绘'],
  ['Esc', '取消选择、取消生成或关闭对话框'],
  [`${MOD}+A`, 'Select all'],
  [`${MOD}+C ${MOD}+X ${MOD}+V`, 'Copy, cut, paste (images from anywhere)'],
  [`${MOD}+⇧+C`, 'Copy selection or canvas as PNG'],
  [`${MOD}+⇧+X`, 'Crop canvas to selection'],
  [`${MOD}+Z ${MOD}+⇧+Z`, 'Undo, redo'],
  [`${MOD}+S`, 'Download PNG'],
  [`${MOD}+⇧+E`, 'Export PNG at 2×'],
  [`${MOD}+N`, 'New drawing'],
  [`${MOD}+E ${MOD}+W ${MOD}+R ${MOD}+I`, 'Attributes, stretch, flip/rotate, invert colors'],
  ['Space+drag', 'Pan'],
  [`${MOD}+wheel`, 'Zoom at cursor'],
  ['⇧+1 ⇧+2 ⇧+0', 'Fit to window, zoom to selection, actual size'],
  ['?', '打开此快捷键列表'],
];

export function Dialogs(): JSX.Element | null {
  const s = useEditorState();
  const editor = useEditor();
  const close = () => editor.openDialog('none');
  switch (s.dialog) {
    case 'key':
      return <KeyDialog onClose={close} />;
    case 'attributes':
      return <AttributesDialog onClose={close} />;
    case 'stretch':
      return <StretchDialog onClose={close} />;
    case 'flip':
      return <FlipDialog onClose={close} />;
    case 'shortcuts':
      return (
        <Modal title="键盘快捷键" onClose={close} width={520} actions={<button type="button" className="btn primary" onClick={close}>完成</button>}>
          <div className="kbd-grid">
            {SHORTCUTS.map(([keys, what]) => (
              <div className="kbd-row" key={what}>
                <span className="kbd-keys">{keys.split(' ').map((k) => <kbd key={k}>{k}</kbd>)}</span>
                <span>{what}</span>
              </div>
            ))}
          </div>
        </Modal>
      );
    case 'about':
      return (
        <Modal title="关于画图" onClose={close} actions={<button type="button" className="btn primary" onClick={close}>确定</button>}>
          <p>一款带有 AI 重绘功能的轻量画图工具。</p>
          <p>选择一个区域并描述修改内容，OpenAI 的 <code>gpt-image-2.5</code> 会参考周围画面，仅重绘选区，让线条、角度和颜色自然衔接。</p>
          <p>绘图保存在本地浏览器中。API 密钥和选区图片会发送到你配置的服务；本地运行时通过本机转发接口请求。</p>
        </Modal>
      );
    default:
      return null;
  }
}

function KeyDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const editor = useEditor();
  const s = useEditorState();
  const [mode, setMode] = useState<'choose' | 'key'>(s.apiKey && !s.oauth ? 'key' : 'choose');
  const [value, setValue] = useState(s.apiKey);
  const [baseUrl, setBaseUrl] = useState(s.apiBaseUrl);
  const [model, setModel] = useState(s.model);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const save = () => {
    try { imageEditEndpoint(baseUrl); } catch (e) { setError((e as Error).message); return; }
    if (!model.trim() || model.includes('|')) { setError('请输入有效的模型 ID，不能包含 |。'); return; }
    editor.setApiBaseUrl(baseUrl);
    editor.setModel(model.trim());
    editor.setApiKey(value);
    onClose();
  };
  const close = () => {
    editor.cancelSignIn();
    onClose();
  };

  if (s.oauth) {
    return (
      <Modal title="OpenAI 账户" onClose={close} actions={<button type="button" className="btn primary" onClick={close}>完成</button>}>
        <div className="acct">
          <span className="acct-dot" />
          <div className="acct-text">
            <div className="acct-name">已登录 OpenAI</div>
            <div className="acct-sub">{s.oauth.email ?? 'ChatGPT account'}{s.oauth.plan ? ` · ${s.oauth.plan.charAt(0).toUpperCase() + s.oauth.plan.slice(1)} plan` : ''}</div>
          </div>
          <button type="button" className="btn" onClick={() => editor.signOutOpenAI()} data-testid="signout">退出登录</button>
        </div>
        <p className="hint">编辑会计入方案包含的用量。{s.apiKey ? '已保存的 API 密钥会在退出登录后作为备用方式。' : ''}</p>
      </Modal>
    );
  }

  if (s.signIn) {
    const { code, status, message } = s.signIn;
    return (
      <Modal title="登录 OpenAI" onClose={close} actions={<button type="button" className="btn" onClick={close}>取消</button>}>
        <p>打开 OpenAI 设备验证页面并输入此代码。批准后，此窗口会自动完成登录。</p>
        <div className="device-code mono" data-testid="device-code" onClick={() => void navigator.clipboard?.writeText(code.userCode)} title="点击复制">{code.userCode}</div>
        <div className="device-actions">
          <a className="btn primary" href={`${VERIFY_URL}?user_code=${encodeURIComponent(code.userCode)}`} target="_blank" rel="noopener" data-testid="device-open">Open auth.openai.com</a>
          <span className={`device-status ${status}`}>{status === 'waiting' ? <><span className="spinner" /> Waiting for approval…</> : message}</span>
        </div>
        {status === 'error' && <p className="hint"><button type="button" className="link" onClick={() => void editor.signInWithOpenAI()}>重试</button></p>}
      </Modal>
    );
  }

  if (mode === 'key') {
    return (
      <Modal
        title="API / 中转站设置"
        onClose={close}
        actions={
          <>
            {s.apiKey && <button type="button" className="btn" onClick={() => { editor.setApiKey(''); onClose(); }}>移除</button>}
            <button type="button" className="btn" onClick={() => setMode('choose')}>返回</button>
            <button type="button" className="btn primary" onClick={save} data-testid="key-save">保存</button>
          </>
        }
      >
        <p>填写中转站的接口地址、密钥和模型 ID。服务需要兼容 OpenAI 图片编辑接口。</p>
        <label>接口地址（Base URL）
          <input className="hex-input" style={{ width: '100%' }} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://你的中转站/v1" aria-label="接口地址" data-testid="api-base-url" />
        </label>
        <p className="hint">可填写网站根地址、带 /v1 的地址或完整 /images/edits 地址。</p>
        <label>模型 ID
          <input className="hex-input" style={{ width: '100%' }} value={model} onChange={(e) => setModel(e.target.value)} placeholder="填写中转站提供的图片模型 ID" aria-label="模型 ID" data-testid="api-model" />
        </label>
        <p className="hint">按中转站的实际名称填写；原有模型仍可在顶部下拉框选择。</p>
        <div className="field">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-…"
            aria-label="API / 中转站密钥"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
            data-testid="key-input"
          />
          <label className="check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> 显示</label>
        </div>
        <p className="hint">密钥保存在此浏览器，生成时发送到上方配置的服务。请使用中转站提供的密钥。</p>
        {error && <p role="alert">{error}</p>}
      </Modal>
    );
  }

  return (
    <Modal title="连接图像服务" onClose={close} actions={<button type="button" className="btn" onClick={close}>取消</button>} width={440}>
      <p className="connect-intro">选择登录方式，或接入自己的 API / 中转站。</p>
      <div className="connect-options">
        <button type="button" className="connect-card primary" onClick={() => void editor.signInWithOpenAI()} data-testid="signin-openai">
          <span className="connect-icon"><Icon name="logo" size={14} /></span>
          <span className="connect-text">
            <span className="connect-title">登录 OpenAI</span>
            <span className="connect-sub">使用你的 ChatGPT Plus、Pro 或 Team 方案</span>
          </span>
          <span className="connect-arrow">→</span>
        </button>
        <button type="button" className="connect-card" onClick={() => setMode('key')} data-testid="use-key">
          <span className="connect-icon"><Icon name="key" size={14} /></span>
          <span className="connect-text">
            <span className="connect-title">使用 API / 中转站</span>
            <span className="connect-sub">自定义接口地址、密钥和图片模型。</span>
          </span>
          <span className="connect-arrow">→</span>
        </button>
      </div>
    </Modal>
  );
}

function AttributesDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const editor = useEditor();
  const s = useEditorState();
  const [w, setW] = useState(String(s.docW));
  const [h, setH] = useState(String(s.docH));
  const apply = () => {
    const nw = Math.max(1, Math.min(8000, Math.round(Number(w)) || s.docW));
    const nh = Math.max(1, Math.min(8000, Math.round(Number(h)) || s.docH));
    editor.resizeCanvas(nw, nh);
    onClose();
  };
  return (
    <Modal
      title="画布属性"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn" onClick={() => { setW('1080'); setH('1080'); }}>默认值</button>
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="button" className="btn primary" onClick={apply} data-testid="attr-ok">确定</button>
        </>
      }
    >
      <div className="field-row">
        <label>宽度 <input type="number" min={1} max={8000} value={w} onChange={(e) => setW(e.target.value)} data-testid="attr-width" autoFocus /></label>
        <label>高度 <input type="number" min={1} max={8000} value={h} onChange={(e) => setH(e.target.value)} data-testid="attr-height" /></label>
        <span className="hint">px</span>
      </div>
      <p className="hint">只改变画布尺寸，不会缩放图像。也可以拖动画布边缘的控制点调整大小。</p>
    </Modal>
  );
}

function StretchDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const editor = useEditor();
  const s = useEditorState();
  const [hv, setHv] = useState('100');
  const [vv, setVv] = useState('100');
  const [keep, setKeep] = useState(true);
  const onH = (v: string) => {
    setHv(v);
    if (keep) setVv(v);
  };
  const onV = (v: string) => {
    setVv(v);
    if (keep) setHv(v);
  };
  const apply = () => {
    const w = (s.docW * Number(hv)) / 100;
    const h = (s.docH * Number(vv)) / 100;
    if (!(w >= 1) || !(h >= 1)) return;
    editor.scaleImage(Math.min(8000, w), Math.min(8000, h));
    onClose();
  };
  return (
    <Modal
      title="拉伸"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="button" className="btn primary" onClick={apply} data-testid="stretch-ok">确定</button>
        </>
      }
    >
      <div className="field-row">
        <label>水平 <input type="number" min={1} value={hv} onChange={(e) => onH(e.target.value)} data-testid="stretch-h" autoFocus /> %</label>
        <label>垂直 <input type="number" min={1} value={vv} onChange={(e) => onV(e.target.value)} data-testid="stretch-v" /> %</label>
      </div>
      <label className="check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> 保持纵横比</label>
      <p className="hint">结果：{Math.round((s.docW * Number(hv)) / 100) || 0} × {Math.round((s.docH * Number(vv)) / 100) || 0} 像素</p>
    </Modal>
  );
}

function FlipDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const editor = useEditor();
  const [mode, setMode] = useState<'fh' | 'fv' | 'r90' | 'r180' | 'r270'>('fh');
  const apply = () => {
    if (mode === 'fh') editor.flip('h');
    else if (mode === 'fv') editor.flip('v');
    else editor.rotate(mode === 'r90' ? 90 : mode === 'r180' ? 180 : 270);
    onClose();
  };
  const opt = (id: typeof mode, label: string) => (
    <label className="radio" key={id}>
      <input type="radio" name="flip" checked={mode === id} onChange={() => setMode(id)} /> {label}
    </label>
  );
  return (
    <Modal
      title="翻转和旋转"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="button" className="btn primary" onClick={apply} data-testid="flip-ok">确定</button>
        </>
      }
    >
      <div className="radio-col">
        {opt('fh', '水平翻转')}
        {opt('fv', '垂直翻转')}
        {opt('r90', '顺时针旋转 90°')}
        {opt('r180', '旋转 180°')}
        {opt('r270', '逆时针旋转 90°')}
      </div>
    </Modal>
  );
}
