import { useState } from 'react';

interface Props { src: string; name: string; }
export default function ProductImage({ src, name }: Props) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="image-fallback" role="img" aria-label={`${name}: image unavailable`}>Image unavailable</div>
    : <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}
