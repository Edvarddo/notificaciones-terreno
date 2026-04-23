function ScanToast({ visible, text, type = 'success' }) {
  if (!visible || !text) return null

  return (
    <div className={`scan-toast scan-toast-${type}`}>
      {text}
    </div>
  )
}

export default ScanToast