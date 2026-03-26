
"use client";

import { DescriptionsSection } from './home/components/DescriptionsSection';
import { GenerationSection } from './home/components/GenerationSection';
import { ImagePopup } from './home/components/ImagePopup';
import { SearchSection } from './home/components/SearchSection';
import { UnifiedPromptSection } from './home/components/UnifiedPromptSection';
import { UploadSection } from './home/components/UploadSection';
import { useGlowupStudio } from './home/hooks/useGlowupStudio';

const APP_VERSION = '1.0';
const RELEASE_DATE = '2026-03-26';

export default function Home() {
  const studio = useGlowupStudio();

  return (
    <main className="page-main">
      <header className="page-hero">
        <div className="page-hero__content">
          <div className="page-hero__brand">
            <div className="page-hero__heading">
              <h1>
                GlowApp
                <sup className="version-badge version-badge--hero">v{APP_VERSION}</sup>
              </h1>
              <p className="page-hero__subtitle">Costruisci il tuo sé ideale</p>
            </div>
          </div>
          <p className="page-intro">
            Costruisci una moodboard, ordina le tue ispirazioni, fondile in un prompt coerente e genera una versione visiva piu intensa, glamour e precisa del tuo immaginario.
          </p>
        </div>
        <div className="page-hero__accent" aria-hidden="true">
          <img src="/brand/logo.png" alt="" className="page-hero__logo" />
        </div>
      </header>

      <SearchSection
        imageSource={studio.imageSource}
        onImageSourceChange={studio.setImageSource}
        searchQuery={studio.searchQuery}
        onSearchQueryChange={studio.setSearchQuery}
        imagesCount={studio.imagesCount}
        onImagesCountChange={studio.setImagesCount}
        onSearch={studio.fetchUnsplashImages}
        onRemoveUnselected={studio.handleRemoveUnselected}
        isLoadingImages={studio.isLoadingImages}
        imagesError={studio.imagesError}
        imagesErrorDetail={studio.imagesErrorDetail}
        unsplashImages={studio.unsplashImages}
        selectedIds={studio.selectedIds}
        getPriorityById={studio.getPriorityById}
        onToggleImage={studio.handleImageToggle}
        onMovePriority={studio.moveSelectedPriority}
        onOpenPopup={studio.setPopupImg}
      />

      <ImagePopup popupImg={studio.popupImg} onClose={() => studio.setPopupImg(null)} />

      <UploadSection
        userImage={studio.userImage}
        showWebcam={studio.showWebcam}
        startWebcam={studio.startWebcam}
        captureWebcam={studio.captureWebcam}
        closeWebcam={studio.closeWebcam}
        onOpenPopup={studio.setPopupImg}
        videoRef={studio.videoRef}
        canvasRef={studio.canvasRef}
        onFileUpload={studio.handleFileUpload}
        onResetUserImage={studio.resetUserImage}
      />

      <DescriptionsSection
        selectedImages={studio.selectedImages}
        openDescriptions={studio.openDescriptions}
        inspoDescriptions={studio.inspoDescriptions}
        error={studio.descriptionsError}
        loadingDescId={studio.loadingDescId}
        isGeneratingDescriptions={studio.isGeneratingDescriptions}
        isGenerating={studio.isGenerating}
        captionModel={studio.captionModel}
        onCaptionModelChange={studio.setCaptionModel}
        onGenerateAllDescriptions={studio.generateInspoDescriptions}
        onToggleDescription={studio.toggleDescription}
        onRemoveDescription={studio.removeSelectedInspiration}
        onGenerateSingleDescription={studio.generateSingleInspoDescription}
        onDescriptionChange={studio.handleInspoChange}
        onDescriptionBlur={studio.handleInspoBlur}
      />

      <UnifiedPromptSection
        isGeneratingUnifiedPrompt={studio.isGeneratingUnifiedPrompt}
        canRegenerate={studio.selectedImages.length > 1}
        unifiedDescription={studio.unifiedDescription}
        error={studio.unifiedPromptError}
        isUnifiedDescriptionEditing={studio.isUnifiedDescriptionEditing}
        onRegenerate={studio.regenerateUnifiedDescription}
        onUnifiedDescriptionChange={studio.setUnifiedDescription}
        onUnifiedDescriptionBlur={studio.handleUnifiedDescriptionBlur}
        onStartUnifiedDescriptionEditing={studio.startUnifiedDescriptionEditing}
      />

      <GenerationSection
        canGenerate={studio.canGenerate}
        isGeneratingUnifiedPrompt={studio.isGeneratingUnifiedPrompt}
        isGenerating={studio.isGenerating}
        generationModel={studio.generationModel}
        selectedImages={studio.selectedImages}
        userImage={studio.userImage}
        generatedImage={studio.generatedImage}
        savedGeneratedImages={studio.savedGeneratedImages}
        error={studio.error}
        usedPrompt={studio.usedPrompt}
        isCurrentImageSaved={studio.isCurrentImageSaved}
        onGenerationModelChange={studio.setGenerationModel}
        onGenerate={studio.generateAspirational}
        onOpenPopup={studio.setPopupImg}
        onSaveCurrentGeneratedImage={studio.saveCurrentGeneratedImage}
        onDownloadImage={studio.downloadImage}
        onRemoveSavedGeneratedImage={studio.removeSavedGeneratedImage}
      />

      <footer className="page-footer">
        <p>© 2026 MM - Mirto Musci</p>
        <p>Data: {RELEASE_DATE} · Versione {APP_VERSION}</p>
      </footer>
    </main>
  );
}