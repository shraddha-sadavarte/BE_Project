import React from "react";
import { useRef, useState, useEffect } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";

const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

const dist = (p1, p2) =>
  Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);

const computeEAR = (eye) => {
  const A = dist(eye[1], eye[5]);
  const B = dist(eye[2], eye[4]);
  const C = dist(eye[0], eye[3]);
  return (A + B) / (2.0 * C);
};

export default function useFaceRecognition() {
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const blinkedRef = useRef(false);

  const [blinked, setBlinked] = useState(false);
  const [facing, setFacing] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  // ---------------------------
  // Initialize FaceMesh ONCE
  // ---------------------------
  useEffect(() => {
    if (faceMeshRef.current) return;

    const fm = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    fm.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    fm.onResults(onResults);
    faceMeshRef.current = fm;

    const t = setTimeout(() => setModelReady(true), 2000);

    // 🔴 CLEANUP
    return () => {
      clearTimeout(t);
      stopCamera();
      faceMeshRef.current?.close();
      faceMeshRef.current = null;
    };
  }, []);

  // ---------------------------
  // FaceMesh result handler
  // ---------------------------
  const onResults = (results) => {
    if (!results.multiFaceLandmarks?.length) {
      setFacing(false);
      return;
    }

    setFacing(true);
    const landmarks = results.multiFaceLandmarks[0];

    const leftEye = LEFT_EYE_INDICES.map((i) => landmarks[i]);
    const rightEye = RIGHT_EYE_INDICES.map((i) => landmarks[i]);

    const avgEAR =
      (computeEAR(leftEye) + computeEAR(rightEye)) / 2;

    if (avgEAR < 0.27 && !blinkedRef.current) {
      blinkedRef.current = true;
      setBlinked(true);
    }
  };

  // ---------------------------
  // Start Camera
  // ---------------------------
  const startCamera = async () => {
    if (!videoRef.current || !faceMeshRef.current) return false;

    if (streamRef.current) return true; // already running

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;

    const camInstance = new cam.Camera(videoRef.current, {
      onFrame: async () => {
        await faceMeshRef.current.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    cameraRef.current = camInstance;
    await camInstance.start();
    return true;
  };

  // ---------------------------
  // Stop Camera (IMPORTANT FIX)
  // ---------------------------
  const stopCamera = () => {
    cameraRef.current?.stop();
    cameraRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    blinkedRef.current = false;
    setBlinked(false);
  };

  // ---------------------------
  // Detect Blink
  // ---------------------------
  const detectLiveness = async ({ timeout = 8000, interval = 200 } = {}) => {
    blinkedRef.current = false;
    setBlinked(false);

    await new Promise((r) => setTimeout(r, 1200));

    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (blinkedRef.current) {
          clearInterval(timer);
          resolve(true);
        }
        if (Date.now() - start > timeout) {
          clearInterval(timer);
          resolve(false);
        }
      }, interval);
    });
  };

  const captureFace = async () => {
    return [Math.random(), Math.random(), Math.random()];
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
