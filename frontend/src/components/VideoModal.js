import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export default function VideoModal({ open, onOpenChange, title, videoUrl }) {
  if (!videoUrl) return null;

  // Convert normal YouTube URLs → embed URLs
  const embedUrl = videoUrl.includes("embed")
    ? videoUrl
    : videoUrl.replace("watch?v=", "embed/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{title || "Exercise Video"}</DialogTitle>
        </DialogHeader>

        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title="Exercise video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}