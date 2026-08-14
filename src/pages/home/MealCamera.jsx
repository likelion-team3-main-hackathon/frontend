import { useEffect, useRef, useState } from 'react'

export default function MealCamera({ onClose, onUsePhoto, guideText = '프레임 안에 담아주세요\n음식 전체를 자동으로 인식해요' }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)
  const [capturedUrl, setCapturedUrl] = useState('')
  const [capturedFile, setCapturedFile] = useState(null)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    let active = true
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => { if (active) setCameraError('카메라를 사용할 수 없어 사진 선택으로 전환했어요.') })
    return () => {
      active = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function capture() {
    const video = videoRef.current
    if (!video?.videoWidth) {
      fileRef.current?.click()
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `activity-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setCapturedFile(file)
        setCapturedUrl(URL.createObjectURL(file))
      }
    }, 'image/jpeg', .9)
  }

  return (
    <section className="meal-camera-page">
      <header><small>음식을 사각형 안에 맞춰주세요</small><button type="button" onClick={onClose}>×</button></header>
      <div className="camera-viewport">
        {capturedUrl ? <img src={capturedUrl} alt="촬영한 음식" /> : <video ref={videoRef} autoPlay playsInline muted />}
        <span className="camera-guide"><i /><i /><i /><i /><small>{guideText.split('\n').map((line) => <span key={line}>{line}<br /></span>)}</small></span>
      </div>
      {cameraError && <p>{cameraError}</p>}
      <footer>
        <button type="button" className="camera-gallery" onClick={() => fileRef.current?.click()}>▧<small>앨범</small></button>
        {capturedUrl ? <button type="button" className="camera-use" onClick={() => onUsePhoto({ url: capturedUrl, file: capturedFile })}>사진 사용</button> : <button type="button" className="camera-shutter" onClick={capture} aria-label="사진 촬영" />}
        <button type="button" className="camera-close" onClick={capturedUrl ? () => { setCapturedUrl(''); setCapturedFile(null) } : onClose}>{capturedUrl ? '↻' : '×'}</button>
      </footer>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) {
          setCapturedFile(file)
          setCapturedUrl(URL.createObjectURL(file))
        }
      }} />
    </section>
  )
}
