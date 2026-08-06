export default function BackgroundDialog() {
  return (
    <>
      <style>{`
        @keyframes bg-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-12px) scale(1.03); }
        }
        @keyframes bg-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(1.08); }
        }
        @keyframes bg-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div aria-hidden="true" style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        borderRadius: 'inherit',
        background: 'linear-gradient(135deg, #ffffff 0%, #f4f7fb 100%)',
        zIndex: 0
      }}>
        {/* Top Right Teal Glow */}
        <div style={{
          position: 'absolute',
          top: '-150px',
          right: '-100px',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(42,157,143,0.22) 0%, rgba(42,157,143,0) 70%)',
          filter: 'blur(25px)',
          animation: 'bg-pulse 8s ease-in-out infinite'
        }} />
        
        {/* Bottom Left Gold Glow */}
        <div style={{
          position: 'absolute',
          left: '-150px',
          bottom: '-150px',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(233,196,106,0.22) 0%, rgba(233,196,106,0) 70%)',
          filter: 'blur(25px)',
          animation: 'bg-pulse 10s ease-in-out infinite alternate'
        }} />

        {/* Center Accent Purple Glow */}
        <div style={{
          position: 'absolute',
          left: '30%',
          top: '35%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(157,78,221,0.08) 0%, rgba(157,78,221,0) 65%)',
          filter: 'blur(30px)',
          animation: 'bg-float 12s ease-in-out infinite'
        }} />


        {/* Decorative Dots Pattern */}
        <div style={{
          position: 'absolute',
          top: '50px',
          right: '50px',
          width: '140px',
          height: '120px',
          opacity: 0.8,
          backgroundImage: 'radial-gradient(rgba(31,78,140,0.3) 1.5px, transparent 1.5px)',
          backgroundSize: '16px 16px',
          animation: 'bg-float 9s ease-in-out infinite'
        }} />

        {/* Bottom Right Floating Square */}
        <div style={{
          position: 'absolute',
          right: '8%',
          bottom: '12%',
          width: '70px',
          height: '70px',
          border: '4px solid rgba(233,196,106,0.5)',
          borderRadius: '16px',
          transform: 'rotate(45deg)',
          animation: 'bg-spin 30s linear infinite reverse'
        }} />

        {/* Coral Accent Dot */}
        <div style={{
          position: 'absolute',
          left: '12%',
          top: '25%',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'rgba(231,111,81,0.7)',
          boxShadow: '0 0 10px rgba(231,111,81,0.5)',
          animation: 'bg-pulse 4s ease-in-out infinite'
        }} />
      </div>
    </>
  )
}