import { useEffect, useRef } from 'react';

export default function GoogleAd({ slotId }) {
  const adElement = useRef(null);

  useEffect(() => {
    const element = adElement.current;
    if (!element || element.dataset.adRequested === 'true') return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      element.dataset.adRequested = 'true';
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, [slotId]);

  return (
  <div style={{ 
      margin: '30px auto', 
      textAlign: 'center', 
      width: '100%', 
      maxWidth: '900px',
      overflow: 'hidden',        /* Ad ko div ke bahar nikalne se rokega */
      padding: '0 10px',         /* Mobile par side se thoda gap dega */
      boxSizing: 'border-box'    /* Padding ko width ke andar hi rakhega */
    }}>
  <ins ref={adElement} className="adsbygoogle"
       style={{ display: 'block' }}
       data-ad-client="ca-pub-6049871133505813"
       data-ad-slot={slotId}
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
</div>
  );
}
