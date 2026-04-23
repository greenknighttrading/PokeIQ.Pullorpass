import React, { useMemo, useRef, useState, useEffect } from "react";
import { Download, FileText, Loader2, ArrowLeft } from "lucide-react";
import { toPng } from "html-to-image";
import { useNavigate } from "react-router-dom";

import { usePortfolio } from "@/contexts/PortfolioContext";
import { Button } from "@/components/ui/button";
import { buildPortfolioReportHtml, buildPortfolioReportText } from "@/lib/reportHtml";
import { Seo } from "@/components/seo/Seo";
import { toast } from "sonner";
export default function GeneratedReport() {
  const {
    isDataLoaded,
    summary,
    allocation,
    concentration,
    milestones,
    insights,
    allocationTarget,
    allocationPreset,
    items,
    healthScoreBreakdown,
    eraAllocation,
    eraAllocationTarget,
    eraAllocationPreset,
    comparison,
  } = usePortfolio();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const html = useMemo(() => {
    return buildPortfolioReportHtml({
      summary,
      allocation,
      concentration,
      milestones: milestones ?? [],
      insights: insights ?? [],
      allocationTarget,
      allocationPreset,
      items,
      healthScoreBreakdown,
      eraAllocation,
      eraAllocationTarget,
      eraAllocationPreset,
      monthlyBudget: 500,
      comparison: comparison ?? undefined,
    });
  }, [summary, allocation, concentration, milestones, insights, allocationTarget, allocationPreset, items, healthScoreBreakdown, eraAllocation, eraAllocationTarget, eraAllocationPreset, comparison]);

  // Wait for iframe to fully load
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      // Wait for fonts to load
      const iframeDoc = iframe.contentDocument;
      if (iframeDoc) {
        if (iframeDoc.fonts && iframeDoc.fonts.ready) {
          iframeDoc.fonts.ready.then(() => {
            setIframeLoaded(true);
          });
        } else {
          // Fallback for browsers without font loading API
          setTimeout(() => setIframeLoaded(true), 500);
        }
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [html]);

  const downloadAsImage = async () => {
    if (!iframeRef.current?.contentDocument?.body) {
      toast.error("Report not ready yet. Please wait a moment.");
      return;
    }

    setIsGeneratingImage(true);

    const EXPORT_CONTENT_WIDTH = 900;
    // Extra breathing room so the right edge (text/shadows) never gets clipped
    const EXPORT_PADDING = 48;
    const EXPORT_BLEED = 12;

    try {
      const iframeDoc = iframeRef.current.contentDocument;
      const reportEl =
        (iframeDoc.querySelector("#report-root") as HTMLElement | null) ??
        (iframeDoc.querySelector(".container") as HTMLElement | null);

      if (!reportEl) {
        toast.error("Could not find report content");
        return;
      }

      // Wait for fonts
      if (iframeDoc.fonts && iframeDoc.fonts.ready) {
        await iframeDoc.fonts.ready;
      }

      // Wait for images
      const imgs = Array.from(iframeDoc.images ?? []);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                const done = () => resolve();
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              })
        )
      );

      // Temporarily disable animations/transitions inside the iframe
      const style = iframeDoc.createElement("style");
      style.id = "capture-styles";
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `;
      iframeDoc.head.appendChild(style);

      // Build an export wrapper INSIDE the iframe (keep it on-screen to avoid blank captures)
      const exportHost = iframeDoc.createElement("div");
      exportHost.setAttribute("data-export-host", "true");

      const bodyStyle = iframeDoc.defaultView?.getComputedStyle(iframeDoc.body);
      // Ensure we always capture with a non-transparent background (otherwise light text can look "blank")
      const solidBg = "#0f172a";

      exportHost.style.position = "fixed";
      exportHost.style.left = "0";
      exportHost.style.top = "0";
      exportHost.style.zIndex = "2147483647";
      exportHost.style.pointerEvents = "none";
      exportHost.style.boxSizing = "border-box";
      exportHost.style.padding = `${EXPORT_PADDING}px`;
      exportHost.style.overflow = "visible";
      exportHost.style.width = `${EXPORT_CONTENT_WIDTH + EXPORT_PADDING * 2}px`;
      exportHost.style.maxWidth = exportHost.style.width;
      exportHost.style.background = bodyStyle?.background && bodyStyle.background !== "rgba(0, 0, 0, 0)" ? bodyStyle.background : solidBg;

      const clone = reportEl.cloneNode(true) as HTMLElement;
      clone.style.width = `${EXPORT_CONTENT_WIDTH}px`;
      clone.style.maxWidth = `${EXPORT_CONTENT_WIDTH}px`;
      clone.style.margin = "0 auto";
      clone.style.overflow = "visible";

      exportHost.appendChild(clone);
      iframeDoc.body.appendChild(exportHost);

      // Allow layout to settle
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));

      // Measure exact dimensions (avoid window.innerWidth; fix right-edge clipping)
      const captureWidth = Math.ceil(exportHost.scrollWidth) + EXPORT_BLEED * 2;
      const captureHeight = Math.ceil(exportHost.scrollHeight) + EXPORT_BLEED * 2;

      const dataUrl = await toPng(exportHost, {
        pixelRatio: 2,
        width: captureWidth,
        height: captureHeight,
        cacheBust: true,
        backgroundColor: solidBg,
        filter: (node) => node.tagName !== "SCRIPT",
      });

      // Cleanup temporary DOM + styles
      exportHost.remove();
      const captureStyle = iframeDoc.getElementById("capture-styles");
      captureStyle?.remove();

      // Trigger download
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `mintdfolio-report-${new Date().toISOString().split("T")[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Image downloaded successfully!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image. Please try again.");

      // Clean up if anything was left behind
      const iframeDoc = iframeRef.current?.contentDocument;
      if (iframeDoc) {
        iframeDoc.querySelector('[data-export-host="true"]')?.remove();
        iframeDoc.getElementById("capture-styles")?.remove();
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const downloadAsText = () => {
    const textContent = buildPortfolioReportText({
      summary,
      allocation,
      concentration,
      milestones: milestones ?? [],
      insights: insights ?? [],
      allocationTarget,
      allocationPreset,
      items,
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mintdfolio-report-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Text report downloaded successfully!");
  };

  if (!isDataLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Seo
          title="Portfolio Report | mintdfolio"
          description="Generate a detailed portfolio analysis report and download it as an image."
          canonicalPath="/report/generated"
        />

        <div className="text-center space-y-4">
          <h1 className="text-lg font-semibold text-foreground">Portfolio Report</h1>
          <p className="text-muted-foreground">No portfolio data available.</p>
          <p className="text-xs text-muted-foreground mt-8">Generated from the MintdFolio App</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Seo
        title="Portfolio Report | mintdfolio"
        description="View your portfolio analysis report and download it as an image."
        canonicalPath="/report/generated"
      />

      <h1 className="sr-only">Portfolio analysis report</h1>

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.href = '/home'}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={downloadAsText} 
            size="sm" 
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            <FileText className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export as .txt</span>
            <span className="sm:hidden">.txt</span>
          </Button>
          <Button 
            onClick={downloadAsImage} 
            size="sm" 
            disabled={isGeneratingImage || !iframeLoaded}
            className="flex-1 sm:flex-none"
          >
            {isGeneratingImage ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Preparing image...</span>
                <span className="sm:hidden">Preparing...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Save Report as Image</span>
                <span className="sm:hidden">Save Image</span>
              </>
            )}
          </Button>
        </div>
      </header>

      <section className="px-4 lg:px-6 pb-6 max-w-6xl mx-auto">
        <div className="glass-card overflow-hidden">
          <iframe
            ref={iframeRef}
            title="Portfolio analysis report"
            className="w-full h-[calc(100vh-8rem)] bg-background"
            srcDoc={html}
          />
        </div>
      </section>
    </main>
  );
}
