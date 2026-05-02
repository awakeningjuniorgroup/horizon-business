import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  ShieldCheck,
  Loader2,
  ScanFace,
  Target,
  Lightbulb,
  LightbulbOff,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const RiderSelfieModal = ({ isOpen, onClose, onVerify }) => {
  const { user } = useAppContext();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  // AI States
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [refDescriptor, setRefDescriptor] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [activeScore, setActiveScore] = useState(0);

  // New Feature States
  const [ringLightOn, setRingLightOn] = useState(false);
  const [analyzingPhase, setAnalyzingPhase] = useState(false);

  // Adaptive video constraints - works with all camera types
  const videoConstraints = {
    facingMode: "user",
    width: { ideal: 1280 },
    height: { ideal: 720 },
    // Advanced constraints for better quality
    advanced: [
      { facingMode: "user", autofocus: true },
      { facingMode: "user", focusMode: "continuous" },
      { facingMode: "user", zoom: 1 },
    ],
  };

  useEffect(() => {
    let isMounted = true;
    const loadModelsAndProfile = async () => {
      try {
        const MODEL_URL = "/models";

        console.log("📦 Starting to load face detection models...");

        // Load models sequentially with proper null checks
        if (!faceapi.nets.tinyFaceDetector) {
          throw new Error("tinyFaceDetector model not available");
        }
        try {
          console.log("Loading tinyFaceDetector...");
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          console.log("✅ tinyFaceDetector loaded");
        } catch (err) {
          console.error("❌ tinyFaceDetector failed:", err.message);
          throw err;
        }

        if (!faceapi.nets.faceLandmark68Net) {
          throw new Error("faceLandmark68Net model not available");
        }
        try {
          console.log("Loading faceLandmark68Net...");
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          console.log("✅ faceLandmark68Net loaded");
        } catch (err) {
          console.error("❌ faceLandmark68Net failed:", err.message);
          throw err;
        }

        if (!faceapi.nets.faceRecognitionNet) {
          throw new Error("faceRecognitionNet model not available");
        }
        try {
          console.log("Loading faceRecognitionNet...");
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          console.log("✅ faceRecognitionNet loaded");
        } catch (err) {
          console.error("❌ faceRecognitionNet failed:", err.message);
          throw err;
        }

        // Optional models - don't fail if these don't load
        if (faceapi.nets.ssdMobilenetv1) {
          try {
            console.log("Loading ssdMobilenetv1 (optional)...");
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            console.log("✅ ssdMobilenetv1 loaded");
          } catch (err) {
            console.warn("⚠️ ssdMobilenetv1 failed:", err.message);
          }
        } else {
          console.warn("⚠️ ssdMobilenetv1 not available");
        }

        if (faceapi.nets.mtcnnNet) {
          try {
            console.log("Loading mtcnnNet (optional)...");
            await faceapi.nets.mtcnnNet.loadFromUri(MODEL_URL);
            console.log("✅ mtcnnNet loaded");
          } catch (err) {
            console.warn("⚠️ mtcnnNet failed:", err.message);
          }
        } else {
          console.warn("⚠️ mtcnnNet not available");
        }

        console.log("✅ All critical models loaded successfully");

        if (user?.profileImage) {
          try {
            // Attempt to load image with CORS headers
            const imgElement = new Image();
            imgElement.crossOrigin = "anonymous";

            await new Promise((resolve, reject) => {
              imgElement.onload = resolve;
              imgElement.onerror = reject;
              imgElement.src = user.profileImage;
            });

            console.log(
              `📸 Profile image loaded. Dimensions: ${imgElement.width}x${imgElement.height}`,
            );
            console.log(
              `📸 Profile image URL: ${user.profileImage.substring(0, 80)}...`,
            );

            // Validate image loaded properly
            if (imgElement.width === 0 || imgElement.height === 0) {
              throw new Error("Image loaded but has invalid dimensions (0x0)");
            }

            if (imgElement.width < 50 || imgElement.height < 50) {
              throw new Error(
                `Image too small (${imgElement.width}x${imgElement.height}). Minimum 50x50 required.`,
              );
            }

            // Try primary detection with TinyFaceDetector
            let refDetection = await faceapi
              .detectSingleFace(
                imgElement,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 416,
                  scoreThreshold: 0.35, // Lowered from 0.4 for better sensitivity
                }),
              )
              .withFaceLandmarks()
              .withFaceDescriptor();

            // Fallback 2: SSD MobileNet with lower threshold
            if (!refDetection && faceapi.nets.ssdMobilenetv1) {
              console.warn("TinyFaceDetector failed, trying SSD MobileNet...");
              try {
                refDetection = await faceapi
                  .detectSingleFace(
                    imgElement,
                    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }),
                  )
                  .withFaceLandmarks()
                  .withFaceDescriptor();
              } catch (e) {
                console.warn("SSD MobileNet also failed");
              }
            }

            // Fallback 3: MTCNN - most accurate but slower (if available)
            if (!refDetection && faceapi.nets.mtcnnNet) {
              console.warn("Trying MTCNN fallback...");
              try {
                refDetection = await faceapi
                  .detectSingleFace(imgElement, new faceapi.MtcnnOptions())
                  .withFaceLandmarks()
                  .withFaceDescriptor();
              } catch (e) {
                console.warn("MTCNN also failed");
              }
            }

            // Diagnostic: Check if any faces detected at all (even without high confidence)
            if (!refDetection) {
              console.warn(
                "Standard detection failed, attempting diagnostic scan with lower threshold...",
              );
              const allFaces = await faceapi.detectAllFaces(
                imgElement,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 416,
                  scoreThreshold: 0.15, // Even lower for initial detection
                }),
              );
              console.log(`Diagnostic: Found ${allFaces.length} face(s)`);

              if (allFaces.length > 0) {
                console.warn(
                  "Faces detected but quality too low. Attempting with best face...",
                );
                refDetection = await faceapi
                  .detectSingleFace(
                    imgElement,
                    new faceapi.TinyFaceDetectorOptions({
                      inputSize: 416,
                      scoreThreshold: 0.08, // Very low threshold for quality cameras
                    }),
                  )
                  .withFaceLandmarks()
                  .withFaceDescriptor();
              }
            }

            if (refDetection && isMounted) {
              setRefDescriptor(refDetection.descriptor);
              console.log("✅ Profile face successfully detected and mapped");
            } else if (isMounted) {
              console.error("❌ Face detection failed after all attempts");
              // Check if image loaded but had no faces
              const allFaces = await faceapi.detectAllFaces(imgElement);
              if (allFaces.length === 0) {
                console.warn(
                  "⚠️ No faces detected in profile image at all. User needs a clear selfie or headshot.",
                );
                toast.error(
                  "Your profile picture doesn't contain a visible face. Please upload a clear selfie or headshot showing your face clearly, well-lit, and facing the camera directly.",
                  { duration: 7000 },
                );
              } else {
                toast.error(
                  "Face detection quality too low. Ensure your photo: is clear and bright, shows your full face frontally, has high contrast, and has no filters or glasses. Try a different photo.",
                  { duration: 7000 },
                );
              }
            }
          } catch (imageError) {
            console.error("Error with profile image:", imageError);
            let errorMsg = "Could not process your profile picture.";

            if (imageError.message.includes("invalid dimensions")) {
              errorMsg =
                "Profile image failed to load properly. Please try uploading again.";
            } else if (imageError.message.includes("too small")) {
              errorMsg = `Profile image is too small. Use an image at least 50x50 pixels.`;
            } else if (imageError.message.includes("ERR_NAME_NOT_RESOLVED")) {
              errorMsg =
                "Could not reach the image server. Check your internet.";
            } else {
              errorMsg +=
                " Check your internet connection and try a different image.";
            }

            toast.error(errorMsg, { duration: 5000 });
          }
        } else {
          if (isMounted)
            toast.error(
              "No official profile picture found. Please upload a profile picture first.",
            );
        }

        if (isMounted) setModelsLoaded(true);
      } catch (error) {
        console.error("Failed to load AI Models:", error);
        if (isMounted) {
          let errorMsg = "Failed to initialize Security AI.";
          if (error.message.includes("model not available")) {
            errorMsg +=
              " A required AI model is not loaded. Please refresh the page.";
          } else if (error.message.includes("404")) {
            errorMsg += " Model files not found. Refresh the page.";
          } else if (error.message.includes("Network")) {
            errorMsg += " Network error. Check your connection and try again.";
          } else {
            errorMsg += " Please refresh and try again.";
          }
          toast.error(errorMsg, { duration: 5000 });
        }
      }
    };

    if (isOpen) {
      setScanResult(null);
      setCameraReady(false);
      setAnalyzingPhase(false);
      setRingLightOn(false);
      loadModelsAndProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.profileImage]);

  // Live Video Feed Recognition Loop
  useEffect(() => {
    let interval;
    if (
      isOpen &&
      modelsLoaded &&
      refDescriptor &&
      cameraReady &&
      !scanResult &&
      !analyzingPhase
    ) {
      interval = setInterval(async () => {
        if (
          webcamRef.current &&
          webcamRef.current.video &&
          webcamRef.current.video.readyState === 4
        ) {
          const video = webcamRef.current.video;

          try {
            const detection = await faceapi
              .detectSingleFace(
                video,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 416,
                  scoreThreshold: 0.35, // Lowered from 0.5 for better compatibility
                }),
              )
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detection) {
              const distance = faceapi.euclideanDistance(
                refDescriptor,
                detection.descriptor,
              );
              // Confidence score - adjusted threshold for better matching
              const matchScore = Math.max(
                0,
                Math.min(100, Math.round(100 - (distance / 0.65) * 35)), // Adjusted distance threshold
              );
              setActiveScore(matchScore);

              if (
                canvasRef.current &&
                video.videoWidth > 0 &&
                video.videoHeight > 0
              ) {
                const displaySize = {
                  width: video.videoWidth,
                  height: video.videoHeight,
                };
                faceapi.matchDimensions(canvasRef.current, displaySize);
                const resizedDetection = faceapi.resizeResults(
                  detection,
                  displaySize,
                );

                const ctx = canvasRef.current.getContext("2d");
                ctx.clearRect(
                  0,
                  0,
                  canvasRef.current.width,
                  canvasRef.current.height,
                );

                const box = resizedDetection.detection.box;
                const isCentered = box.width > 20 && box.height > 20;
                const isMatch = distance < 0.65; // Slightly higher tolerance for different cameras

                if (isMatch && isCentered) {
                  clearInterval(interval);

                  setAnalyzingPhase(true);
                  const snap = webcamRef.current.getScreenshot();

                  setTimeout(() => {
                    setScanResult({
                      score: matchScore,
                      success: true,
                      image: snap,
                    });
                    setTimeout(() => {
                      onVerify({ image: snap, score: matchScore });
                    }, 1500);
                  }, 1000);
                }
              }
            } else {
              setActiveScore(0);
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                ctx.clearRect(
                  0,
                  0,
                  canvasRef.current.width,
                  canvasRef.current.height,
                );
              }
            }
          } catch (e) {
            // Safely ignore inference errors during teardown or model loading
            console.debug(
              "Face detection inference error (expected during cleanup):",
              e.message,
            );
          }
        }
      }, 300);
    }
    return () => clearInterval(interval);
  }, [
    isOpen,
    modelsLoaded,
    refDescriptor,
    cameraReady,
    onVerify,
    scanResult,
    analyzingPhase,
  ]);

  const handleUserMedia = () => setCameraReady(true);

  const toggleRingLight = async () => {
    const toggleValue = !ringLightOn;
    setRingLightOn(toggleValue);

    try {
      const track = webcamRef.current?.video?.srcObject?.getVideoTracks()[0];
      if (track) {
        // If device supports actual torch or exposure compensation, use them to maximize light
        const capabilities = track.getCapabilities?.() || {};
        const constraints = { advanced: [] };

        if (capabilities.torch) {
          constraints.advanced.push({ torch: toggleValue });
        }

        if (capabilities.exposureCompensation) {
          constraints.advanced.push({
            exposureCompensation: toggleValue
              ? capabilities.exposureCompensation.max
              : 0,
          });
        }

        if (constraints.advanced.length > 0) {
          await track.applyConstraints(constraints);
        }
      }
    } catch (err) {
      console.log(
        "Torch/Exposure access error or unsupported (falling back to screen Ring Light)",
        err,
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 font-outfit transition-colors duration-500 ${ringLightOn ? "bg-white" : "bg-slate-900/90 backdrop-blur-md"}`}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative transition-colors duration-500 ${ringLightOn ? "bg-white shadow-[0_0_50px_rgba(255,255,255,0.8)] border border-slate-100" : "bg-white"}`}
          >
            {/* Header */}
            <div
              className={`p-5 flex justify-between items-center z-10 transition-colors ${ringLightOn ? "bg-white border-b border-slate-100" : "bg-slate-50 border-b border-slate-100"}`}
            >
              <div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <ShieldCheck className="text-primary" /> Identity Check
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Photo Verification
                </p>
              </div>
              <div className="flex items-center gap-2">
                {cameraReady && !scanResult && !analyzingPhase && (
                  <button
                    onClick={toggleRingLight}
                    className={`p-2 rounded-full transition-all ${
                      ringLightOn
                        ? "bg-primary/20 text-primary shadow-sm border border-primary/30"
                        : "bg-white text-slate-400 hover:bg-slate-100 border border-slate-200"
                    }`}
                    title="Toggle Ring Light for Night Scan"
                  >
                    {ringLightOn ? (
                      <Lightbulb
                        size={20}
                        className="fill-current animate-pulse"
                      />
                    ) : (
                      <LightbulbOff size={20} />
                    )}
                  </button>
                )}
                <button
                  onClick={onClose}
                  disabled={scanResult || analyzingPhase}
                  className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors border border-slate-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scanner Viewport */}
            <div
              className={`p-6 flex flex-col items-center justify-center relative h-[400px] overflow-hidden transition-colors duration-500 ${ringLightOn ? "bg-slate-50" : "bg-slate-900 border-t border-slate-800"}`}
            >
              {/* Loading State */}
              {!modelsLoaded || !refDescriptor ? (
                <div
                  className={`w-64 h-64 rounded-full flex flex-col items-center justify-center shadow-inner text-primary relative z-20 ${ringLightOn ? "bg-white border-4 border-slate-100" : "bg-slate-900 border-4 border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"}`}
                >
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest mt-2 text-center px-4 ${ringLightOn ? "text-slate-500" : "text-slate-400"}`}
                  >
                    Initializing System...
                  </p>
                </div>
              ) : (
                <div
                  className={`relative w-72 h-72 rounded-full overflow-hidden flex items-center justify-center z-20 transition-all duration-500 ${ringLightOn ? "border-8 border-white shadow-[0_0_60px_15px_rgba(255,255,255,0.8),inset_0_0_40px_20px_rgba(255,255,255,0.4)] bg-white" : "border-4 border-slate-800 shadow-[0_0_30px_rgba(79,191,139,0.1)] bg-slate-900"}`}
                >
                  {/* Always Active Live Video Feed */}
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    onUserMedia={handleUserMedia}
                    onUserMediaError={(err) => {
                      console.warn("Camera error, attempting fallback:", err);
                      // Fallback to simpler constraints
                      if (webcamRef.current) {
                        setTimeout(() => {
                          handleUserMedia();
                        }, 500);
                      }
                    }}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={1}
                    videoConstraints={videoConstraints}
                    className="absolute inset-0 w-full h-full object-cover z-10 scale-125"
                    mirrored={true}
                  />

                  {/* Additional Ring Light internal glow effect */}
                  {ringLightOn && !(scanResult || analyzingPhase) && (
                    <div className="absolute inset-0 z-[15] pointer-events-none rounded-full shadow-[inset_0_0_60px_30px_rgba(255,255,255,1)]" />
                  )}

                  {/* Transparent Canvas for face-api boxes. Only show while scanning. */}
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover z-20 scale-125"
                    style={{
                      transform: "scaleX(-1)",
                      display: scanResult || analyzingPhase ? "none" : "block",
                    }}
                  />

                  {/* Live Targeting Reticle Layer */}
                  {!(scanResult || analyzingPhase) && (
                    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center opacity-30">
                      <Target
                        size={220}
                        className="text-primary animate-[spin_8s_linear_infinite]"
                        strokeWidth={1}
                      />
                    </div>
                  )}

                  {/* Analyzing Transition Overlay */}
                  <AnimatePresence>
                    {analyzingPhase && !scanResult && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 z-40 backdrop-blur-md flex flex-col items-center justify-center ${ringLightOn ? "bg-white/80" : "bg-slate-900/80"}`}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            ease: "linear",
                          }}
                          className={`w-16 h-16 border-[3px] rounded-full mb-4 shadow-[0_0_15px_rgba(79,191,139,0.5)] ${ringLightOn ? "border-primary/20 border-t-primary" : "border-slate-700 border-t-primary"}`}
                        />
                        <span className="text-primary font-bold tracking-widest text-sm animate-pulse">
                          ANALYZING PROFILE
                        </span>
                        <span
                          className={`text-[10px] mt-2 tracking-wider ${ringLightOn ? "text-slate-600" : "text-slate-400"}`}
                        >
                          Please Wait...
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Final Professional Score Overlay */}
                  <AnimatePresence>
                    {scanResult && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 z-50 bg-primary flex flex-col items-center justify-center"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 15,
                            delay: 0.1,
                          }}
                          className="bg-white rounded-full p-3 shadow-xl mb-4"
                        >
                          <Check
                            className="text-primary-dull"
                            size={36}
                            strokeWidth={4}
                          />
                        </motion.div>

                        <h4 className="text-white font-black text-4xl tracking-tighter mb-2 shadow-black drop-shadow-md">
                          Verified
                        </h4>

                        <div className="bg-black/10 px-4 py-1.5 rounded-full border border-white/30 backdrop-blur-sm">
                          <span className="text-white text-[10px] uppercase font-bold tracking-widest shadow-black drop-shadow-sm">
                            Access Confirmed
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Ambient Scanning Glow */}
              {!ringLightOn && !scanResult && !analyzingPhase && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
                  <div className="w-full h-2 bg-primary absolute top-0 left-0 animate-[scan_4s_ease-in-out_infinite] shadow-[0_0_30px_15px_rgba(79,191,139,0.4)]"></div>
                </div>
              )}
            </div>

            {/* Status Footer */}
            <div
              className={`p-6 border-t flex flex-col items-center transition-colors duration-500 ${ringLightOn ? "bg-white border-slate-100" : "bg-slate-900 border-slate-800"}`}
            >
              {scanResult ? (
                <p className="text-primary font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                  Identity Verified
                </p>
              ) : analyzingPhase ? (
                <p className="text-primary font-medium text-xs tracking-widest uppercase animate-pulse">
                  Processing Photo...
                </p>
              ) : (
                <>
                  <p
                    className={`font-medium text-center text-xs tracking-wide ${ringLightOn ? "text-slate-600" : "text-slate-400"}`}
                  >
                    Position your face in the center. The system will
                    auto-capture when aligned.
                  </p>
                  <div
                    className={`mt-4 flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border transition-colors ${ringLightOn ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-slate-800 text-slate-500 border-slate-700"}`}
                  >
                    <ScanFace
                      size={14}
                      className={
                        activeScore > 0 ? "text-primary" : "text-slate-400"
                      }
                    />
                    {activeScore === 0
                      ? "Detecting Face..."
                      : "Aligning Face..."}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RiderSelfieModal;
