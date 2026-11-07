// Diffusion en direct (hôte) : QR code, lien, nombre de spectateurs.
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { LiveHost } from '../sync/live';
import { watchUrl } from '../sync/live';
import { t } from '../i18n/t';
import { Icon, Modal, Toast } from './common';

export function LiveModal({ host, onStop, onClose }: { host: LiveHost; onStop: () => void; onClose: () => void }) {
  const url = watchUrl(host.code);
  const [svg, setSvg] = useState('');
  const [toast, setToast] = useState('');
  const [, setTick] = useState(0);
  useEffect(() => {
    void QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#1a100a', light: '#f2e4c4' } }).then(setSvg);
  }, [url]);
  useEffect(() => {
    const prev = host.onChange;
    host.onChange = () => {
      prev?.();
      setTick((x) => x + 1);
    };
    return () => {
      host.onChange = prev;
    };
  }, [host]);
  return (
    <Modal onClose={onClose} label={t('live.title')}>
      <h2 className="title" style={{ fontSize: 'var(--fs-xl)', marginTop: 0 }}>
        {t('live.title')}
      </h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {t('live.hint')}
      </p>
      <div className="live-qr" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="live-code num" aria-label={t('live.codeLabel', { c: host.code })}>
        {host.code}
      </div>
      <p className="live-status" role="status">
        <span className={`live-dot ${host.status}`} />
        {host.status === 'error' ? t('live.error') : host.status === 'online' ? t('live.watchers', { c: host.spectators }) : t('live.connecting')}
      </p>
      <div className="stack">
        <button
          className="btn block"
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(url)
              .then(() => setToast(t('live.copied')))
              .catch(() => setToast(url));
          }}
        >
          <Icon name="share" /> {t('live.copy')}
        </button>
        <button className="btn block danger" type="button" onClick={onStop}>
          <Icon name="close" /> {t('live.stop')}
        </button>
        <button className="btn ghost block" type="button" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
      {toast && <Toast text={toast} onDone={() => setToast('')} />}
    </Modal>
  );
}
