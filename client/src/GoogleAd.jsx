import { useEffect } from 'react';

export default function GoogleAd({ slotId }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

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
  <ins className="adsbygoogle"
       style={{ display: 'block' }}
       data-ad-client="ca-pub-6049871133505813" // Apni ID yahan daal di
       data-ad-slot={slotId}
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
</div>
  );
}