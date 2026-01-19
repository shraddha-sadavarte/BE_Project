import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";

export default function useFaceRecognition() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [modelReady, setModelReady] = useState(false);
  const [facing, setFacing] = useState(false);

  // ---------------------------
  // Load face-api models ONCE
  // ---------------------------
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setModelReady(true);
    };

    loadModels();

    return () => stopCamera();
  }, []);

  // ---------------------------
  // Start Camera
  // ---------------------------
  const startCamera = async () => {
    if (!videoRef.current) return false;
    if (streamRef.current) return true;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    return true;
  };

  // ---------------------------
  // Stop Camera
  // ---------------------------
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // ---------------------------
  // Detect liveness (face present)
  // ---------------------------
  const detectLiveness = async ({ timeout = 6000 } = {}) => {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const detection = await faceapi.detectSingleFace(videoRef.current);
      if (detection) {
        setFacing(true);
        return true;
      }
      await new Promise(r => setTimeout(r, 300));
    }

    setFacing(false);
    return false;
  };

  // ---------------------------
  // REAL Face Embedding
  // ---------------------------
  // const captureFace = async () => {
  //   const detection = await faceapi
  //     .detectSingleFace(videoRef.current)
  //     .withFaceLandmarks()
  //     .withFaceDescriptor();

  //   if (!detection) {
  //     throw new Error("No face detected");
  //   }

  //   return Array.from(detection.descriptor); // 🔥 128D vector
  // };

  //updated captureFace function with modelReady check
  const captureFace = async () => {
    if (!modelReady) {
      throw new Error("Face models not loaded yet");
    }

    const detection = await faceapi
      .detectSingleFace(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error("No face detected");
    }

    return Array.from(detection.descriptor); // 128D real embedding
  };

  return {
    videoRef,
    startCamera,
    stopCamera,
    detectLiveness,
    captureFace,
    facing,
    modelReady,
  };
}

