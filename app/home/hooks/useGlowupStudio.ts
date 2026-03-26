"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { PROMPTS } from '../../../lib/prompts';
import type { CaptionModel, GenerationModel, ImageSource, PinterestImage, SavedGeneratedImage } from '../types';
import { orderImagesByPriority } from '../utils';

const MAX_INSPO = 5;

export function useGlowupStudio() {
  const [showWebcam, setShowWebcam] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  const [imageSource, setImageSource] = useState<ImageSource>('pexels');
  const [searchQuery, setSearchQuery] = useState('');
  const [unsplashImages, setUnsplashImages] = useState<PinterestImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imagesError, setImagesError] = useState('');
  const [imagesErrorDetail, setImagesErrorDetail] = useState('');
  const [imagesCount, setImagesCount] = useState(10);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [userImage, setUserImage] = useState('');
  const [userFile, setUserFile] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState('');
  const [savedGeneratedImages, setSavedGeneratedImages] = useState<SavedGeneratedImage[]>([]);
  const [error, setError] = useState('');
  const [descriptionsError, setDescriptionsError] = useState('');
  const [unifiedPromptError, setUnifiedPromptError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false);
  const [isGeneratingUnifiedPrompt, setIsGeneratingUnifiedPrompt] = useState(false);
  const [usedPrompt, setUsedPrompt] = useState('');
  const [inspoDescriptions, setInspoDescriptions] = useState<Record<number, string>>({});
  const [popupImg, setPopupImg] = useState<string | null>(null);
  const [openDescriptions, setOpenDescriptions] = useState<Record<number, boolean>>({});
  const [loadingDescId, setLoadingDescId] = useState<number | null>(null);
  const [captionModel, setCaptionModel] = useState<CaptionModel>('llava13b');
  const [generationModel, setGenerationModel] = useState<GenerationModel>('replicate-qwen');
  const [unifiedDescription, setUnifiedDescription] = useState('');
  const [isUnifiedDescriptionEditing, setIsUnifiedDescriptionEditing] = useState(false);

  const shouldRefreshUnifiedPromptRef = useRef(false);
  const suppressUnifiedPromptRefreshRef = useRef(false);
  const unifiedPromptAbortControllerRef = useRef<AbortController | null>(null);
  const unifiedPromptRequestIdRef = useRef(0);

  const selectedImages = useMemo(
    () => selectedIds
      .map((id) => unsplashImages.find((item) => item.id === id))
      .filter((item): item is PinterestImage => Boolean(item)),
    [selectedIds, unsplashImages]
  );

  const canGenerate = selectedIds.length >= 1 && Boolean(userImage) && !isGenerating;
  const isCurrentImageSaved = generatedImage
    ? savedGeneratedImages.some((item) => item.src === generatedImage)
    : false;

  const getPriorityById = (id: number) => {
    const index = selectedIds.indexOf(id);
    return index >= 0 ? index + 1 : null;
  };

  useEffect(() => {
    return () => {
      unifiedPromptAbortControllerRef.current?.abort();
      webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!showWebcam || !videoRef.current || !webcamStreamRef.current) {
      return;
    }

    videoRef.current.srcObject = webcamStreamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [showWebcam]);

  useEffect(() => {
    if (!shouldRefreshUnifiedPromptRef.current) {
      return;
    }
    if (suppressUnifiedPromptRefreshRef.current) {
      return;
    }
    shouldRefreshUnifiedPromptRef.current = false;
    const descriptions = selectedImages.map((img) => inspoDescriptions[img.id]).filter(Boolean);
    void generateUnifiedDescriptionAI(descriptions);
  }, [selectedImages, inspoDescriptions]);

  async function generateUnifiedDescriptionAI(descriptions: string[]) {
    unifiedPromptRequestIdRef.current += 1;
    const requestId = unifiedPromptRequestIdRef.current;
    unifiedPromptAbortControllerRef.current?.abort();

    if (descriptions.length === 0) {
      unifiedPromptAbortControllerRef.current = null;
      setIsGeneratingUnifiedPrompt(false);
      setUnifiedDescription('');
      setIsUnifiedDescriptionEditing(false);
      return;
    }

    if (descriptions.length === 1) {
      unifiedPromptAbortControllerRef.current = null;
      setIsGeneratingUnifiedPrompt(false);
      setUnifiedDescription(descriptions[0]?.trim() || '');
      setIsUnifiedDescriptionEditing(false);
      return;
    }

    const abortController = new AbortController();
    unifiedPromptAbortControllerRef.current = abortController;
    setIsGeneratingUnifiedPrompt(true);
    setUnifiedPromptError('');

    try {
      const response = await fetch('/api/unify-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptions }),
        signal: abortController.signal,
      });

      if (requestId !== unifiedPromptRequestIdRef.current) {
        return;
      }

      const rawResponse = await response.text();
      let data: any = null;
      try {
        data = rawResponse ? JSON.parse(rawResponse) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const debugParts = [data?.error || 'Errore AI'];
        if (data?.status || response.status) {
          debugParts.push(`Status: ${data?.status || response.status}`);
        }
        if (data?.statusText) {
          debugParts.push(`Status text: ${data.statusText}`);
        }
        if (data?.detail) {
          debugParts.push(`Detail: ${typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail, null, 2)}`);
        } else if (rawResponse && !data) {
          debugParts.push(`Raw response: ${rawResponse}`);
        }
        setUnifiedPromptError(debugParts.join('\n'));
        setUnifiedDescription('');
        setIsUnifiedDescriptionEditing(false);
      } else {
        setUnifiedDescription(data?.prompt || '');
        setIsUnifiedDescriptionEditing(false);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        return;
      }
      if (requestId !== unifiedPromptRequestIdRef.current) {
        return;
      }
      setUnifiedPromptError('Errore di rete nella fusione AI.');
      setUnifiedDescription('');
      setIsUnifiedDescriptionEditing(false);
    } finally {
      if (requestId === unifiedPromptRequestIdRef.current) {
        unifiedPromptAbortControllerRef.current = null;
        setIsGeneratingUnifiedPrompt(false);
      }
    }
  }

  const stopWebcamStream = () => {
    webcamStreamRef.current?.getTracks().forEach((track) => track.stop());
    webcamStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeWebcam = () => {
    setShowWebcam(false);
    stopWebcamStream();
  };

  const startWebcam = async () => {
    setError('');
    try {
      stopWebcamStream();
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('La webcam non e supportata da questo browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = stream;
      setShowWebcam(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }
    } catch (e: any) {
      setShowWebcam(false);
      stopWebcamStream();
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setError('Permesso webcam negato dal browser.');
        return;
      }
      if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
        setError('Nessuna webcam disponibile rilevata.');
        return;
      }
      if (e?.name === 'NotReadableError' || e?.name === 'TrackStartError') {
        setError('La webcam e occupata da un altra applicazione.');
        return;
      }
      setError('Impossibile aprire la webcam.');
    }
  };

  const captureWebcam = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setUserImage(dataUrl);
        setUserFile(null);
        setShowWebcam(false);
        stopWebcamStream();
      }
    }
  };

  const fetchUnsplashImages = async () => {
    setIsLoadingImages(true);
    setImagesError('');
    setImagesErrorDetail('');
    try {
      const response = await fetch('/api/unsplash-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, count: imagesCount, source: imageSource }),
      });
      const data = await response.json();
      if (!response.ok) {
        setImagesError(data.error || 'Errore nella ricerca immagini.');
        setImagesErrorDetail(data.detail || '');
        setUnsplashImages([]);
      } else {
        setUnsplashImages((prev) => {
          const selectedImagesInOrder = prev
            .filter((img) => selectedIds.includes(img.id))
            .sort((a, b) => selectedIds.indexOf(a.id) - selectedIds.indexOf(b.id));
          const newImages = (data.images || []).filter((img: PinterestImage) => !selectedIds.includes(img.id));
          return [...selectedImagesInOrder, ...newImages];
        });
      }
    } catch (e: any) {
      setImagesError('Errore di rete nella ricerca immagini.');
      setImagesErrorDetail(e?.message || '');
      setUnsplashImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleRemoveUnselected = () => {
    setUnsplashImages(unsplashImages.filter((img) => selectedIds.includes(img.id)));
  };

  const handleImageToggle = (id: number) => {
    setError('');
    setGeneratedImage('');
    let newSelected: number[];
    if (selectedIds.includes(id)) {
      shouldRefreshUnifiedPromptRef.current = true;
      newSelected = selectedIds.filter((selectedId) => selectedId !== id);
    } else {
      if (selectedIds.length >= MAX_INSPO) {
        return;
      }
      if (inspoDescriptions[id]?.trim()) {
        shouldRefreshUnifiedPromptRef.current = true;
      }
      newSelected = [...selectedIds, id];
    }
    setSelectedIds(newSelected);
    setUnsplashImages((prev) => orderImagesByPriority(prev, newSelected));
  };

  const removeSelectedInspiration = (id: number) => {
    if (!selectedIds.includes(id)) {
      return;
    }

    setError('');
    setGeneratedImage('');
    shouldRefreshUnifiedPromptRef.current = true;

    const newSelected = selectedIds.filter((selectedId) => selectedId !== id);
    setSelectedIds(newSelected);
    setUnsplashImages((prev) => orderImagesByPriority(prev, newSelected));
    setOpenDescriptions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const moveSelectedPriority = (id: number, direction: 'up' | 'down') => {
    setError('');
    setGeneratedImage('');
    shouldRefreshUnifiedPromptRef.current = true;
    setSelectedIds((prev) => {
      const currentIndex = prev.indexOf(id);
      if (currentIndex === -1) {
        return prev;
      }
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      setUnsplashImages((currentImages) => orderImagesByPriority(currentImages, next));
      return next;
    });
  };

  const handleFileUpload = (file?: File) => {
    if (!file) {
      return;
    }
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Solo JPG e PNG sono supportati.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUserImage(reader.result as string);
      setUserFile(file);
      setGeneratedImage('');
    };
    reader.readAsDataURL(file);
  };

  const resetUserImage = () => {
    setUserImage('');
    setUserFile(null);
  };

  const handleInspoChange = (id: number, value: string) => {
    setInspoDescriptions((prev) => ({ ...prev, [id]: value }));
  };

  const toggleDescription = (id: number) => {
    setOpenDescriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleInspoBlur = (id: number) => {
    setOpenDescriptions((prev) => ({ ...prev, [id]: false }));
    shouldRefreshUnifiedPromptRef.current = true;
    const descriptions = selectedImages.map((img) => inspoDescriptions[img.id]).filter(Boolean);
    void generateUnifiedDescriptionAI(descriptions);
  };

  const handleUnifiedDescriptionBlur = () => {
    setIsUnifiedDescriptionEditing(false);
  };

  const startUnifiedDescriptionEditing = () => {
    setIsUnifiedDescriptionEditing(true);
  };

  const regenerateUnifiedDescription = () => {
    const descriptions = selectedImages.map((img) => inspoDescriptions[img.id]).filter(Boolean);
    if (descriptions.length <= 1) {
      setUnifiedDescription(descriptions[0]?.trim() || '');
      setIsUnifiedDescriptionEditing(false);
      return;
    }
    void generateUnifiedDescriptionAI(descriptions);
  };

  const generateSingleInspoDescription = async (id: number, src: string, options?: { triggerUnifiedPrompt?: boolean }) => {
    const triggerUnifiedPrompt = options?.triggerUnifiedPrompt ?? true;
    setDescriptionsError('');
    setLoadingDescId(id);
    try {
      const response = await fetch('/api/img2text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: src, model: captionModel }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setDescriptionsError('Risposta non valida dal backend img2text.');
        setLoadingDescId(null);
        return;
      }
      if (data.description) {
        setInspoDescriptions((prev) => ({ ...prev, [id]: data.description }));
        if (triggerUnifiedPrompt && !suppressUnifiedPromptRefreshRef.current) {
          shouldRefreshUnifiedPromptRef.current = true;
        }
        return data.description as string;
      }
      if (data.error) {
        setDescriptionsError(`Errore img2text: ${data.error}`);
      }
    } catch {
      setDescriptionsError('Errore di rete img2text.');
    } finally {
      setLoadingDescId(null);
    }
    return null;
  };

  const generateInspoDescriptions = async () => {
    if (selectedImages.length === 0) {
      return;
    }
    setDescriptionsError('');
    setIsGeneratingDescriptions(true);
    suppressUnifiedPromptRefreshRef.current = true;
    const nextDescriptions = { ...inspoDescriptions };
    try {
      for (const img of selectedImages) {
        const generatedDescription = await generateSingleInspoDescription(img.id, img.src, { triggerUnifiedPrompt: false });
        if (generatedDescription) {
          nextDescriptions[img.id] = generatedDescription;
        }
      }
    } finally {
      suppressUnifiedPromptRefreshRef.current = false;
      setIsGeneratingDescriptions(false);
    }
    const descriptions = selectedImages.map((img) => nextDescriptions[img.id]).filter(Boolean);
    await generateUnifiedDescriptionAI(descriptions);
  };

  const generateAspirational = async () => {
    setError('');
    setGeneratedImage('');
    if (!userImage) {
      setError('Devi caricare una foto prima.');
      return;
    }
    if (selectedIds.length < 1) {
      setError('Devi selezionare almeno 1 immagine dalla moodboard.');
      return;
    }
    const glowupInstruction = PROMPTS.generateImage.glowupInstruction;
    const fullPrompt = `${unifiedDescription?.trim() || ''}\n${glowupInstruction}`;
    setUsedPrompt(fullPrompt);
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: userImage, prompt: unifiedDescription, model: generationModel }),
      });
      const data = await response.json();
      if (!response.ok) {
        let debugMessage = data.error || 'Errore nella generazione dell’immagine.';
        if (data.provider) {
          debugMessage += `\nProvider: ${data.provider}`;
        }
        if (data.replicate_status || data.replicate_detail) {
          debugMessage += '\nStatus: ' + (data.replicate_status || '');
          debugMessage += '\nDetail: ' + JSON.stringify(data.replicate_detail, null, 2);
        }
        setError(debugMessage);
      } else {
        setGeneratedImage(data.generatedImage);
      }
    } catch {
      setError('Si è verificato un errore di rete. Riprova.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (src: string, filename: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveCurrentGeneratedImage = () => {
    if (!generatedImage || isCurrentImageSaved) {
      return;
    }
    setSavedGeneratedImages((prev) => [
      {
        id: `${Date.now()}-${prev.length}`,
        src: generatedImage,
        prompt: usedPrompt,
      },
      ...prev,
    ]);
  };

  const removeSavedGeneratedImage = (id: string) => {
    setSavedGeneratedImages((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    videoRef,
    canvasRef,
    showWebcam,
    imageSource,
    searchQuery,
    unsplashImages,
    isLoadingImages,
    imagesError,
    imagesErrorDetail,
    imagesCount,
    selectedIds,
    userImage,
    userFile,
    generatedImage,
    savedGeneratedImages,
    error,
    descriptionsError,
    unifiedPromptError,
    isGenerating,
    isGeneratingDescriptions,
    isGeneratingUnifiedPrompt,
    usedPrompt,
    inspoDescriptions,
    popupImg,
    openDescriptions,
    loadingDescId,
    captionModel,
    generationModel,
    unifiedDescription,
    isUnifiedDescriptionEditing,
    selectedImages,
    canGenerate,
    isCurrentImageSaved,
    setImageSource,
    setSearchQuery,
    setImagesCount,
    setPopupImg,
    setCaptionModel,
    setGenerationModel,
    setUnifiedDescription,
    getPriorityById,
    closeWebcam,
    startWebcam,
    captureWebcam,
    fetchUnsplashImages,
    handleRemoveUnselected,
    handleImageToggle,
    removeSelectedInspiration,
    moveSelectedPriority,
    handleFileUpload,
    resetUserImage,
    handleInspoChange,
    toggleDescription,
    handleInspoBlur,
    handleUnifiedDescriptionBlur,
    startUnifiedDescriptionEditing,
    regenerateUnifiedDescription,
    generateSingleInspoDescription,
    generateInspoDescriptions,
    generateAspirational,
    downloadImage,
    saveCurrentGeneratedImage,
    removeSavedGeneratedImage,
  };
}