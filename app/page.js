"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";

function PhotoWallContent() {
  const searchParams = useSearchParams();
  const folder = searchParams.get("folder") || "";

  const [latestImage, setLatestImage] = useState(null);
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    const fetchUrl = folder ? `/api/images?folder=${encodeURIComponent(folder)}` : "/api/images";

    // 1. Load initial latest image for this folder
    fetch(fetchUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.images && data.images.length > 0) {
          const newest = `/uploads/${data.images[0]}`;
          console.log("Loaded initial image:", newest);
          setLatestImage(newest);
        } else {
          setStatus(`No images found in public/uploads/${folder}`);
        }
      })
      .catch((err) => {
        console.error("Error loading initial image:", err);
        setStatus("Error loading images from server");
      });

    const socket = io();

    socket.on("connect", () => {
      console.log("⚡ Photo stream connected:", socket.id);
      socket.emit("join-folder", folder);
    });

    socket.on("new-image", (data) => {
      console.log("📷 New photo detected:", data.filename);
      const newPath = `/uploads/${data.filename}?t=${Date.now()}`;
      setLatestImage(newPath);
    });

    socket.on("remove-image", () => {
      fetch(fetchUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.images && data.images.length > 0) {
            setLatestImage(`/uploads/${data.images[0]}?t=${Date.now()}`);
          } else {
            setLatestImage(null);
            setStatus(`No images found in public/uploads/${folder}`);
          }
        })
        .catch(console.error);
    });

    return () => socket.disconnect();
  }, [folder]);

  const handleImageError = () => {
    console.warn("Image load pending or failed, retrying in 500ms:", latestImage);
    setTimeout(() => {
      if (latestImage) {
        const cleanUrl = latestImage.split("?")[0];
        setLatestImage(`${cleanUrl}?t=${Date.now()}`);
      }
    }, 500);
  };

  const uploadFolderPath = folder ? `public/uploads/${folder}` : "public/uploads";

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
          {folder && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono text-indigo-300 border border-indigo-500/30">
              📁 {folder}
            </div>
          )}
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
            Send photos from phone via LocalSend to:<br />
            <span className="text-indigo-400">{uploadFolderPath}</span>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white font-mono text-sm">Loading...</div>}>
      <PhotoWallContent />
    </Suspense>
  );
}