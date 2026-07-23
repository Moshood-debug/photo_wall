"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function Home() {
  const [latestImage, setLatestImage] = useState(null);
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    // 1. Load initial latest image from server
    fetch("/api/images")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.images && data.images.length > 0) {
          const newest = `/uploads/${data.images[0]}`;
          console.log("Loaded initial image:", newest);
          setLatestImage(newest);
        } else {
          setStatus("No images found in public/uploads");
        }
      })
      .catch((err) => {
        console.error("Error loading initial image:", err);
        setStatus("Error loading images from server");
      });

    // 2. Listen to real-time events via Socket.IO
    const socket = io();

    socket.on("connect", () => {
      console.log("⚡ Photo stream connected:", socket.id);
    });

    socket.on("new-image", (data) => {
      console.log("📷 New photo detected:", data.filename);
      const newPath = `/uploads/${data.filename}?t=${Date.now()}`;
      setLatestImage(newPath);
    });

    return () => socket.disconnect();
  }, []);

  const handleImageError = () => {
    console.warn("Image load pending or failed, retrying in 500ms:", latestImage);
    // If the image was just created and hasn't finished writing completely, retry with updated timestamp
    setTimeout(() => {
      if (latestImage) {
        const cleanUrl = latestImage.split("?")[0];
        setLatestImage(`${cleanUrl}?t=${Date.now()}`);
      }
    }, 500);
  };

  return (
    <main className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {latestImage ? (
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            key={latestImage}
            src={latestImage}
            alt="Latest Photo"
            className="max-w-full max-h-full object-contain select-none"
            onError={handleImageError}
          />
        </div>
      ) : (
        <div className="text-center text-zinc-400 p-6 flex flex-col items-center">
          <div className="w-16 h-16 mb-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Waiting for LocalSend Photo...
          </h2>
          <p className="text-sm text-zinc-400 max-w-sm mb-4">
            {status}
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 text-left font-mono">
            Send photos from phone via LocalSend to:<br/>
            <span className="text-indigo-400">public/uploads</span>
          </div>
        </div>
      )}
    </main>
  );
}