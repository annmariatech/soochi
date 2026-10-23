import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { analyzeScraps, saveScraps } from "../api"
import { FABRIC_TYPES, PATTERNS, STRETCH, WEIGHTS } from "../lib/scraps"

export default function AddScrapPage() {
  const navigate = useNavigate()
  const uploadInputRef = useRef(null)
  const videoRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)
  const [annotated, setAnnotated] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scraps, setScraps] = useState([])
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    if (!cameraOpen) return undefined
    let active = true
    let stream

    const videoElement = videoRef.current

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((cameraStream) => {
        if (!active) {
          cameraStream.getTracks().forEach((track) => track.stop())
          return
        }
        stream = cameraStream
        if (videoElement) videoElement.srcObject = cameraStream
      })
      .catch(() => {
        setError("Could not open the camera. Allow camera access or upload an image.")
        setCameraOpen(false)
      })

    return () => {
      active = false
      stream?.getTracks().forEach((track) => track.stop())
      if (videoElement) videoElement.srcObject = null
    }
  }, [cameraOpen])

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  function selectPhoto(file) {
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setAnnotated("")
    setScraps([])
    setError("")
    setNotice("")
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) {
      setError("The camera is still starting. Try again in a moment.")
      return
    }
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob) selectPhoto(new File([blob], "soochi-camera.jpg", { type: "image/jpeg" }))
      setCameraOpen(false)
    }, "image/jpeg", 0.92)
  }

  async function handleAnalyze() {
    if (!photo) {
      setError("Please take or upload a fabric photo first.")
      return
    }

    setLoading(true)
    setError("")
    setNotice("")
    setScraps([])

    try {
      const result = await analyzeScraps(photo)
      const detected = result.scraps || []
      if (!detected.length) {
        setError(
          result.marker_found === false
            ? "Reference marker not found. Place a ruler beside the fabric and try again."
            : "No scraps were detected. Try another photo with the marker clearly visible.",
        )
        return
      }

      setAnnotated(result.annotated_image_url || "")
      setScraps(
        detected.map((scrap, index) => ({
          ...scrap,
          temp_id: scrap.temp_id ?? `scrap-${index}`,
          name: scrap.name || scrap.tags?.fabric_type || `Scrap ${index + 1}`,
          width_cm: scrap.width_cm ?? 0,
          height_cm: scrap.height_cm ?? 0,
          area_cm2: scrap.area_cm2 ?? null,
          shape_type: scrap.shape_type || "rectangle",
          radius_cm: scrap.radius_cm ?? null,
          fabric_type: scrap.tags?.fabric_type ?? "Cotton",
          stretch: scrap.tags?.stretch ?? "None",
          weight: scrap.tags?.weight ?? "Medium",
          pattern: scrap.tags?.pattern ?? "Solid",
          color_hex: scrap.color_hex ?? "#D9879A",
          color_name: scrap.color_name ?? scrap.tags?.dominant_color ?? "Colour",
        })),
      )
      setNotice(
        `The photo analysis found ${detected.length} scrap${detected.length === 1 ? "" : "s"}. Review the detected measurements and tags before saving.`,
      )
    } catch (err) {
      setError(err.message || "Could not analyze this photo.")
    } finally {
      setLoading(false)
    }
  }

  function updateScrap(index, field, value) {
    setScraps((current) =>
      current.map((scrap, i) => {
        if (i !== index) return scrap
        if (field === "radius_cm") {
          const radius = Number(value)
          return { ...scrap, radius_cm: value, width_cm: radius > 0 ? radius * 2 : scrap.width_cm, height_cm: radius > 0 ? radius * 2 : scrap.height_cm, area_cm2: radius > 0 ? Number((Math.PI * radius ** 2).toFixed(2)) : scrap.area_cm2 }
        }
        return { ...scrap, [field]: value }
      }),
    )
  }

  async function handleSave() {
    if (!scraps.length) {
      setError("Analyze a photo before saving scraps.")
      return
    }
    if (scraps.some((scrap) => !scrap.name.trim())) {
      setError("Give every scrap a name.")
      return
    }
    if (
      scraps.some(
        (scrap) => Number(scrap.width_cm) <= 0 || Number(scrap.height_cm) <= 0,
      )
    ) {
      setError("Enter a width and height greater than zero for every scrap.")
      return
    }
    if (scraps.some((scrap) => scrap.shape_type === "irregular" && Number(scrap.area_cm2) <= 0)) {
      setError("Enter an area greater than zero for every irregular scrap.")
      return
    }
    if (scraps.some((scrap) => scrap.shape_type === "circle" && Number(scrap.radius_cm) <= 0)) {
      setError("Enter a radius greater than zero for every circular scrap.")
      return
    }
    if (scraps.some((scrap) => !/^#([0-9A-Fa-f]{6})$/.test(scrap.color_hex))) {
      setError("Each colour needs a valid hex value.")
      return
    }

    setSaving(true)
    setError("")
    try {
      await saveScraps(
        scraps.map((scrap) => ({
          ...scrap,
          width_cm: Number(scrap.width_cm),
          height_cm: Number(scrap.height_cm),
          area_cm2: Number(scrap.area_cm2 || Number(scrap.width_cm) * Number(scrap.height_cm)),
          radius_cm: scrap.radius_cm == null ? null : Number(scrap.radius_cm),
        })),
      )
      navigate("/inventory")
    } catch (err) {
      setError(err.message || "Could not save your scraps.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="add-scrap-content">
      <button className="back-button" onClick={() => navigate("/inventory")}>
        ← Back to inventory
      </button>

      <h1>Add fabric scraps</h1>
      <p>Give leftover fabric a second life, one little piece at a time.</p>

      <section className="add-step-card">
        <h2>1. Photograph your fabric</h2>
        <p>
          Place each scrap on a flat surface with a ruler or reference marker
          clearly visible so the image analysis can estimate its dimensions.
        </p>

        <div className="photo-source-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setError("")
              if (!navigator.mediaDevices?.getUserMedia) {
                setError("Camera access is unavailable in this browser. Upload an image instead.")
                return
              }
              setCameraOpen(true)
            }}
          >
            Take a photo
          </button>
          <button
            type="button"
            className="add-button"
            onClick={() => uploadInputRef.current?.click()}
          >
            Upload an image
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            className="photo-upload-input"
            accept="image/*"
            onChange={(event) => {
              selectPhoto(event.target.files?.[0])
              event.target.value = ""
            }}
          />
        </div>

        {cameraOpen && (
          <div className="camera-preview">
            <video ref={videoRef} autoPlay playsInline aria-label="Camera preview" />
            <div className="camera-actions">
              <button type="button" className="primary-button" onClick={capturePhoto}>
                Capture photo
              </button>
              <button type="button" className="add-button" onClick={() => setCameraOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {preview && (
          <img className="uploaded-photo" src={preview} alt="Selected fabric" />
        )}
        {annotated && (
          <figure className="annotated-preview">
            <img src={annotated} alt="Fabric scan overlay" />
            <figcaption>Detected scrap regions from your uploaded photo.</figcaption>
          </figure>
        )}

        <button
          className="scan-button"
          onClick={handleAnalyze}
          disabled={!photo || loading}
        >
          {loading ? "Scanning fabric…" : "Scan for scraps ✨"}
        </button>
      </section>

      {error && <p className="error-note">{error}</p>}
      {notice && <p className="success-note">{notice}</p>}

      {scraps.length > 0 && (
        <section className="add-step-card detected-section">
          <h2>2. Review detected scraps</h2>
          <p>Check the measurements and edit any details before saving.</p>

          <div className="detected-grid">
            {scraps.map((scrap, index) => (
              <article className="detected-card" key={scrap.temp_id}>
                {scrap.crop_url && (
                  <img
                    className="detected-crop"
                    src={scrap.crop_url}
                    alt={`Detected scrap ${index + 1}`}
                  />
                )}
                <h3>Scrap {index + 1}</h3>
                <label>
                  Name
                  <input
                    value={scrap.name}
                    onChange={(event) => updateScrap(index, "name", event.target.value)}
                  />
                </label>
                <div className="field-pair">
                  <label>
                    Width (cm)
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={scrap.width_cm}
                      onChange={(event) =>
                        updateScrap(index, "width_cm", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Height (cm)
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={scrap.height_cm}
                      onChange={(event) =>
                        updateScrap(index, "height_cm", event.target.value)
                      }
                    />
                  </label>
                </div>
                {scrap.shape_type === "circle" ? (
                  <label>
                    Radius (cm)
                    <input type="number" min="0.1" step="0.1" value={scrap.radius_cm ?? ""} onChange={(event) => updateScrap(index, "radius_cm", event.target.value)} />
                    <small>Area is calculated as π × radius² ({scrap.area_cm2 ?? "—"} cm²).</small>
                  </label>
                ) : scrap.shape_type === "irregular" ? (
                  <label>
                    Usable fabric area (cm²)
                    <input type="number" min="0.1" step="0.1" value={scrap.area_cm2 ?? ""} onChange={(event) => updateScrap(index, "area_cm2", event.target.value)} />
                    <small>Measured from the detected fabric outline; edit if needed.</small>
                  </label>
                ) : null}
                <label>
                  Fabric type
                  <select
                    value={scrap.fabric_type}
                    onChange={(event) =>
                      updateScrap(index, "fabric_type", event.target.value)
                    }
                  >
                    {FABRIC_TYPES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Stretch
                  <select
                    value={scrap.stretch}
                    onChange={(event) => updateScrap(index, "stretch", event.target.value)}
                  >
                    {STRETCH.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Weight
                  <select
                    value={scrap.weight}
                    onChange={(event) => updateScrap(index, "weight", event.target.value)}
                  >
                    {WEIGHTS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Pattern
                  <select
                    value={scrap.pattern}
                    onChange={(event) => updateScrap(index, "pattern", event.target.value)}
                  >
                    {PATTERNS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Colour name
                  <input
                    value={scrap.color_name}
                    onChange={(event) =>
                      updateScrap(index, "color_name", event.target.value)
                    }
                  />
                </label>
                <div className="color-editor">
                  <input
                    type="color"
                    value={scrap.color_hex}
                    onChange={(event) =>
                      updateScrap(index, "color_hex", event.target.value)
                    }
                    aria-label="Colour"
                  />
                  <input
                    value={scrap.color_hex}
                    onChange={(event) =>
                      updateScrap(index, "color_hex", event.target.value)
                    }
                  />
                </div>
              </article>
            ))}
          </div>

          <button
            className="primary-button save-scraps-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving scraps…" : "Save scraps"}
          </button>
        </section>
      )}
    </main>
  )
}
